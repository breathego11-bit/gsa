import { PrismaClient } from '@prisma/client'
import bcryptjs from 'bcryptjs'

const prisma = new PrismaClient()

const admins = [
    {
        name: 'Admin',
        last_name: 'GSA',
        username: 'admin_gsa',
        email: 'admin@gsa.com',
        phone: null,
    },
]

const testimonials = [
    {
        id: 'seed-testimonial-1',
        name: 'Estudiante GSA · 1',
        role: 'Closer · GSA Community',
        metric: '+180% cierres',
        quote: 'Cerré 3x más sin presionar a nadie. El método GSA cambió mi manera de escuchar.',
        duration: '0:46',
        video_url: '/testimonio-1-p1-opt.mp4',
        hue: 205,
        poster_bg: 'linear-gradient(160deg, #2a3547 0%, #1a1f2e 100%)',
        poster_accent: '#f4c9a8',
        order: 1,
    },
    {
        id: 'seed-testimonial-2',
        name: 'María',
        role: 'Closer · GSA Community',
        metric: '4 deals en 2 semanas',
        quote: 'Por fin una academia que no te enseña a vender, sino a conectar con personas reales.',
        duration: '0:57',
        video_url: '/testimonio-maria-opt.mp4',
        hue: 215,
        poster_bg: 'linear-gradient(160deg, #3a4055 0%, #1e2434 100%)',
        poster_accent: '#e8b59a',
        order: 2,
    },
    {
        id: 'seed-testimonial-3',
        name: 'Pau Olmos',
        role: 'Closer · GSA Community',
        metric: 'Ticket medio 2.4x',
        quote: 'El método funciona. Mi tasa de cierre subió en pocas semanas y la mentoría hizo la diferencia.',
        duration: '1:17',
        video_url: '/testi3-opt.mp4',
        hue: 225,
        poster_bg: 'linear-gradient(160deg, #2e3649 0%, #171c2a 100%)',
        poster_accent: '#c9a089',
        order: 3,
    },
]

async function main() {
    const password = await bcryptjs.hash(
        process.env.ADMIN_SEED_PASSWORD ?? 'Admin@GSA2024!',
        10
    )

    for (const admin of admins) {
        await prisma.user.upsert({
            where: { email: admin.email },
            update: {},
            create: {
                ...admin,
                password,
                role: 'ADMIN',
            },
        })
        console.log(`✓ Admin seeded: ${admin.email}`)
    }

    for (const t of testimonials) {
        await prisma.testimonial.upsert({
            where: { id: t.id },
            update: t,
            create: t,
        })
        console.log(`✓ Testimonial seeded: ${t.name}`)
    }

    // Default commission tiers (only set if SiteSettings.commission_tiers is null)
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'singleton' } })
    const defaultTiers = [
        { min_amount: 0, percentage: 9 },
        { min_amount: 2000000, percentage: 11 },
        { min_amount: 4000000, percentage: 13 },
    ]
    if (settings && settings.commission_tiers === null) {
        await prisma.siteSettings.update({
            where: { id: 'singleton' },
            data: { commission_tiers: defaultTiers },
        })
        console.log('✓ Commission tiers seeded (default 9/11/13%)')
    } else if (!settings) {
        await prisma.siteSettings.create({
            data: {
                id: 'singleton',
                pricing: { totalPrice: 188800, firstInstallment: 188800, installmentCount: 1, interestRate: 0 },
                commission_tiers: defaultTiers,
            },
        })
        console.log('✓ SiteSettings created with default pricing + commission tiers')
    }

    console.log('\nSeed complete. Default password: Admin@GSA2024!')
    console.log('Change it immediately after first login.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
