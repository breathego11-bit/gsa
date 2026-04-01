import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = req.nextUrl;

    // Already authenticated — redirect away from auth pages
    if (token && (pathname === "/login" || pathname === "/register")) {
        const dest = token.role === "ADMIN" ? "/admin" : "/dashboard";
        return NextResponse.redirect(new URL(dest, req.url));
    }

    // Already authenticated — redirect away from public pages
    if (token && pathname === "/") {
        const dest = token.role === "ADMIN" ? "/admin" : "/dashboard";
        return NextResponse.redirect(new URL(dest, req.url));
    }
    if (token && pathname === "/courses") {
        const dest = token.role === "ADMIN" ? "/admin/courses" : "/dashboard/courses";
        return NextResponse.redirect(new URL(dest, req.url));
    }

    // Admin routes — require ADMIN role
    if (pathname.startsWith("/admin")) {
        if (!token) {
            return NextResponse.redirect(new URL("/login", req.url));
        }
        if (token.role !== "ADMIN") {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }
    }

    // Protected student routes — require any valid session
    if (
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/lesson")
    ) {
        if (!token) {
            return NextResponse.redirect(new URL("/login", req.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/",
        "/courses",
        "/dashboard/:path*",
        "/course/:path*",
        "/lesson/:path*",
        "/admin/:path*",
        "/login",
        "/register",
    ],
};
