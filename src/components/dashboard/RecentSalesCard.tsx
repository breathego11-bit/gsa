import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { formatRelativeEs } from '@/lib/relative-time'

export interface RecentSaleItem {
    id: string
    cliente: string
    packageName: string
    amountCents: number
    saleDate: Date | string
}

interface Props {
    sales: RecentSaleItem[]
}

const MONO: React.CSSProperties = {
    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
}

function initials(fullName: string): string {
    return fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? '')
        .join('') || '·'
}

export function RecentSalesCard({ sales }: Props) {
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
                        ACTIVIDAD · PERÍODO ACTUAL
                    </div>
                    <h3
                        className="m-0 font-semibold"
                        style={{ fontSize: 15, color: '#dee2f2', letterSpacing: -0.3 }}
                    >
                        Ventas recientes
                    </h3>
                </div>
                <Link
                    href="/admin/sales"
                    className="inline-flex items-center gap-1 text-[11.5px]"
                    style={{ ...MONO, color: '#38bdf8', letterSpacing: 0.3 }}
                >
                    Ver todas <ArrowRight size={11} />
                </Link>
            </div>

            {sales.length === 0 ? (
                <div className="py-8 text-center" style={{ color: '#7a8094', fontSize: 12.5 }}>
                    Sin ventas en este período
                </div>
            ) : (
                <div className="flex flex-col gap-1">
                    {sales.map((s) => (
                        <div key={s.id} className="flex items-center gap-2.5 py-2.5 px-2 rounded-lg">
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{
                                    ...MONO,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: '#fff',
                                    background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                                }}
                            >
                                {initials(s.cliente)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div
                                    className="font-medium truncate"
                                    style={{ fontSize: 12.5, color: '#dee2f2' }}
                                >
                                    {s.cliente}
                                </div>
                                <div
                                    className="mt-0.5 truncate"
                                    style={{ fontSize: 11, color: '#7a8094' }}
                                >
                                    {s.packageName}
                                </div>
                            </div>
                            <div className="text-right">
                                <div
                                    className="font-semibold"
                                    style={{ fontSize: 13, color: '#34d399' }}
                                >
                                    €{Math.round(s.amountCents / 100).toLocaleString('es-ES')}
                                </div>
                                <div
                                    className="mt-0.5"
                                    style={{ ...MONO, fontSize: 10.5, color: '#7a8094', letterSpacing: 0.3 }}
                                >
                                    {formatRelativeEs(s.saleDate)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}
