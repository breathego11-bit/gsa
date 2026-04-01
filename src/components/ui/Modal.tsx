'use client'

import { useEffect, ReactNode } from 'react'
import { X } from 'lucide-react'

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
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [open])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
                    className="flex items-center justify-between border-b px-6 py-4"
                    style={{ borderColor: 'var(--border)' }}
                >
                    <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="btn-ghost rounded-lg p-1.5"
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="px-6 py-5 overflow-y-auto max-h-[calc(100vh-200px)]">{children}</div>
            </div>
        </div>
    )
}
