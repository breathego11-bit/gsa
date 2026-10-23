'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CircleDot } from 'lucide-react'
import type { LeadStatus } from '@prisma/client'
import { LEAD_STATUSES, LEAD_STATUS_META } from '@/lib/leads/display'

/**
 * Cambia el estado de un lead con `PATCH /api/leads/[id]`.
 *
 * El closer solo puede tocar los leads que tiene asignados: eso lo decide la API, no este
 * componente, así que un 403 se muestra tal cual en vez de esconderse.
 */
export function LeadStatusControl({ leadId, current }: { leadId: string; current: LeadStatus }) {
    const router = useRouter()
    const [value, setValue] = useState<LeadStatus>(current)
    const [busy, setBusy] = useState(false)
    const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

    async function save(next: LeadStatus) {
        const prev = value
        setValue(next) // optimista: el <select> no se queda atrás mientras viaja la petición
        setBusy(true)
        setMsg(null)
        try {
            const res = await fetch(`/api/leads/${leadId}`, {
                method: 'PATCH',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ status: next }),
            })
            const data = (await res.json().catch(() => ({}))) as { error?: string }
            if (!res.ok) {
                setValue(prev)
                setMsg({ kind: 'error', text: data.error ?? 'No se pudo cambiar el estado' })
                return
            }
            setMsg({ kind: 'ok', text: `Estado: ${LEAD_STATUS_META[next].label}` })
            router.refresh()
        } catch {
            setValue(prev)
            setMsg({ kind: 'error', text: 'No se pudo cambiar el estado' })
        } finally {
            setBusy(false)
        }
    }

    return (
        <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
                Estado
            </p>
            <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                    <select
                        value={value}
                        disabled={busy}
                        onChange={(e) => save(e.target.value as LeadStatus)}
                        className="appearance-none text-sm rounded-lg py-2 pl-9 pr-8 disabled:opacity-60"
                        style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    >
                        {LEAD_STATUSES.map((s) => (
                            <option key={s} value={s}>
                                {LEAD_STATUS_META[s].label}
                            </option>
                        ))}
                    </select>
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        {busy ? (
                            <Loader2 size={14} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
                        ) : (
                            <CircleDot size={14} style={{ color: LEAD_STATUS_META[value].color }} />
                        )}
                    </span>
                </div>
                {msg && (
                    <span className="text-xs" style={{ color: msg.kind === 'ok' ? '#34d399' : '#f87171' }}>
                        {msg.text}
                    </span>
                )}
            </div>
            <p className="text-xs mt-2.5" style={{ color: 'var(--text-secondary)' }}>
                Marca <strong>Contactado</strong> en cuanto le escribas y <strong>Descartado</strong> si no encaja, para
                que el equipo vea en qué va cada lead.
            </p>
        </div>
    )
}
