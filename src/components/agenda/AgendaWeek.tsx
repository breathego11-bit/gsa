'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { MIN_VISUAL_MIN, type AgendaSegment, type AgendaWeek as AgendaWeekModel } from '@/lib/calendar/agenda-model'

/** Escala vertical de la rejilla: 1 hora = 48 px. */
const PX_PER_MIN = 0.8
/** Al pulsar un hueco vacío, la hora se redondea a la media hora. */
const SNAP_MIN = 30

function fmtMin(total: number): string {
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

interface Draft {
    date: string
    start: string
    end: string
}

/**
 * Rejilla semanal de la agenda.
 *
 * Detrás de los eventos va sombreado el horario de atención: franja sombreada sin evento encima =
 * hueco que aplica y VSL pueden ofrecer a un lead. Así se ve de un vistazo qué le queda libre a
 * Iván sin tener que cruzar mentalmente su horario con su calendario.
 */
export function AgendaWeek({ week, canCreate }: { week: AgendaWeekModel; canCreate: boolean }) {
    const [draft, setDraft] = useState<Draft | null>(null)

    const height = (week.endMin - week.startMin) * PX_PER_MIN
    const hourMarks: number[] = []
    for (let m = week.startMin; m <= week.endMin; m += 60) hourMarks.push(m)
    const hasAllDay = week.days.some((d) => d.allDay.length > 0)
    const firstDay = week.days.find((d) => d.isToday)?.ymd ?? week.days[0].ymd

    function openAt(ymd: string, minute: number) {
        if (!canCreate) return
        const start = Math.min(Math.max(0, Math.floor(minute / SNAP_MIN) * SNAP_MIN), 23 * 60 + 30)
        // Tope en 23:59 y no en 24:00: `<input type="time">` no sabe mostrar "24:00" y dejaba el
        // campo de fin en blanco al pulsar en las filas de las 23:00 o 23:30.
        setDraft({ date: ymd, start: fmtMin(start), end: fmtMin(Math.min(start + 60, 24 * 60 - 1)) })
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Link href={`/admin/agenda?week=${week.prevWeek}`} className="inline-flex items-center justify-center h-8 min-w-8 rounded-lg transition-colors" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }} aria-label="Semana anterior">
                        <ChevronLeft size={16} />
                    </Link>
                    <Link href="/admin/agenda" className="inline-flex items-center justify-center h-8 min-w-8 rounded-lg transition-colors px-3 text-xs font-semibold" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                        Hoy
                    </Link>
                    <Link href={`/admin/agenda?week=${week.nextWeek}`} className="inline-flex items-center justify-center h-8 min-w-8 rounded-lg transition-colors" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }} aria-label="Semana siguiente">
                        <ChevronRight size={16} />
                    </Link>
                    <span className="ml-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {week.rangeLabel}
                    </span>
                </div>
                {canCreate && (
                    <button
                        type="button"
                        onClick={() => setDraft({ date: firstDay, start: '09:00', end: '10:00' })}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold"
                        style={{ background: 'linear-gradient(135deg, #38bdf8, #818cf8)', color: '#fff' }}
                    >
                        <Plus size={14} />
                        Nuevo evento
                    </button>
                )}
            </div>

            {/* En móvil los 7 días no caben: la rejilla se desplaza en horizontal dentro de su caja. */}
            <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
                <div className="min-w-[760px]">
                    {/* Cabecera de días */}
                    <div className="grid" style={{ gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
                        <div />
                        {week.days.map((d) => (
                            <div
                                key={d.ymd}
                                className="py-2 text-center text-xs font-semibold"
                                style={{ color: d.isToday ? '#38bdf8' : 'var(--text-secondary)' }}
                            >
                                {d.label}
                            </div>
                        ))}
                    </div>

                    {/* Eventos de día completo */}
                    {hasAllDay && (
                        <div className="grid" style={{ gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
                            <div className="text-[10px] px-1 py-1.5" style={{ color: 'var(--text-secondary)' }}>
                                Todo el día
                            </div>
                            {week.days.map((d) => (
                                <div key={d.ymd} className="p-1 space-y-1" style={{ borderLeft: '1px solid var(--border)' }}>
                                    {d.allDay.map((ev) => (
                                        <EventLink key={ev.id} leadId={ev.leadId} htmlLink={ev.htmlLink}>
                                            <div
                                                className="truncate rounded px-1.5 py-0.5 text-[11px]"
                                                style={eventStyle(Boolean(ev.leadId), ev.busy)}
                                                title={ev.title}
                                            >
                                                {ev.title}
                                            </div>
                                        </EventLink>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Cuerpo horario */}
                    <div className="grid" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
                        <div className="relative" style={{ height }}>
                            {hourMarks.map((m) => (
                                <span
                                    key={m}
                                    className="absolute right-1.5 -translate-y-1/2 text-[10px]"
                                    style={{ top: (m - week.startMin) * PX_PER_MIN, color: 'var(--text-secondary)' }}
                                >
                                    {m < 24 * 60 ? fmtMin(m) : ''}
                                </span>
                            ))}
                        </div>

                        {week.days.map((d) => (
                            <div
                                key={d.ymd}
                                className="relative"
                                style={{
                                    height,
                                    borderLeft: '1px solid var(--border)',
                                    cursor: canCreate ? 'pointer' : 'default',
                                    background: d.isToday ? 'rgba(56,189,248,0.03)' : undefined,
                                }}
                                // Clic en un hueco vacío = nuevo evento a esa hora. Solo cuenta el clic
                                // sobre la propia columna; los eventos tienen su propio enlace.
                                onClick={(e) => {
                                    if (e.target !== e.currentTarget) return
                                    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
                                    openAt(d.ymd, week.startMin + y / PX_PER_MIN)
                                }}
                            >
                                {/* Líneas de hora y sombreado del horario: sin eventos de ratón, para
                                    que el clic llegue a la columna. */}
                                {hourMarks.map((m) => (
                                    <div
                                        key={m}
                                        className="absolute inset-x-0 pointer-events-none"
                                        style={{ top: (m - week.startMin) * PX_PER_MIN, borderTop: '1px solid var(--border)', opacity: 0.5 }}
                                    />
                                ))}
                                {d.windows.map(([a, b]) => (
                                    <div
                                        key={`${a}-${b}`}
                                        className="absolute inset-x-0 pointer-events-none"
                                        style={{
                                            top: (Math.max(a, week.startMin) - week.startMin) * PX_PER_MIN,
                                            height: (Math.min(b, week.endMin) - Math.max(a, week.startMin)) * PX_PER_MIN,
                                            background: 'rgba(52,211,153,0.07)',
                                            borderLeft: '2px solid rgba(52,211,153,0.35)',
                                        }}
                                    />
                                ))}
                                {d.segments.map((seg) => (
                                    <SegmentBlock key={`${seg.id}-${seg.startMin}`} seg={seg} startMin={week.startMin} />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                <Legend swatch={{ background: 'rgba(52,211,153,0.15)', borderLeft: '2px solid rgba(52,211,153,0.6)' }}>
                    Horario en que aplica y VSL ofrecen reuniones
                </Legend>
                <Legend swatch={eventStyle(true, true)}>Reunión de un lead (abre su ficha)</Legend>
                <Legend swatch={eventStyle(false, true)}>Evento de tu calendario</Legend>
                <Legend swatch={eventStyle(false, false)}>No bloquea: un lead puede reservar encima</Legend>
            </div>

            {draft && <CreateEventModal draft={draft} onClose={() => setDraft(null)} />}
        </div>
    )
}

function eventStyle(isLead: boolean, busy: boolean): React.CSSProperties {
    if (!busy) {
        return { background: 'transparent', border: '1px dashed rgba(148,163,184,0.6)', color: 'var(--text-secondary)' }
    }
    return isLead
        ? { background: 'rgba(56,189,248,0.2)', border: '1px solid rgba(56,189,248,0.6)', color: 'var(--text-primary)' }
        : { background: 'rgba(129,140,248,0.18)', border: '1px solid rgba(129,140,248,0.5)', color: 'var(--text-primary)' }
}

function SegmentBlock({ seg, startMin }: { seg: AgendaSegment; startMin: number }) {
    const top = (seg.startMin - startMin) * PX_PER_MIN
    const heightPx = Math.max(seg.endMin - seg.startMin, MIN_VISUAL_MIN) * PX_PER_MIN
    return (
        <EventLink leadId={seg.leadId} htmlLink={seg.htmlLink}>
            <div
                className="absolute overflow-hidden rounded-md px-1.5 py-0.5 text-[11px] leading-tight"
                style={{
                    top,
                    height: heightPx,
                    left: `calc(${(seg.col / seg.cols) * 100}% + 2px)`,
                    width: `calc(${100 / seg.cols}% - 4px)`,
                    ...eventStyle(Boolean(seg.leadId), seg.busy),
                }}
                title={`${seg.title} · ${seg.timeLabel}`}
            >
                <div className="truncate font-semibold">{seg.title}</div>
                {heightPx >= 30 && <div className="truncate opacity-75">{seg.timeLabel}</div>}
            </div>
        </EventLink>
    )
}

/** Las reuniones de leads abren su ficha del CRM; el resto, el evento en Google Calendar. */
function EventLink({ leadId, htmlLink, children }: { leadId: string | null; htmlLink: string; children: React.ReactNode }) {
    if (leadId) return <Link href={`/admin/leads/${leadId}`}>{children}</Link>
    if (htmlLink) {
        return (
            <a href={htmlLink} target="_blank" rel="noopener noreferrer">
                {children}
            </a>
        )
    }
    return <>{children}</>
}

function Legend({ swatch, children }: { swatch: React.CSSProperties; children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-3 rounded-sm" style={swatch} />
            {children}
        </span>
    )
}

function CreateEventModal({ draft, onClose }: { draft: Draft; onClose: () => void }) {
    const router = useRouter()
    const [summary, setSummary] = useState('')
    const [date, setDate] = useState(draft.date)
    const [start, setStart] = useState(draft.start)
    const [end, setEnd] = useState(draft.end)
    const [description, setDescription] = useState('')
    const [blocks, setBlocks] = useState(true)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    // `<input type="time">` devuelve "HH:mm", así que la comparación de texto ordena bien.
    const valid = summary.trim() !== '' && date !== '' && start !== '' && end !== '' && end > start

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        if (!valid || busy) return
        setBusy(true)
        setError('')
        try {
            const res = await fetch('/api/calendar/events', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ summary, date, start, end, description, blocks_agenda: blocks }),
            })
            const data = (await res.json().catch(() => ({}))) as { error?: string }
            if (!res.ok) {
                setError(data.error ?? 'No se pudo crear el evento.')
                return
            }
            onClose()
            router.refresh()
        } catch {
            setError('No se pudo conectar con el servidor.')
        } finally {
            setBusy(false)
        }
    }

    const field = 'w-full text-sm rounded-lg px-3 py-2 outline-none'
    const fieldStyle = { background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }

    return (
        <Modal open onClose={() => !busy && onClose()} title="Nuevo evento" size="md">
            <form onSubmit={submit} className="space-y-3.5 text-sm">
                <input
                    autoFocus
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Título"
                    maxLength={200}
                    className={field}
                    style={fieldStyle}
                />
                <div className="grid grid-cols-3 gap-2">
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} style={fieldStyle} />
                    <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={field} style={fieldStyle} />
                    <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={field} style={fieldStyle} />
                </div>
                {start && end && end <= start && (
                    <p className="text-[12px]" style={{ color: '#fbbf24' }}>
                        La hora de fin debe ser posterior a la de inicio.
                    </p>
                )}
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descripción (opcional)"
                    rows={3}
                    maxLength={2000}
                    className={`${field} resize-none`}
                    style={fieldStyle}
                />
                <label className="flex items-start gap-2.5 cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={blocks} onChange={(e) => setBlocks(e.target.checked)} className="mt-0.5" />
                    <span className="text-[12.5px]">
                        <b style={{ color: 'var(--text-primary)' }}>Bloquea mi agenda para leads.</b> Desmárcalo para un
                        recordatorio o algo informativo: se verá en tu calendario pero aplica y VSL seguirán
                        ofreciendo ese hueco.
                    </span>
                </label>

                {error && (
                    <div
                        className="px-3.5 py-2.5 rounded-lg text-[12.5px]"
                        style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#fda4af' }}
                    >
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="px-4 py-2 rounded-lg text-xs font-semibold"
                        style={{ background: 'var(--bg-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={!valid || busy}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold"
                        style={{
                            background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                            color: '#fff',
                            opacity: valid && !busy ? 1 : 0.45,
                            cursor: valid && !busy ? 'pointer' : 'not-allowed',
                        }}
                    >
                        {busy && <Loader2 size={13} className="animate-spin" />}
                        {busy ? 'Creando…' : 'Crear evento'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}
