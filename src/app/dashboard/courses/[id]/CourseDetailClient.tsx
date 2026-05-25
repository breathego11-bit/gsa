'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

/* ── Types ─────────────────────────────────────────────────────────── */

type CourseInfo = {
    id: string
    title: string
    description: string
    tagline: string | null
    hero_image: string | null
    tier: string | null
    level: string | null
    language: string | null
    certificate: boolean
    rating: number | null
    includedItems: string[]
    requirements: string[]
}

type Stats = {
    totalModules: number
    totalLessons: number
    totalDurationMin: number
    completedCount: number
    percent: number
    enrollmentsCount: number
}

type CurrentLesson = {
    id: string
    moduleTitle: string
    numberInModule: number
    title: string
    duration: number | null
    type: string
}

type Instructor = {
    id: string
    name: string
    lastName: string
    title: string | null
    bio: string | null
    profileImage: string | null
    coursesCount: number
    studentsCount: number
}

type CohortMember = {
    id: string
    name: string
    lastName: string
    profileImage: string | null
}

type LessonView = {
    id: string
    title: string
    order: number
    duration: number | null
    type: string
    thumbnail: string | null
    completed: boolean
    current: boolean
}

type ModuleView = {
    id: string
    title: string
    order: number
    locked: boolean
    lessons: LessonView[]
    completedCount: number
    progress: number
    durationMin: number
}

type ResourceItem = { id: string; name: string; url: string; type: string; lessonTitle: string }

type Tab = 'about' | 'curriculum' | 'instructors' | 'resources'

/* ── Helpers ───────────────────────────────────────────────────────── */

function fmtDuration(min: number): string {
    if (!min) return '0m'
    const h = Math.floor(min / 60)
    const m = min % 60
    if (h > 0 && m > 0) return `${h}h ${m}m`
    if (h > 0) return `${h}h`
    return `${m}m`
}

function initials(name: string, lastName: string): string {
    return `${(name?.[0] ?? '').toUpperCase()}${(lastName?.[0] ?? '').toUpperCase()}` || '·'
}

const LESSON_TYPE_LABEL: Record<string, string> = {
    VIDEO: 'Video',
    TEXT: 'Lectura',
    FORM: 'Formulario',
    EXAM: 'Examen',
}
const LESSON_TYPE_ICON: Record<string, string> = {
    VIDEO: 'play_arrow',
    TEXT: 'article',
    FORM: 'assignment',
    EXAM: 'quiz',
}

/* ── Component ─────────────────────────────────────────────────────── */

export function CourseDetailClient({
    course,
    stats,
    currentLesson,
    instructors,
    cohort,
    modules,
    resources,
}: {
    course: CourseInfo
    stats: Stats
    currentLesson: CurrentLesson | null
    instructors: Instructor[]
    cohort: CohortMember[]
    modules: ModuleView[]
    resources: ResourceItem[]
}) {
    const [tab, setTab] = useState<Tab>('about')
    const [expanded, setExpanded] = useState<Set<string>>(
        new Set(modules.length > 0 ? [modules[0].id] : []),
    )

    function toggle(id: string) {
        setExpanded((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const expandAll = () => setExpanded(new Set(modules.map((m) => m.id)))
    const collapseAll = () => setExpanded(new Set())

    const breadcrumbCategory = (course.tier || 'CURSO').toUpperCase()
    const remaining = stats.totalLessons - stats.completedCount
    const showResourcesTab = resources.length > 0

    return (
        <div className="relative -mx-6 -my-6 md:-mx-8 md:-my-8 px-6 py-6 md:px-8 md:py-8 overflow-hidden">
            {/* Decorative glows */}
            <div
                aria-hidden
                className="pointer-events-none absolute -top-48 -right-24 w-[800px] h-[800px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(56,189,248,0.14) 0%, transparent 60%)',
                    filter: 'blur(60px)',
                }}
            />
            <div
                aria-hidden
                className="pointer-events-none absolute top-40 -left-48 w-[600px] h-[600px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(129,140,248,0.10) 0%, transparent 60%)',
                    filter: 'blur(60px)',
                }}
            />
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-[540px]"
                style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(56,189,248,0.10) 1px, transparent 0)',
                    backgroundSize: '32px 32px',
                    maskImage: 'linear-gradient(180deg, black 0%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(180deg, black 0%, transparent 100%)',
                }}
            />

            <div className="relative">
                {/* Back link */}
                <Link
                    href="/dashboard/courses"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-on-surface-variant hover:text-on-surface transition-colors mb-5"
                    style={{ background: 'rgba(20,25,38,0.5)', border: '1px solid rgba(129,140,248,0.15)' }}
                >
                    <MaterialIcon name="arrow_back" size="text-sm" />
                    Volver a mis cursos
                </Link>

                {/* Hero */}
                <section className="grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_minmax(300px,1fr)] gap-6 mb-7">
                    {/* Left */}
                    <div className="flex flex-col gap-4">
                        {/* Breadcrumb */}
                        <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-[0.12em] text-on-surface-variant/70 uppercase">
                            <span>BIBLIOTECA</span>
                            <MaterialIcon name="chevron_right" size="text-xs" className="opacity-70" />
                            <span>{breadcrumbCategory}</span>
                            <MaterialIcon name="chevron_right" size="text-xs" className="opacity-70" />
                            <span className="text-sky-400 truncate">{course.title.toUpperCase()}</span>
                        </div>

                        {/* Chips */}
                        <div className="flex flex-wrap gap-1.5">
                            <Chip accent>
                                <MaterialIcon name="layers" size="text-xs" />
                                {stats.totalModules} módulos · {stats.totalLessons} lecciones
                            </Chip>
                            {course.level && (
                                <Chip>
                                    <MaterialIcon name="signal_cellular_alt" size="text-xs" />
                                    {course.level}
                                </Chip>
                            )}
                            {stats.totalDurationMin > 0 && (
                                <Chip>
                                    <MaterialIcon name="schedule" size="text-xs" />
                                    {fmtDuration(stats.totalDurationMin)}
                                </Chip>
                            )}
                            {course.language && (
                                <Chip>
                                    <MaterialIcon name="public" size="text-xs" />
                                    {course.language}
                                </Chip>
                            )}
                        </div>

                        {/* Title */}
                        <h1
                            className="font-semibold text-on-surface m-0"
                            style={{ fontSize: 'clamp(28px, 5vw, 52px)', letterSpacing: '-1.5px', lineHeight: 1.05 }}
                        >
                            {course.title}
                        </h1>
                        {course.tagline && (
                            <p className="text-base text-on-surface-variant leading-relaxed max-w-xl m-0">
                                {course.tagline}
                            </p>
                        )}

                        {/* Instructors row */}
                        {instructors.length > 0 && (
                            <div className="flex items-center gap-3.5 mt-1">
                                <div className="flex">
                                    {instructors.map((ins, i) => (
                                        <Avatar
                                            key={ins.id}
                                            name={ins.name}
                                            lastName={ins.lastName}
                                            profileImage={ins.profileImage}
                                            size={36}
                                            style={{
                                                marginLeft: i ? -8 : 0,
                                                zIndex: instructors.length - i,
                                            }}
                                        />
                                    ))}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold text-on-surface truncate">
                                        {instructors.map((i) => `${i.name} ${i.lastName}`).join(' · ')}
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] font-mono text-on-surface-variant mt-0.5">
                                        {course.rating != null && (
                                            <>
                                                <MaterialIcon name="star" size="text-xs" className="text-amber-400" />
                                                <strong className="text-on-surface">{course.rating.toFixed(1)}</strong>
                                                <Sep />
                                            </>
                                        )}
                                        <MaterialIcon name="group" size="text-xs" />
                                        <span>{stats.enrollmentsCount} alumnos</span>
                                        {course.certificate && (
                                            <>
                                                <Sep />
                                                <MaterialIcon name="workspace_premium" size="text-xs" />
                                                <span>Certificado</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Continue card */}
                    <ContinueCard
                        currentLesson={currentLesson}
                        stats={stats}
                        completedCount={stats.completedCount}
                        remaining={remaining}
                    />
                </section>

                {/* Tabs */}
                <nav
                    className="flex flex-wrap gap-0 mb-6"
                    style={{ borderBottom: '1px solid rgba(129,140,248,0.15)' }}
                >
                    {[
                        { id: 'about' as const, label: 'Acerca del curso', count: null },
                        { id: 'curriculum' as const, label: 'Contenido', count: stats.totalLessons },
                        { id: 'instructors' as const, label: 'Instructores', count: instructors.length },
                        ...(showResourcesTab
                            ? [{ id: 'resources' as const, label: 'Recursos', count: resources.length }]
                            : []),
                    ].map((t) => {
                        const active = tab === t.id
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setTab(t.id)}
                                className={`relative inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                                    active ? 'text-on-surface' : 'text-on-surface-variant hover:text-on-surface/90'
                                }`}
                            >
                                <span>{t.label}</span>
                                {t.count != null && (
                                    <span
                                        className="text-[10px] font-mono px-1.5 py-0.5 rounded text-on-surface-variant"
                                        style={{ background: 'rgba(129,140,248,0.10)' }}
                                    >
                                        {t.count}
                                    </span>
                                )}
                                {active && (
                                    <span
                                        className="absolute -bottom-px left-3 right-3 h-0.5 rounded-full"
                                        style={{ background: 'linear-gradient(90deg, #38bdf8, #818cf8)' }}
                                    />
                                )}
                            </button>
                        )
                    })}
                </nav>

                {/* Tab panels */}
                {tab === 'about' && <AboutTab course={course} stats={stats} cohort={cohort} />}

                {tab === 'curriculum' && (
                    <CurriculumTab
                        modules={modules}
                        stats={stats}
                        expanded={expanded}
                        onToggle={toggle}
                        onExpandAll={expandAll}
                        onCollapseAll={collapseAll}
                    />
                )}

                {tab === 'instructors' && <InstructorsTab instructors={instructors} />}

                {tab === 'resources' && showResourcesTab && <ResourcesTab resources={resources} />}
            </div>
        </div>
    )
}

/* ── Pieces ────────────────────────────────────────────────────────── */

function Chip({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
    return (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[10.5px] tracking-wide"
            style={
                accent
                    ? {
                          background: 'rgba(56,189,248,0.12)',
                          border: '1px solid rgba(56,189,248,0.35)',
                          color: '#38bdf8',
                      }
                    : {
                          background: 'rgba(20,25,38,0.5)',
                          border: '1px solid rgba(129,140,248,0.18)',
                          color: 'var(--text-secondary)',
                      }
            }
        >
            {children}
        </span>
    )
}

function Sep() {
    return (
        <span
            aria-hidden
            className="inline-block w-[3px] h-[3px] rounded-full"
            style={{ background: 'rgba(154,160,184,0.7)' }}
        />
    )
}

function Avatar({
    name,
    lastName,
    profileImage,
    size = 32,
    style,
}: {
    name: string
    lastName: string
    profileImage: string | null
    size?: number
    style?: React.CSSProperties
}) {
    const text = initials(name, lastName)
    return (
        <div
            className="inline-flex items-center justify-center text-white font-mono font-bold overflow-hidden shrink-0"
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                border: '2px solid #0d1422',
                fontSize: Math.round(size * 0.32),
                background: profileImage ? undefined : 'linear-gradient(135deg, #38bdf8, #818cf8)',
                ...style,
            }}
        >
            {profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profileImage} alt="" className="w-full h-full object-cover" />
            ) : (
                <span>{text}</span>
            )}
        </div>
    )
}

function ContinueCard({
    currentLesson,
    stats,
    completedCount,
    remaining,
}: {
    currentLesson: CurrentLesson | null
    stats: Stats
    completedCount: number
    remaining: number
}) {
    const allDone = currentLesson == null
    return (
        <article
            className="p-5 rounded-2xl flex flex-col gap-3.5 backdrop-blur"
            style={{
                background: 'linear-gradient(180deg, rgba(20,25,38,0.85), rgba(14,19,30,0.85))',
                border: '1px solid rgba(56,189,248,0.25)',
                boxShadow:
                    '0 20px 50px -10px rgba(56,189,248,0.18), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
        >
            <div className="inline-flex items-center gap-2 text-[10.5px] font-mono tracking-[0.13em] text-sky-400">
                <span
                    aria-hidden
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }}
                />
                <span>{allDone ? 'CURSO COMPLETADO' : 'SIGUIENTE LECCIÓN'}</span>
            </div>

            {allDone ? (
                <>
                    <div className="flex items-baseline gap-2.5">
                        <h3 className="text-xl font-semibold tracking-tight text-on-surface m-0">
                            Has completado todas las lecciones
                        </h3>
                    </div>
                    <div className="inline-flex items-center gap-2 text-[11.5px] font-mono text-on-surface-variant">
                        <MaterialIcon name="check_circle" size="text-sm" className="text-emerald-400" />
                        <span>{stats.totalLessons} de {stats.totalLessons} lecciones</span>
                    </div>
                </>
            ) : (
                <>
                    <div className="font-mono text-[11px] text-on-surface-variant tracking-wide">
                        {currentLesson.moduleTitle}
                    </div>
                    <div className="flex items-baseline gap-2.5">
                        <span
                            className="font-mono text-xs font-semibold px-2 py-0.5 rounded"
                            style={{
                                background: 'rgba(56,189,248,0.15)',
                                color: '#38bdf8',
                                border: '1px solid rgba(56,189,248,0.3)',
                            }}
                        >
                            {String(currentLesson.numberInModule).padStart(2, '0')}
                        </span>
                        <h3 className="text-xl font-semibold tracking-tight text-on-surface m-0 truncate">
                            {currentLesson.title}
                        </h3>
                    </div>
                    <div className="inline-flex items-center gap-2 text-[11.5px] font-mono text-on-surface-variant">
                        <MaterialIcon name={LESSON_TYPE_ICON[currentLesson.type] || 'play_arrow'} size="text-sm" />
                        <span>{(LESSON_TYPE_LABEL[currentLesson.type] || 'Video').toUpperCase()}</span>
                        {currentLesson.duration && (
                            <>
                                <Sep />
                                <MaterialIcon name="schedule" size="text-sm" />
                                <span>{fmtDuration(currentLesson.duration)}</span>
                            </>
                        )}
                    </div>
                </>
            )}

            {/* Progress */}
            <div
                className="flex flex-col gap-1.5 pt-3"
                style={{ borderTop: '1px dashed rgba(129,140,248,0.18)' }}
            >
                <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-[0.13em] text-on-surface-variant">
                        PROGRESO DEL CURSO
                    </span>
                    <span className="font-mono text-[13px] font-semibold text-on-surface">{stats.percent}%</span>
                </div>
                <div
                    className="relative h-1.5 rounded overflow-hidden"
                    style={{ background: 'rgba(129,140,248,0.10)' }}
                >
                    <div
                        className="h-full rounded transition-all duration-500"
                        style={{
                            width: `${stats.percent}%`,
                            background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
                            boxShadow: '0 0 8px #38bdf8',
                        }}
                    />
                    {stats.totalLessons > 1 &&
                        Array.from({ length: stats.totalLessons - 1 }).map((_, i) => (
                            <div
                                key={i}
                                className="absolute top-0 bottom-0 w-px"
                                style={{
                                    left: `${((i + 1) / stats.totalLessons) * 100}%`,
                                    background: 'rgba(8,13,24,0.8)',
                                }}
                            />
                        ))}
                </div>
                <div className="flex gap-1.5 font-mono text-[11px] text-on-surface-variant">
                    <span>
                        {completedCount} de {stats.totalLessons} lecciones completadas
                    </span>
                    {!allDone && (
                        <>
                            <span>·</span>
                            <span>{remaining} restantes</span>
                        </>
                    )}
                </div>
            </div>

            {/* CTA */}
            {!allDone && (
                <Link
                    href={`/lesson/${currentLesson.id}`}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-semibold transition-transform active:scale-[0.98]"
                    style={{
                        background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                        boxShadow:
                            '0 12px 30px -8px rgba(56,189,248,0.6), inset 0 1px 0 rgba(255,255,255,0.15)',
                    }}
                >
                    <MaterialIcon name="play_arrow" size="text-base" />
                    <span>Continuar aprendiendo</span>
                    <MaterialIcon name="arrow_forward" size="text-sm" />
                </Link>
            )}
        </article>
    )
}

/* ── About tab ─────────────────────────────────────────────────────── */

function AboutTab({
    course,
    stats,
    cohort,
}: {
    course: CourseInfo
    stats: Stats
    cohort: CohortMember[]
}) {
    return (
        <section className="grid grid-cols-1 md:grid-cols-[minmax(0,1.6fr)_minmax(260px,1fr)] gap-5">
            <article
                className="p-6 rounded-2xl"
                style={{
                    background: 'linear-gradient(180deg, rgba(20,25,38,0.5), rgba(14,19,30,0.5))',
                    border: '1px solid rgba(129,140,248,0.14)',
                }}
            >
                <h2 className="text-xl font-semibold text-on-surface tracking-tight m-0 mb-3">
                    Acerca del curso
                </h2>
                {course.description && (
                    <p className="text-sm text-on-surface-variant leading-[1.7] m-0">
                        {course.description}
                    </p>
                )}

                {course.includedItems.length > 0 && (
                    <>
                        <Divider />
                        <h3 className="font-mono uppercase text-sm font-semibold text-on-surface m-0 mb-3 tracking-tight">
                            Lo que vas a aprender
                        </h3>
                        <ul className="list-none p-0 m-0 flex flex-col gap-2.5">
                            {course.includedItems.map((it, i) => (
                                <li
                                    key={i}
                                    className="flex gap-2.5 items-start text-[13.5px] leading-[1.55]"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    <span
                                        className="inline-flex items-center justify-center shrink-0 mt-px"
                                        style={{
                                            width: 18,
                                            height: 18,
                                            borderRadius: 5,
                                            background: 'rgba(52,211,153,0.14)',
                                            border: '1px solid rgba(52,211,153,0.35)',
                                            color: '#34d399',
                                        }}
                                    >
                                        <MaterialIcon name="check" size="text-xs" />
                                    </span>
                                    <span>{it}</span>
                                </li>
                            ))}
                        </ul>
                    </>
                )}

                {course.requirements.length > 0 && (
                    <>
                        <Divider />
                        <h3 className="font-mono uppercase text-sm font-semibold text-on-surface m-0 mb-3 tracking-tight">
                            Requisitos
                        </h3>
                        <ul className="list-none p-0 m-0 flex flex-col gap-2.5">
                            {course.requirements.map((it, i) => (
                                <li
                                    key={i}
                                    className="flex gap-2.5 items-start text-[13.5px] leading-[1.55]"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    <span
                                        className="inline-flex items-center justify-center shrink-0 mt-px"
                                        style={{
                                            width: 18,
                                            height: 18,
                                            borderRadius: 5,
                                            background: 'rgba(56,189,248,0.08)',
                                            color: '#38bdf8',
                                        }}
                                    >
                                        <MaterialIcon name="fiber_manual_record" size="text-xs" />
                                    </span>
                                    <span>{it}</span>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </article>

            <aside className="flex flex-col gap-3.5">
                {/* Stats */}
                <div
                    className="p-5 rounded-2xl"
                    style={{
                        background: 'linear-gradient(180deg, rgba(20,25,38,0.5), rgba(14,19,30,0.5))',
                        border: '1px solid rgba(129,140,248,0.14)',
                    }}
                >
                    <div
                        className="font-mono text-[10px] tracking-[0.13em] text-on-surface-variant pb-2.5 mb-2"
                        style={{ borderBottom: '1px solid rgba(129,140,248,0.10)' }}
                    >
                        RESUMEN
                    </div>
                    {stats.totalDurationMin > 0 && (
                        <StatRow label="Duración total" value={fmtDuration(stats.totalDurationMin)} />
                    )}
                    <StatRow label="Módulos" value={String(stats.totalModules)} />
                    <StatRow label="Lecciones" value={String(stats.totalLessons)} />
                    {course.level && <StatRow label="Nivel" value={course.level} />}
                    {course.language && <StatRow label="Idioma" value={course.language} />}
                    <StatRow label="Certificado" value={course.certificate ? 'Sí · al 100%' : 'No'} />
                    <StatRow label="Inscritos" value={`${stats.enrollmentsCount} alumnos`} />
                </div>

                {/* Cohort */}
                {stats.enrollmentsCount > 0 && (
                    <div
                        className="p-5 rounded-2xl"
                        style={{
                            background:
                                'linear-gradient(135deg, rgba(56,189,248,0.06), rgba(129,140,248,0.04))',
                            border: '1px solid rgba(56,189,248,0.20)',
                        }}
                    >
                        <div className="mb-3">
                            <div className="font-mono text-[10px] tracking-[0.13em] text-sky-400">
                                OTROS ALUMNOS
                            </div>
                            <div className="text-sm font-semibold text-on-surface mt-1">Cohorte activa</div>
                        </div>
                        {cohort.length > 0 && (
                            <div className="flex items-center mb-2.5">
                                {cohort.map((c, i) => (
                                    <Avatar
                                        key={c.id}
                                        name={c.name}
                                        lastName={c.lastName}
                                        profileImage={c.profileImage}
                                        size={30}
                                        style={{ marginLeft: i ? -10 : 0, zIndex: cohort.length - i }}
                                    />
                                ))}
                                {stats.enrollmentsCount - cohort.length > 0 && (
                                    <span className="ml-2 font-mono text-[11px] text-on-surface-variant">
                                        +{stats.enrollmentsCount - cohort.length}
                                    </span>
                                )}
                            </div>
                        )}
                        <div className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant">
                            <MaterialIcon name="group" size="text-sm" />
                            <span>
                                <strong className="text-on-surface">{stats.enrollmentsCount} alumnos</strong>{' '}
                                {stats.enrollmentsCount === 1 ? 'inscrito' : 'inscritos'} en este curso.
                            </span>
                        </div>
                    </div>
                )}
            </aside>
        </section>
    )
}

function StatRow({ label, value }: { label: string; value: string }) {
    return (
        <div
            className="flex justify-between py-1.5"
            style={{ borderBottom: '1px dashed rgba(129,140,248,0.08)' }}
        >
            <span className="text-xs text-on-surface-variant">{label}</span>
            <span className="text-xs font-mono font-medium text-on-surface">{value}</span>
        </div>
    )
}

function Divider() {
    return <div className="my-5 h-px" style={{ background: 'rgba(129,140,248,0.10)' }} />
}

/* ── Curriculum tab ────────────────────────────────────────────────── */

function CurriculumTab({
    modules,
    stats,
    expanded,
    onToggle,
    onExpandAll,
    onCollapseAll,
}: {
    modules: ModuleView[]
    stats: Stats
    expanded: Set<string>
    onToggle: (id: string) => void
    onExpandAll: () => void
    onCollapseAll: () => void
}) {
    if (modules.length === 0) {
        return (
            <div
                className="rounded-2xl p-12 text-center"
                style={{
                    background: 'linear-gradient(180deg, rgba(20,25,38,0.5), rgba(14,19,30,0.5))',
                    border: '1px solid rgba(129,140,248,0.14)',
                }}
            >
                <MaterialIcon name="school" size="text-4xl" className="text-on-surface-variant" />
                <p className="text-on-surface-variant mt-3 mb-0">El contenido está siendo preparado.</p>
            </div>
        )
    }

    return (
        <section>
            <header className="flex justify-between items-end mb-3.5 flex-wrap gap-3">
                <div>
                    <h2 className="text-xl font-semibold text-on-surface tracking-tight m-0">
                        Contenido del curso
                    </h2>
                    <p className="font-mono text-xs text-on-surface-variant tracking-wide mt-1 mb-0">
                        {stats.totalModules} módulos · {stats.totalLessons} lecciones
                        {stats.totalDurationMin > 0 ? ` · ${fmtDuration(stats.totalDurationMin)}` : ''}
                    </p>
                </div>
                <div className="flex gap-1.5">
                    <GhostBtn onClick={onExpandAll} icon="expand_more">
                        Expandir todo
                    </GhostBtn>
                    <GhostBtn onClick={onCollapseAll} icon="expand_less">
                        Contraer
                    </GhostBtn>
                </div>
            </header>

            <div className="flex flex-col gap-2.5">
                {modules.map((mod) => (
                    <ModuleAccordion
                        key={mod.id}
                        mod={mod}
                        open={expanded.has(mod.id)}
                        onToggle={() => onToggle(mod.id)}
                    />
                ))}
            </div>
        </section>
    )
}

function GhostBtn({
    onClick,
    icon,
    children,
}: {
    onClick: () => void
    icon: string
    children: React.ReactNode
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-on-surface-variant hover:text-on-surface transition-colors"
            style={{ background: 'rgba(20,25,38,0.5)', border: '1px solid rgba(129,140,248,0.18)' }}
        >
            <MaterialIcon name={icon} size="text-xs" />
            <span>{children}</span>
        </button>
    )
}

function ModuleAccordion({
    mod,
    open,
    onToggle,
}: {
    mod: ModuleView
    open: boolean
    onToggle: () => void
}) {
    const isLocked = mod.locked
    const isComplete = mod.progress === 100 && mod.lessons.length > 0
    return (
        <article
            className="rounded-2xl overflow-hidden"
            style={{
                background: 'linear-gradient(180deg, rgba(20,25,38,0.55), rgba(14,19,30,0.55))',
                border: '1px solid rgba(129,140,248,0.15)',
                opacity: isLocked ? 0.7 : 1,
                transition: 'border-color .2s',
            }}
        >
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={open}
                className="grid items-center gap-3.5 w-full px-4 py-3.5 text-left"
                style={{ gridTemplateColumns: 'auto 1fr auto', background: 'transparent' }}
            >
                <div
                    className="flex items-center justify-center font-mono font-bold text-sm shrink-0"
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 9,
                        background: 'linear-gradient(135deg, rgba(56,189,248,0.18), rgba(129,140,248,0.10))',
                        border: '1px solid rgba(56,189,248,0.3)',
                        color: '#38bdf8',
                    }}
                >
                    {String(mod.order).padStart(2, '0')}
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-base font-semibold text-on-surface tracking-tight m-0">
                            {mod.title}
                        </h3>
                        {isLocked && (
                            <Pill color="#fbbf24" bg="rgba(251,191,36,0.12)" border="rgba(251,191,36,0.3)">
                                <MaterialIcon name="lock" size="text-xs" /> PRÓXIMAMENTE
                            </Pill>
                        )}
                        {!isLocked && isComplete && (
                            <Pill color="#34d399" bg="rgba(52,211,153,0.14)" border="rgba(52,211,153,0.35)">
                                <MaterialIcon name="check" size="text-xs" /> COMPLETO
                            </Pill>
                        )}
                    </div>
                    <div className="inline-flex items-center gap-2 mt-1 font-mono text-[11.5px] text-on-surface-variant tracking-wide">
                        <span>
                            {mod.lessons.length} {mod.lessons.length === 1 ? 'lección' : 'lecciones'}
                            {mod.durationMin > 0 ? ` · ${fmtDuration(mod.durationMin)}` : ''}
                        </span>
                        {mod.progress > 0 && (
                            <>
                                <Sep />
                                <span className="text-sky-400">{mod.progress}% completado</span>
                            </>
                        )}
                    </div>
                    {mod.progress > 0 && mod.progress < 100 && (
                        <div className="mt-2 max-w-xs">
                            <div
                                className="h-[3px] rounded overflow-hidden"
                                style={{ background: 'rgba(129,140,248,0.10)' }}
                            >
                                <div
                                    className="h-full rounded"
                                    style={{
                                        width: `${mod.progress}%`,
                                        background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
                <div
                    className="flex items-center justify-center text-on-surface-variant shrink-0"
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: 'rgba(20,25,38,0.6)',
                        border: '1px solid rgba(129,140,248,0.15)',
                    }}
                >
                    <MaterialIcon name={open ? 'expand_less' : 'expand_more'} size="text-base" />
                </div>
            </button>

            <div
                className="overflow-hidden transition-all duration-300 px-4"
                style={{
                    maxHeight: open ? `${mod.lessons.length * 88 + 32}px` : '0px',
                    opacity: open ? 1 : 0,
                    pointerEvents: open ? 'auto' : 'none',
                }}
            >
                <div
                    className="flex flex-col pt-1 pb-3.5"
                    style={{ borderTop: '1px dashed rgba(129,140,248,0.12)' }}
                >
                    {mod.lessons.map((lesson, i) => (
                        <LessonRow
                            key={lesson.id}
                            lesson={lesson}
                            index={i + 1}
                            total={mod.lessons.length}
                            moduleLocked={isLocked}
                        />
                    ))}
                </div>
            </div>
        </article>
    )
}

function Pill({
    color,
    bg,
    border,
    children,
}: {
    color: string
    bg: string
    border: string
    children: React.ReactNode
}) {
    return (
        <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[9px] tracking-[0.1em] font-semibold uppercase"
            style={{ color, background: bg, border: `1px solid ${border}` }}
        >
            {children}
        </span>
    )
}

function LessonRow({
    lesson,
    index,
    total,
    moduleLocked,
}: {
    lesson: LessonView
    index: number
    total: number
    moduleLocked: boolean
}) {
    const inaccessible = moduleLocked
    const dotStyle: React.CSSProperties = {
        width: 22,
        height: 22,
        borderRadius: '50%',
        background: 'rgba(20,25,38,0.7)',
        border: '1.5px solid rgba(129,140,248,0.25)',
        color: 'var(--text-secondary)',
    }
    if (lesson.completed) {
        dotStyle.background = 'rgba(52,211,153,0.15)'
        dotStyle.border = '1.5px solid #34d399'
        dotStyle.color = '#34d399'
    } else if (lesson.current && !inaccessible) {
        dotStyle.background = 'rgba(56,189,248,0.15)'
        dotStyle.border = '1.5px solid #38bdf8'
        dotStyle.color = '#38bdf8'
    } else if (inaccessible) {
        dotStyle.background = 'rgba(251,191,36,0.10)'
        dotStyle.border = '1.5px solid rgba(251,191,36,0.30)'
        dotStyle.color = '#fbbf24'
    }

    const content = (
        <div
            className="grid items-center gap-3.5 relative rounded-lg transition-colors"
            style={{
                gridTemplateColumns: 'auto 1fr auto',
                padding: lesson.current && !inaccessible ? '11px 7px' : '12px 8px',
                background: lesson.current && !inaccessible ? 'rgba(56,189,248,0.06)' : 'transparent',
                border:
                    lesson.current && !inaccessible
                        ? '1px solid rgba(56,189,248,0.22)'
                        : '1px solid transparent',
                opacity: inaccessible ? 0.55 : 1,
            }}
        >
            {/* Timeline */}
            <div className="flex flex-col items-center self-stretch shrink-0" style={{ width: 22 }}>
                <div
                    className="flex items-center justify-center shrink-0"
                    style={dotStyle}
                >
                    {lesson.completed && <MaterialIcon name="check" size="text-xs" />}
                    {lesson.current && !lesson.completed && !inaccessible && (
                        <span
                            aria-hidden
                            style={{
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                background: '#38bdf8',
                                boxShadow: '0 0 6px #38bdf8',
                            }}
                        />
                    )}
                    {inaccessible && <MaterialIcon name="lock" size="text-xs" />}
                </div>
                {index < total && (
                    <div
                        className="flex-1 w-px mt-1"
                        style={{ background: 'rgba(129,140,248,0.15)' }}
                    />
                )}
            </div>

            {/* Body */}
            <div className="flex items-center gap-3 min-w-0">
                <span
                    className="font-mono text-[10.5px] px-1.5 py-0.5 rounded shrink-0"
                    style={{ background: 'rgba(129,140,248,0.08)', color: 'var(--text-secondary)' }}
                >
                    L{String(lesson.order).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span
                            className="text-[13.5px] font-medium"
                            style={{
                                color: lesson.completed ? 'var(--text-secondary)' : 'var(--text-primary)',
                            }}
                        >
                            {lesson.title}
                        </span>
                        {lesson.current && !inaccessible && (
                            <Pill color="#38bdf8" bg="rgba(56,189,248,0.15)" border="rgba(56,189,248,0.35)">
                                EN CURSO
                            </Pill>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-on-surface-variant tracking-wide">
                        <span className="inline-flex items-center gap-1">
                            <MaterialIcon
                                name={LESSON_TYPE_ICON[lesson.type] || 'play_arrow'}
                                size="text-xs"
                            />
                            <span>{LESSON_TYPE_LABEL[lesson.type] || 'Video'}</span>
                        </span>
                        {lesson.duration && (
                            <>
                                <Sep />
                                <span className="inline-flex items-center gap-1">
                                    <MaterialIcon name="schedule" size="text-xs" />
                                    <span>{fmtDuration(lesson.duration)}</span>
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Action */}
            <div
                className="flex items-center justify-center shrink-0"
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background:
                        lesson.current && !inaccessible
                            ? 'linear-gradient(135deg, #38bdf8, #818cf8)'
                            : 'rgba(20,25,38,0.6)',
                    border:
                        lesson.current && !inaccessible
                            ? 'none'
                            : '1px solid rgba(129,140,248,0.18)',
                    color:
                        lesson.current && !inaccessible
                            ? '#fff'
                            : 'var(--text-secondary)',
                    boxShadow:
                        lesson.current && !inaccessible
                            ? '0 6px 14px -4px rgba(56,189,248,0.5)'
                            : undefined,
                }}
            >
                <MaterialIcon
                    name={
                        inaccessible
                            ? 'lock'
                            : lesson.completed
                            ? 'restart_alt'
                            : 'play_arrow'
                    }
                    size="text-sm"
                />
            </div>
        </div>
    )

    if (inaccessible) {
        return (
            <div className="cursor-not-allowed" aria-disabled>
                {content}
            </div>
        )
    }

    return (
        <Link href={`/lesson/${lesson.id}`} className="block">
            {content}
        </Link>
    )
}

/* ── Instructors tab ───────────────────────────────────────────────── */

function InstructorsTab({ instructors }: { instructors: Instructor[] }) {
    if (instructors.length === 0) {
        return (
            <p className="text-on-surface-variant text-sm">Aún no hay instructores asignados a este curso.</p>
        )
    }
    return (
        <section>
            <h2 className="text-xl font-semibold text-on-surface tracking-tight m-0 mb-3">
                Tus instructores
            </h2>
            <div
                className="grid gap-3.5"
                style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
            >
                {instructors.map((ins) => (
                    <article
                        key={ins.id}
                        className="p-5 rounded-2xl flex flex-col gap-3"
                        style={{
                            background:
                                'linear-gradient(180deg, rgba(20,25,38,0.5), rgba(14,19,30,0.5))',
                            border: '1px solid rgba(129,140,248,0.14)',
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <Avatar
                                name={ins.name}
                                lastName={ins.lastName}
                                profileImage={ins.profileImage}
                                size={48}
                                style={{ borderRadius: 12, border: 'none' }}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="text-[14.5px] font-semibold text-on-surface tracking-tight truncate">
                                    {ins.name} {ins.lastName}
                                </div>
                                {ins.title && (
                                    <div className="font-mono text-[11.5px] text-on-surface-variant mt-0.5 tracking-wide truncate">
                                        {ins.title}
                                    </div>
                                )}
                            </div>
                        </div>
                        {ins.bio && (
                            <p className="text-[13px] text-on-surface-variant leading-[1.55] m-0">
                                {ins.bio}
                            </p>
                        )}
                        <div
                            className="flex items-center gap-2 pt-2.5 font-mono text-[11.5px] text-on-surface-variant tracking-wide"
                            style={{ borderTop: '1px dashed rgba(129,140,248,0.12)' }}
                        >
                            <span>
                                <strong className="text-on-surface">{ins.coursesCount}</strong>{' '}
                                {ins.coursesCount === 1 ? 'curso' : 'cursos'}
                            </span>
                            <Sep />
                            <span>
                                <strong className="text-on-surface">{ins.studentsCount}</strong>{' '}
                                {ins.studentsCount === 1 ? 'alumno' : 'alumnos'}
                            </span>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    )
}

/* ── Resources tab ─────────────────────────────────────────────────── */

function ResourcesTab({ resources }: { resources: ResourceItem[] }) {
    return (
        <section>
            <h2 className="text-xl font-semibold text-on-surface tracking-tight m-0 mb-2">
                Recursos del curso
            </h2>
            <p className="text-sm text-on-surface-variant mb-3.5 leading-relaxed">
                Material descargable y enlaces externos para complementar las lecciones.
            </p>
            <div className="flex flex-col gap-2">
                {resources.map((r) => (
                    <a
                        key={r.id}
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-on-surface no-underline transition-colors hover:bg-white/[0.02]"
                        style={{
                            background: 'rgba(20,25,38,0.5)',
                            border: '1px solid rgba(129,140,248,0.14)',
                        }}
                    >
                        <div
                            className="flex items-center justify-center shrink-0"
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 9,
                                background: 'rgba(56,189,248,0.12)',
                                border: '1px solid rgba(56,189,248,0.30)',
                                color: '#38bdf8',
                            }}
                        >
                            <MaterialIcon
                                name={r.type === 'link' ? 'link' : 'description'}
                                size="text-base"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[13.5px] font-medium text-on-surface truncate">{r.name}</div>
                            <div className="font-mono text-[11px] text-on-surface-variant mt-0.5 tracking-wide truncate">
                                {r.type === 'link' ? 'Enlace externo' : 'Documento'} · {r.lessonTitle}
                            </div>
                        </div>
                        <MaterialIcon
                            name={r.type === 'link' ? 'open_in_new' : 'download'}
                            size="text-base"
                            className="text-on-surface-variant"
                        />
                    </a>
                ))}
            </div>
        </section>
    )
}
