import { Card } from '@/components/ui/Card'
import { Megaphone } from 'lucide-react'

/**
 * Atribución de campaña de un lead.
 *
 * Los campos escalares son el ÚLTIMO toque (el clic que trajo la conversión). Cuando la
 * primera atribución fue distinta se muestra al lado, porque en ese caso la campaña que
 * descubrió al lead y la que lo cerró no son la misma y eso cambia cómo se lee el gasto.
 */

interface AttributionSnapshot {
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    utm_term?: string
    fbclid?: string
    gclid?: string
    referrer?: string
    landing_path?: string
    captured_at?: string
}

interface LeadAttribution {
    utm_source: string | null
    utm_medium: string | null
    utm_campaign: string | null
    utm_content: string | null
    utm_term: string | null
    fbclid: string | null
    landing_url: string | null
    referrer: string | null
    attribution_first: unknown
    attribution_last: unknown
}

/** `Json` de Prisma llega como `unknown`: se estrecha antes de leerlo. */
function asSnapshot(v: unknown): AttributionSnapshot | null {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return null
    return v as AttributionSnapshot
}

const FIELDS: { key: keyof AttributionSnapshot; label: string }[] = [
    { key: 'utm_source', label: 'Source' },
    { key: 'utm_medium', label: 'Medium' },
    { key: 'utm_campaign', label: 'Campaña' },
    { key: 'utm_content', label: 'Contenido' },
    { key: 'utm_term', label: 'Término' },
    { key: 'fbclid', label: 'fbclid' },
]

export function AttributionCard({ lead }: { lead: LeadAttribution }) {
    const first = asSnapshot(lead.attribution_first)
    const last = asSnapshot(lead.attribution_last)

    const current: AttributionSnapshot = {
        utm_source: lead.utm_source ?? undefined,
        utm_medium: lead.utm_medium ?? undefined,
        utm_campaign: lead.utm_campaign ?? undefined,
        utm_content: lead.utm_content ?? undefined,
        utm_term: lead.utm_term ?? undefined,
        fbclid: lead.fbclid ?? undefined,
    }

    const hasAny = FIELDS.some((f) => current[f.key])

    // Solo interesa mostrar el primer toque cuando difiere del último.
    const firstDiffers =
        !!first &&
        FIELDS.some((f) => (first[f.key] ?? undefined) !== (current[f.key] ?? undefined))

    return (
        <Card>
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <Megaphone size={13} /> Atribución
            </h2>

            {!hasAny ? (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Sin datos de campaña. El lead llegó por tráfico directo, o entró antes de que
                    se activara el seguimiento de UTMs.
                </p>
            ) : (
                <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {FIELDS.map((f) => (
                            <Field key={f.key} label={f.label} value={current[f.key]} />
                        ))}
                    </div>

                    {(lead.landing_url || lead.referrer || last?.captured_at) && (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                            <Field label="Página de entrada" value={lead.landing_url ?? undefined} />
                            <Field label="Referrer" value={lead.referrer ?? undefined} />
                            <Field
                                label="Capturado"
                                value={
                                    last?.captured_at
                                        ? new Date(last.captured_at).toLocaleString('es-ES')
                                        : undefined
                                }
                            />
                        </div>
                    )}

                    {firstDiffers && first && (
                        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                            <p className="text-[11px] uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
                                Primera atribución (difiere de la última)
                            </p>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {FIELDS.map((f) => (
                                    <Field key={f.key} label={f.label} value={first[f.key]} />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </Card>
    )
}

function Field({ label, value }: { label: string; value?: string }) {
    return (
        <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                {label}
            </p>
            <p
                className="text-sm font-mono break-all"
                style={{ color: value ? 'var(--text-primary)' : 'var(--text-secondary)', opacity: value ? 1 : 0.5 }}
            >
                {value || '—'}
            </p>
        </div>
    )
}
