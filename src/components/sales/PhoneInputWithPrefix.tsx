'use client'

import { useEffect, useState } from 'react'
import { PHONE_PREFIXES, splitPhone, joinPhone } from '@/lib/phone-prefixes'

interface Props {
    value: string
    onChange: (combined: string) => void
    required?: boolean
    placeholder?: string
}

export function PhoneInputWithPrefix({ value, onChange, required, placeholder }: Props) {
    const parsed = splitPhone(value)
    const [prefix, setPrefix] = useState(parsed.prefix)
    const [number, setNumber] = useState(parsed.number)

    // Re-sync when the parent updates `value` from outside (modal reopens with a different sale)
    useEffect(() => {
        const p = splitPhone(value)
        setPrefix(p.prefix)
        setNumber(p.number)
    }, [value])

    function emit(nextPrefix: string, nextNumber: string) {
        onChange(joinPhone(nextPrefix, nextNumber))
    }

    return (
        <div className="flex gap-2">
            <select
                value={prefix}
                onChange={(e) => {
                    setPrefix(e.target.value)
                    emit(e.target.value, number)
                }}
                className="form-input"
                style={{ width: 120, flexShrink: 0, paddingLeft: 12, paddingRight: 8 }}
                aria-label="Prefijo de país"
            >
                {PHONE_PREFIXES.map((p) => (
                    <option key={p.code} value={p.code}>
                        {p.code}
                    </option>
                ))}
            </select>
            <input
                type="tel"
                value={number}
                onChange={(e) => {
                    setNumber(e.target.value)
                    emit(prefix, e.target.value)
                }}
                required={required}
                placeholder={placeholder ?? '612 345 678'}
                className="form-input flex-1"
                inputMode="tel"
                autoComplete="tel-national"
            />
        </div>
    )
}
