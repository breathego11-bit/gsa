import { redirect } from 'next/navigation'

export default async function RegisterRedirect({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    const params = await searchParams
    const qs = new URLSearchParams()
    qs.set('mode', 'register')
    for (const [k, v] of Object.entries(params)) {
        if (k === 'mode') continue
        if (typeof v === 'string') qs.set(k, v)
        else if (Array.isArray(v) && v[0]) qs.set(k, v[0])
    }
    redirect(`/auth?${qs.toString()}`)
}
