import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

/**
 * Cifrado de tokens OAuth en reposo — AES-256-GCM.
 *
 * Clave: `CALENDAR_TOKEN_ENC_KEY` (32 bytes en base64; generar con `openssl rand -base64 32`).
 * Formato almacenado: base64( iv[12] || authTag[16] || ciphertext ).
 * Nunca se guardan ni se loguean los tokens en texto plano.
 */

const ALGO = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16

function getKey(): Buffer {
    const raw = process.env.CALENDAR_TOKEN_ENC_KEY
    if (!raw) throw new Error('CALENDAR_TOKEN_ENC_KEY no configurado en el servidor')
    const key = Buffer.from(raw, 'base64')
    if (key.length !== 32) {
        throw new Error('CALENDAR_TOKEN_ENC_KEY debe ser exactamente 32 bytes en base64')
    }
    return key
}

export function encryptToken(plain: string): string {
    const iv = randomBytes(IV_LEN)
    const cipher = createCipheriv(ALGO, getKey(), iv)
    const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return Buffer.concat([iv, tag, ct]).toString('base64')
}

/** Error de cifrado/clave (distinto de un fallo de auth de Google). */
export class CryptoError extends Error {}

export function decryptToken(payload: string): string {
    try {
        const buf = Buffer.from(payload, 'base64')
        const iv = buf.subarray(0, IV_LEN)
        const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN)
        const ct = buf.subarray(IV_LEN + TAG_LEN)
        const decipher = createDecipheriv(ALGO, getKey(), iv)
        decipher.setAuthTag(tag)
        return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
    } catch (e) {
        // Clave rotada/mal configurada o ciphertext corrupto → NO es revocación de token.
        throw new CryptoError('decrypt de token falló (revisar CALENDAR_TOKEN_ENC_KEY)', { cause: e })
    }
}

/** decrypt tolerante: devuelve null si falla (token corrupto o clave rotada). */
export function tryDecryptToken(payload: string | null | undefined): string | null {
    if (!payload) return null
    try {
        return decryptToken(payload)
    } catch {
        return null
    }
}
