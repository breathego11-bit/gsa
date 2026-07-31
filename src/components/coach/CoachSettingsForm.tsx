'use client'

import { useMemo, useRef, useState } from 'react'
import {
    Save,
    Loader2,
    Check,
    Plus,
    X,
    FileText,
    ChevronDown,
    ChevronUp,
    RotateCcw,
    History,
    AlertTriangle,
    Search,
} from 'lucide-react'
import type { CoachPromptBreakdown } from '@/lib/coach/prompt'

interface VersionRow {
    id: string
    created_at: string
    chars: number
}

/**
 * Las instrucciones se guardan en `CoachSetting.extra_instructions` como una línea por
 * instrucción, no como JSON. Así el texto almacenado es EXACTAMENTE el que recibe el
 * system prompt: no hay serialización que pueda acabar colándose en el prompt si algo
 * falla, y el contenido libre que ya hubiera guardado aparece como sus líneas.
 */
function parseInstructions(raw: string): string[] {
    return raw
        .split('\n')
        .map((l) => l.replace(/^\s*[-•]\s*/, '').trim())
        .filter(Boolean)
}

/** ~3,6 caracteres por token en español. Misma constante que usa el servidor. */
const estimate = (text: string) => Math.ceil(text.length / 3.6)
const fmt = (n: number) => n.toLocaleString('es-ES')

export function CoachSettingsForm({
    initial,
    breakdown,
    methodology,
    methodologyEdited,
    factoryChars,
    model,
}: {
    initial: string
    breakdown: CoachPromptBreakdown
    methodology: string
    /** ¿El método activo es una edición del panel, o el original del build? */
    methodologyEdited: boolean
    factoryChars: number
    model: string
}) {
    const [items, setItems] = useState<string[]>(() => parseInstructions(initial))
    const [draft, setDraft] = useState('')
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
    const [showDoc, setShowDoc] = useState(false)

    // ── Documento maestro ──
    const [doc, setDoc] = useState(methodology)
    const [docSaved, setDocSaved] = useState(methodology)
    const [edited, setEdited] = useState(methodologyEdited)
    const [docStatus, setDocStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
    const [docError, setDocError] = useState<string | null>(null)
    const [versions, setVersions] = useState<VersionRow[] | null>(null)
    const [showVersions, setShowVersions] = useState(false)

    // ── Buscador dentro del documento ──
    // Un <textarea> no admite resaltado, así que la navegación se hace seleccionando la
    // coincidencia: el propio navegador desplaza la vista hasta la selección.
    const docRef = useRef<HTMLTextAreaElement>(null)
    const [query, setQuery] = useState('')
    const [matchIdx, setMatchIdx] = useState(0)

    const matches = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (q.length < 2) return [] as number[]
        const hay = doc.toLowerCase()
        const out: number[] = []
        let from = 0
        while (out.length < 500) {
            const i = hay.indexOf(q, from)
            if (i === -1) break
            out.push(i)
            from = i + q.length
        }
        return out
    }, [doc, query])

    function goToMatch(next: number) {
        if (matches.length === 0) return
        const idx = (next + matches.length) % matches.length
        setMatchIdx(idx)
        const el = docRef.current
        if (!el) return
        const start = matches[idx]
        el.focus()
        el.setSelectionRange(start, start + query.trim().length)
        // Centrar la coincidencia: el scroll del textarea no sigue a setSelectionRange.
        const before = doc.slice(0, start).split('\n').length - 1
        const lineHeight = el.scrollHeight / Math.max(1, doc.split('\n').length)
        el.scrollTop = Math.max(0, before * lineHeight - el.clientHeight / 2)
    }

    const docDirty = doc.trim() !== docSaved.trim()
    // Un recorte brusco casi siempre es un borrado accidental, no una edición deliberada.
    const bigShrink = docDirty && doc.length < docSaved.length * 0.5

    async function saveDoc(payload: { methodology?: string; restore_factory?: boolean }) {
        setDocStatus('saving')
        setDocError(null)
        try {
            const res = await fetch('/api/admin/coach-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) {
                setDocError(json.error ?? 'No se pudo guardar el documento.')
                setDocStatus('idle')
                return
            }
            setDoc(json.methodology)
            setDocSaved(json.methodology)
            setEdited(Boolean(json.methodology_edited))
            setVersions(null) // el historial cambió; se recarga al abrirlo
            setDocStatus('saved')
            setTimeout(() => setDocStatus('idle'), 2500)
        } catch {
            setDocError('Error de red al guardar.')
            setDocStatus('idle')
        }
    }

    async function loadVersions() {
        const next = !showVersions
        setShowVersions(next)
        if (!next || versions) return
        try {
            const res = await fetch('/api/admin/coach-settings/versions')
            const json = await res.json()
            setVersions(json.versions ?? [])
        } catch {
            setVersions([])
        }
    }

    async function restoreVersion(id: string) {
        setDocStatus('saving')
        try {
            const res = await fetch('/api/admin/coach-settings/versions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            })
            const json = await res.json()
            if (res.ok) {
                setDoc(json.methodology)
                setDocSaved(json.methodology)
                setEdited(true)
                setVersions(null)
            }
        } finally {
            setDocStatus('idle')
        }
    }
    // Referencia de lo último persistido. `initial` viene del render del servidor y no cambia
    // al guardar, así que sin esto el aviso de "cambios sin guardar" se quedaría pegado.
    const [saved, setSaved] = useState(() => parseInstructions(initial).join('\n'))

    const joined = useMemo(() => items.join('\n'), [items])
    const dirty = joined !== saved

    // Se recalcula en vivo (documento + instrucciones) para ver el impacto en tokens sin
    // tener que guardar. El andamiaje del prompt es lo único fijo.
    const liveInstructionTokens = estimate(joined)
    const liveMethodologyTokens = estimate(doc)
    const liveSystemTokens =
        liveMethodologyTokens + breakdown.framingTokens + liveInstructionTokens
    const liveTranscript = Math.max(
        0,
        breakdown.tpmLimit - liveSystemTokens - breakdown.outputReserve,
    )
    const liveMinutes = Math.round(
        Math.min(liveTranscript * 3.6, breakdown.maxInputChars) / breakdown.charsPerMinute,
    )

    function addDraft() {
        const v = draft.trim()
        if (!v) return
        setItems((prev) => [...prev, v])
        setDraft('')
    }

    async function save() {
        setStatus('saving')
        try {
            const res = await fetch('/api/admin/coach-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ extra_instructions: joined }),
            })
            setStatus(res.ok ? 'saved' : 'error')
            if (res.ok) {
                setSaved(joined)
                setTimeout(() => setStatus('idle'), 2500)
            }
        } catch {
            setStatus('error')
        }
    }

    return (
        <div className="max-w-3xl flex flex-col gap-6">
            {/* ── Con qué se alimenta el coach ───────────────────────── */}
            <section
                className="rounded-2xl p-5"
                style={{
                    background: 'linear-gradient(180deg, rgba(20,25,38,0.7), rgba(14,19,30,0.7))',
                    border: '1px solid rgba(129,140,248,0.18)',
                }}
            >
                <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                    <div>
                        <div
                            className="text-[10px] mb-1"
                            style={{
                                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                letterSpacing: 1.4,
                                color: '#38bdf8',
                            }}
                        >
                            CON QUÉ SE ALIMENTA EL COACH
                        </div>
                        <div className="text-[15px] font-semibold" style={{ color: '#dee2f2' }}>
                            Lo que se envía en cada evaluación
                        </div>
                    </div>
                    <span
                        className="text-[10.5px] px-2.5 py-1 rounded-full shrink-0"
                        style={{
                            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                            background: 'rgba(56,189,248,0.12)',
                            border: '1px solid rgba(56,189,248,0.3)',
                            color: '#38bdf8',
                        }}
                    >
                        {model}
                    </span>
                </div>

                <div className="flex flex-col gap-1.5">
                    <TokenRow
                        label="Documento maestro del método"
                        sub={
                            edited
                                ? 'Editado desde el panel · las 9 fases, la rúbrica y los ejemplos'
                                : 'Original de fábrica · las 9 fases, la rúbrica y los ejemplos'
                        }
                        tokens={liveMethodologyTokens}
                        total={liveSystemTokens}
                        color="#818cf8"
                    />
                    <TokenRow
                        label="Instrucciones adicionales"
                        sub={`${items.length} ${items.length === 1 ? 'instrucción' : 'instrucciones'}`}
                        tokens={liveInstructionTokens}
                        total={liveSystemTokens}
                        color="#34d399"
                    />
                    <TokenRow
                        label="Encuadre y reglas de operación"
                        sub="Formato de respuesta, tono, seguridad"
                        tokens={breakdown.framingTokens}
                        total={liveSystemTokens}
                        color="#7a8094"
                    />
                </div>

                <div
                    className="flex items-center justify-between gap-3 mt-3 pt-3 flex-wrap"
                    style={{ borderTop: '1px solid rgba(129,140,248,0.14)' }}
                >
                    <span className="text-[13px] font-semibold" style={{ color: '#dee2f2' }}>
                        Total en cada evaluación
                    </span>
                    <span
                        className="text-[15px] font-semibold"
                        style={{
                            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                            color: '#dee2f2',
                        }}
                    >
                        {fmt(liveSystemTokens)} tokens
                    </span>
                </div>

                <p
                    className="text-[12.5px] leading-relaxed mt-3 p-3 rounded-xl"
                    style={{
                        background: 'rgba(8,13,24,0.5)',
                        border: '1px solid rgba(129,140,248,0.12)',
                        color: '#9ca3b8',
                    }}
                >
                    Con el límite actual de la cuenta ({fmt(breakdown.tpmLimit)} tokens/min) quedan{' '}
                    <strong style={{ color: '#dee2f2' }}>{fmt(liveTranscript)} tokens</strong> libres
                    para la transcripción del alumno, es decir llamadas de hasta{' '}
                    <strong style={{ color: '#34d399' }}>
                        ~{liveMinutes >= 60 ? `${(liveMinutes / 60).toFixed(1)} h` : `${liveMinutes} min`}
                    </strong>
                    . Cuanto más largas sean las instrucciones, menos llamada cabe.
                </p>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <button
                        type="button"
                        onClick={() => setShowDoc((v) => !v)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] cursor-pointer"
                        style={{
                            background: 'rgba(129,140,248,0.08)',
                            border: '1px solid rgba(129,140,248,0.2)',
                            color: '#c7cede',
                        }}
                    >
                        <FileText size={14} />
                        {showDoc ? 'Cerrar' : 'Ver y editar'} el documento maestro
                        <ChevronDown
                            size={14}
                            style={{
                                transform: showDoc ? 'rotate(180deg)' : 'none',
                                transition: 'transform .15s',
                            }}
                        />
                    </button>
                    {edited && (
                        <span
                            className="text-[10.5px] px-2.5 py-1 rounded-full"
                            style={{
                                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                background: 'rgba(251,191,36,0.12)',
                                border: '1px solid rgba(251,191,36,0.3)',
                                color: '#fbbf24',
                            }}
                        >
                            EDITADO
                        </span>
                    )}
                </div>

                {showDoc && (
                    <div className="mt-3">
                        {/* Buscador */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <div
                                className="flex items-center gap-2 px-3 rounded-xl flex-1 min-w-[200px]"
                                style={{
                                    background: '#0e131e',
                                    border: '1px solid rgba(129,140,248,0.2)',
                                }}
                            >
                                <Search size={14} style={{ color: '#5a6178' }} className="shrink-0" />
                                <input
                                    value={query}
                                    onChange={(e) => {
                                        setQuery(e.target.value)
                                        setMatchIdx(0)
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            goToMatch(e.shiftKey ? matchIdx - 1 : matchIdx + (matches.length && matchIdx === 0 ? 0 : 1))
                                        }
                                        if (e.key === 'Escape') setQuery('')
                                    }}
                                    placeholder="Buscar en el documento… (Enter para ir, Shift+Enter atrás)"
                                    className="flex-1 min-w-0 bg-transparent outline-none py-2.5 text-base sm:text-[13px]"
                                    style={{ color: '#dee2f2' }}
                                />
                                {query.trim().length >= 2 && (
                                    <span
                                        className="shrink-0 text-[11.5px]"
                                        style={{
                                            fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                            color: matches.length ? '#38bdf8' : '#f87171',
                                        }}
                                    >
                                        {matches.length ? `${matchIdx + 1}/${matches.length}` : '0'}
                                    </span>
                                )}
                                {query && (
                                    <button
                                        type="button"
                                        onClick={() => setQuery('')}
                                        aria-label="Limpiar búsqueda"
                                        className="shrink-0 cursor-pointer"
                                        style={{ color: '#5a6178' }}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => goToMatch(matchIdx - 1)}
                                    disabled={matches.length === 0}
                                    aria-label="Coincidencia anterior"
                                    className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center"
                                    style={{
                                        background: 'rgba(129,140,248,0.08)',
                                        border: '1px solid rgba(129,140,248,0.2)',
                                        color: '#c7cede',
                                        opacity: matches.length ? 1 : 0.4,
                                        cursor: matches.length ? 'pointer' : 'not-allowed',
                                    }}
                                >
                                    <ChevronUp size={15} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => goToMatch(matchIdx + 1)}
                                    disabled={matches.length === 0}
                                    aria-label="Coincidencia siguiente"
                                    className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center"
                                    style={{
                                        background: 'rgba(129,140,248,0.08)',
                                        border: '1px solid rgba(129,140,248,0.2)',
                                        color: '#c7cede',
                                        opacity: matches.length ? 1 : 0.4,
                                        cursor: matches.length ? 'pointer' : 'not-allowed',
                                    }}
                                >
                                    <ChevronDown size={15} />
                                </button>
                            </div>
                        </div>

                        <textarea
                            ref={docRef}
                            value={doc}
                            onChange={(e) => setDoc(e.target.value)}
                            spellCheck={false}
                            className="w-full resize-y rounded-xl p-4 outline-none text-[11.5px] leading-relaxed"
                            style={{
                                background: '#080d18',
                                border: `1px solid ${docDirty ? 'rgba(251,191,36,0.4)' : 'rgba(129,140,248,0.15)'}`,
                                color: '#c7cede',
                                minHeight: 420,
                                fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                            }}
                        />

                        <div
                            className="flex items-center justify-between gap-2 mt-1.5 flex-wrap text-[11.5px]"
                            style={{ color: '#5a6178' }}
                        >
                            <span style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}>
                                {fmt(doc.length)} caracteres · {fmt(liveMethodologyTokens)} tokens
                            </span>
                            <span>
                                Los cambios afectan a las evaluaciones que se hagan a partir de
                                guardarlos.
                            </span>
                        </div>

                        {bigShrink && (
                            <div
                                className="flex items-start gap-2 mt-2 px-3 py-2.5 rounded-xl text-[12.5px]"
                                style={{
                                    background: 'rgba(251,191,36,0.1)',
                                    border: '1px solid rgba(251,191,36,0.3)',
                                    color: '#fbbf24',
                                }}
                            >
                                <AlertTriangle size={15} className="shrink-0 mt-px" />
                                <span>
                                    Vas a reducir el documento a menos de la mitad ({fmt(docSaved.length)}{' '}
                                    → {fmt(doc.length)} caracteres). Si no era intencionado, revísalo
                                    antes de guardar. Podrás volver atrás desde el historial.
                                </span>
                            </div>
                        )}

                        {docError && (
                            <div className="mt-2 text-[12.5px]" style={{ color: '#f87171' }}>
                                {docError}
                            </div>
                        )}

                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <button
                                type="button"
                                onClick={() => saveDoc({ methodology: doc })}
                                disabled={!docDirty || docStatus === 'saving'}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold"
                                style={{
                                    background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
                                    color: '#fff',
                                    opacity: !docDirty || docStatus === 'saving' ? 0.5 : 1,
                                    cursor:
                                        !docDirty || docStatus === 'saving' ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {docStatus === 'saving' ? (
                                    <Loader2 size={15} className="animate-spin" />
                                ) : (
                                    <Save size={15} />
                                )}
                                Guardar documento
                            </button>

                            {docDirty && (
                                <button
                                    type="button"
                                    onClick={() => setDoc(docSaved)}
                                    className="px-3 py-2.5 rounded-xl text-[12.5px] cursor-pointer"
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid rgba(129,140,248,0.22)',
                                        color: '#9ca3b8',
                                    }}
                                >
                                    Descartar cambios
                                </button>
                            )}

                            {edited && (
                                <button
                                    type="button"
                                    onClick={() => saveDoc({ restore_factory: true })}
                                    disabled={docStatus === 'saving'}
                                    title={`Vuelve al documento original (${fmt(factoryChars)} caracteres)`}
                                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12.5px] cursor-pointer"
                                    style={{
                                        background: 'rgba(239,68,68,0.08)',
                                        border: '1px solid rgba(239,68,68,0.25)',
                                        color: '#f87171',
                                    }}
                                >
                                    <RotateCcw size={14} /> Restaurar original
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={loadVersions}
                                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12.5px] cursor-pointer"
                                style={{
                                    background: 'transparent',
                                    border: '1px solid rgba(129,140,248,0.22)',
                                    color: '#9ca3b8',
                                }}
                            >
                                <History size={14} /> Historial
                            </button>

                            {docStatus === 'saved' && (
                                <span
                                    className="flex items-center gap-1.5 text-[12.5px]"
                                    style={{ color: '#34d399' }}
                                >
                                    <Check size={14} /> Documento guardado.
                                </span>
                            )}
                        </div>

                        {showVersions && (
                            <div
                                className="mt-3 rounded-xl overflow-hidden"
                                style={{ border: '1px solid rgba(129,140,248,0.15)' }}
                            >
                                <div
                                    className="px-3.5 py-2 text-[10px]"
                                    style={{
                                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                        letterSpacing: 1.2,
                                        color: '#5a6178',
                                        background: 'rgba(8,13,24,0.5)',
                                    }}
                                >
                                    VERSIONES ANTERIORES
                                </div>
                                {versions === null && (
                                    <div className="px-3.5 py-3 text-[12.5px]" style={{ color: '#5a6178' }}>
                                        Cargando…
                                    </div>
                                )}
                                {versions?.length === 0 && (
                                    <div className="px-3.5 py-3 text-[12.5px]" style={{ color: '#5a6178' }}>
                                        Todavía no hay versiones anteriores. Se guarda una cada vez que
                                        cambias el documento.
                                    </div>
                                )}
                                {versions?.map((v) => (
                                    <div
                                        key={v.id}
                                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 flex-wrap"
                                        style={{ borderTop: '1px solid rgba(129,140,248,0.1)' }}
                                    >
                                        <span className="text-[12.5px]" style={{ color: '#c7cede' }}>
                                            {new Date(v.created_at).toLocaleString('es-ES', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                            <span className="ml-2" style={{ color: '#5a6178' }}>
                                                {fmt(v.chars)} caracteres
                                            </span>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => restoreVersion(v.id)}
                                            className="px-3 py-1.5 rounded-lg text-[12px] cursor-pointer shrink-0"
                                            style={{
                                                background: 'rgba(129,140,248,0.1)',
                                                border: '1px solid rgba(129,140,248,0.25)',
                                                color: '#c7cede',
                                            }}
                                        >
                                            Restaurar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* ── Instrucciones adicionales ───────────────────────────── */}
            <section>
                <h2 className="text-[15px] font-semibold mb-1.5" style={{ color: '#dee2f2' }}>
                    Instrucciones adicionales
                </h2>
                <p className="text-[13.5px] leading-relaxed mb-1.5" style={{ color: '#9ca3b8' }}>
                    Se <strong style={{ color: '#dee2f2' }}>añaden</strong> al método base sin
                    modificarlo. Úsalas para afinar el comportamiento: enfatizar algo, corregir un
                    matiz, ajustar el tono.
                </p>
                <p className="text-[12px] mb-4" style={{ color: '#5a6178' }}>
                    Ejemplo: “Sé más estricto puntuando el cierre” · “Cuando el alumno venda The
                    Breath Act, recuerda que el precio del retiro es 4.888€”.
                </p>

                <div className="flex flex-col gap-2">
                    {items.length === 0 && (
                        <div
                            className="rounded-xl px-4 py-5 text-center text-[13px]"
                            style={{
                                background: 'rgba(8,13,24,0.4)',
                                border: '1px dashed rgba(129,140,248,0.2)',
                                color: '#5a6178',
                            }}
                        >
                            Todavía no hay instrucciones. El coach usa solo el método base.
                        </div>
                    )}

                    {items.map((text, i) => (
                        <div
                            key={i}
                            className="flex items-start gap-3 px-3.5 py-3 rounded-xl"
                            style={{
                                background: 'rgba(8,13,24,0.4)',
                                border: '1px solid rgba(129,140,248,0.14)',
                            }}
                        >
                            <span
                                className="shrink-0 mt-0.5 w-6 h-6 rounded-md flex items-center justify-center text-[10.5px]"
                                style={{
                                    background: 'rgba(52,211,153,0.14)',
                                    border: '1px solid rgba(52,211,153,0.3)',
                                    color: '#34d399',
                                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                }}
                            >
                                {i + 1}
                            </span>
                            <span
                                className="flex-1 min-w-0 text-[13.5px] leading-relaxed break-words"
                                style={{ color: '#dee2f2' }}
                            >
                                {text}
                            </span>
                            <span
                                className="shrink-0 mt-1 text-[10.5px] hidden sm:inline"
                                style={{
                                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                    color: '#5a6178',
                                }}
                            >
                                {estimate(text)} tk
                            </span>
                            <button
                                type="button"
                                onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                                aria-label={`Borrar instrucción ${i + 1}`}
                                className="shrink-0 w-9 h-9 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center cursor-pointer"
                                style={{
                                    background: 'rgba(239,68,68,0.1)',
                                    border: '1px solid rgba(239,68,68,0.25)',
                                    color: '#f87171',
                                }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Añadir */}
                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                    <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                e.preventDefault()
                                addDraft()
                            }
                        }}
                        placeholder="Escribe una instrucción y pulsa Enter…"
                        className="flex-1 min-w-0 rounded-xl px-4 py-3 outline-none text-base sm:text-[13.5px]"
                        style={{
                            background: '#0e131e',
                            border: '1px solid rgba(129,140,248,0.2)',
                            color: '#dee2f2',
                        }}
                    />
                    <button
                        type="button"
                        onClick={addDraft}
                        disabled={!draft.trim()}
                        className="shrink-0 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[13px] font-semibold cursor-pointer"
                        style={{
                            background: 'rgba(129,140,248,0.12)',
                            border: '1px solid rgba(129,140,248,0.28)',
                            color: '#c7cede',
                            opacity: draft.trim() ? 1 : 0.45,
                            cursor: draft.trim() ? 'pointer' : 'not-allowed',
                        }}
                    >
                        <Plus size={15} /> Añadir
                    </button>
                </div>

                <div className="flex items-center gap-3 mt-4 flex-wrap">
                    <button
                        onClick={save}
                        disabled={status === 'saving' || !dirty}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold"
                        style={{
                            background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
                            color: '#fff',
                            opacity: status === 'saving' || !dirty ? 0.5 : 1,
                            cursor: status === 'saving' || !dirty ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {status === 'saving' ? (
                            <Loader2 size={15} className="animate-spin" />
                        ) : (
                            <Save size={15} />
                        )}
                        Guardar
                    </button>
                    {dirty && status === 'idle' && (
                        <span className="text-[12.5px]" style={{ color: '#fbbf24' }}>
                            Hay cambios sin guardar.
                        </span>
                    )}
                    {status === 'saved' && (
                        <span
                            className="flex items-center gap-1.5 text-[12.5px]"
                            style={{ color: '#34d399' }}
                        >
                            <Check size={14} /> Guardado. Aplica a las próximas evaluaciones.
                        </span>
                    )}
                    {status === 'error' && (
                        <span className="text-[12.5px]" style={{ color: '#f87171' }}>
                            Error al guardar. Inténtalo de nuevo.
                        </span>
                    )}
                </div>
            </section>
        </div>
    )
}

function TokenRow({
    label,
    sub,
    tokens,
    total,
    color,
}: {
    label: string
    sub: string
    tokens: number
    total: number
    color: string
}) {
    const pct = total > 0 ? Math.round((tokens / total) * 100) : 0
    return (
        <div className="flex items-center gap-3">
            <span className="w-1.5 h-8 rounded-full shrink-0" style={{ background: color }} />
            <div className="flex-1 min-w-0">
                <div className="text-[13px] truncate" style={{ color: '#dee2f2' }}>
                    {label}
                </div>
                <div className="text-[11px] truncate" style={{ color: '#5a6178' }}>
                    {sub}
                </div>
            </div>
            <div className="text-right shrink-0">
                <div
                    className="text-[13px]"
                    style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: '#c7cede' }}
                >
                    {fmt(tokens)}
                </div>
                <div className="text-[10.5px]" style={{ color: '#5a6178' }}>
                    {pct}%
                </div>
            </div>
        </div>
    )
}
