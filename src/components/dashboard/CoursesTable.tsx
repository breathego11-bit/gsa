import Link from 'next/link'
import { GraduationCap, Search, Filter, Download, Eye, MoreHorizontal, BookOpen } from 'lucide-react'

export interface CourseRowData {
    id: string
    name: string
    modulos: number
    lecciones: number
    completion: number
    published: boolean
    inscritos: number
    enrollmentMax: number
    revenueEur: number | null
    color: string
    instructor: {
        name: string
        role: string
        initials: string
        color: string
    } | null
}

interface Props {
    courses: CourseRowData[]
}

const MONO: React.CSSProperties = {
    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
}

export function CoursesTable({ courses }: Props) {
    const published = courses.filter((c) => c.published).length

    return (
        <section
            className="rounded-2xl overflow-hidden border border-outline-variant/15"
            style={{
                background: 'linear-gradient(180deg, rgb(20,25,38), rgb(14,19,30))',
            }}
        >
            <div className="px-5 py-[18px] flex justify-between items-end gap-3 flex-wrap border-b border-outline-variant/10">
                <div>
                    <div
                        className="inline-flex items-center gap-1.5 text-[10px] uppercase mb-1"
                        style={{ ...MONO, letterSpacing: 1.2, color: '#38bdf8' }}
                    >
                        <BookOpen size={11} />
                        <span>CATÁLOGO · {courses.length} {courses.length === 1 ? 'CURSO' : 'CURSOS'}{published > 0 ? ` · ${published} ACTIVOS` : ''}</span>
                    </div>
                    <h2
                        className="m-0 font-semibold"
                        style={{ fontSize: 17, color: '#dee2f2', letterSpacing: -0.4 }}
                    >
                        Gestión de cursos
                    </h2>
                </div>
                <div className="flex gap-1.5 items-center">
                    <div
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg"
                        style={{
                            background: 'rgba(8,13,24,0.5)',
                            border: '1px solid rgba(129,140,248,0.18)',
                            color: '#7a8094',
                        }}
                    >
                        <Search size={12} />
                        <input
                            className="bg-transparent border-none text-on-surface text-xs outline-none min-w-[160px]"
                            placeholder="Buscar curso, instructor..."
                            type="text"
                        />
                    </div>
                    <button
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{
                            background: 'rgba(8,13,24,0.5)',
                            border: '1px solid rgba(129,140,248,0.18)',
                            color: '#9ca3b8',
                        }}
                        aria-label="Filtrar"
                    >
                        <Filter size={12} />
                    </button>
                    <button
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{
                            background: 'rgba(8,13,24,0.5)',
                            border: '1px solid rgba(129,140,248,0.18)',
                            color: '#9ca3b8',
                        }}
                        aria-label="Descargar"
                    >
                        <Download size={12} />
                    </button>
                </div>
            </div>

            {courses.length === 0 ? (
                <div className="p-16 text-center">
                    <GraduationCap className="mx-auto mb-3" size={42} style={{ color: '#7a809466' }} />
                    <p style={{ color: '#9ca3b8' }}>No hay cursos creados aún</p>
                </div>
            ) : (
                <>
                    <div
                        className="hidden lg:flex gap-3 px-5 py-2.5 border-b border-outline-variant/10"
                        style={{
                            ...MONO,
                            fontSize: 9.5,
                            letterSpacing: 1.2,
                            color: '#5a6178',
                            background: 'rgba(8,13,24,0.3)',
                        }}
                    >
                        <span style={{ flex: '2 1 220px' }}>CURSO</span>
                        <span style={{ flex: '1.4 1 160px' }}>INSTRUCTOR</span>
                        <span style={{ flex: '1 1 100px' }}>ESTADO</span>
                        <span style={{ flex: '1.6 1 180px' }}>INSCRITOS</span>
                        <span style={{ flex: '1.1 1 130px', textAlign: 'right' }}>INGRESOS</span>
                        <span style={{ flex: '0 0 60px' }} />
                    </div>

                    <div className="lg:hidden flex flex-col gap-3 p-4">
                        {courses.map((c) => (
                            <MobileCourseCard key={c.id} course={c} />
                        ))}
                    </div>

                    <div className="hidden lg:block">
                        {courses.map((c) => (
                            <CourseRow key={c.id} course={c} />
                        ))}
                    </div>
                </>
            )}
        </section>
    )
}

function CourseRow({ course }: { course: CourseRowData }) {
    const enrolPct = course.enrollmentMax
        ? Math.min(course.inscritos / course.enrollmentMax, 1)
        : 0

    return (
        <Link
            href={`/admin/courses/${course.id}/builder`}
            className="flex gap-3 px-5 py-3.5 border-b border-outline-variant/10 hover:bg-white/[0.02] transition-colors"
        >
            <div className="flex flex-col justify-center min-w-0" style={{ flex: '2 1 220px' }}>
                <div className="flex items-center gap-3">
                    <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border"
                        style={{
                            color: course.color,
                            background: course.color + '14',
                            borderColor: course.color + '40',
                        }}
                    >
                        <GraduationCap size={15} />
                    </div>
                    <div className="min-w-0">
                        <div
                            className="font-semibold truncate"
                            style={{ fontSize: 13.5, color: '#dee2f2', letterSpacing: -0.2 }}
                        >
                            {course.name}
                        </div>
                        <div
                            className="mt-0.5 truncate"
                            style={{ ...MONO, fontSize: 11, color: '#7a8094', letterSpacing: 0.2 }}
                        >
                            {course.modulos} módulos · {course.lecciones} lecciones · {course.completion}% completion
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col justify-center min-w-0" style={{ flex: '1.4 1 160px' }}>
                {course.instructor ? (
                    <div className="flex items-center gap-2">
                        <div
                            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border"
                            style={{
                                ...MONO,
                                fontSize: 10,
                                fontWeight: 600,
                                background: course.instructor.color + '22',
                                color: course.instructor.color,
                                borderColor: course.instructor.color + '40',
                            }}
                        >
                            {course.instructor.initials}
                        </div>
                        <div className="min-w-0">
                            <div
                                className="truncate"
                                style={{ fontSize: 12.5, color: '#dee2f2', fontWeight: 500 }}
                            >
                                {course.instructor.name}
                            </div>
                            <div
                                className="mt-0.5 truncate"
                                style={{ ...MONO, fontSize: 10.5, color: '#7a8094', letterSpacing: 0.2 }}
                            >
                                {course.instructor.role}
                            </div>
                        </div>
                    </div>
                ) : (
                    <span style={{ fontSize: 12, color: '#7a809480' }}>Sin asignar</span>
                )}
            </div>

            <div className="flex flex-col justify-center" style={{ flex: '1 1 100px' }}>
                <StatusPill published={course.published} />
            </div>

            <div className="flex flex-col justify-center min-w-0" style={{ flex: '1.6 1 180px' }}>
                <div className="flex items-baseline gap-1.5 mb-1.5">
                    <span className="font-semibold" style={{ fontSize: 15, color: '#dee2f2' }}>
                        {course.inscritos}
                    </span>
                    {course.enrollmentMax > 0 && (
                        <span
                            style={{ ...MONO, fontSize: 11.5, color: '#7a8094' }}
                        >
                            / {course.enrollmentMax}
                        </span>
                    )}
                </div>
                <div
                    className="h-1 rounded overflow-hidden"
                    style={{ background: 'rgba(129,140,248,0.1)' }}
                >
                    <div
                        className="h-full rounded transition-all"
                        style={{
                            width: `${enrolPct * 100}%`,
                            background: `linear-gradient(90deg, ${course.color}, #818cf8)`,
                        }}
                    />
                </div>
            </div>

            <div
                className="flex flex-col justify-center text-right"
                style={{ flex: '1.1 1 130px' }}
            >
                <div
                    className="font-semibold"
                    style={{ fontSize: 14, color: '#34d399', letterSpacing: -0.2 }}
                >
                    {course.revenueEur != null
                        ? `€${course.revenueEur.toLocaleString('es-ES')}`
                        : '—'}
                </div>
                <div
                    className="mt-0.5"
                    style={{ ...MONO, fontSize: 10.5, color: '#7a8094', letterSpacing: 0.2 }}
                >
                    {course.published ? 'estimado · precio × inscritos' : 'sin lanzar'}
                </div>
            </div>

            <div
                className="flex flex-row items-center justify-end gap-1"
                style={{ flex: '0 0 60px' }}
            >
                <span
                    className="w-7 h-7 rounded-md flex items-center justify-center"
                    style={{
                        background: 'rgba(8,13,24,0.5)',
                        border: '1px solid rgba(129,140,248,0.15)',
                        color: '#9ca3b8',
                    }}
                >
                    <Eye size={13} />
                </span>
                <span
                    className="w-7 h-7 rounded-md flex items-center justify-center"
                    style={{
                        background: 'rgba(8,13,24,0.5)',
                        border: '1px solid rgba(129,140,248,0.15)',
                        color: '#9ca3b8',
                    }}
                >
                    <MoreHorizontal size={13} />
                </span>
            </div>
        </Link>
    )
}

function MobileCourseCard({ course }: { course: CourseRowData }) {
    const enrolPct = course.enrollmentMax
        ? Math.min(course.inscritos / course.enrollmentMax, 1)
        : 0
    return (
        <Link
            href={`/admin/courses/${course.id}/builder`}
            className="rounded-xl p-4 border border-outline-variant/10 flex flex-col gap-3"
            style={{ background: 'rgba(8,13,24,0.4)' }}
        >
            <div className="flex items-start gap-3">
                <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border"
                    style={{
                        color: course.color,
                        background: course.color + '14',
                        borderColor: course.color + '40',
                    }}
                >
                    <GraduationCap size={17} />
                </div>
                <div className="min-w-0 flex-1">
                    <div
                        className="font-semibold"
                        style={{ fontSize: 14, color: '#dee2f2', letterSpacing: -0.2 }}
                    >
                        {course.name}
                    </div>
                    <div
                        className="mt-0.5"
                        style={{ ...MONO, fontSize: 11, color: '#7a8094', letterSpacing: 0.2 }}
                    >
                        {course.modulos} módulos · {course.lecciones} lecciones
                    </div>
                </div>
                <StatusPill published={course.published} />
            </div>
            <div>
                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                    <span style={{ ...MONO, fontSize: 11, color: '#7a8094', letterSpacing: 1 }}>
                        INSCRITOS
                    </span>
                    <span className="font-semibold" style={{ fontSize: 13, color: '#dee2f2' }}>
                        {course.inscritos}
                        {course.enrollmentMax > 0 && (
                            <span style={{ ...MONO, color: '#7a8094', marginLeft: 4 }}>
                                / {course.enrollmentMax}
                            </span>
                        )}
                    </span>
                </div>
                <div
                    className="h-1 rounded overflow-hidden"
                    style={{ background: 'rgba(129,140,248,0.1)' }}
                >
                    <div
                        className="h-full rounded"
                        style={{
                            width: `${enrolPct * 100}%`,
                            background: `linear-gradient(90deg, ${course.color}, #818cf8)`,
                        }}
                    />
                </div>
            </div>
            <div className="flex items-center justify-between">
                <span style={{ ...MONO, fontSize: 11, color: '#7a8094' }}>
                    {course.completion}% completion
                </span>
                <span
                    className="font-semibold"
                    style={{ fontSize: 13, color: '#34d399' }}
                >
                    {course.revenueEur != null
                        ? `€${course.revenueEur.toLocaleString('es-ES')}`
                        : '—'}
                </span>
            </div>
        </Link>
    )
}

function StatusPill({ published }: { published: boolean }) {
    const style = published
        ? {
            background: 'rgba(52,211,153,0.14)',
            color: '#34d399',
            borderColor: 'rgba(52,211,153,0.35)',
            dot: '#34d399',
        }
        : {
            background: 'rgba(251,191,36,0.12)',
            color: '#fbbf24',
            borderColor: 'rgba(251,191,36,0.35)',
            dot: '#fbbf24',
        }

    return (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold border"
            style={{
                ...MONO,
                fontSize: 10,
                letterSpacing: 1,
                background: style.background,
                color: style.color,
                borderColor: style.borderColor,
            }}
        >
            <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: style.dot }}
            />
            {published ? 'PUBLICADO' : 'BORRADOR'}
        </span>
    )
}
