/**
 * Center-of-viewport watermark with "GS" initials.
 *
 * Sits behind all dashboard / admin content (z-0, pointer-events: none).
 * Components above it cover it naturally — this is intentional per client request.
 */
export function Watermark() {
    return (
        <div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center select-none"
        >
            <span
                style={{
                    fontSize: 'clamp(120px, 18vw, 240px)',
                    fontWeight: 800,
                    letterSpacing: '-0.05em',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    color: 'rgba(222, 226, 242, 0.045)',
                    lineHeight: 1,
                    userSelect: 'none',
                }}
            >
                GS
            </span>
        </div>
    )
}
