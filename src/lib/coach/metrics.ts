import { prisma } from '@/lib/prisma'
import { parseScorecard, SCORE_CATEGORIES } from './scorecard'

/** Media de una fase del método para un alumno, en bruto y en porcentaje de dominio. */
export interface SkillAverage {
    label: string
    /** Media de puntos obtenidos. */
    score: number
    max: number
    /** score/max — el "porcentaje de aplicación" de esa fase. */
    pct: number
}

export interface StudentMetrics {
    userId: string
    name: string
    email: string
    /** ADMIN o STUDENT: el panel los separa y las medias solo cuentan alumnos. */
    role: 'ADMIN' | 'STUDENT'
    evaluations: number
    /** Media del total sobre 100. */
    average: number
    skills: SkillAverage[]
    strongest: SkillAverage | null
    weakest: SkillAverage | null
    /** Diferencia entre la última evaluación y la primera. `null` con menos de 2. */
    trend: number | null
    lastAt: string | null
    conversations: { id: string; title: string; updated_at: string; scored: boolean }[]
}

export interface CoachMetrics {
    /** Solo alumnos. Es lo que mide la formación. */
    students: StudentMetrics[]
    /** Admins que han probado el coach. Se listan aparte y NO cuentan en las medias. */
    staff: StudentMetrics[]
    totalEvaluations: number
    /** Media de la academia sobre 100 — solo alumnos. */
    academyAverage: number
    /** La fase con menor porcentaje medio entre los alumnos: dónde poner el foco formativo. */
    academyWeakest: SkillAverage | null
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

/**
 * Agrega las puntuaciones de todas las evaluaciones por alumno.
 *
 * Las notas no están en columnas: viven dentro del texto de cada respuesta del coach, así que
 * se parsean al vuelo (ver spec_coach_student_metrics.md §2). Eso cubre todo el histórico sin
 * migración. Las respuestas que no son evaluaciones —dudas, saludos— devuelven `null` en
 * `parseScorecard` y quedan fuera de las medias.
 */
export async function getCoachMetrics(): Promise<CoachMetrics> {
    const conversations = await prisma.coachConversation.findMany({
        orderBy: { updated_at: 'desc' },
        select: {
            id: true,
            title: true,
            updated_at: true,
            user_id: true,
            user: { select: { name: true, last_name: true, email: true, role: true } },
            messages: {
                where: { role: 'assistant' },
                orderBy: { created_at: 'asc' },
                select: { content: true, created_at: true },
            },
        },
    })

    type Acc = {
        userId: string
        name: string
        email: string
        role: 'ADMIN' | 'STUDENT'
        totals: { value: number; at: Date }[]
        bySkill: Map<string, number[]>
        conversations: StudentMetrics['conversations']
    }
    const byUser = new Map<string, Acc>()

    for (const conv of conversations) {
        const acc = byUser.get(conv.user_id) ?? {
            userId: conv.user_id,
            name: `${conv.user.name} ${conv.user.last_name}`.trim(),
            email: conv.user.email,
            role: conv.user.role,
            totals: [],
            bySkill: new Map<string, number[]>(),
            conversations: [],
        }

        let scored = false
        for (const msg of conv.messages) {
            const card = parseScorecard(msg.content)
            if (!card) continue
            scored = true
            acc.totals.push({ value: card.total, at: msg.created_at })
            for (const item of card.items) {
                const list = acc.bySkill.get(item.label) ?? []
                list.push(item.score)
                acc.bySkill.set(item.label, list)
            }
        }

        acc.conversations.push({
            id: conv.id,
            title: conv.title,
            updated_at: conv.updated_at.toISOString(),
            scored,
        })
        byUser.set(conv.user_id, acc)
    }

    const everyone: StudentMetrics[] = []
    for (const acc of byUser.values()) {
        // Un alumno que solo ha charlado con el coach no tiene métricas que mostrar,
        // pero sí conversaciones: se lista con 0 evaluaciones.
        const ordered = [...acc.totals].sort((a, b) => a.at.getTime() - b.at.getTime())

        const skills: SkillAverage[] = SCORE_CATEGORIES.map((c) => {
            const values = acc.bySkill.get(c.label) ?? []
            const score = avg(values)
            return { label: c.label, score, max: c.max, pct: c.max ? score / c.max : 0 }
        }).filter((s) => (acc.bySkill.get(s.label) ?? []).length > 0)

        const sorted = [...skills].sort((a, b) => b.pct - a.pct)

        everyone.push({
            userId: acc.userId,
            name: acc.name,
            email: acc.email,
            role: acc.role,
            evaluations: ordered.length,
            average: avg(ordered.map((t) => t.value)),
            skills,
            strongest: sorted[0] ?? null,
            weakest: sorted[sorted.length - 1] ?? null,
            trend:
                ordered.length >= 2
                    ? ordered[ordered.length - 1].value - ordered[0].value
                    : null,
            lastAt: ordered.length ? ordered[ordered.length - 1].at.toISOString() : null,
            conversations: acc.conversations,
        })
    }

    // Los que tienen evaluaciones primero (por nota); los que solo han charlado, al final.
    const byScore = (a: StudentMetrics, b: StudentMetrics) => {
        if (a.evaluations === 0 && b.evaluations > 0) return 1
        if (b.evaluations === 0 && a.evaluations > 0) return -1
        return b.average - a.average
    }

    /*
     * Alumnos y admins van por separado a propósito.
     *
     * Los admins usan el coach para probarlo, no para formarse: si sus pruebas entraran en
     * la media de la academia o en el cálculo de la fase más floja, distorsionarían justo la
     * señal que sirve para decidir dónde reforzar la formación. Se listan aparte para que su
     * historial siga siendo accesible, pero fuera de las medias.
     */
    const students = everyone.filter((s) => s.role === 'STUDENT').sort(byScore)
    const staff = everyone.filter((s) => s.role === 'ADMIN').sort(byScore)

    const evaluated = students.filter((s) => s.evaluations > 0)
    const academySkills: SkillAverage[] = SCORE_CATEGORIES.map((c) => {
        const pcts = evaluated
            .map((s) => s.skills.find((k) => k.label === c.label))
            .filter((x): x is SkillAverage => Boolean(x))
        return {
            label: c.label,
            score: avg(pcts.map((p) => p.score)),
            max: c.max,
            pct: avg(pcts.map((p) => p.pct)),
        }
    }).filter((s) => s.score > 0)

    return {
        students,
        staff,
        totalEvaluations: evaluated.reduce((n, s) => n + s.evaluations, 0),
        academyAverage: avg(evaluated.map((s) => s.average)),
        academyWeakest:
            academySkills.length > 0
                ? academySkills.reduce((min, s) => (s.pct < min.pct ? s : min))
                : null,
    }
}
