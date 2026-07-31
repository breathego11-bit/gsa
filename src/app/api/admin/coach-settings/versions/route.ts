import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveMethodology } from '@/lib/coach/methodology-source'

export const runtime = 'nodejs'

/** Cuántas versiones se listan. Suficiente para deshacer sin cargar megas de texto. */
const LIST_LIMIT = 20

async function requireAdmin() {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'ADMIN') return null
    return session.user
}

/** Lista las versiones anteriores del Documento Maestro (sin el contenido: solo metadatos). */
export async function GET() {
    if (!(await requireAdmin())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rows = await prisma.coachMethodologyVersion.findMany({
        orderBy: { created_at: 'desc' },
        take: LIST_LIMIT,
        select: { id: true, created_at: true, created_by: true, content: true },
    })

    // El contenido no se manda entero en el listado: solo su tamaño. Se pide al restaurar.
    return NextResponse.json({
        versions: rows.map((v) => ({
            id: v.id,
            created_at: v.created_at.toISOString(),
            created_by: v.created_by,
            chars: v.content.length,
        })),
    })
}

/** Restaura una versión anterior como Documento Maestro activo. */
export async function POST(req: Request) {
    const user = await requireAdmin()
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let body: { id?: string }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
    }
    if (!body.id) return NextResponse.json({ error: 'Falta el id de la versión' }, { status: 400 })

    const version = await prisma.coachMethodologyVersion.findUnique({ where: { id: body.id } })
    if (!version) return NextResponse.json({ error: 'Versión no encontrada' }, { status: 404 })

    // Restaurar también es un cambio: se archiva lo que estaba activo para poder deshacerlo.
    const current = await prisma.coachSetting.findUnique({
        where: { id: 'singleton' },
        select: { methodology: true },
    })
    await prisma.coachMethodologyVersion.create({
        data: { content: resolveMethodology(current?.methodology), created_by: user.id },
    })

    await prisma.coachSetting.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton', methodology: version.content, updated_by: user.id },
        update: { methodology: version.content, updated_by: user.id },
    })

    return NextResponse.json({ methodology: version.content })
}
