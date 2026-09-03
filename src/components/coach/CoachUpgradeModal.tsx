'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, Lock } from 'lucide-react'
import { COACH_FREE_EVALUATIONS, COACH_UPGRADE_URL } from '@/lib/coach/trial'

/**
 * Popup de bloqueo del Coach IA cuando se agotan las evaluaciones gratuitas.
 *
 * No se puede cerrar: el cliente pidió que aparezca "cada que lo intenten abrir" el coach,
 * así que un botón de cerrar dejaría usar la pantalla igualmente. La única salida es agendar
 * la llamada de admisión o volver al dashboard.
 *
 * Portal a `document.body` por la misma razón que `ui/Modal.tsx`: el contenedor del chat crea
 * un stacking context y el BottomNav quedaría por encima del diálogo en móvil.
 */
export function CoachUpgradeModal() {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    // El fondo no debe poder desplazarse mientras el bloqueo está activo.
    useEffect(() => {
        const previous = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = previous
        }
    }, [])

    if (!mounted) return null

    return createPortal(
        <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="coach-upgrade-title"
        >
            <div className="absolute inset-0" style={{ background: 'rgba(4,7,15,0.86)', backdropFilter: 'blur(6px)' }} />

            <div
                className="relative w-full max-w-md rounded-2xl p-6 text-center"
                style={{
                    background: '#0e131e',
                    border: '1px solid rgba(129,140,248,0.22)',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
                    color: '#dee2f2',
                }}
            >
                <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: 'rgba(129,140,248,0.14)', color: '#818cf8' }}
                >
                    <Lock size={22} />
                </div>

                <h2 id="coach-upgrade-title" className="text-[19px] font-semibold mb-2">
                    Has usado tus {COACH_FREE_EVALUATIONS} evaluaciones gratuitas
                </h2>

                <p className="text-[13.5px] leading-relaxed mb-6" style={{ color: '#9ca3b8' }}>
                    El Coach IA forma parte del programa de Growth Sales Academy. Agenda una
                    reunión con el equipo para ver si encajas en el programa y seguir entrenando
                    tus llamadas sin límite.
                </p>

                <a
                    href={COACH_UPGRADE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full rounded-xl px-4 py-3 text-[14px] font-semibold transition-opacity hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)', color: '#fff' }}
                >
                    <CalendarDays size={16} />
                    Agendar mi reunión
                </a>

                <a
                    href="/dashboard"
                    className="block mt-3 text-[12.5px] transition-colors hover:opacity-80"
                    style={{ color: '#7a8094' }}
                >
                    Volver al inicio
                </a>
            </div>
        </div>,
        document.body,
    )
}
