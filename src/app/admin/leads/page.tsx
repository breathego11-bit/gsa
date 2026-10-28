import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'
import { fmtLeadDate } from '@/lib/leads/display'
import { AlertTriangle } from 'lucide-react'
import { CalendarConnectionRow } from '@/components/leads/CalendarConnectionRow'
import { LeadsTable } from '@/components/leads/LeadsTable'
import { GoogleConnectBanner } from '@/components/leads/GoogleConnectBanner'
import { describeWorkingHours } from '@/lib/calendar/availability'
import { CLOSER_WHERE, POOL_MEMBER_WHERE } from '@/lib/calendar/pool'

interface PageProps {
    searchParams: Promise<{ assignee?: string; google?: string }>
}

export default async function AdminLeadsPage({ searchParams }: PageProps) {
    const sp = await searchParams
    const assigneeFilter = typeof sp.assignee === 'string' && sp.assignee ? sp.assignee : undefined

    const session = await getServerSession(authOptions)
    const myUserId = session?.user?.id

    const [leads, members, pendingClosers, assignees] = await Promise.all([
        prisma.lead.findMany({
            where: assigneeFilter ? { assigned_to: assigneeFilter } : {},
            orderBy: { created_at: 'desc' },
            select: {
                id: true,
                full_name: true,
                email: true,
                instagram: true,
                whatsapp: true,
                country: true,
                situation: true,
                urgency: true,
                investment: true,
                status: true,
                source: true,
                utm_campaign: true,
                utm_source: true,
                meeting_at: true,
                meeting_tz_iana: true,
                meeting_link: true,
                created_at: true,
                assignee: { select: { id: true, name: true, last_name: true } },
            },
        }),
        /*
         * El pool del round-robin: quien tiene `lead_booking_enabled`. Se trae también su
         * conexión de Google porque una cosa sin la otra no sirve — estar en el pool sin
         * calendario activo significa que las reuniones no se le pueden crear, y eso ocurre
         * en silencio. Con el consent screen en modo Testing los refresh tokens caducan a
         * los 7 días, así que las conexiones se rompen de forma rutinaria.
         */
        prisma.user.findMany({
            where: POOL_MEMBER_WHERE,
            select: {
                id: true,
                name: true,
                last_name: true,
                booking_timezone: true,
                working_hours: true,
                calendars: {
                    where: { provider: 'GOOGLE' },
                    select: { account_email: true, status: true, connected_at: true },
                },
            },
            orderBy: { name: 'asc' },
        }),
        /*
         * Closers que ya conectaron su calendario pero a los que nadie ha autorizado a recibir leads.
         * No están en el reparto, así que no salen en la tabla de arriba; sin esta lista, Iván no
         * vería en ningún sitio quién está listo para que lo active.
         */
        // Cualquier conexión, no solo las activas: con la app de Google en modo de pruebas caducan a
        // los 7 días, y un closer con la conexión caída no saldría en ningún sitio de esta pantalla.
        prisma.user.findMany({
            where: {
                ...CLOSER_WHERE,
                blocked: false,
                lead_booking_authorized: false,
                calendars: { some: { provider: 'GOOGLE' } },
            },
            select: {
                id: true,
                name: true,
                last_name: true,
                calendars: { where: { provider: 'GOOGLE' }, select: { status: true } },
            },
            orderBy: { name: 'asc' },
        }),
        /*
         * Todos los que tienen algún lead a su nombre, para el filtro por responsable. No vale con el
         * pool: a un closer sin autorización (o con ella retirada) le siguen quedando leads, y sin
         * esto desaparecía del filtro y no había forma de ver los suyos.
         */
        // `groupBy` y no `findMany({ distinct })`: Prisma hace el distinct en memoria, así que traería
        // todos los leads asignados en cada carga. Aquí la base devuelve solo un id por responsable.
        prisma.lead.groupBy({ by: ['assigned_to'], where: { assigned_to: { not: null } } }),
    ])

    const assigneeIds = assignees.map((a) => a.assigned_to).filter((id): id is string => !!id)
    const assigneeUsers = assigneeIds.length
        ? await prisma.user.findMany({
              where: { id: { in: assigneeIds } },
              select: { id: true, name: true, last_name: true },
          })
        : []

    // Opciones del filtro: el pool más cualquiera con leads asignados, sin repetir.
    const filterPeople = new Map<string, { id: string; name: string; last_name: string }>()
    for (const m of members) filterPeople.set(m.id, m)
    for (const u of assigneeUsers) filterPeople.set(u.id, u)
    const filterOptions = [...filterPeople.values()].sort((a, b) => a.name.localeCompare(b.name))

    // En el pool del round-robin pero sin calendario activo: no pueden recibir reuniones.
    const sinCalendario = members.filter((m) => m.calendars[0]?.status !== 'active').length

    const nuevos = leads.filter((l) => l.status === 'NUEVO').length

    return (
        <div className="space-y-6">
            <div>
                <h1 className="section-title">Leads</h1>
                <p className="section-subtitle">
                    {leads.length} {leads.length === 1 ? 'lead' : 'leads'}
                    {nuevos > 0 && ` · ${nuevos} sin contactar`}
                </p>
            </div>

            <GoogleConnectBanner status={sp.google} />

            {/* Conexión de Google Calendar (per-member) */}
            <Card>
                {/* Mi conexión: la misma fila que ve el closer en su agenda (traspaso incluido). */}
                {myUserId && <CalendarConnectionRow userId={myUserId} />}

                {/*
                  * Estado del equipo. El round-robin solo puede asignar reuniones a quien
                  * tenga calendario activo: alguien en el pool sin conexión deja de recibir
                  * leads sin que nadie se entere. Esta tabla es para detectarlo de un vistazo.
                  */}
                {members.length > 0 && (
                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                                Calendarios del equipo
                            </p>
                            {sinCalendario > 0 && (
                                <span
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
                                    style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}
                                >
                                    <AlertTriangle size={11} />
                                    {sinCalendario} sin recibir reuniones
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            {members.map((m) => {
                                const conn = m.calendars[0]
                                const ok = conn?.status === 'active'
                                const tone = ok
                                    ? { bg: 'rgba(52,211,153,0.15)', fg: '#34d399', label: 'Conectado' }
                                    : conn?.status === 'error'
                                      ? { bg: 'rgba(248,113,113,0.15)', fg: '#f87171', label: 'Con error' }
                                      : conn?.status === 'revoked'
                                        ? { bg: 'rgba(248,113,113,0.15)', fg: '#f87171', label: 'Revocado' }
                                        : { bg: 'rgba(148,163,184,0.12)', fg: '#94a3b8', label: 'Sin conectar' }
                                return (
                                    <div
                                        key={m.id}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg flex-wrap sm:flex-nowrap"
                                        style={{ background: 'var(--bg-raised)' }}
                                    >
                                        {/* Se lee como una frase: "Joen conectó su calendario · joen@gmail.com" */}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                                                <span className="font-medium">
                                                    {`${m.name} ${m.last_name}`.trim()}
                                                </span>
                                                {m.id === myUserId && (
                                                    <span className="ml-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                        (yo)
                                                    </span>
                                                )}
                                                <span style={{ color: 'var(--text-secondary)' }}>
                                                    {conn?.status === 'active'
                                                        ? ' conectó su calendario'
                                                        : conn
                                                          ? ' tiene el calendario con problemas'
                                                          : ' aún no ha conectado su calendario'}
                                                </span>
                                            </p>
                                            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                                                {conn ? (
                                                    <>
                                                        {conn.account_email}
                                                        <span style={{ opacity: 0.6 }}>
                                                            {' '}
                                                            · desde el {fmtLeadDate(conn.connected_at)} · {m.booking_timezone}
                                                        </span>
                                                        {/* El horario decide qué huecos ve el lead. Enseñarlo evita
                                                            el caso de un horario mal puesto que nadie detecta hasta
                                                            que alguien agenda a una hora imposible. */}
                                                        <span style={{ display: 'block', opacity: 0.6 }}>
                                                            {describeWorkingHours(m.working_hours)}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span style={{ opacity: 0.7 }}>
                                                        No recibe reuniones hasta que la conecte · {m.booking_timezone}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <span
                                            className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0"
                                            style={{ background: tone.bg, color: tone.fg }}
                                            title={
                                                conn
                                                    ? `Conectado el ${fmtLeadDate(conn.connected_at)}`
                                                    : 'Está en el round-robin pero no puede recibir reuniones'
                                            }
                                        >
                                            {tone.label}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {pendingClosers.length > 0 && (
                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                            Conectados que todavía no reciben leads
                        </p>
                        <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                            Han conectado su calendario, pero no entran al reparto hasta que actives
                            &quot;Recibe leads&quot; en su ficha. Si la conexión caducó, tendrán que
                            reconectarla para empezar a recibir.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {pendingClosers.map((c) => (
                                <Link
                                    key={c.id}
                                    href={`/admin/students/${c.id}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                    style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                >
                                    {`${c.name} ${c.last_name}`.trim()}
                                    {c.calendars[0]?.status !== 'active' && (
                                        <span style={{ color: '#fbbf24' }}>· conexión caducada</span>
                                    )}
                                    <span style={{ color: 'var(--blue-accent)' }}>· Activar</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </Card>

            {/* Filtro por asignado */}
            {filterOptions.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <FilterChip label="Todos" href="/admin/leads" active={!assigneeFilter} />
                    {filterOptions.map((m) => (
                        <FilterChip
                            key={m.id}
                            label={m.id === myUserId ? `${m.name} (yo)` : `${m.name} ${m.last_name}`.trim()}
                            href={`/admin/leads?assignee=${m.id}`}
                            active={assigneeFilter === m.id}
                        />
                    ))}
                </div>
            )}

            <Card>
                <LeadsTable
                    leads={leads}
                    hrefBase="/admin/leads"
                    adminColumns
                    emptyText={
                        assigneeFilter
                            ? 'No hay leads asignados a este miembro.'
                            : 'Aún no hay leads. Llegan automáticamente desde el formulario de la landing.'
                    }
                />
            </Card>
        </div>
    )
}

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
    return (
        <a
            href={href}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={
                active
                    ? { background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)' }
                    : { background: 'var(--bg-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
            }
        >
            {label}
        </a>
    )
}
