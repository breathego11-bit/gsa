import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function LandingPage() {
    return (
        <div className="relative isolate min-h-screen flex items-center bg-zinc-950">
            <div className="mx-auto w-full max-w-7xl px-6 lg:px-8 flex flex-col lg:flex-row items-center justify-between z-10">

                {/* Main Area: Marketing Info */}
                <div className="w-full lg:w-1/2 pt-20 pb-16 lg:pt-0 lg:pb-0 text-left">
                    <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6">
                        Master the Art of <span className="text-blue-500">Sales</span> & <span className="text-blue-500">Growth</span>
                    </h1>
                    <p className="mt-4 text-lg text-zinc-400 mb-8 max-w-xl">
                        Growth Sales Academy is your exclusive portal for elite sales training, personal development, and professional mastery. Elevate your career with our proven systems.
                    </p>
                    <ul className="space-y-4 text-zinc-300 mb-10">
                        <li className="flex items-center gap-3">
                            <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">✓</div>
                            <span>Exclusive Masterclasses</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">✓</div>
                            <span>Advanced Closing Techniques</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">✓</div>
                            <span>Personal Development Blueprints</span>
                        </li>
                    </ul>
                </div>

                {/* Side Area: Login / Register Card */}
                <div className="w-full lg:w-5/12 max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl backdrop-blur-sm">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-white">Member Access</h2>
                        <p className="text-sm text-zinc-400 mt-2">Sign in to continue your journey</p>
                    </div>

                    <div className="space-y-4">
                        <Link href="/login" className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-all">
                            Login to Academy <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link href="/register" className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-700 transition-all">
                            Create an Account
                        </Link>
                    </div>
                </div>

            </div>

            {/* Modern Background Elements */}
            <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
                <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#0066ff] to-[#4facfe] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }}></div>
            </div>
        </div>
    );
}
