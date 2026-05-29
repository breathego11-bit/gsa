'use client'

import { useEffect, useRef, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useVideoUpload } from '@/hooks/useVideoUpload'
import { BunnyVideoPreview } from '@/components/admin/BunnyVideoPreview'

interface Props {
    open: boolean
    onClose: () => void
    /** Called when the video is fully saved on the user record (status='processing' or later). */
    onSaved?: () => void
}

const COPY =
    'Sube un video tuyo de un minuto hablando a cámara explicando quién eres, en qué situación te encuentras, y por qué decidiste unirte a nuestra comunidad — para que en unos meses, cuando mires atrás, te des cuenta de la gran transformación que hoy ya ha comenzado en tu vida.'

const MAX_BYTES = 300 * 1024 * 1024 // 300 MB

function fmtBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function fmtEta(seconds: number): string {
    if (!isFinite(seconds) || seconds <= 0) return '…'
    if (seconds < 60) return `~${Math.ceil(seconds)} s`
    const mins = Math.round(seconds / 60)
    if (mins < 60) return `~${mins} min`
    return `~${Math.round(mins / 60)} h`
}

export function WelcomeVideoUploadModal({ open, onClose, onSaved }: Props) {
    const videoUpload = useVideoUpload({
        credentialsEndpoint: '/api/me/welcome-video/upload-credentials',
    })
    const [savingError, setSavingError] = useState<string | null>(null)
    const [fileError, setFileError] = useState<string | null>(null)
    const [fileSize, setFileSize] = useState<number | null>(null)
    const [uploadStartedAt, setUploadStartedAt] = useState<number | null>(null)
    const [, forceTick] = useState(0)
    const savedRef = useRef<{ id: string; status: string } | null>(null)

    // Persist bunny_id on the user record as soon as the upload finishes
    // (processing) and again when Bunny finalizes (ready / failed).
    useEffect(() => {
        if (!videoUpload.videoId) return
        if (videoUpload.status !== 'processing' && videoUpload.status !== 'ready' && videoUpload.status !== 'failed') {
            return
        }
        const key = `${videoUpload.videoId}:${videoUpload.status}`
        if (savedRef.current && `${savedRef.current.id}:${savedRef.current.status}` === key) return

        ;(async () => {
            try {
                const res = await fetch('/api/me/welcome-video', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        bunny_video_id: videoUpload.videoId,
                        status: videoUpload.status,
                    }),
                })
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}))
                    throw new Error(data.error || 'Error al guardar el video')
                }
                savedRef.current = { id: videoUpload.videoId!, status: videoUpload.status }
                if (videoUpload.status === 'processing') onSaved?.()
            } catch (e) {
                setSavingError(e instanceof Error ? e.message : 'Error al guardar el video')
            }
        })()
    }, [videoUpload.videoId, videoUpload.status, onSaved])

    // Tick the ETA display every second while uploading so the user sees it move.
    useEffect(() => {
        if (videoUpload.status !== 'uploading') return
        const t = setInterval(() => forceTick((n) => n + 1), 1000)
        return () => clearInterval(t)
    }, [videoUpload.status])

    // Reset transient state when the modal closes
    useEffect(() => {
        if (open) return
        setFileError(null)
        setSavingError(null)
        // Note: we intentionally don't reset videoUpload here — the upload may
        // continue in the background if the user reopens the modal.
    }, [open])

    const isUploading = videoUpload.status === 'uploading'
    const isProcessing = videoUpload.status === 'processing'
    const isReady = videoUpload.status === 'ready'
    const isFailed = videoUpload.status === 'failed'
    const isIdle = videoUpload.status === 'idle'

    // Compute ETA from elapsed time + progress
    let etaText: string | null = null
    if (isUploading && uploadStartedAt != null && videoUpload.progress > 0) {
        const elapsedSec = (Date.now() - uploadStartedAt) / 1000
        const ratePctPerSec = videoUpload.progress / elapsedSec
        const remainingSec = (100 - videoUpload.progress) / ratePctPerSec
        if (remainingSec > 0 && remainingSec < 60 * 60 * 6) {
            etaText = fmtEta(remainingSec)
        }
    }

    function handleFile(file: File) {
        setFileError(null)
        setSavingError(null)
        savedRef.current = null

        if (!file.type.startsWith('video/')) {
            setFileError('El archivo debe ser un video (MP4, MOV o WebM).')
            return
        }
        if (file.size > MAX_BYTES) {
            setFileError(
                `El video pesa ${fmtBytes(file.size)} — máximo ${fmtBytes(MAX_BYTES)}. ` +
                'Si grabaste con celular en 4K, vuelve a grabarlo en HD (1080p o 720p). ' +
                'El video pedido es de ~1 minuto.',
            )
            return
        }

        setFileSize(file.size)
        setUploadStartedAt(Date.now())
        videoUpload.upload(file, `welcome-${Date.now()}`)
    }

    function handleClose() {
        // Allow closing only when not actively uploading
        if (isUploading) return
        onClose()
    }

    function handleCancel() {
        videoUpload.cancel()
        setFileSize(null)
        setUploadStartedAt(null)
    }

    return (
        <Modal open={open} onClose={handleClose} title="Tu video de bienvenida" size="lg">
            <div className="space-y-5">
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {COPY}
                </p>

                {/* Steps indicator (only visible once upload has started) */}
                {(isUploading || isProcessing || isReady || isFailed) && (
                    <StepsIndicator status={videoUpload.status} />
                )}

                {/* Main content area: dropzone (idle/failed) OR preview (processing/ready) */}
                <div
                    className="rounded-xl overflow-hidden"
                    style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}
                >
                    {videoUpload.videoId && (isProcessing || isReady) ? (
                        <BunnyVideoPreview
                            videoId={videoUpload.videoId}
                            status={isReady ? 'ready' : 'processing'}
                            thumbnail={videoUpload.thumbnailUrl}
                        />
                    ) : isUploading ? (
                        <UploadingPanel
                            progress={videoUpload.progress}
                            fileSize={fileSize}
                            etaText={etaText}
                        />
                    ) : (
                        <label
                            className="flex flex-col items-center justify-center gap-2 px-6 py-10 cursor-pointer text-center"
                            style={{ minHeight: 200 }}
                        >
                            <span className="material-symbols-outlined text-3xl" style={{ color: '#38bdf8' }}>
                                videocam
                            </span>
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                {isFailed ? 'Hubo un error. Vuelve a intentarlo.' : 'Selecciona tu video'}
                            </span>
                            <span className="text-xs leading-relaxed max-w-xs" style={{ color: 'var(--text-secondary)' }}>
                                MP4, MOV o WebM · ~1 minuto · máx. {fmtBytes(MAX_BYTES)}.<br />
                                Si grabas con celular, hazlo en <strong>HD (1080p)</strong> — no 4K — para subida más rápida.
                            </span>
                            <input
                                type="file"
                                className="hidden"
                                accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                                onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (!file) return
                                    handleFile(file)
                                    e.target.value = ''
                                }}
                            />
                        </label>
                    )}
                </div>

                {fileError && (
                    <div className="p-3 rounded-lg text-sm leading-relaxed" style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.28)' }}>
                        {fileError}
                    </div>
                )}

                {(videoUpload.error || savingError) && (
                    <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                        {videoUpload.error || savingError}
                    </div>
                )}

                {(isProcessing || isReady) && !videoUpload.error && (
                    <div
                        className="p-3 rounded-lg text-xs leading-relaxed"
                        style={{
                            background: 'rgba(52,211,153,0.08)',
                            border: '1px solid rgba(52,211,153,0.28)',
                            color: '#34d399',
                        }}
                    >
                        {isReady
                            ? 'Listo · tu video se guardó correctamente. Puedes cerrar esta ventana.'
                            : 'Subida completa · Bunny está procesando el video. Puedes cerrar esta ventana — quedará disponible en unos minutos.'}
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex justify-end gap-2 pt-1">
                    {isUploading ? (
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                            style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
                        >
                            Cancelar subida
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                            style={{ background: 'var(--bg-raised)', color: 'var(--text-primary)' }}
                        >
                            {isProcessing || isReady ? 'Cerrar' : 'Cancelar'}
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    )
}

/* ── Steps indicator (Subir → Procesar → Listo) ─────────────────────── */

function StepsIndicator({ status }: { status: string }) {
    const steps = [
        { id: 'upload', label: 'Subir' },
        { id: 'process', label: 'Procesar' },
        { id: 'done', label: 'Listo' },
    ]
    const currentIdx = status === 'uploading' || status === 'failed' ? 0 : status === 'processing' ? 1 : status === 'ready' ? 2 : -1

    return (
        <div className="flex items-center gap-2" aria-label="Progreso de la subida">
            {steps.map((step, i) => {
                const isPast = i < currentIdx || status === 'ready'
                const isCurrent = i === currentIdx && status !== 'ready'
                const isFailedHere = status === 'failed' && i === 0
                return (
                    <div key={step.id} className="flex items-center gap-2 flex-1">
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                                className="flex items-center justify-center text-[11px] font-semibold"
                                style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    background: isFailedHere
                                        ? 'rgba(239,68,68,0.15)'
                                        : isPast
                                            ? 'rgba(52,211,153,0.18)'
                                            : isCurrent
                                                ? 'linear-gradient(135deg, #38bdf8, #818cf8)'
                                                : 'rgba(129,140,248,0.10)',
                                    color: isFailedHere
                                        ? '#f87171'
                                        : isPast
                                            ? '#34d399'
                                            : isCurrent
                                                ? '#fff'
                                                : '#7a8094',
                                    border: isFailedHere
                                        ? '1px solid rgba(239,68,68,0.4)'
                                        : isPast
                                            ? '1px solid rgba(52,211,153,0.4)'
                                            : isCurrent
                                                ? 'none'
                                                : '1px solid rgba(129,140,248,0.25)',
                                    boxShadow: isCurrent ? '0 0 12px rgba(56,189,248,0.5)' : undefined,
                                }}
                            >
                                {isFailedHere ? '!' : isPast ? '✓' : i + 1}
                            </span>
                            <span
                                className="text-xs font-medium"
                                style={{
                                    color: isCurrent || isPast ? 'var(--text-primary)' : '#7a8094',
                                }}
                            >
                                {step.label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div
                                className="flex-1 h-px"
                                style={{
                                    background:
                                        i < currentIdx || status === 'ready'
                                            ? 'rgba(52,211,153,0.35)'
                                            : 'rgba(129,140,248,0.15)',
                                }}
                            />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

/* ── Uploading panel (progress bar + file size + ETA) ──────────────── */

function UploadingPanel({
    progress,
    fileSize,
    etaText,
}: {
    progress: number
    fileSize: number | null
    etaText: string | null
}) {
    const uploadedBytes = fileSize ? Math.floor((progress / 100) * fileSize) : null
    return (
        <div className="flex flex-col gap-3 px-6 py-8" style={{ minHeight: 200 }}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg animate-spin" style={{ color: '#38bdf8' }}>
                        hourglass_empty
                    </span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Subiendo… {progress}%
                    </span>
                </div>
                {etaText && (
                    <span
                        className="text-xs font-mono"
                        style={{ color: '#9ca3b8' }}
                    >
                        {etaText} restantes
                    </span>
                )}
            </div>

            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(129,140,248,0.15)' }}>
                <div
                    className="h-full transition-all duration-200"
                    style={{
                        width: `${progress}%`,
                        background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
                        boxShadow: '0 0 12px rgba(56,189,248,0.6)',
                    }}
                />
            </div>

            {fileSize != null && (
                <div className="flex items-center justify-between text-xs font-mono" style={{ color: '#7a8094' }}>
                    <span>{uploadedBytes != null ? fmtBytes(uploadedBytes) : ''} de {fmtBytes(fileSize)}</span>
                    <span>No cierres esta ventana</span>
                </div>
            )}
        </div>
    )
}
