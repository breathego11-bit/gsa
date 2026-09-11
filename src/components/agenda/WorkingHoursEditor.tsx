'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, RotateCcw, AlertTriangle } from 'lucide-react'
import {
    WEEKDAYS,
    MAX_WINDOWS_PER_DAY,
    defaultWorkingHours,
    fromMinutes,
    hasAnySlot,
    slotsPerDay,
    timeOptions,
    toMinutes,
    validateWorkingHours,
    type TimeWindow,
    type WorkingHours,
} from '@/lib/calendar/working-hours'

/**
 * Editor del horario de atención: en qué tramos de cada día pueden aplica y VSL ofrecer reuniones.
 *
 * Los dos embudos piden la disponibilidad al mismo motor del LMS, así que aquí se cambian los dos a
 * la vez. La validación es la misma que aplica la API (`working-hours.ts`): se avisa antes de
 * guardar en lugar de devolver un error después.
 */
export function WorkingHoursEditor({
    initial,
    isCustom,
    tz,
}: {
    initial: WorkingHours
    isCustom: boolean
    tz: string
}) {
    const router = useRouter()
    const [hours, setHours] = useState<WorkingHours>(() => JSON.parse(JSON.stringify(initial)) as WorkingHours)
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
    const options = useMemo(timeOptions, [])

    const validation = validateWorkingHours(hours)
    const initialNorm = validateWorkingHours(initial)
    const dirty =
        validation.ok && initialNorm.ok
            ? JSON.stringify(validation.value) !== JSON.stringify(initialNorm.value)
            : true
    const weeklySlots = WEEKDAYS.reduce((n, { key }) => n + slotsPerDay(hours[key] ?? []), 0)

    function setDay(key: string, windows: TimeWindow[]) {
        setHours((h) => ({ ...h, [key]: windows }))
        setMsg(null)
    }

    function toggleDay(key: string) {
        const windows = hours[key] ?? []
        if (windows.length > 0) {
            setDay(key, [])
            return
        }
        // Al activar un día se copia el horario del primer día que ya tenga tramos: casi siempre se
        // quiere la misma jornada, y así no hay que volver a escribirla.
        const template = WEEKDAYS.map((w) => hours[w.key] ?? []).find((w) => w.length > 0)
        setDay(key, template ? template.map(([a, b]) => [a, b] as TimeWindow) : [['09:00', '13:00']])
    }

    function addWindow(key: string) {
        const windows = hours[key] ?? []
        const lastEnd = windows.length > 0 ? (toMinutes(windows[windows.length - 1][1]) ?? 9 * 60) : 8 * 60
        const start = Math.min(lastEnd + 60, 23 * 60)
        setDay(key, [...windows, [fromMinutes(start), fromMinutes(Math.min(start + 60, 24 * 60))]])
    }

    function updateWindow(key: string, i: number, which: 0 | 1, value: string) {
        const windows = (hours[key] ?? []).map((w) => [...w] as TimeWindow)
        windows[i][which] = value
        setDay(key, windows)
    }

    function removeWindow(key: string, i: number) {
        setDay(key, (hours[key] ?? []).filter((_, j) => j !== i))
    }

    async function persist(payload: WorkingHours | null) {
        setSaving(true)
        setMsg(null)
        try {
            const res = await fetch('/api/calendar/working-hours', {
                method: 'PUT',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ working_hours: payload }),
            })
            const data = (await res.json().catch(() => ({}))) as { error?: string }
            if (!res.ok) {
                setMsg({ kind: 'error', text: data.error ?? 'No se pudo guardar el horario.' })
                return
            }
            // Se deja en pantalla exactamente lo guardado (tramos ya ordenados por la validación),
            // para que no parezca que hay cambios pendientes tras guardar.
            setHours(payload === null ? defaultWorkingHours() : (JSON.parse(JSON.stringify(payload)) as WorkingHours))
            setMsg({ kind: 'ok', text: 'Horario guardado. Aplica y VSL ya ofrecen estos huecos.' })
            router.refresh()
        } catch {
            setMsg({ kind: 'error', text: 'No se pudo conectar con el servidor.' })
        } finally {
            setSaving(false)
        }
    }

    const select = 'text-xs rounded-md px-2 py-1.5 outline-none'
    const selectStyle = { background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }

    return (
        <div className="space-y-4">
            <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Horario para aplica y VSL
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Los dos formularios solo ofrecen reuniones dentro de estos tramos, y nunca encima de un
                    evento de tu calendario que te bloquee. Horas en <b>{tz}</b>.
                    {!isCustom && ' Ahora mismo usas el horario por defecto.'}
                </p>
            </div>

            <div className="space-y-2">
                {WEEKDAYS.map(({ key, label }) => {
                    const windows = hours[key] ?? []
                    const open = windows.length > 0
                    const slots = slotsPerDay(windows)
                    return (
                        <div
                            key={key}
                            className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 rounded-lg"
                            style={{ background: 'var(--bg-raised)' }}
                        >
                            <label className="flex items-center gap-2 w-32 cursor-pointer text-sm" style={{ color: 'var(--text-primary)' }}>
                                <input type="checkbox" checked={open} onChange={() => toggleDay(key)} />
                                {label}
                            </label>

                            {open ? (
                                <div className="flex flex-wrap items-center gap-2 flex-1">
                                    {windows.map(([a, b], i) => (
                                        <span key={i} className="inline-flex items-center gap-1">
                                            <select value={a} onChange={(e) => updateWindow(key, i, 0, e.target.value)} className={select} style={selectStyle}>
                                                {options.slice(0, -1).map((t) => (
                                                    <option key={t} value={t}>
                                                        {t}
                                                    </option>
                                                ))}
                                            </select>
                                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>–</span>
                                            <select value={b} onChange={(e) => updateWindow(key, i, 1, e.target.value)} className={select} style={selectStyle}>
                                                {options.slice(1).map((t) => (
                                                    <option key={t} value={t}>
                                                        {t}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => removeWindow(key, i)}
                                                aria-label={`Quitar tramo ${a}–${b}`}
                                                className="p-1 rounded"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </span>
                                    ))}
                                    {windows.length < MAX_WINDOWS_PER_DAY && (
                                        <button
                                            type="button"
                                            onClick={() => addWindow(key)}
                                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded"
                                            style={{ color: '#38bdf8' }}
                                        >
                                            <Plus size={12} /> Tramo
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <span className="flex-1 text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                                    Sin reuniones
                                </span>
                            )}

                            <span className="text-[11px] ml-auto" style={{ color: 'var(--text-secondary)' }}>
                                {open ? `${slots} ${slots === 1 ? 'hueco' : 'huecos'}` : ''}
                            </span>
                        </div>
                    )
                })}
            </div>

            {!validation.ok && (
                <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-lg text-[12.5px]" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#fda4af' }}>
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    {validation.error}
                </div>
            )}
            {validation.ok && !hasAnySlot(validation.value) && (
                <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-lg text-[12.5px]" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24' }}>
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    Con este horario, aplica y VSL no ofrecerán ningún hueco: nadie podrá agendar contigo.
                </div>
            )}
            {msg && (
                <p className="text-[12.5px]" style={{ color: msg.kind === 'ok' ? '#34d399' : '#fda4af' }}>
                    {msg.text}
                </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {weeklySlots} huecos de 30 min a la semana
                </span>
                <div className="flex gap-2">
                    {isCustom && (
                        <button
                            type="button"
                            onClick={() => persist(null)}
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold"
                            style={{ background: 'var(--bg-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                        >
                            <RotateCcw size={13} />
                            Volver al horario por defecto
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => validation.ok && persist(validation.value)}
                        disabled={!validation.ok || !dirty || saving}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold"
                        style={{
                            background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                            color: '#fff',
                            opacity: validation.ok && dirty && !saving ? 1 : 0.45,
                            cursor: validation.ok && dirty && !saving ? 'pointer' : 'not-allowed',
                        }}
                    >
                        {saving && <Loader2 size={13} className="animate-spin" />}
                        {saving ? 'Guardando…' : 'Guardar horario'}
                    </button>
                </div>
            </div>
        </div>
    )
}
