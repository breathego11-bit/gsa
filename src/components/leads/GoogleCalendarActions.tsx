'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarPlus, Loader2, LogOut, AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

export interface TransferTarget {
    id: string
    name: string
}

/**
 * Botones de la tarjeta de Google Calendar: conectar/reconectar y desconectar.
 *
 * La desconexión abre un diálogo porque no es una acción neutra: si el miembro tiene reuniones
 * futuras asignadas, hay que decidir qué pasa con ellas ANTES de soltar la conexión. Después ya no
 * se puede — mover un evento entre calendarios necesita los tokens de las dos partes, así que una
 * vez desconectado esas reuniones quedan atrapadas en su calendario.
 */
export function GoogleCalendarActions({
    connected,
    futureMeetings,
    transferTargets,
}: {
    connected: boolean
    futureMeetings: number
    /** Miembros con calendario ACTIVO: son los únicos a los que se puede traspasar una reunión. */
    transferTargets: TransferTarget[]
}) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [transferTo, setTransferTo] = useState<string>('')

    async function disconnect() {
        setBusy(true)
        setError('')
        try {
            const res = await fetch('/api/integrations/google/disconnect', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                // "keep" no es un destinatario, es "no transferir": no debe viajar como transfer_to.
                body: JSON.stringify(
                    transferTo && transferTo !== 'keep' ? { transfer_to: transferTo } : {},
                ),
            })
            const data = (await res.json().catch(() => ({}))) as {
                error?: string
                failed?: { leadId: string; error?: string }[]
            }
            if (!res.ok) {
                setError(
                    data.failed?.length
                        ? `${data.error ?? 'No se pudo completar'} (${data.failed.length} con problemas)`
                        : (data.error ?? 'No se pudo desconectar'),
                )
                return
            }
            setOpen(false)
            router.refresh()
        } catch {
            setError('No se pudo conectar con el servidor')
        } finally {
            setBusy(false)
        }
    }

    // Con reuniones futuras hay que elegir explícitamente: traspasarlas o quedárselas ("keep").
    const mustDecide = futureMeetings > 0
    const canSubmit = !busy && (!mustDecide || transferTo !== '')

    return (
        <>
            <div className="flex items-center gap-2">
                <a
                    href="/api/integrations/google/connect"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors"
                    style={{
                        background: connected ? 'var(--bg-raised)' : 'linear-gradient(135deg, #38bdf8, #818cf8)',
                        color: connected ? 'var(--text-secondary)' : '#fff',
                        border: connected ? '1px solid var(--border)' : 'none',
                    }}
                >
                    <CalendarPlus size={14} />
                    {connected ? 'Reconectar' : 'Conectar Google Calendar'}
                </a>

                {connected && (
                    <button
                        type="button"
                        onClick={() => {
                            setTransferTo('')
                            setError('')
                            setOpen(true)
                        }}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors"
                        style={{ background: 'var(--bg-raised)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}
                    >
                        <LogOut size={14} />
                        Desconectar
                    </button>
                )}
            </div>

            <Modal open={open} onClose={() => !busy && setOpen(false)} title="Desconectar Google Calendar" size="md">
                <div className="space-y-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <p>
                        Dejarás de recibir reuniones nuevas y saldrás del reparto automático de leads.
                        Para volver, tendrás que conectar y autorizar de nuevo en Google.
                    </p>

                    {mustDecide ? (
                        <>
                            <div
                                className="flex items-start gap-2 px-3.5 py-3 rounded-lg"
                                style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24' }}
                            >
                                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                                <p className="text-[12.5px]">
                                    Tienes <strong>{futureMeetings}</strong>{' '}
                                    {futureMeetings === 1 ? 'reunión futura' : 'reuniones futuras'} asignadas.
                                    Decide qué hacer con ellas: <strong>después de desconectar ya no se pueden mover</strong>,
                                    porque hace falta el acceso a tu calendario para cancelarlas.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                                    ¿Qué hacemos con esas reuniones?
                                </label>
                                <select
                                    value={transferTo}
                                    onChange={(e) => setTransferTo(e.target.value)}
                                    className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                                    style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                >
                                    <option value="">Elige una opción…</option>
                                    {transferTargets.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            Pasárselas a {t.name}
                                        </option>
                                    ))}
                                    <option value="keep">Dejarlas en mi calendario (las atiendo yo)</option>
                                </select>
                                {transferTargets.length === 0 && (
                                    <p className="text-[11.5px] mt-1.5" style={{ color: '#fbbf24' }}>
                                        Nadie más tiene el calendario conectado, así que no hay a quién pasárselas.
                                    </p>
                                )}
                                <p className="text-[11.5px] mt-1.5" style={{ opacity: 0.75 }}>
                                    Al traspasarlas, cada lead recibe la cancelación de la reunión anterior y una
                                    invitación nueva con otro enlace de Meet.
                                </p>
                            </div>
                        </>
                    ) : (
                        <p>No tienes reuniones futuras asignadas, así que no hay nada que traspasar.</p>
                    )}

                    {error && (
                        <div
                            className="px-3.5 py-2.5 rounded-lg text-[12.5px]"
                            style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#fda4af' }}
                        >
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            disabled={busy}
                            className="px-4 py-2 rounded-lg text-xs font-semibold"
                            style={{ background: 'var(--bg-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={disconnect}
                            disabled={!canSubmit}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold"
                            style={{
                                background: '#f87171',
                                color: '#fff',
                                opacity: canSubmit ? 1 : 0.45,
                                cursor: canSubmit ? 'pointer' : 'not-allowed',
                            }}
                        >
                            {busy && <Loader2 size={13} className="animate-spin" />}
                            {busy ? 'Desconectando…' : 'Desconectar'}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    )
}
