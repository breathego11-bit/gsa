import NextAuth from "next-auth";
import type { CloserType } from "@prisma/client";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            name?: string | null;
            last_name?: string | null;
            email?: string | null;
            image?: string | null;
            profile_image?: string | null;
            role: string;
            payment_status: string;
            blocked: boolean;
            closer_enabled: boolean;
            closer_type: CloserType | null;
        };
    }

    interface User {
        role: string;
        last_name?: string | null;
        profile_image?: string | null;
        payment_status?: string;
        blocked?: boolean;
        closer_enabled?: boolean;
        closer_type?: CloserType | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: string;
        last_name?: string | null;
        profile_image?: string | null;
        payment_status?: string;
        blocked?: boolean;
        closer_enabled?: boolean;
        closer_type?: CloserType | null;
    }
}
