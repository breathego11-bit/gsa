import Link from "next/link";

export default function RegisterPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 py-12">
            <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white">Join the Academy</h2>
                    <p className="text-zinc-400 text-sm mt-2">Create your account to start learning</p>
                </div>

                <form className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">First Name</label>
                            <input type="text" className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-white focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">Last Name</label>
                            <input type="text" className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-white focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">Username</label>
                        <input type="text" className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-white focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">Email</label>
                        <input type="email" className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-white focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">Phone Number</label>
                        <input type="tel" className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-white focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">Password</label>
                            <input type="password" className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-white focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-300 mb-2">Confirm Password</label>
                            <input type="password" className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-white focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>

                    <button
                        type="button"
                        className="w-full mt-6 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
                    >
                        Create Account
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-zinc-400">
                    Already have an account?{' '}
                    <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold">
                        Login
                    </Link>
                </p>
            </div>
        </div>
    );
}
