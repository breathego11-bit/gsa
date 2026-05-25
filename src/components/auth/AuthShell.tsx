'use client'

import { useState, useEffect, type CSSProperties, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn, getSession } from 'next-auth/react'

type Mode = 'login' | 'register'

export function AuthShell() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const invite = searchParams.get('invite')
    const justRegistered = searchParams.get('registered') === '1'
    const initialMode: Mode = searchParams.get('mode') === 'register' ? 'register' : 'login'

    const [mode, setMode] = useState<Mode>(initialMode)
    const [error, setError] = useState('')
    const [info, setInfo] = useState('')
    const [loading, setLoading] = useState(false)
    const [termsChecked, setTermsChecked] = useState(true)

    // Sync mode → URL (?mode=register) without triggering a navigation/reload
    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString())
        const current = params.get('mode')
        if (mode === 'register' && current !== 'register') {
            params.set('mode', 'register')
            router.replace(`/auth?${params.toString()}`, { scroll: false })
        } else if (mode === 'login' && current === 'register') {
            params.delete('mode')
            const qs = params.toString()
            router.replace(qs ? `/auth?${qs}` : '/auth', { scroll: false })
        }
    }, [mode, router, searchParams])

    function switchMode(target: Mode) {
        if (target === mode) return
        setError('')
        setInfo('')
        setMode(target)
    }

    function showInfo(message: string) {
        setError('')
        setInfo(message)
        setTimeout(() => setInfo(''), 3500)
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError('')
        setInfo('')
        setLoading(true)

        const form = e.currentTarget
        const get = (n: string) =>
            (form.elements.namedItem(n) as HTMLInputElement | null)?.value ?? ''

        if (mode === 'login') {
            const email = get('email')
            const password = get('password')
            const res = await signIn('credentials', { email, password, redirect: false })
            if (res?.error) {
                setError('Email o contraseña incorrectos')
                setLoading(false)
                return
            }
            const session = await getSession()
            router.push(session?.user?.role === 'ADMIN' ? '/admin' : '/dashboard')
            router.refresh()
            return
        }

        // register
        if (!termsChecked) {
            setError('Debes aceptar los términos y la política de privacidad.')
            setLoading(false)
            return
        }

        const email = get('email')
        const password = get('password')

        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: get('name'),
                last_name: get('last_name'),
                username: get('username'),
                email,
                password,
                ...(invite ? { invite } : {}),
            }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
            setError(data.error || 'Algo salió mal. Intenta de nuevo.')
            setLoading(false)
            return
        }

        // Invitation-based registrations are already paid (status='active').
        // Auto-sign-in and take them to the onboarding/welcome page.
        if (invite) {
            const signInRes = await signIn('credentials', { email, password, redirect: false })
            if (signInRes?.error) {
                setMode('login')
                router.replace('/auth?registered=1', { scroll: false })
                setLoading(false)
                return
            }
            router.push('/onboarding')
            router.refresh()
            return
        }

        setMode('login')
        router.replace('/auth?registered=1', { scroll: false })
        setLoading(false)
    }

    return (
        <div style={au.root} className="auth-shell">
            <div style={au.glow1} aria-hidden />
            <div style={au.glow2} aria-hidden />

            <main style={au.main}>
                <div style={au.formInner}>
                    <div style={au.brand}>
                        <div style={au.logoMark}>
                            <img src="/logo_dark.png" alt="GSA" style={{ width: 24, height: 24, objectFit: 'contain' }} />
                        </div>
                        <div>
                            <div style={au.logoName}>GROWTH SALES</div>
                            <div style={au.logoSub}>ACADEMY</div>
                        </div>
                    </div>

                    <div style={au.tabs}>
                        <div
                            style={{
                                ...au.tabsIndicator,
                                left: mode === 'login' ? 4 : '50%',
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => switchMode('login')}
                            style={{ ...au.tab, ...(mode === 'login' ? au.tabActive : {}) }}
                        >
                            Iniciar sesión
                        </button>
                        <button
                            type="button"
                            onClick={() => switchMode('register')}
                            style={{ ...au.tab, ...(mode === 'register' ? au.tabActive : {}) }}
                        >
                            Crear cuenta
                        </button>
                    </div>

                    {invite && mode === 'register' && (
                        <div style={au.inviteBanner}>
                            <span style={au.inviteDot} />
                            <span>Has sido invitado a Growth Sales Academy</span>
                        </div>
                    )}

                    {justRegistered && mode === 'login' && (
                        <div style={au.successBanner}>
                            <span style={au.inviteDot} />
                            <span>Cuenta creada. Inicia sesión para continuar.</span>
                        </div>
                    )}

                    <div style={au.formHead}>
                        <div style={au.formKicker}>
                            {mode === 'login' ? '· BIENVENIDO DE NUEVO' : '· EMPIEZA HOY'}
                        </div>
                        <h2 style={au.formTitle}>
                            {mode === 'login' ? (
                                <>Continúa tu <span style={au.formTitleAccent}>entrenamiento.</span></>
                            ) : (
                                <>Conviértete en <span style={au.formTitleAccent}>closer.</span></>
                            )}
                        </h2>
                        <p style={au.formSub}>
                            {mode === 'login'
                                ? 'Accede a tu ecosistema: formación, comunidad, iCoach y oportunidades.'
                                : 'Únete al ecosistema GSA. Acceso a las 10 áreas de formación desde el día uno.'}
                        </p>
                    </div>

                    <form style={au.form} onSubmit={handleSubmit}>
                        {mode === 'register' && (
                            <>
                                <div style={au.fieldRow}>
                                    <Field label="Nombre" placeholder="Iván" name="name" required />
                                    <Field label="Apellido" placeholder="Abad" name="last_name" required />
                                </div>
                                <Field label="Usuario" placeholder="ivanabad" name="username" autoComplete="username" required />
                            </>
                        )}

                        <Field
                            label="Email"
                            placeholder="tu@email.com"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                        />

                        <Field
                            label="Contraseña"
                            placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : '••••••••'}
                            name="password"
                            type="password"
                            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                            required
                            hint={
                                mode === 'login' ? (
                                    <button
                                        type="button"
                                        onClick={() => showInfo('Próximamente. Contacta soporte para recuperar tu contraseña.')}
                                        style={au.fieldLinkBtn}
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                ) : null
                            }
                        />

                        {mode === 'register' && (
                            <label style={au.checkRow}>
                                <span style={au.check}>
                                    <input
                                        type="checkbox"
                                        name="terms"
                                        checked={termsChecked}
                                        onChange={(e) => setTermsChecked(e.target.checked)}
                                        style={au.checkInput}
                                    />
                                    <span
                                        style={{
                                            ...au.checkBox,
                                            ...(termsChecked ? au.checkBoxActive : {}),
                                        }}
                                    >
                                        {termsChecked && (
                                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#080d18" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M2.5 6.5l2.5 2.5 4.5-5" />
                                            </svg>
                                        )}
                                    </span>
                                </span>
                                <span style={au.checkText}>
                                    Acepto los <span style={au.fieldLinkInline}>términos</span> y la{' '}
                                    <span style={au.fieldLinkInline}>política de privacidad</span>.
                                </span>
                            </label>
                        )}

                        {error && <div style={au.errorBox}>{error}</div>}
                        {info && <div style={au.infoBox}>{info}</div>}

                        <button
                            type="submit"
                            style={{ ...au.submit, opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}
                            disabled={loading}
                        >
                            <span>
                                {loading
                                    ? mode === 'login'
                                        ? 'Ingresando…'
                                        : 'Creando cuenta…'
                                    : mode === 'login'
                                        ? 'Acceder al ecosistema'
                                        : 'Crear mi cuenta'}
                            </span>
                            {!loading && (
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M2 7h10M8 3l4 4-4 4" />
                                </svg>
                            )}
                        </button>

                        <p style={au.switch}>
                            {mode === 'login' ? '¿Aún no tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
                            <button
                                type="button"
                                onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                                style={au.switchBtn}
                            >
                                {mode === 'login' ? 'Crear cuenta gratis' : 'Iniciar sesión'}
                            </button>
                        </p>
                    </form>

                    <div style={au.formFooter}>
                        <span style={au.formFooterDot} />
                        Acceso seguro · cifrado de extremo a extremo
                    </div>
                </div>
            </main>
        </div>
    )
}

function Field({
    label,
    placeholder,
    name,
    type = 'text',
    hint,
    required,
    autoComplete,
}: {
    label: string
    placeholder?: string
    name: string
    type?: string
    hint?: ReactNode
    required?: boolean
    autoComplete?: string
}) {
    const [focus, setFocus] = useState(false)
    const [show, setShow] = useState(false)
    const isPwd = type === 'password'
    const realType = isPwd ? (show ? 'text' : 'password') : type

    return (
        <div style={au.field}>
            <div style={au.fieldHead}>
                <label htmlFor={name} style={au.fieldLabel}>{label}</label>
                {hint}
            </div>
            <div style={{ ...au.inputWrap, ...(focus ? au.inputWrapFocus : {}) }}>
                <input
                    id={name}
                    name={name}
                    type={realType}
                    placeholder={placeholder}
                    onFocus={() => setFocus(true)}
                    onBlur={() => setFocus(false)}
                    style={au.input}
                    autoComplete={autoComplete}
                    required={required}
                />
                {isPwd && (
                    <button
                        type="button"
                        onClick={() => setShow((s) => !s)}
                        style={au.eyeBtn}
                        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                        {show ? (
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" />
                                <circle cx="8" cy="8" r="2" />
                                <path d="M2 2l12 12" />
                            </svg>
                        ) : (
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" />
                                <circle cx="8" cy="8" r="2.5" />
                            </svg>
                        )}
                    </button>
                )}
            </div>
        </div>
    )
}

const MONO = 'var(--font-jetbrains-mono), ui-monospace, monospace'
const SERIF = 'var(--font-instrument-serif), Georgia, serif'

const au: Record<string, CSSProperties> = {
    root: {
        minHeight: '100vh',
        width: '100%',
        background: '#080d18',
        color: '#dee2f2',
        position: 'relative',
        overflow: 'hidden',
    },
    glow1: {
        position: 'absolute',
        top: '-15%',
        left: '-10%',
        width: 700,
        height: 700,
        borderRadius: '50%',
        pointerEvents: 'none',
        filter: 'blur(110px)',
        background: 'radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 60%)',
    },
    glow2: {
        position: 'absolute',
        bottom: '-15%',
        right: '-10%',
        width: 750,
        height: 750,
        borderRadius: '50%',
        pointerEvents: 'none',
        filter: 'blur(120px)',
        background: 'radial-gradient(circle, rgba(129,140,248,0.16) 0%, transparent 60%)',
    },

    main: {
        position: 'relative',
        zIndex: 1,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(32px, 5vw, 64px) clamp(20px, 5vw, 48px)',
    },
    formInner: {
        width: '100%',
        maxWidth: 460,
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
    },

    brand: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        alignSelf: 'center',
        marginBottom: 4,
    },
    logoMark: {
        width: 40,
        height: 40,
        borderRadius: 10,
        background: 'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(129,140,248,0.2))',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'rgba(129,140,248,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoName: { fontSize: 12, letterSpacing: 2, fontWeight: 700, color: '#dee2f2', lineHeight: 1.1 },
    logoSub: {
        fontSize: 10,
        letterSpacing: 3,
        color: '#38bdf8',
        fontFamily: MONO,
        marginTop: 3,
    },

    tabs: {
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        padding: 4,
        borderRadius: 12,
        background: 'rgba(14,19,30,0.7)',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'rgba(129,140,248,0.18)',
    },
    tabsIndicator: {
        position: 'absolute',
        top: 4,
        bottom: 4,
        width: 'calc(50% - 4px)',
        borderRadius: 9,
        background: 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(129,140,248,0.2))',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'rgba(56,189,248,0.35)',
        boxShadow: '0 4px 12px rgba(56,189,248,0.15)',
        transition: 'left .35s cubic-bezier(.4,0,.2,1)',
    },
    tab: {
        position: 'relative',
        zIndex: 1,
        padding: '10px 14px',
        border: 'none',
        background: 'transparent',
        color: '#c4c5d5',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 13.5,
        fontWeight: 500,
        transition: 'color .2s',
    },
    tabActive: { color: '#dee2f2' },

    inviteBanner: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 10,
        background: 'rgba(16,185,129,0.08)',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'rgba(16,185,129,0.3)',
        color: '#34d399',
        fontSize: 13,
        fontWeight: 500,
    },
    successBanner: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 10,
        background: 'rgba(56,189,248,0.08)',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'rgba(56,189,248,0.3)',
        color: '#38bdf8',
        fontSize: 13,
        fontWeight: 500,
    },
    inviteDot: {
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: 'currentColor',
        boxShadow: '0 0 8px currentColor',
        flexShrink: 0,
    },

    formHead: { display: 'flex', flexDirection: 'column', gap: 8 },
    formKicker: {
        fontFamily: MONO,
        fontSize: 10.5,
        letterSpacing: 1.5,
        color: '#38bdf8',
    },
    formTitle: {
        fontSize: 28,
        lineHeight: 1.1,
        letterSpacing: -0.8,
        fontWeight: 600,
        margin: 0,
        color: '#dee2f2',
    },
    formTitleAccent: {
        background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        fontFamily: SERIF,
        fontStyle: 'italic',
        fontWeight: 400,
    },
    formSub: { fontSize: 13.5, lineHeight: 1.5, color: '#c4c5d5', margin: 0 },

    form: { display: 'flex', flexDirection: 'column', gap: 14 },
    fieldRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
    field: { display: 'flex', flexDirection: 'column', gap: 6 },
    fieldHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
    fieldLabel: {
        fontSize: 11.5,
        letterSpacing: 0.3,
        color: '#c4c5d5',
        textTransform: 'uppercase',
        fontWeight: 600,
        fontFamily: MONO,
    },
    fieldLinkBtn: {
        background: 'transparent',
        border: 'none',
        padding: 0,
        fontSize: 11.5,
        color: '#38bdf8',
        cursor: 'pointer',
        textDecoration: 'none',
        fontFamily: MONO,
        letterSpacing: 0.3,
    },
    fieldLinkInline: {
        color: '#38bdf8',
        cursor: 'pointer',
        textDecoration: 'underline',
        textUnderlineOffset: 2,
    },
    inputWrap: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(14,19,30,0.7)',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'rgba(129,140,248,0.2)',
        borderRadius: 10,
        transition: 'all .2s',
    },
    inputWrapFocus: {
        borderColor: 'rgba(56,189,248,0.5)',
        boxShadow: '0 0 0 3px rgba(56,189,248,0.12)',
    },
    input: {
        flex: 1,
        background: 'transparent',
        border: 'none',
        outline: 'none',
        color: '#dee2f2',
        fontSize: 14,
        padding: '12px 14px',
        fontFamily: 'inherit',
    },
    eyeBtn: {
        width: 38,
        height: '100%',
        padding: 0,
        background: 'transparent',
        border: 'none',
        color: '#c4c5d5',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },

    checkRow: { display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' },
    check: { position: 'relative', width: 18, height: 18, marginTop: 1, flexShrink: 0 },
    checkInput: {
        position: 'absolute',
        inset: 0,
        opacity: 0,
        cursor: 'pointer',
        margin: 0,
    },
    checkBox: {
        position: 'absolute',
        inset: 0,
        borderRadius: 5,
        background: 'rgba(14,19,30,0.7)',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'rgba(129,140,248,0.3)',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all .15s',
    },
    checkBoxActive: {
        background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
        borderColor: 'rgba(56,189,248,0.6)',
        boxShadow: '0 0 0 3px rgba(56,189,248,0.12)',
    },
    checkText: { fontSize: 12.5, lineHeight: 1.5, color: '#c4c5d5' },

    errorBox: {
        padding: '10px 14px',
        borderRadius: 10,
        background: 'rgba(239,68,68,0.08)',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'rgba(239,68,68,0.25)',
        color: '#f87171',
        fontSize: 13,
        textAlign: 'center',
    },
    infoBox: {
        padding: '10px 14px',
        borderRadius: 10,
        background: 'rgba(56,189,248,0.08)',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'rgba(56,189,248,0.25)',
        color: '#38bdf8',
        fontSize: 13,
        textAlign: 'center',
    },

    submit: {
        marginTop: 4,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '13px 18px',
        borderRadius: 11,
        background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%)',
        border: 'none',
        color: '#fff',
        fontFamily: 'inherit',
        fontSize: 14.5,
        fontWeight: 600,
        boxShadow: '0 12px 30px -8px rgba(56,189,248,0.5)',
        transition: 'transform .15s',
    },

    switch: { fontSize: 13, color: '#c4c5d5', textAlign: 'center', margin: '4px 0 0' },
    switchBtn: {
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: '#38bdf8',
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: 500,
        padding: 0,
        textDecoration: 'underline',
        textDecorationColor: 'rgba(56,189,248,0.4)',
        textUnderlineOffset: 3,
    },

    formFooter: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: MONO,
        fontSize: 10.5,
        letterSpacing: 0.5,
        color: '#c4c5d5',
        alignSelf: 'center',
        marginTop: 4,
    },
    formFooterDot: { width: 5, height: 5, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' },
}
