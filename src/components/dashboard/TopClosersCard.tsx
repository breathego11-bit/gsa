import { Trophy } from 'lucide-react'

export interface TopCloserItem {
    id: string
    name: string
    initials: string
    cashCollectedCents: number
    salesCount: number
    color: string
}

interface Props {
    closers: TopCloserItem[]
}

const MONO: React.CSSProperties = {
    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
}

export function TopClosersCard({ closers }: Props) {
    const max = closers.reduce((m, c) => Math.max(m, c.cashCollectedCents), 0)

    return (
        <section
            className="p-[18px] rounded-2xl border border-outline-variant/15 flex flex-col gap-3.5"
            style={{
                background: 'linear-gradient(180deg, rgba(20,25,38,0.5), rgba(14,19,30,0.5))',
            }}
        >
            <div className="flex justify-between items-end">
                <div>
                    <div
                        className="text-[10px] uppercase mb-1"
                        style={{ ...MONO, letterSpacing: 1.3, color: '#7a8094' }}
                    >
                        RANKING · PERÍODO ACTUAL
                    </div>
                    <h3
                        className="m-0 font-semibold"
                        style={{ fontSize: 15, color: '#dee2f2', letterSpacing: -0.3 }}
                    >
                        Top closers
                    </h3>
                </div>
                <Trophy size={16} style={{ color: '#fbbf24' }} />
            </div>

            {closers.length === 0 ? (
                <div className="py-8 text-center" style={{ color: '#7a8094', fontSize: 12.5 }}>
                    Sin cash collected en este período
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {closers.map((c, idx) => {
                        const pct = max > 0 ? c.cashCollectedCents / max : 0
                        return (
                            <div key={c.id} className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2.5">
                                    <span
                                        className="inline-flex items-center justify-center w-5 text-center font-semibold"
                                        style={{ ...MONO, fontSize: 11, color: '#7a8094' }}
                                    >
                                        #{idx + 1}
                                    </span>
                                    <div
                                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border"
                                        style={{
                                            ...MONO,
                                            fontSize: 10,
                                            fontWeight: 600,
                                            color: c.color,
                                            background: c.color + '22',
                                            borderColor: c.color + '40',
                                        }}
                                    >
                                        {c.initials}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div
                                            className="truncate"
                                            style={{ fontSize: 12.5, color: '#dee2f2', fontWeight: 500 }}
                                        >
                                            {c.name}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div
                                            className="font-semibold"
                                            style={{ ...MONO, fontSize: 12.5, color: '#dee2f2' }}
                                        >
                                            €{Math.round(c.cashCollectedCents / 100).toLocaleString('es-ES')}
                                        </div>
                                        <div
                                            style={{ ...MONO, fontSize: 10, color: '#7a8094', marginTop: 1 }}
                                        >
                                            {c.salesCount} {c.salesCount === 1 ? 'venta' : 'ventas'}
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className="h-1.5 rounded overflow-hidden ml-[34px]"
                                    style={{ background: 'rgba(129,140,248,0.08)' }}
                                >
                                    <div
                                        className="h-full rounded transition-all"
                                        style={{
                                            width: `${pct * 100}%`,
                                            background: `linear-gradient(90deg, ${c.color}, ${c.color}88)`,
                                        }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </section>
    )
}
