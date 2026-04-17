'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

interface MarkCompleteButtonProps {
    lessonId: string
    initialCompleted: boolean
    nextLessonId?: string | null
    courseId?: string
    lessonType?: string
}

export function MarkCompleteButton({ lessonId, initialCompleted, nextLessonId, courseId, lessonType }: MarkCompleteButtonProps) {
    // FORM and EXAM lessons handle completion through their own components
    if (lessonType === 'FORM' || lessonType === 'EXAM') return null

    const router = useRouter()
    const [completed, setCompleted] = useState(initialCompleted)
    const [loading, setLoading] = useState(false)

    async function handleComplete() {
        if (completed) return

        setLoading(true)
        try {
            const res = await fetch('/api/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lesson_id: lessonId, completed: true }),
            })
            if (res.ok) {
                setCompleted(true)
                // Auto-navigate after a brief delay
                setTimeout(() => {
                    if (nextLessonId) {
                        router.push(`/lesson/${nextLessonId}`)
                    } else if (courseId) {
                        router.push(`/dashboard/courses/${courseId}`)
                    }
                }, 500)
            }
        } finally {
            setLoading(false)
        }
    }

    if (completed) {
        return (
            <button
                disabled
                className="bg-emerald-500/20 text-emerald-400 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2"
            >
                <MaterialIcon name="check_circle" size="text-sm" />
                Completada
            </button>
        )
    }

    return (
        <button
            onClick={handleComplete}
            disabled={loading}
            className="bg-gradient-to-r from-primary-container to-secondary-container text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:shadow-lg active:scale-95 transition-all disabled:opacity-50"
        >
            {loading ? (
                <>
                    <span className="spinner" />
                    Guardando...
                </>
            ) : (
                <>
                    {lessonType === 'TEXT'
                        ? (nextLessonId ? 'Marcar como leído' : 'Marcar como leído')
                        : (nextLessonId ? 'Completar y Siguiente' : 'Completar curso')}
                    <MaterialIcon name="chevron_right" size="text-sm" />
                </>
            )}
        </button>
    )
}
