import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { GOOGLE_CONNECT_BANNER } from '@/lib/leads/display'

/**
 * Aviso tras volver del consentimiento de Google (`?google=connected|denied|...`). Lo enseñan la
 * pantalla de leads del admin y la agenda del closer, que es adonde devuelve cada rol el callback.
 */
export function GoogleConnectBanner({ status }: { status?: string }) {
    // `Object.hasOwn`: con `?google=constructor` el objeto devolvería una función heredada y se
    // pintaría un aviso de error vacío.
    const banner = status && Object.hasOwn(GOOGLE_CONNECT_BANNER, status) ? GOOGLE_CONNECT_BANNER[status] : undefined
    if (!banner) return null
    return (
        <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
            style={{
                background: banner.ok ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                border: `1px solid ${banner.ok ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
                color: banner.ok ? '#34d399' : '#f87171',
            }}
        >
            {banner.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {banner.msg}
        </div>
    )
}
