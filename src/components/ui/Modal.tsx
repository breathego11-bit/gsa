'use client'

import { useEffect, useState, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useScrollLock } from '@/hooks/useScrollLock'

interface ModalProps {
    open: boolean
    onClose: () => void
    title: string
    children: ReactNode
    size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    useScrollLock(open)

    if (!open || !mounted) return null

    /*
     * El portal NO es cosmético: `main` (MainContent.tsx) es `relative z-10` y crea
     * un stacking context, así que un modal renderizado dentro de él queda por
     * debajo del BottomNav (`z-50`, hermano de `main`) por mucho z-index que se le
     * ponga. En móvil eso dejaba la franja inferior del diálogo —donde viven
     * Guardar/Cancelar— tapada, y el BottomNav seguía siendo clicable sobre el
     * backdrop. Sacándolo a `document.body` el z-index vuelve a significar algo.
     */
    return createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />
            {/* Dialog */}
            <div
                className={`relative w-full ${sizeClasses[size]} rounded-2xl border shadow-2xl animate-slide-up`}
                style={{
                    background: 'var(--bg-surface)',
                    borderColor: 'var(--border)',
                }}
            >
                <div
                    className="flex items-center justify-between border-b px-4 sm:px-6 py-4"
                    style={{ borderColor: 'var(--border)' }}
                >
                    <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="btn-ghost rounded-lg p-1.5 max-sm:h-11 max-sm:w-11 shrink-0"
                        aria-label="Cerrar"
                    >
                        <X size={16} />
                    </button>
                </div>
                {/*
                 * `svh` en móvil: `vh` es el viewport grande (sin barra de URL), así que
                 * con `vh` el modal se extiende por debajo de ella. Y 140px en vez de
                 * 200px deja área útil usable en landscape (~375px de alto).
                 */}
                <div className="px-4 sm:px-6 py-5 overflow-y-auto max-h-[calc(100svh-140px)] sm:max-h-[calc(100vh-200px)]">
                    {children}
                </div>
            </div>
        </div>,
        document.body,
    )
}
