interface MaterialIconProps {
    name: string
    className?: string
    size?: string
}

export function MaterialIcon({ name, className = '', size = 'text-2xl' }: MaterialIconProps) {
    return (
        <span className={`material-symbols-outlined ${size} ${className}`}>
            {name}
        </span>
    )
}
