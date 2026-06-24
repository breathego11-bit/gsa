import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

/**
 * `state` firmado para el flujo OAuth (anti-CSRF). Lleva el user_id del admin que inicia
 * la conexión y un timestamp; se firma con HMAC-SHA256 usando NEXTAUTH_SECRET.
 */

const TTL_MS = 10 * 60 * 1000 // 10 min

function key(): Buffer {
    const s = process.env.NEXTAUTH_SECRET
    if (!s) throw new Error('NEXTAUTH_SECRET no configurado')
    return Buffer.from(s, 'utf8')
}

export function signState(userId: string): string {
    const body = Buffer.from(
        JSON.stringify({ uid: userId, ts: Date.now(), n: randomBytes(8).toString('hex') }),
    ).toString('base64url')
    const sig = createHmac('sha256', key()).update(body).digest('base64url')
    return `${body}.${sig}`
}

export function verifyState(state: string): { userId: string } | null {
    const dot = state.indexOf('.')
    if (dot < 0) return null
    const body = state.slice(0, dot)
    const sig = state.slice(dot + 1)
    const expected = createHmac('sha256', key()).update(body).digest('base64url')
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    try {
        const obj = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { uid?: string; ts?: number }
        if (!obj.uid || typeof obj.ts !== 'number') return null
        if (Date.now() - obj.ts > TTL_MS) return null
        return { userId: obj.uid }
    } catch {
        return null
    }
}
