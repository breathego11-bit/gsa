import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Paths under /dashboard/* that a CRM_ONLY closer IS allowed to access.
// Everything else under /dashboard, /lesson, and /course is denied for them.
function isAllowedForCrmOnly(pathname: string): boolean {
    return (
        pathname.startsWith("/dashboard/sales") ||
        pathname.startsWith("/dashboard/method") ||
        pathname.startsWith("/dashboard/profile")
    );
}

export async function middleware(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const { pathname } = req.nextUrl;

    // Already authenticated — redirect away from auth pages
    if (
        token &&
        (pathname === "/auth" || pathname === "/login" || pathname === "/register")
    ) {
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
            return NextResponse.redirect(new URL("/auth", req.url));
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
            return NextResponse.redirect(new URL("/auth", req.url));
        }
    }

    // CRM_ONLY closers: confined to their CRM, Método and Profile.
    // Blocks them from /dashboard (root), /dashboard/courses*, /lesson/*, and
    // /course/* (public preview) so they can't accidentally enroll or pay.
    if (token?.role === "STUDENT" && token?.closer_enabled === true && token?.closer_type === "CRM_ONLY") {
        const blockedDashboardRoot = pathname === "/dashboard";
        const blockedDashboardSub = pathname.startsWith("/dashboard/") && !isAllowedForCrmOnly(pathname);
        const blockedLesson = pathname.startsWith("/lesson");
        const blockedCoursePreview = pathname.startsWith("/course/");

        if (blockedDashboardRoot || blockedDashboardSub || blockedLesson || blockedCoursePreview) {
            return NextResponse.redirect(new URL("/dashboard/sales", req.url));
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
        "/auth",
        "/login",
        "/register",
    ],
};
