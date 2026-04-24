'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import * as tus from 'tus-js-client'

export type VideoUploadStatus = 'idle' | 'uploading' | 'processing' | 'ready' | 'failed'

type TusCredentialsResponse = {
    endpoint: string
    videoId: string
    libraryId: string
    signature: string
    expirationTime: number
    thumbnail_url: string
}

export function useVideoUpload() {
    const [progress, setProgress] = useState(0)
    const [status, setStatus] = useState<VideoUploadStatus>('idle')
    const [error, setError] = useState<string | null>(null)
    const [videoId, setVideoId] = useState<string | null>(null)
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)

    const uploadRef = useRef<tus.Upload | null>(null)
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const stopPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current)
            pollRef.current = null
        }
    }, [])

    const pollBunnyStatus = useCallback((id: string) => {
        stopPolling()
        pollRef.current = setInterval(async () => {
            try {
                const res = await fetch(`/api/bunny-status/${id}`)
                if (!res.ok) return
                const data = await res.json()
                if (data.status === 'ready') {
                    setStatus('ready')
                    stopPolling()
                } else if (data.status === 'failed') {
                    setStatus('failed')
                    setError('Bunny falló al procesar el video')
                    stopPolling()
                }
            } catch {
                /* transient network error, keep polling */
            }
        }, 5000)
    }, [stopPolling])

    const upload = useCallback(async (file: File, title: string) => {
        setError(null)
        setProgress(0)
        setStatus('uploading')
        setVideoId(null)
        setThumbnailUrl(null)

        try {
            const res = await fetch('/api/upload-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title }),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || 'No se pudo autorizar la subida')
            }
            const creds: TusCredentialsResponse = await res.json()
            setVideoId(creds.videoId)
            setThumbnailUrl(creds.thumbnail_url)

            const tusUpload = new tus.Upload(file, {
                endpoint: creds.endpoint,
                retryDelays: [0, 3000, 5000, 10000, 20000, 30000, 60000],
                headers: {
                    AuthorizationSignature: creds.signature,
                    AuthorizationExpire: String(creds.expirationTime),
                    VideoId: creds.videoId,
                    LibraryId: creds.libraryId,
                },
                metadata: {
                    filetype: file.type,
                    title,
                },
                onError: (err) => {
                    setStatus('failed')
                    setError(err instanceof Error ? err.message : 'Error al subir a Bunny Stream')
                },
                onProgress: (sent, total) => {
                    if (total > 0) setProgress(Math.floor((sent / total) * 100))
                },
                onSuccess: () => {
                    setProgress(100)
                    setStatus('processing')
                    pollBunnyStatus(creds.videoId)
                },
            })
            uploadRef.current = tusUpload
            tusUpload.start()
        } catch (err) {
            setStatus('failed')
            setError(err instanceof Error ? err.message : 'Error desconocido')
        }
    }, [pollBunnyStatus])

    const cancel = useCallback(() => {
        uploadRef.current?.abort().catch(() => {})
        uploadRef.current = null
        stopPolling()
        setStatus('idle')
        setProgress(0)
    }, [stopPolling])

    const reset = useCallback(() => {
        uploadRef.current?.abort().catch(() => {})
        uploadRef.current = null
        stopPolling()
        setStatus('idle')
        setProgress(0)
        setError(null)
        setVideoId(null)
        setThumbnailUrl(null)
    }, [stopPolling])

    useEffect(() => {
        return () => {
            uploadRef.current?.abort().catch(() => {})
            if (pollRef.current) clearInterval(pollRef.current)
        }
    }, [])

    return { progress, status, error, videoId, thumbnailUrl, upload, cancel, reset }
}
