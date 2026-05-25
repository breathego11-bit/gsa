import { NextResponse } from 'next/server'

// Clears all NextAuth cookies on the response and redirects to /auth.
// Used when a server component detects that the authenticated user no longer
// exists in the database (e.g. admin deleted them) — server components can't
// modify cookies directly, so they redirect here to break the redirect loop.
export async function GET(req: Request) {
    const url = new URL('/auth', req.url)
    const res = NextResponse.redirect(url)

    const cookieNames = [
        'next-auth.session-token',
        '__Secure-next-auth.session-token',
        'next-auth.csrf-token',
        '__Host-next-auth.csrf-token',
        'next-auth.callback-url',
        '__Secure-next-auth.callback-url',
    ]
    for (const name of cookieNames) {
        res.cookies.set(name, '', { path: '/', maxAge: 0 })
    }

    return res
}
