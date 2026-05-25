'use server'

import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function completeOnboarding() {
    const session = await getServerSession(authOptions)
    if (!session) redirect('/auth')

    await prisma.user.update({
        where: { id: session.user.id },
        data: { onboarded_at: new Date() },
    })

    redirect('/dashboard')
}
