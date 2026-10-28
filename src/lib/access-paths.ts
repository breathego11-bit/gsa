/**
 * Rutas del área del closer — módulo PURO (sin next-auth ni Prisma) para que lo compartan el
 * middleware, el menú y los tests.
 *
 * Existe por un fallo real: el middleware confina a los closers **CRM_ONLY** a una lista blanca
 * de rutas, y al añadir "Mis leads" y "Mi agenda" al menú nadie actualizó esa lista. El enlace
 * aparecía, pero al pulsarlo los rebotaba a `/dashboard/sales`, así que un CRM_ONLY no podía ni
 * conectar su calendario. Con la lista y el menú saliendo del mismo sitio, y un test que lo
 * comprueba, no puede volver a desincronizarse.
 */

/** Rutas del menú del closer dentro del grupo VENTAS, en orden. */
export const CLOSER_NAV = {
    sales: '/dashboard/sales',
    leads: '/dashboard/leads',
    agenda: '/dashboard/agenda',
} as const

/**
 * Lo que un closer CRM_ONLY puede abrir bajo `/dashboard`. Todo lo demás (dashboard de alumno,
 * cursos, lecciones y la vista pública de un curso) se le bloquea para que no se matricule ni
 * pague por error.
 */
export const CRM_ONLY_ALLOWED: string[] = [
    CLOSER_NAV.sales,
    CLOSER_NAV.leads,
    CLOSER_NAV.agenda,
    '/dashboard/method',
    '/dashboard/coach',
    '/dashboard/profile',
]

/** Coincide con la ruta exacta o con sus subrutas (`/dashboard/leads/<id>`), no por prefijo suelto. */
export function isAllowedForCrmOnly(pathname: string): boolean {
    return CRM_ONLY_ALLOWED.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}
