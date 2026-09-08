'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, UserCog } from 'lucide-react'

/**
 * Cambia el responsable de un lead **moviendo también su reunión** de Google.
 *
 * Usa `POST /api/leads/[id]/reassign`, no el `PATCH` de siempre: aquel solo cambia el nombre en la
 * ficha y deja el evento en el calendario de la persona anterior, con lo que el lead se queda con
 * un Meet que apunta a una reunión que ya no le corresponde.
 */
export function LeadAssigneeControl({
    leadId,
    currentAssigneeId,
    hasMeeting,
    members,
}: {
    leadId: string
    currentAssigneeId: string | null
    hasMeeting: boolean
    /**
     * Miembros del pool. `calendarActive` distingue a quién se le puede traspasar de verdad la
     * reunión: sin conexión activa no hay dónde crear el evento. Se listan igualmente los
     * inactivos porque el responsable actual puede tener el token caducado (en modo Testing
     * caducan cada 7 días) y, si no, su propio lead se vería como "Sin asignar".
     */
    members: { id: string; name: string; calendarActive?: boolean }[]
}) {
    const router = useRouter()
    const [value, setValue] = useState(currentAssigneeId ?? '')
    const [busy, setBusy] = useState(false)
    const [msg, setMsg] = useState<{ kind: 'ok' | 'warn' | 'error'; text: string } | null>(null)

    const dirty = value !== (currentAssigneeId ?? '') && value !== ''

    async function submit() {
        setBusy(true)
        setMsg(null)
        try {
            const res = await fetch(`/api/leads/${leadId}/reassign`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ to_user_id: value }),
            })
            const data = (await res.json().catch(() => ({}))) as { error?: string; movedEvent?: boolean }
            if (!res.ok) {
                setMsg({ kind: 'error', text: data.error ?? 'No se pudo reasignar' })
                return
            }
            /*
             * El endpoint puede devolver ok:true CON un aviso (p. ej. el calendario de origen ya no
             * está conectado y su evento sigue vivo). Pintarlo en verde como los demás hacía leer
             * "hay que cancelarlo a mano" como si todo hubiera ido bien.
             */
            setMsg(
                data.error
                    ? { kind: 'warn', text: data.error }
                    : {
                          kind: 'ok',
                          text: data.movedEvent
                              ? 'Reasignado y reunión movida al calendario del nuevo responsable.'
                              : 'Reasignado.',
                      },
            )
            router.refresh()
        } catch {
            setMsg({ kind: 'error', text: 'No se pudo conectar con el servidor' })
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
                <select
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    disabled={busy}
                    className="text-sm rounded-lg px-3 py-2 outline-none min-w-[200px]"
                    style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                    {/* Marcador de estado, no una acción: este control reasigna, y quitar el
                        responsable es otra operación (PATCH /api/leads/[id]). Deshabilitado para
                        no ofrecer un botón que nunca se activa. */}
                    <option value="" disabled>
                        Sin asignar
                    </option>
                    {members.map((m) => (
                        <option key={m.id} value={m.id}>
                            {m.name}
                            {m.calendarActive === false ? ' — sin calendario conectado' : ''}
                        </option>
                    ))}
                </select>

                <button
                    type="button"
                    onClick={submit}
                    disabled={!dirty || busy}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold"
                    style={{
                        background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                        color: '#fff',
                        opacity: !dirty || busy ? 0.45 : 1,
                        cursor: !dirty || busy ? 'not-allowed' : 'pointer',
                    }}
                >
                    {busy ? <Loader2 size={13} className="animate-spin" /> : <UserCog size={13} />}
                    {busy ? 'Moviendo…' : 'Reasignar'}
                </button>
            </div>

            {dirty && hasMeeting && members.find((m) => m.id === value)?.calendarActive === false && (
                <p className="text-[11.5px]" style={{ color: '#fbbf24' }}>
                    Esa persona no tiene Google Calendar conectado, así que la reunión no se podrá
                    mover a su calendario. Conéctalo antes de reasignar.
                </p>
            )}

            {dirty && hasMeeting && members.find((m) => m.id === value)?.calendarActive !== false && (
                <p className="text-[11.5px]" style={{ color: 'var(--text-secondary)', opacity: 0.8 }}>
                    La reunión se moverá al calendario del nuevo responsable. El lead recibirá la
                    cancelación de la actual y una invitación nueva con otro enlace de Meet.
                </p>
            )}

            {msg && (
                <p
                    className="text-[12px]"
                    style={{
                        color: msg.kind === 'ok' ? '#34d399' : msg.kind === 'warn' ? '#fbbf24' : '#fda4af',
                    }}
                >
                    {msg.text}
                </p>
            )}
        </div>
    )
}
