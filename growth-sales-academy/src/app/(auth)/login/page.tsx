import Link from "next/link";

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
                    <p className="text-zinc-400 text-sm mt-2">Enter your credentials to access your courses</p>
                </div>

                <form className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">Email</label>
                        <input
                            type="email"
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="you@email.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">Password</label>
                        <input
                            type="password"
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="button"
                        className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
                    >
                        Sign In
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-zinc-400">
                    Don't have an account?{' '}
                    <Link href="/register" className="text-blue-400 hover:text-blue-300 font-semibold">
                        Register
                    </Link>
                </p>
            </div>
        </div>
    );
}
