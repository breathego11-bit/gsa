'use client'

import { useState } from 'react'

interface CheckoutButtonProps {
    plan?: 'one_time' | 'installment'
    paymentId?: string
    children: React.ReactNode
    className?: string
}

export function CheckoutButton({ plan, paymentId, children, className }: CheckoutButtonProps) {
    const [loading, setLoading] = useState(false)

    async function handleClick() {
        setLoading(true)
        try {
            const body = paymentId ? { paymentId } : { plan }
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const data = await res.json()
            if (data.url) {
                window.location.href = data.url
            }
        } catch {
            setLoading(false)
        }
    }

    return (
        <button onClick={handleClick} disabled={loading} className={className}>
            {loading ? (
                <span className="flex items-center justify-center gap-2">
                    <span className="spinner" />
                    Redirigiendo a Stripe...
                </span>
            ) : children}
        </button>
    )
}
