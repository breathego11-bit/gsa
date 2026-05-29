export interface PhonePrefix {
    code: string   // E.g. "+34" — used as the stored prefix token
    label: string  // E.g. "España (+34)" — what shows in the dropdown
}

// España va primero (default); el resto va alfabético por nombre de país
// para facilitar la búsqueda visual en el dropdown nativo.
export const PHONE_PREFIXES: PhonePrefix[] = [
    { code: '+34', label: 'España (+34)' },
    { code: '+54', label: 'Argentina (+54)' },
    { code: '+591', label: 'Bolivia (+591)' },
    { code: '+56', label: 'Chile (+56)' },
    { code: '+57', label: 'Colombia (+57)' },
    { code: '+506', label: 'Costa Rica (+506)' },
    { code: '+53', label: 'Cuba (+53)' },
    { code: '+593', label: 'Ecuador (+593)' },
    { code: '+503', label: 'El Salvador (+503)' },
    { code: '+1', label: 'Estados Unidos (+1)' },
    { code: '+502', label: 'Guatemala (+502)' },
    { code: '+240', label: 'Guinea Ecuatorial (+240)' },
    { code: '+504', label: 'Honduras (+504)' },
    { code: '+52', label: 'México (+52)' },
    { code: '+505', label: 'Nicaragua (+505)' },
    { code: '+507', label: 'Panamá (+507)' },
    { code: '+595', label: 'Paraguay (+595)' },
    { code: '+51', label: 'Perú (+51)' },
    { code: '+1 787', label: 'Puerto Rico (+1 787)' },
    { code: '+1 809', label: 'República Dominicana (+1 809)' },
    { code: '+598', label: 'Uruguay (+598)' },
    { code: '+58', label: 'Venezuela (+58)' },
]

export const DEFAULT_PREFIX = '+34'

/**
 * Parse a stored phone string into (prefix, number).
 *
 * Convention: new entries are stored as "<prefix> <number>" (space-separated).
 * Legacy entries (no prefix, bare digits) fall back to DEFAULT_PREFIX with the
 * whole value as the number.
 *
 * Matches the longest prefix first so that "+1 809" wins over "+1".
 */
export function splitPhone(value: string | null | undefined): { prefix: string; number: string } {
    const trimmed = (value ?? '').trim()
    if (!trimmed) return { prefix: DEFAULT_PREFIX, number: '' }

    const codesByLength = PHONE_PREFIXES
        .map((p) => p.code)
        .sort((a, b) => b.length - a.length)

    for (const code of codesByLength) {
        if (trimmed === code) return { prefix: code, number: '' }
        if (trimmed.startsWith(code + ' ')) {
            return { prefix: code, number: trimmed.slice(code.length + 1).trim() }
        }
    }

    // Legacy / unknown — keep input as-is, default the prefix
    return { prefix: DEFAULT_PREFIX, number: trimmed }
}

/** Recompose a prefix + number into the storage format. */
export function joinPhone(prefix: string, number: string): string {
    const n = number.trim()
    return n ? `${prefix} ${n}` : prefix
}
