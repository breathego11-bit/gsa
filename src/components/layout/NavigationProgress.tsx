'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function NavigationProgress() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [progress, setProgress] = useState(0)
    const [visible, setVisible] = useState(false)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const prevUrl = useRef('')

    const start = useCallback(() => {
        setVisible(true)
        setProgress(15)
        timerRef.current = setInterval(() => {
            setProgress((p) => {
                if (p >= 90) return p
                return p + (90 - p) * 0.1
            })
        }, 200)
    }, [])

    const done = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current)
        setProgress(100)
        setTimeout(() => {
            setVisible(false)
            setProgress(0)
        }, 300)
    }, [])

    // Detect route changes
    useEffect(() => {
        const url = pathname + searchParams.toString()
        if (prevUrl.current && prevUrl.current !== url) {
            done()
        }
        prevUrl.current = url
    }, [pathname, searchParams, done])

    // Intercept link clicks to start progress
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            const anchor = (e.target as HTMLElement).closest('a')
            if (!anchor) return
            const href = anchor.getAttribute('href')
            if (!href || href.startsWith('#') || href.startsWith('http') || anchor.target === '_blank') return
            const current = pathname + searchParams.toString()
            if (href !== current && href !== pathname) {
                start()
            }
        }

        document.addEventListener('click', handleClick, true)
        return () => document.removeEventListener('click', handleClick, true)
    }, [pathname, searchParams, start])

    if (!visible && progress === 0) return null

    return (
        <div
            className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
            style={{ opacity: visible ? 1 : 0, transition: 'opacity 300ms' }}
        >
            <div
                className="h-full rounded-r-full"
                style={{
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, var(--blue-accent, #3b82f6), #60a5fa)',
                    boxShadow: '0 0 10px rgba(59,130,246,0.5)',
                    transition: progress === 0 ? 'none' : 'width 200ms ease-out',
                }}
            />
        </div>
    )
}
