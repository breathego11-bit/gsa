interface ProgressRingProps {
    percent: number
    size?: number
    strokeWidth?: number
    className?: string
}

export function ProgressRing({
    percent,
    size = 64,
    strokeWidth = 5,
    className = '',
}: ProgressRingProps) {
    const radius = (size - strokeWidth * 2) / 2
    const circumference = radius * 2 * Math.PI
    const offset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference

    return (
        <svg
            width={size}
            height={size}
            className={`-rotate-90 ${className}`}
            aria-label={`${percent}% complete`}
        >
            {/* Track */}
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--bg-raised)"
                strokeWidth={strokeWidth}
            />
            {/* Progress */}
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--blue-accent)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
        </svg>
    )
}
