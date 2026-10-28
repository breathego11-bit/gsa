import { cache } from 'react'
import { prisma } from '@/lib/prisma'

/**
 * Perfil del usuario con lo que deciden los permisos y el menú, **cacheado por petición**.
 *
 * En el área del closer lo piden el layout (menú), la página y la tarjeta de conexión de Google en
 * el mismo render; sin `cache` eran tres consultas idénticas. `cache` de React lo resuelve una vez
 * por petición y no comparte nada entre peticiones, así que un cambio de permisos se ve en la
 * siguiente carga.
 */
export const getAccessProfile = cache((userId: string) =>
    prisma.user.findUnique({
        where: { id: userId },
        select: {
            name: true,
            last_name: true,
            email: true,
            profile_image: true,
            role: true,
            payment_status: true,
            closer_enabled: true,
            closer_type: true,
            lead_booking_enabled: true,
            lead_booking_authorized: true,
        },
    }),
)
