import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CoachAdminTabs } from '@/components/coach/CoachAdminTabs'
import { StudentMetricsCard } from '@/components/coach/StudentMetricsCard'
import { getCoachMetrics } from '@/lib/coach/metrics'
import { scoreColor } from '@/lib/coach/scorecard'

export const metadata = { title: 'Evaluaciones de alumnos · GSA' }

export default async function CoachAlumnosPage() {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'ADMIN') redirect('/admin')

    const metrics = await getCoachMetrics()
    const evaluated = metrics.students.filter((s) => s.evaluations > 0)

    return (
        <div className="max-w-4xl">
            <h1 className="text-[22px] font-bold mb-1" style={{ color: '#dee2f2' }}>
                Evaluaciones de alumnos
            </h1>
            <CoachAdminTabs />

            {metrics.students.length === 0 && metrics.staff.length === 0 ? (
                <p className="text-[13.5px]" style={{ color: '#7a8094' }}>
                    Todavía no hay evaluaciones. Cuando un alumno use el Coach IA aparecerán aquí.
                </p>
            ) : (
                <>
                    {/* Resumen de la academia */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                        <Kpi label="Alumnos evaluados" value={String(evaluated.length)} />
                        <Kpi label="Evaluaciones" value={String(metrics.totalEvaluations)} />
                        <Kpi
                            label="Nota media"
                            value={
                                metrics.totalEvaluations
                                    ? `${Math.round(metrics.academyAverage)}/100`
                                    : '—'
                            }
                            color={
                                metrics.totalEvaluations
                                    ? scoreColor(metrics.academyAverage / 100)
                                    : undefined
                            }
                        />
                        <Kpi
                            label="Fase más floja"
                            value={
                                metrics.academyWeakest
                                    ? `${Math.round(metrics.academyWeakest.pct * 100)}%`
                                    : '—'
                            }
                            sub={metrics.academyWeakest?.label}
                            color={
                                metrics.academyWeakest
                                    ? scoreColor(metrics.academyWeakest.pct)
                                    : undefined
                            }
                        />
                    </div>

                    {metrics.totalEvaluations === 0 && (
                        <p
                            className="text-[13px] mb-4 px-4 py-3 rounded-xl"
                            style={{
                                background: 'rgba(251,191,36,0.08)',
                                border: '1px solid rgba(251,191,36,0.25)',
                                color: '#fbbf24',
                            }}
                        >
                            Ningún alumno tiene todavía una evaluación puntuada. Las métricas
                            aparecerán cuando peguen transcripciones y el coach las puntúe.
                        </p>
                    )}

                    {metrics.students.length === 0 ? (
                        <p className="text-[13.5px] mb-6" style={{ color: '#7a8094' }}>
                            Ningún alumno ha usado el Coach IA todavía.
                        </p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {metrics.students.map((s) => (
                                <StudentMetricsCard key={s.userId} student={s} />
                            ))}
                        </div>
                    )}

                    {/*
                      * Los admins van aparte y fuera de las medias: usan el coach para probarlo,
                      * no para formarse, y sus pruebas distorsionarían la señal de dónde
                      * reforzar la formación.
                      */}
                    {metrics.staff.length > 0 && (
                        <section className="mt-8">
                            <div className="flex items-baseline gap-2 mb-1">
                                <h2 className="text-[15px] font-semibold" style={{ color: '#dee2f2' }}>
                                    Equipo
                                </h2>
                                <span
                                    className="text-[10px] px-2 py-0.5 rounded-full"
                                    style={{
                                        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                                        background: 'rgba(251,146,60,0.12)',
                                        border: '1px solid rgba(251,146,60,0.3)',
                                        color: '#fb923c',
                                    }}
                                >
                                    ADMIN
                                </span>
                            </div>
                            <p className="text-[12.5px] mb-3" style={{ color: '#5a6178' }}>
                                Pruebas del equipo con el coach. No cuentan en las métricas de la
                                academia.
                            </p>
                            <div className="flex flex-col gap-3">
                                {metrics.staff.map((s) => (
                                    <StudentMetricsCard key={s.userId} student={s} />
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    )
}

function Kpi({
    label,
    value,
    sub,
    color,
}: {
    label: string
    value: string
    sub?: string
    color?: string
}) {
    return (
        <div
            className="px-4 py-3.5 rounded-xl min-w-0"
            style={{
                background: 'linear-gradient(180deg, rgba(20,25,38,0.6), rgba(14,19,30,0.6))',
                border: '1px solid rgba(129,140,248,0.14)',
            }}
        >
            <div
                className="text-[9.5px] mb-1.5"
                style={{
                    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
                    letterSpacing: 1.3,
                    color: '#5a6178',
                }}
            >
                {label.toUpperCase()}
            </div>
            <div
                className="text-[20px] font-semibold leading-none truncate"
                style={{ color: color ?? '#dee2f2', letterSpacing: -0.4 }}
            >
                {value}
            </div>
            {sub && (
                <div className="text-[11px] mt-1 truncate" style={{ color: '#7a8094' }}>
                    {sub}
                </div>
            )}
        </div>
    )
}
