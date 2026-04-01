import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_DOC_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES]
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
        const formData = await req.formData()
        const file = formData.get('file') as File | null

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: 'Tipo de archivo no permitido. Usa imágenes (JPG, PNG, WebP, GIF) o documentos (PDF, DOC, XLS, PPT).' },
                { status: 400 },
            )
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { error: 'El archivo es muy grande. Máximo 10 MB.' },
                { status: 400 },
            )
        }

        const ext = file.name.split('.').pop() || 'jpg'
        const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`

        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'courses')
        await mkdir(uploadsDir, { recursive: true })

        const buffer = Buffer.from(await file.arrayBuffer())
        await writeFile(path.join(uploadsDir, uniqueName), buffer)

        const url = `/uploads/courses/${uniqueName}`
        return NextResponse.json({ url })
    } catch {
        return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 })
    }
}
