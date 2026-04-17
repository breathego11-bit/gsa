import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcryptjs from "bcryptjs";

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Missing email or password");
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email }
                });

                if (!user) {
                    throw new Error("Invalid credentials");
                }

                const isPasswordValid = await bcryptjs.compare(credentials.password, user.password);

                if (!isPasswordValid) {
                    throw new Error("Invalid credentials");
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    last_name: user.last_name,
                    profile_image: user.profile_image,
                    role: user.role,
                    payment_status: user.payment_status,
                    blocked: user.blocked,
                };
            }
        })
    ],
    callbacks: {
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.last_name = token.last_name as string | null;
                session.user.profile_image = token.profile_image as string | null;
                session.user.payment_status = (token.payment_status as string) || 'none';
                session.user.blocked = (token.blocked as boolean) ?? false;
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.last_name = (user as any).last_name ?? null;
                token.profile_image = (user as any).profile_image ?? null;
                token.payment_status = (user as any).payment_status ?? 'none';
                token.blocked = (user as any).blocked ?? false;
            }
            return token;
        }
    }
};
