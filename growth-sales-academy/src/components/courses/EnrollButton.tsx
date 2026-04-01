'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

interface EnrollButtonProps {
    courseId: string
    isAuthenticated: boolean
}

export function EnrollButton({ courseId, isAuthenticated }: EnrollButtonProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [enrolled, setEnrolled] = useState(false)

    async function handleEnroll() {
        if (!isAuthenticated) {
            router.push('/register')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/enrollments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ course_id: courseId }),
            })
            if (res.ok) {
                setEnrolled(true)
                router.push(`/course/${courseId}`)
            }
        } finally {
            setLoading(false)
        }
    }

    if (enrolled) {
        return (
            <button
                disabled
                className="w-full bg-emerald-500/20 text-emerald-400 px-6 py-3 rounded-full font-semibold text-sm flex items-center justify-center gap-2"
            >
                <MaterialIcon name="check_circle" size="text-sm" />
                Inscrito
            </button>
        )
    }

    return (
        <button
            onClick={handleEnroll}
            disabled={loading}
            className="w-full bg-gradient-to-br from-primary-container to-secondary-container text-on-primary-container px-6 py-3 rounded-full font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg active:scale-95 transition-all disabled:opacity-50"
        >
            {loading ? (
                <span className="spinner" />
            ) : (
                <MaterialIcon name="school" size="text-sm" />
            )}
            {isAuthenticated ? 'Inscribirme' : 'Regístrate para inscribirte'}
        </button>
    )
}
