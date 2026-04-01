import { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode
    variant?: 'default' | 'raised'
}

export function Card({ children, variant = 'default', className = '', ...props }: CardProps) {
    const base = variant === 'raised' ? 'card-raised' : 'card'
    return (
        <div className={`${base} ${className}`} {...props}>
            {children}
        </div>
    )
}
