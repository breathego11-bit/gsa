import { ReactNode } from 'react'

interface BadgeProps {
    variant?: 'published' | 'draft' | 'success' | 'warning' | 'info'
    children: ReactNode
    className?: string
}

const variantClasses = {
    published: 'badge-published',
    success: 'badge-published',
    draft: 'badge-draft',
    warning: 'badge-warning',
    info: 'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-blue-primary/10 text-blue-accent',
}

export function Badge({ variant = 'draft', children, className = '' }: BadgeProps) {
    return (
        <span className={`${variantClasses[variant]} ${className}`}>
            {children}
        </span>
    )
}
