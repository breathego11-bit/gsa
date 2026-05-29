'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Video, Clock } from 'lucide-react'
import { WelcomeVideoUploadModal } from '@/components/onboarding/WelcomeVideoUploadModal'

export function WelcomeVideoBanner() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [snoozing, setSnoozing] = useState(false)
    const [hidden, setHidden] = useState(false)

    async function handleSnooze() {
        setSnoozing(true)
        try {
            await fetch('/api/me/welcome-video/snooze', { method: 'POST' })
            setHidden(true) // optimistically hide; server returns next 24h
        } finally {
            setSnoozing(false)
        }
    }

    if (hidden) return null

    return (
        <>
            <div className="rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 border bg-surface-container-low border-outline-variant/15">
                <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8' }}>
                    <Video size={18} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-on-surface">
                        Pendiente: graba tu video de bienvenida
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                        Un minuto hablando a cámara sobre quién eres y por qué decidiste unirte. En unos meses verás cuánto has cambiado.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={handleSnooze}
                        disabled={snoozing}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <Clock size={12} />
                        Recordármelo mañana
                    </button>
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                        style={{
                            background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%)',
                            boxShadow: '0 6px 16px -6px rgba(56,189,248,0.5)',
                        }}
                    >
                        Subir ahora
                    </button>
                </div>
            </div>

            <WelcomeVideoUploadModal
                open={open}
                onClose={() => {
                    setOpen(false)
                    // If the user uploaded, the server now has bunny_id; refresh to hide the banner.
                    router.refresh()
                }}
                onSaved={() => {
                    setHidden(true)
                    router.refresh()
                }}
            />
        </>
    )
}
