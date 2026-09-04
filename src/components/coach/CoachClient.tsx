'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Sparkles, Send, Plus, Loader2, MessageSquare, CalendarDays } from 'lucide-react'
import { CoachUpgradeModal } from '@/components/coach/CoachUpgradeModal'
import {
    COACH_TRIAL_EXHAUSTED,
    COACH_UPGRADE_URL,
    chargesFreeEvaluation,
    type CoachAccess,
} from '@/lib/coach/trial'
import { COACH_CALL_TYPES } from '@/lib/coach/types'
import {
    parseScorecard,
    stripScoreBlock,
    scoreColor,
    type Scorecard,
} from '@/lib/coach/scorecard'

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
                            <span className="text-[11.5px] w-24 sm:w-40 shrink-0 truncate" style={{ color: '#aab3c7' }}>
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

/** Acceso por defecto: sin límite. `/admin/coach` no pasa `access` — el staff siempre lo tiene. */
const FULL_ACCESS: CoachAccess = { level: 'full', remaining: 0, used: 0, limit: 0 }

export function CoachClient({
    activeConversationId,
    initialMessages,
    conversations,
    firstName,
    basePath = '/dashboard/coach',
    access = FULL_ACCESS,
}: {
    activeConversationId: string
    initialMessages: CoachUIMessage[]
    conversations: CoachConversationBrief[]
    firstName: string
    basePath?: string
    access?: CoachAccess
}) {
    const router = useRouter()
    const [input, setInput] = useState('')
    const [callType, setCallType] = useState('')
    const urlSynced = useRef(initialMessages.length > 0)
    const scrollRef = useRef<HTMLDivElement>(null)

    /*
     * Prueba gratuita. `remaining` se lleva en estado porque baja al enviar una
     * transcripción, sin recargar la página.
     *
     * Cuándo aparece el popup:
     *  - al ENTRAR con la cuota ya agotada (`access.level === 'exhausted'`), que es lo que
     *    pidió el cliente: "un pop-up cada que lo intenten abrir";
     *  - si el servidor rechaza un envío por cuota (red de seguridad para varias pestañas).
     *
     * Al gastar la última evaluación DENTRO de la sesión no se abre: quien acaba de enviarla
     * tiene que poder leer la respuesta que está llegando. Se le bloquea el composer y el
     * popup le saldrá la próxima vez que entre.
     */
    const isTrial = access.level !== 'full'
    const [remaining, setRemaining] = useState(access.remaining)
    const [blocked, setBlocked] = useState(access.level === 'exhausted')
    // Si el envío que descontó cuota acaba fallando, hay que devolverla en la UI: el
    // servidor tampoco la consumió (la reserva se devuelve en la ruta).
    const pendingQuotaRef = useRef(false)

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
    const outOfQuota = isTrial && remaining <= 0

    /*
     * Envío completado sin error: el descuento se confirma y deja de estar "pendiente".
     * Sin esto el ref se quedaba en true tras una evaluación correcta, y el siguiente
     * fallo cualquiera (un seguimiento que peta) devolvía en la UI una evaluación que el
     * servidor nunca devolvió: el banner prometía de más y el usuario se topaba con un 402.
     */
    useEffect(() => {
        if (status === 'ready' && !error) pendingQuotaRef.current = false
    }, [status, error])

    useEffect(() => {
        if (!error) return
        if (error.message?.includes(COACH_TRIAL_EXHAUSTED)) {
            // Red de seguridad: otra pestaña se llevó la última evaluación.
            pendingQuotaRef.current = false
            setRemaining(0)
            setBlocked(true)
            return
        }
        /*
         * Los errores que devuelve el servidor (413 por tamaño, 429, fallo de OpenAI) no
         * consumen cuota allí, así que aquí también se devuelve. Sin esto, dos intentos
         * fallidos bloqueaban el composer y abrían el popup con el contador real todavía a
         * cero, y solo se recuperaba recargando.
         *
         * Excepción conocida: si el error viene de que el navegador cortó la conexión, el
         * servidor sí terminó la evaluación (`consumeStream`) y no devolvió nada. El banner
         * queda optimista hasta el siguiente envío, que recibe un 402 y abre el popup. No se
         * intenta distinguir ese caso: desde el cliente no es fiable, y el 402 lo corrige.
         */
        if (pendingQuotaRef.current) {
            pendingQuotaRef.current = false
            setRemaining((n) => Math.min(access.limit, n + 1))
        }
    }, [error, access.limit])

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }, [messages, status])

    function submit(e: React.FormEvent) {
        e.preventDefault()
        const text = input.trim()
        if (!text || busy) return
        if (outOfQuota) {
            setBlocked(true)
            return
        }
        const prefix = callType
            ? `(Tipo de llamada indicado por el alumno: ${callTypeLabel(callType)})\n\n`
            : ''
        const payload = prefix + text
        /*
         * Solo las transcripciones descuentan, igual que en el servidor: un "hola" o una duda
         * sobre la puntuación no puede quemar una de las dos pruebas. Se evalúa sobre
         * `payload`, exactamente el mismo string que recibe el servidor.
         */
        // Misma función que el servidor, sobre el mismo string: el contador de la UI no
        // puede divergir del real.
        if (isTrial && chargesFreeEvaluation(payload)) {
            pendingQuotaRef.current = true
            setRemaining((n) => Math.max(0, n - 1))
        }
        sendMessage({ text: payload })
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

                    {/* El aside del historial es `hidden md:flex`, así que por debajo de 768px
                      * no había forma de abrir una conversación anterior ni de empezar una
                      * nueva salvo escribiendo la URL `?c=<id>` a mano. */}
                    <Link
                        href={basePath}
                        aria-label="Nueva llamada"
                        title="Nueva llamada"
                        className="md:hidden ml-auto shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ background: ACCENT, color: '#fff', textDecoration: 'none' }}
                    >
                        <Plus size={16} />
                    </Link>
                </header>

                {/* Historial en móvil (el aside equivalente es `hidden md:flex`) */}
                {conversationList.length > 0 && (
                    <details
                        className="md:hidden shrink-0"
                        style={{ borderBottom: '1px solid rgba(129,140,248,0.1)', background: 'rgba(8,13,24,0.4)' }}
                    >
                        <summary
                            className="px-5 py-2.5 text-[11px] cursor-pointer list-none"
                            style={{
                                fontFamily: 'JetBrains Mono, monospace',
                                letterSpacing: 1.2,
                                color: '#7a8094',
                            }}
                        >
                            HISTORIAL · {conversationList.length}
                        </summary>
                        <div className="max-h-56 overflow-y-auto px-2 pb-3 flex flex-col gap-0.5">
                            {conversationList.map((conv) => {
                                const active = conv.id === activeConversationId
                                return (
                                    <Link
                                        key={conv.id}
                                        href={`${basePath}?c=${conv.id}`}
                                        className="flex items-start gap-2 px-2.5 py-2 rounded-lg text-[12.5px]"
                                        style={{
                                            background: active ? 'rgba(56,189,248,0.12)' : 'transparent',
                                            border: active
                                                ? '1px solid rgba(56,189,248,0.28)'
                                                : '1px solid transparent',
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
                    </details>
                )}

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

                {/* Error. El marcador de cuota agotada no se pinta: ya lo explica el popup. */}
                {error && !error.message?.includes(COACH_TRIAL_EXHAUSTED) && (
                    <div
                        className="mx-4 md:mx-8 mb-2 px-4 py-2.5 rounded-lg text-[12.5px]"
                        style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: '#fda4af' }}
                    >
                        {error.message || 'Ha ocurrido un error. Inténtalo de nuevo.'}
                    </div>
                )}

                {/* Prueba gratuita: cuántas evaluaciones quedan, y el CTA cuando se agotan. */}
                {isTrial && (
                    <div
                        className="mx-4 md:mx-8 mb-2 px-4 py-2.5 rounded-lg text-[12.5px] flex flex-wrap items-center justify-between gap-2"
                        style={
                            outOfQuota
                                ? { background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.3)', color: '#c7cede' }
                                : { background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.22)', color: '#9ca3b8' }
                        }
                    >
                        <span>
                            {outOfQuota ? (
                                <>Has usado tus {access.limit} evaluaciones gratuitas.</>
                            ) : (
                                <>
                                    Prueba gratuita: te{' '}
                                    {remaining === 1 ? 'queda 1 evaluación' : `quedan ${remaining} evaluaciones`}.
                                </>
                            )}
                        </span>
                        <a
                            href={COACH_UPGRADE_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 font-semibold transition-opacity hover:opacity-80"
                            style={{ color: '#818cf8' }}
                        >
                            <CalendarDays size={13} />
                            Agendar mi reunión
                        </a>
                    </div>
                )}

                {/*
                  * Composer.
                  * `/dashboard/coach` y `/admin/coach` son rutas full-bleed, así que no
                  * reciben el `pb-28` del wrapper de MainContent. Sin el `pb-bottom-nav`
                  * el textarea y el botón de enviar quedan literalmente debajo del
                  * BottomNav: la función principal de la pantalla es inutilizable en móvil.
                  * La clase `coach-composer` es además el gancho de globals.css que
                  * sube los campos a 16px y evita el zoom automático de iOS.
                  */}
                <form
                    onSubmit={submit}
                    className="coach-composer shrink-0 px-4 md:px-8 py-4 pb-bottom-nav lg:pb-4"
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
                                disabled={outOfQuota}
                                placeholder={
                                    outOfQuota
                                        ? 'Agenda tu reunión para seguir entrenando tus llamadas.'
                                        : 'Pega aquí la transcripción de tu llamada… (Enter para enviar · Shift+Enter para salto de línea)'
                                }
                                className="flex-1 resize-none bg-transparent outline-none text-[13.5px] px-2 py-1.5 max-h-52"
                                style={{ color: '#dee2f2', opacity: outOfQuota ? 0.5 : 1 }}
                            />
                            <button
                                type="submit"
                                disabled={busy || !input.trim() || outOfQuota}
                                aria-label="Enviar"
                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-opacity"
                                style={{
                                    background: ACCENT,
                                    color: '#fff',
                                    opacity: busy || !input.trim() || outOfQuota ? 0.4 : 1,
                                    cursor: busy || !input.trim() || outOfQuota ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {busy ? <Loader2 size={17} className="animate-spin" /> : <Send size={16} />}
                            </button>
                        </div>
                    </div>
                </form>
            </section>

            {/* Bloqueo. Se puede cerrar para releer las evaluaciones ya recibidas; el envío
                sigue bloqueado y el popup reaparece en la siguiente visita. */}
            {blocked && <CoachUpgradeModal onClose={() => setBlocked(false)} />}
        </div>
    )
}

export function MessageBubble({ role, text }: { role: string; text: string }) {
    const isUser = role === 'user'
    if (isUser) {
        return (
            <div className="flex justify-end">
                <div
                    className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-sm text-[13.5px] whitespace-pre-wrap break-words"
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
