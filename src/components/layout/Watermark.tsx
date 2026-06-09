/**
 * Center-of-viewport watermark using the GSA logo.
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="/logo_dark.png"
                alt=""
                draggable={false}
                style={{
                    width: 'clamp(180px, 26vw, 360px)',
                    height: 'auto',
                    opacity: 0.06,
                    userSelect: 'none',
                }}
            />
        </div>
    )
}
