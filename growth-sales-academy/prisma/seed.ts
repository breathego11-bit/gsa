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
