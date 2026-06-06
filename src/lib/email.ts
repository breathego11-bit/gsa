import { Resend } from 'resend'
import type { ReactElement } from 'react'

const API_KEY = process.env.RESEND_API_KEY
const FROM = process.env.EMAIL_FROM || 'GSA <onboarding@resend.dev>'
const REPLY_TO = process.env.EMAIL_REPLY_TO || undefined

// Lazy-init so the module imports cleanly even when the API key isn't configured yet
// (build time, local dev without secrets, etc.). Errors surface on first `sendEmail` call.
let _client: Resend | null = null
function client(): Resend {
    if (!_client) {
        if (!API_KEY) {
            throw new Error('RESEND_API_KEY no está configurado')
        }
        _client = new Resend(API_KEY)
    }
    return _client
}

export interface SendEmailParams {
    to: string | string[]
    subject: string
    react: ReactElement
    replyTo?: string
}

export interface SendEmailResult {
    ok: boolean
    id?: string
    error?: string
}

/**
 * Sends a transactional email through Resend.
 *
 * Returns `{ ok, error }` instead of throwing so callers (request handlers, cron jobs)
 * can decide whether email failure should bubble up. Logs all failures to stderr.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    try {
        const result = await client().emails.send({
            from: FROM,
            to: params.to,
            subject: params.subject,
            react: params.react,
            replyTo: params.replyTo ?? REPLY_TO,
        })
        if (result.error) {
            console.error('[email] Resend returned error:', result.error)
            return { ok: false, error: result.error.message }
        }
        return { ok: true, id: result.data?.id }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown email error'
        console.error('[email] sendEmail threw:', message)
        return { ok: false, error: message }
    }
}
