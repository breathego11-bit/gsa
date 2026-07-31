import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
    FACTORY_METHODOLOGY,
    resolveMethodology,
    isMethodologyEdited,
} from '@/lib/coach/methodology-source'

export const runtime = 'nodejs'

/** Un documento más corto que esto casi seguro es un borrado accidental, no una edición. */
const MIN_METHODOLOGY_CHARS = 500
/** Techo de cordura: el original ronda los 50k. */
const MAX_METHODOLOGY_CHARS = 400000

async function requireAdmin() {
    const session = await getServerSession(authOptions)
    if (session?.user?.role !== 'ADMIN') return null
    return session.user
}

export async function GET() {
    if (!(await requireAdmin())) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const setting = await prisma.coachSetting.findUnique({ where: { id: 'singleton' } })
    return NextResponse.json({
        extra_instructions: setting?.extra_instructions ?? '',
        methodology: resolveMethodology(setting?.methodology),
        methodology_edited: isMethodologyEdited(setting?.methodology),
    })
}

export async function PUT(req: Request) {
    const user = await requireAdmin()
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let body: { extra_instructions?: string; methodology?: string; restore_factory?: boolean }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
    }

    const data: { extra_instructions?: string; methodology?: string | null; updated_by: string } = {
        updated_by: user.id,
    }

    if (typeof body.extra_instructions === 'string') {
        data.extra_instructions = body.extra_instructions.slice(0, 20000)
    }

    const current = await prisma.coachSetting.findUnique({
        where: { id: 'singleton' },
        select: { methodology: true },
    })
    const activeNow = resolveMethodology(current?.methodology)

    if (body.restore_factory) {
        // Volver a NULL hace que mande otra vez el documento del build.
        if (isMethodologyEdited(current?.methodology)) {
            await prisma.coachMethodologyVersion.create({
                data: { content: activeNow, created_by: user.id },
            })
        }
        data.methodology = null
    } else if (typeof body.methodology === 'string') {
        const doc = body.methodology.trim()
        if (doc.length < MIN_METHODOLOGY_CHARS) {
            return NextResponse.json(
                {
                    error:
                        `El documento tiene ${doc.length} caracteres, por debajo del mínimo de ` +
                        `${MIN_METHODOLOGY_CHARS}. Si querías vaciarlo, usa "Restaurar original".`,
                },
                { status: 400 },
            )
        }
        if (doc.length > MAX_METHODOLOGY_CHARS) {
            return NextResponse.json(
                { error: `El documento supera el máximo de ${MAX_METHODOLOGY_CHARS} caracteres.` },
                { status: 400 },
            )
        }
        // Solo se versiona si de verdad cambia, para no llenar la tabla cuando se guardan
        // únicamente las instrucciones. Se archiva lo que había ANTES: es a lo que se
        // querría volver si la edición sale mal.
        if (doc !== activeNow.trim()) {
            await prisma.coachMethodologyVersion.create({
                data: { content: activeNow, created_by: user.id },
            })
            data.methodology = doc
        }
    }

    const setting = await prisma.coachSetting.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton', ...data },
        update: data,
    })

    return NextResponse.json({
        extra_instructions: setting.extra_instructions ?? '',
        methodology: resolveMethodology(setting.methodology),
        methodology_edited: isMethodologyEdited(setting.methodology),
        factory_chars: FACTORY_METHODOLOGY.length,
    })
}
