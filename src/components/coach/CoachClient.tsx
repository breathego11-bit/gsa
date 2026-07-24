'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Sparkles, Send, Plus, Loader2, MessageSquare } from 'lucide-react'
import { COACH_CALL_TYPES } from '@/lib/coach/types'

export type CoachUIMessage = UIMessage
export type CoachConversationBrief = { id: string; title: string; updated_at: string }

const ACCENT = 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)'

function messageText(m: UIMessage): string {
    return (m.parts ?? [])
        .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('\n')
}

function callTypeLabel(value: string): string {
    return COACH_CALL_TYPES.find((t) => t.value === value)?.label ?? value
}

// ── Scorecard: parsea el bloque de "Puntuación" (§19) del texto del coach ──
type ScoreItem = { label: string; score: number; max: number }
type Scorecard = { items: ScoreItem[]; total: number | null }

const SCORE_CATEGORIES: { test: RegExp; label: string; max: number }[] = [
    { test: /conexi[oó]n/i, label: 'Conexión', max: 10 },
    { test: /marco/i, label: 'Marco', max: 10 },
    { test: /diagn[oó]stico/i, label: 'Diagnóstico', max: 15 },
    { test: /dolor|deseo|brecha/i, label: 'Dolor / deseo / brecha', max: 20 },
    { test: /espejo|claridad/i, label: 'Espejo y claridad', max: 10 },
    { test: /presentaci[oó]n|valor/i, label: 'Presentación', max: 15 },
    { test: /precio|cierre/i, label: 'Precio y cierre', max: 10 },
    { test: /objec/i, label: 'Objeciones', max: 10 },
]

function parseScorecard(text: string): Scorecard | null {
    const found = new Map<string, ScoreItem>()
    let total: number | null = null
    const re = /([^\n:]+):\s*(\d+)\s*\/\s*(\d+)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
        const rawLabel = m[1]
        const score = Number(m[2])
        const max = Number(m[3])
        if (/total/i.test(rawLabel) || max === 100) {
            total = score
            continue
        }
        const cat = SCORE_CATEGORIES.find((c) => c.test.test(rawLabel))
        if (cat && !found.has(cat.label)) {
            found.set(cat.label, { label: cat.label, score, max })
        }
    }
    const items = SCORE_CATEGORIES.map((c) => found.get(c.label)).filter(
        (x): x is ScoreItem => Boolean(x),
    )
    // Solo mostramos el scorecard cuando la evaluación está razonablemente completa.
    if (total === null || items.length < 6) return null
    return { items, total }
}

/** Quita el bloque de puntuación en texto (ya se muestra como scorecard). */
function stripScoreBlock(text: string): string {
    return text
        .split('\n')
        .filter(
            (line) =>
                !/^\s*#*\s*\d*\.?\s*Puntuaci[oó]n\s*$/i.test(line) &&
                !/^\s*[-*]?\s*[^\n:]+:\s*\d+\s*\/\s*\d+\s*$/.test(line),
        )
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
}

function scoreColor(ratio: number): string {
    if (ratio >= 0.7) return '#34d399'
    if (ratio >= 0.4) return '#fbbf24'
    return '#f43f5e'
}

function ScorecardCard({ data }: { data: Scorecard }) {
    const totalRatio = (data.total ?? 0) / 100
    return (
        <div
            className="rounded-2xl p-4 mb-3"
            style={{ background: 'rgba(14,19,30,0.85)', border: '1px solid rgba(129,140,248,0.18)' }}
        >
            <div className="flex items-center justify-between mb-3">
                <span
                    className="text-[10px]"
                    style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1.4, color: '#7a8094' }}
                >
                    PUNTUACIÓN GSA
                </span>
                <span className="text-[20px] font-bold" style={{ color: scoreColor(totalRatio) }}>
                    {data.total}
                    <span className="text-[12px]" style={{ color: '#5a6178' }}>
                        /100
                    </span>
                </span>
            </div>
            <div className="flex flex-col gap-2">
                {data.items.map((it) => {
                    const ratio = it.max ? it.score / it.max : 0
                    return (
                        <div key={it.label} className="flex items-center gap-2.5">
                            <span className="text-[11.5px] w-40 shrink-0 truncate" style={{ color: '#aab3c7' }}>
                                {it.label}
                            </span>
                            <div
                                className="flex-1 h-1.5 rounded-full overflow-hidden"
                                style={{ background: 'rgba(129,140,248,0.12)' }}
                            >
                                <div
                                    className="h-full rounded-full"
                                    style={{ width: `${Math.round(ratio * 100)}%`, background: scoreColor(ratio) }}
                                />
                            </div>
                            <span
                                className="text-[11px] w-10 text-right shrink-0"
                                style={{ fontFamily: 'JetBrains Mono, monospace', color: '#c7cede' }}
                            >
                                {it.score}/{it.max}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export function CoachClient({
    activeConversationId,
    initialMessages,
    conversations,
    firstName,
    basePath = '/dashboard/coach',
}: {
    activeConversationId: string
    initialMessages: CoachUIMessage[]
    conversations: CoachConversationBrief[]
    firstName: string
    basePath?: string
}) {
    const router = useRouter()
    const [input, setInput] = useState('')
    const [callType, setCallType] = useState('')
    const urlSynced = useRef(initialMessages.length > 0)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Historial optimista: al iniciar/continuar un chat la conversación aparece en el
    // sidebar al instante, sin refrescar. Se fusiona sobre la lista del servidor (que
    // se reconcilia sola en el siguiente fetch) — el overlay solo cambia orden/título.
    const [optimisticConvs, setOptimisticConvs] = useState<Record<string, CoachConversationBrief>>({})

    const conversationList = useMemo(() => {
        const map = new Map<string, CoachConversationBrief>()
        for (const c of conversations) map.set(c.id, c)
        for (const id of Object.keys(optimisticConvs)) {
            const o = optimisticConvs[id]
            const base = map.get(id)
            // Conversación existente: conserva su título, solo la sube (updated_at).
            // Conversación nueva: aún no está en el server → usa la entrada optimista.
            map.set(id, base ? { ...base, updated_at: o.updated_at } : o)
        }
        return Array.from(map.values()).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    }, [conversations, optimisticConvs])

    const transport = useMemo(
        () =>
            new DefaultChatTransport({
                api: '/api/coach/chat',
                body: { conversationId: activeConversationId },
            }),
        [activeConversationId],
    )

    const { messages, sendMessage, status, error } = useChat({
        transport,
        messages: initialMessages,
    })

    const busy = status === 'submitted' || status === 'streaming'

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, [messages, status])

    function submit(e: React.FormEvent) {
        e.preventDefault()
        const text = input.trim()
        if (!text || busy) return
        const prefix = callType
            ? `(Tipo de llamada indicado por el alumno: ${callTypeLabel(callType)})\n\n`
            : ''
        sendMessage({ text: prefix + text })
        setInput('')
        // Muestra la conversación en el historial de inmediato (título = primer mensaje).
        setOptimisticConvs((prev) => ({
            ...prev,
            [activeConversationId]: {
                id: activeConversationId,
                title:
                    prev[activeConversationId]?.title ??
                    conversations.find((c) => c.id === activeConversationId)?.title ??
                    (text.slice(0, 60) || 'Nueva llamada'),
                updated_at: new Date().toISOString(),
            },
        }))
        // Fija la conversación nueva en la URL: refrescar la conserva y aparece en el historial.
        if (!urlSynced.current) {
            urlSynced.current = true
            router.replace(`${basePath}?c=${activeConversationId}`, { scroll: false })
        }
    }

    const isEmpty = messages.length === 0

    return (
        <div className="h-full flex" style={{ color: '#dee2f2', fontFamily: 'Inter, system-ui, sans-serif' }}>
            {/* Historial */}
            <aside
                className="hidden md:flex flex-col w-72 shrink-0"
                style={{ borderRight: '1px solid rgba(129,140,248,0.1)', background: 'rgba(8,13,24,0.4)' }}
            >
                <div className="p-3">
                    <Link
                        href={basePath}
                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-semibold"
                        style={{ background: ACCENT, color: '#fff', textDecoration: 'none' }}
                    >
                        <Plus size={15} /> Nueva llamada
                    </Link>
                </div>
                <div
                    className="px-3 pb-1 text-[9.5px]"
                    style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1.4, color: '#4a5168' }}
                >
                    HISTORIAL
                </div>
                <div className="flex-1 overflow-y-auto px-2 pb-3 flex flex-col gap-0.5">
                    {conversationList.length === 0 && (
                        <div className="px-3 py-2 text-[12px]" style={{ color: '#5a6178' }}>
                            Aún no has evaluado ninguna llamada.
                        </div>
                    )}
                    {conversationList.map((conv) => {
                        const active = conv.id === activeConversationId
                        return (
                            <Link
                                key={conv.id}
                                href={`${basePath}?c=${conv.id}`}
                                className="flex items-start gap-2 px-2.5 py-2 rounded-lg text-[12.5px] transition-colors"
                                style={{
                                    background: active ? 'rgba(56,189,248,0.12)' : 'transparent',
                                    border: active ? '1px solid rgba(56,189,248,0.28)' : '1px solid transparent',
                                    color: active ? '#fff' : '#9ca3b8',
                                    textDecoration: 'none',
                                }}
                            >
                                <MessageSquare size={13} className="mt-0.5 shrink-0" style={{ color: '#7a8094' }} />
                                <span className="line-clamp-2">{conv.title}</span>
                            </Link>
                        )
                    })}
                </div>
            </aside>

            {/* Chat */}
            <section className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header
                    className="flex items-center gap-3 px-5 py-3.5 shrink-0"
                    style={{ borderBottom: '1px solid rgba(129,140,248,0.1)', background: 'rgba(10,16,32,0.6)' }}
                >
                    <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: ACCENT }}
                    >
                        <Sparkles size={17} color="#fff" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[14px] font-semibold">Coach IA · Método GSA</div>
                        <div className="text-[11px]" style={{ color: '#7a8094' }}>
                            Pega la transcripción de tu llamada y te la corrijo como lo haría Iván.
                        </div>
                    </div>
                </header>

                {/* Mensajes */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
                    {isEmpty ? (
                        <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                            <div
                                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                                style={{ background: ACCENT }}
                            >
                                <Sparkles size={26} color="#fff" />
                            </div>
                            <h2 className="text-[18px] font-semibold mb-1.5">Hola {firstName} 👋</h2>
                            <p className="text-[13.5px] leading-relaxed" style={{ color: '#9ca3b8' }}>
                                Pega abajo la transcripción de una de tus llamadas de venta. Te la evalúo
                                fase por fase según el método GSA, con tu puntuación y qué mejorar.
                            </p>
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto flex flex-col gap-5">
                            {messages.map((m) => (
                                <MessageBubble key={m.id} role={m.role} text={messageText(m)} />
                            ))}
                            {status === 'submitted' && <ThinkingIndicator />}
                        </div>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div
                        className="mx-4 md:mx-8 mb-2 px-4 py-2.5 rounded-lg text-[12.5px]"
                        style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: '#fda4af' }}
                    >
                        {error.message || 'Ha ocurrido un error. Inténtalo de nuevo.'}
                    </div>
                )}

                {/* Composer */}
                <form
                    onSubmit={submit}
                    className="shrink-0 px-4 md:px-8 py-4"
                    style={{ borderTop: '1px solid rgba(129,140,248,0.1)', background: 'rgba(10,16,32,0.6)' }}
                >
                    <div className="max-w-3xl mx-auto">
                        <div className="flex items-center gap-2 mb-2">
                            <label className="text-[11px]" style={{ color: '#7a8094' }}>
                                Tipo de llamada:
                            </label>
                            <select
                                value={callType}
                                onChange={(e) => setCallType(e.target.value)}
                                className="text-[11.5px] rounded-md px-2 py-1 outline-none"
                                style={{ background: '#0e131e', border: '1px solid rgba(129,140,248,0.2)', color: '#c7cede' }}
                            >
                                <option value="">Que lo detecte el coach</option>
                                {COACH_CALL_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>
                                        {t.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div
                            className="flex items-end gap-2 rounded-2xl p-2"
                            style={{ background: '#0e131e', border: '1px solid rgba(129,140,248,0.2)' }}
                        >
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    // Enter envía; Shift+Enter salta de línea. isComposing evita
                                    // enviar a mitad de composición de acentos/IME.
                                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                        e.preventDefault()
                                        submit(e)
                                    }
                                }}
                                rows={3}
                                placeholder="Pega aquí la transcripción de tu llamada… (Enter para enviar · Shift+Enter para salto de línea)"
                                className="flex-1 resize-none bg-transparent outline-none text-[13.5px] px-2 py-1.5 max-h-52"
                                style={{ color: '#dee2f2' }}
                            />
                            <button
                                type="submit"
                                disabled={busy || !input.trim()}
                                aria-label="Enviar"
                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-opacity"
                                style={{
                                    background: ACCENT,
                                    color: '#fff',
                                    opacity: busy || !input.trim() ? 0.4 : 1,
                                    cursor: busy || !input.trim() ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {busy ? <Loader2 size={17} className="animate-spin" /> : <Send size={16} />}
                            </button>
                        </div>
                    </div>
                </form>
            </section>
        </div>
    )
}

export function MessageBubble({ role, text }: { role: string; text: string }) {
    const isUser = role === 'user'
    if (isUser) {
        return (
            <div className="flex justify-end">
                <div
                    className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-sm text-[13.5px] whitespace-pre-wrap"
                    style={{ background: 'rgba(56,189,248,0.14)', border: '1px solid rgba(56,189,248,0.25)', color: '#eaf2ff' }}
                >
                    {text}
                </div>
            </div>
        )
    }
    const scorecard = parseScorecard(text)
    const bodyText = scorecard ? stripScoreBlock(text) : text
    return (
        <div className="flex gap-3">
            <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: ACCENT }}
            >
                <Sparkles size={14} color="#fff" />
            </div>
            <div className="coach-md min-w-0 flex-1 text-[13.5px] leading-relaxed" style={{ color: '#dbe2f0' }}>
                {scorecard && <ScorecardCard data={scorecard} />}
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        h1: (p) => <h1 className="text-[16px] font-bold mt-4 mb-2 text-white" {...p} />,
                        h2: (p) => <h2 className="text-[15px] font-bold mt-4 mb-2 text-white" {...p} />,
                        h3: (p) => <h3 className="text-[14px] font-semibold mt-3 mb-1.5 text-white" {...p} />,
                        p: (p) => <p className="mb-2.5" {...p} />,
                        ul: (p) => <ul className="list-disc pl-5 mb-2.5 space-y-1" {...p} />,
                        ol: (p) => <ol className="list-decimal pl-5 mb-2.5 space-y-1" {...p} />,
                        strong: (p) => <strong className="font-semibold text-white" {...p} />,
                        blockquote: (p) => (
                            <blockquote
                                className="pl-3 my-2 italic"
                                style={{ borderLeft: '3px solid rgba(56,189,248,0.4)', color: '#aab3c7' }}
                                {...p}
                            />
                        ),
                        code: (p) => (
                            <code
                                className="px-1 py-0.5 rounded text-[12.5px]"
                                style={{ background: 'rgba(129,140,248,0.12)', fontFamily: 'JetBrains Mono, monospace' }}
                                {...p}
                            />
                        ),
                        table: (p) => (
                            <div className="overflow-x-auto my-3">
                                <table className="w-full text-[12.5px] border-collapse" {...p} />
                            </div>
                        ),
                        th: (p) => (
                            <th
                                className="text-left px-2.5 py-1.5 font-semibold"
                                style={{ borderBottom: '1px solid rgba(129,140,248,0.25)', color: '#c7cede' }}
                                {...p}
                            />
                        ),
                        td: (p) => (
                            <td className="px-2.5 py-1.5" style={{ borderBottom: '1px solid rgba(129,140,248,0.1)' }} {...p} />
                        ),
                    }}
                >
                    {bodyText}
                </ReactMarkdown>
            </div>
        </div>
    )
}

function ThinkingIndicator() {
    return (
        <div className="flex gap-3 items-center">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: ACCENT }}>
                <Sparkles size={14} color="#fff" />
            </div>
            <div className="flex items-center gap-1.5 text-[12.5px]" style={{ color: '#7a8094' }}>
                <Loader2 size={13} className="animate-spin" /> El coach está analizando tu llamada…
            </div>
        </div>
    )
}
