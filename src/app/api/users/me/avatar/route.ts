import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const formData = await req.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: 'Tipo de archivo no permitido. Usa JPG, PNG, WebP o GIF.' },
                { status: 400 },
            )
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { error: 'El archivo es muy grande. Máximo 5 MB.' },
                { status: 400 },
            )
        }

        const ext = file.name.split('.').pop() || 'jpg'
        const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`

        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars')
        await mkdir(uploadsDir, { recursive: true })

        const buffer = Buffer.from(await file.arrayBuffer())
        await writeFile(path.join(uploadsDir, uniqueName), buffer)

        const url = `/uploads/avatars/${uniqueName}`

        await prisma.user.update({
            where: { id: session.user.id },
            data: { profile_image: url },
        })

        return NextResponse.json({ url })
    } catch {
        return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 })
    }
}
