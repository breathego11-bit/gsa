import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CoachAdminTabs } from '@/components/coach/CoachAdminTabs'

export const metadata = { title: 'Uso y costos del Coach · GSA' }

function usd(n: number): string {
    return '$' + n.toFixed(n >= 10 ? 2 : 4)
}
function n0(n: number): string {
    return Math.round(n).toLocaleString('es-ES')
}
function toNum(d: unknown): number {
    return d == null ? 0 : Number(d)
}

export default async function CoachUsoPage() {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'ADMIN') redirect('/admin')

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [allTime, thisMonth, perUserRaw, perModel] = await Promise.all([
        prisma.coachUsage.aggregate({
            _sum: { cost_usd: true, input_tokens: true, output_tokens: true },
            _count: true,
        }),
        prisma.coachUsage.aggregate({
            where: { created_at: { gte: monthStart } },
            _sum: { cost_usd: true },
            _count: true,
        }),
        prisma.coachUsage.groupBy({
            by: ['user_id'],
            _sum: { cost_usd: true, input_tokens: true, output_tokens: true },
            _count: true,
        }),
        prisma.coachUsage.groupBy({
            by: ['model'],
            _sum: { cost_usd: true },
            _count: true,
        }),
    ])

    // Resolver nombres/roles de los usuarios con consumo.
    const userIds = perUserRaw.map((r) => r.user_id)
    const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, last_name: true, email: true, role: true },
    })
    const userMap = new Map(users.map((u) => [u.id, u]))

    const perUser = perUserRaw
        .map((r) => ({
            user: userMap.get(r.user_id),
            calls: r._count,
            inTok: toNum(r._sum.input_tokens),
            outTok: toNum(r._sum.output_tokens),
            cost: toNum(r._sum.cost_usd),
        }))
        .sort((a, b) => b.cost - a.cost)

    const totalCost = toNum(allTime._sum.cost_usd)
    const totalIn = toNum(allTime._sum.input_tokens)
    const totalOut = toNum(allTime._sum.output_tokens)
    const monthCost = toNum(thisMonth._sum.cost_usd)

    const cardStyle = {
        background: 'rgba(20,25,38,0.5)',
        border: '1px solid rgba(129,140,248,0.14)',
    } as const

    return (
        <div>
            <h1 className="text-[22px] font-bold mb-1" style={{ color: '#dee2f2' }}>
                Uso y costos del Coach IA
            </h1>
            <CoachAdminTabs />

            <p className="text-[12.5px] mb-5" style={{ color: '#7a8094' }}>
                Consumo <strong style={{ color: '#9ca3b8' }}>real</strong> facturado por OpenAI (tokens del
                campo <code>usage</code> de cada respuesta) × la tarifa vigente. Cuadra con el dashboard de OpenAI.
            </p>

            {/* Tarjetas resumen */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 max-w-4xl">
                <div className="rounded-xl p-4" style={cardStyle}>
                    <div className="text-[10px] mb-1" style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1, color: '#7a8094' }}>
                        GASTO TOTAL
                    </div>
                    <div className="text-[22px] font-bold" style={{ color: '#34d399' }}>{usd(totalCost)}</div>
                </div>
                <div className="rounded-xl p-4" style={cardStyle}>
                    <div className="text-[10px] mb-1" style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1, color: '#7a8094' }}>
                        ESTE MES
                    </div>
                    <div className="text-[22px] font-bold" style={{ color: '#38bdf8' }}>{usd(monthCost)}</div>
                    <div className="text-[10.5px] mt-0.5" style={{ color: '#5a6178' }}>{thisMonth._count} llamadas</div>
                </div>
                <div className="rounded-xl p-4" style={cardStyle}>
                    <div className="text-[10px] mb-1" style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1, color: '#7a8094' }}>
                        TOKENS TOTALES
                    </div>
                    <div className="text-[18px] font-bold" style={{ color: '#dee2f2' }}>{n0(totalIn + totalOut)}</div>
                    <div className="text-[10.5px] mt-0.5" style={{ color: '#5a6178' }}>
                        {n0(totalIn)} in · {n0(totalOut)} out
                    </div>
                </div>
                <div className="rounded-xl p-4" style={cardStyle}>
                    <div className="text-[10px] mb-1" style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1, color: '#7a8094' }}>
                        LLAMADAS A LA API
                    </div>
                    <div className="text-[22px] font-bold" style={{ color: '#dee2f2' }}>{allTime._count}</div>
                </div>
            </div>

            {/* Por persona */}
            <h2 className="text-[15px] font-semibold mb-3" style={{ color: '#dee2f2' }}>Gasto por persona</h2>
            <div className="overflow-x-auto max-w-4xl mb-8">
                {perUser.length === 0 ? (
                    <p className="text-[13px]" style={{ color: '#7a8094' }}>Todavía no hay consumo registrado.</p>
                ) : (
                    <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ color: '#7a8094' }}>
                                <th className="text-left font-medium px-3 py-2">Persona</th>
                                <th className="text-left font-medium px-3 py-2">Rol</th>
                                <th className="text-right font-medium px-3 py-2">Llamadas</th>
                                <th className="text-right font-medium px-3 py-2">Tokens</th>
                                <th className="text-right font-medium px-3 py-2">Costo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {perUser.map((row, i) => (
                                <tr key={i} style={{ borderTop: '1px solid rgba(129,140,248,0.1)' }}>
                                    <td className="px-3 py-2.5" style={{ color: '#dee2f2' }}>
                                        {row.user ? `${row.user.name} ${row.user.last_name}` : 'Usuario eliminado'}
                                        <div className="text-[10.5px]" style={{ color: '#5a6178' }}>{row.user?.email}</div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <span
                                            className="text-[10px] px-1.5 py-0.5 rounded"
                                            style={{
                                                fontFamily: 'JetBrains Mono, monospace',
                                                background: row.user?.role === 'ADMIN' ? 'rgba(251,146,60,0.12)' : 'rgba(56,189,248,0.12)',
                                                color: row.user?.role === 'ADMIN' ? '#fb923c' : '#38bdf8',
                                            }}
                                        >
                                            {row.user?.role === 'ADMIN' ? 'ADMIN' : 'ALUMNO'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-right" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#c7cede' }}>{row.calls}</td>
                                    <td className="px-3 py-2.5 text-right" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#c7cede' }}>{n0(row.inTok + row.outTok)}</td>
                                    <td className="px-3 py-2.5 text-right font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#34d399' }}>{usd(row.cost)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Por modelo */}
            <h2 className="text-[15px] font-semibold mb-3" style={{ color: '#dee2f2' }}>Gasto por modelo</h2>
            <div className="flex flex-col gap-1.5 max-w-md">
                {perModel.map((m) => (
                    <div
                        key={m.model}
                        className="flex items-center justify-between px-4 py-2.5 rounded-lg"
                        style={cardStyle}
                    >
                        <span className="text-[12.5px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#c7cede' }}>{m.model}</span>
                        <span className="text-[12px]" style={{ color: '#7a8094' }}>
                            {m._count} llamadas · <span style={{ color: '#34d399', fontWeight: 600 }}>{usd(toNum(m._sum.cost_usd))}</span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}
