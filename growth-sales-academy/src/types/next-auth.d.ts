import NextAuth from "next-auth";

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
        };
    }

    interface User {
        role: string;
        last_name?: string | null;
        profile_image?: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: string;
        last_name?: string | null;
        profile_image?: string | null;
    }
}
