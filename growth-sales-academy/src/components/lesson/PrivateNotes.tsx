'use client'

import { useState, useEffect } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { PenLine, Check, Loader2 } from 'lucide-react'

interface PrivateNotesProps {
    lessonId: string
    initialContent: string
}

export function PrivateNotes({ lessonId, initialContent }: PrivateNotesProps) {
    const [content, setContent] = useState(initialContent)
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
    const debouncedContent = useDebounce(content, 1000)

    useEffect(() => {
        if (debouncedContent === initialContent) return
        setStatus('saving')

        fetch(`/api/notes/${lessonId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: debouncedContent }),
        }).then(() => {
            setStatus('saved')
            setTimeout(() => setStatus('idle'), 2000)
        })
    }, [debouncedContent]) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <PenLine size={15} style={{ color: 'var(--text-secondary)' }} />
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Notas privadas
                    </h3>
                </div>
                <div className="flex items-center gap-1.5">
                    {status === 'saving' && (
                        <>
                            <Loader2 size={12} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Guardando...</span>
                        </>
                    )}
                    {status === 'saved' && (
                        <>
                            <Check size={12} style={{ color: 'var(--success)' }} />
                            <span className="text-xs" style={{ color: 'var(--success)' }}>Guardado</span>
                        </>
                    )}
                </div>
            </div>

            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder="Escribe tus notas aquí... Solo tú puedes verlas."
                className="w-full resize-none rounded-xl border p-3 text-sm outline-none transition-all"
                style={{
                    background: 'var(--bg-raised)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                }}
                onFocus={(e) => {
                    e.target.style.borderColor = 'var(--blue-accent)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.12)'
                }}
                onBlur={(e) => {
                    e.target.style.borderColor = 'var(--border)'
                    e.target.style.boxShadow = 'none'
                }}
            />
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Se guardan automáticamente
            </p>
        </div>
    )
}
