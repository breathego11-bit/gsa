import Link from "next/link";
import { ArrowLeft, Play, CheckCircle2, Lock } from "lucide-react";

export default function CoursePage({ params }: { params: { courseId: string } }) {
    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-20">
            {/* Hero Header */}
            <div className="w-full h-64 md:h-80 bg-gradient-to-r from-blue-900 to-zinc-900 relative border-b border-zinc-800">
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute inset-0 max-w-5xl mx-auto px-6 flex flex-col justify-end pb-10">
                    <Link href="/dashboard" className="flex items-center text-sm text-zinc-400 hover:text-white mb-6 w-fit transition-colors">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
                    </Link>
                    <div className="flex items-center gap-4 mb-3">
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded-full border border-blue-500/30">Sales Training</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Mastering the Close</h1>
                    <p className="mt-4 max-w-2xl text-zinc-300">The definitive guide to handling objections, understanding buyer psychology, and increasing your closing rate by 40%.</p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 mt-10 grid md:grid-cols-3 gap-10">
                {/* Modules & Lessons */}
                <div className="md:col-span-2 space-y-8">
                    <h2 className="text-2xl font-bold">Course Modules</h2>

                    <div className="space-y-4">
                        {/* Module 1 */}
                        <div className="border border-zinc-800 rounded-2xl bg-zinc-900/50 overflow-hidden">
                            <div className="p-5 border-b border-zinc-800 bg-zinc-900">
                                <h3 className="font-semibold text-lg">Module 1: The Psychology of Selling</h3>
                            </div>
                            <div className="divide-y divide-zinc-800">
                                <Link href="/lesson/1" className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                        <div>
                                            <h4 className="font-medium group-hover:text-blue-400 transition-colors">1. Understanding the buyer</h4>
                                            <p className="text-xs text-zinc-500 mt-1">12 minutes</p>
                                        </div>
                                    </div>
                                    <Play className="h-4 w-4 text-zinc-500 group-hover:text-blue-400" />
                                </Link>
                                <Link href="/lesson/2" className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors group bg-blue-900/10 border-l-2 border-blue-500">
                                    <div className="flex items-center gap-4">
                                        <Play className="h-5 w-5 text-blue-500 fill-blue-500/20" />
                                        <div>
                                            <h4 className="font-medium text-blue-400">2. The 4 Emotional Triggers</h4>
                                            <p className="text-xs text-blue-500/70 mt-1">18 minutes</p>
                                        </div>
                                    </div>
                                    <Play className="h-4 w-4 text-blue-500" />
                                </Link>
                            </div>
                        </div>

                        {/* Module 2 (Locked State Example) */}
                        <div className="border border-zinc-800 rounded-2xl bg-zinc-900/50 overflow-hidden opacity-75">
                            <div className="p-5 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center">
                                <h3 className="font-semibold text-lg text-zinc-300">Module 2: Handling Objections</h3>
                                <Lock className="h-4 w-4 text-zinc-500" />
                            </div>
                            <div className="divide-y divide-zinc-800">
                                <div className="flex items-center justify-between p-4 cursor-not-allowed">
                                    <div className="flex items-center gap-4">
                                        <div className="h-5 w-5 rounded-full border-2 border-zinc-700" />
                                        <div>
                                            <h4 className="font-medium text-zinc-500">1. The "Too Expensive" Objection</h4>
                                            <p className="text-xs text-zinc-600 mt-1">15 minutes</p>
                                        </div>
                                    </div>
                                    <Lock className="h-4 w-4 text-zinc-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="border border-zinc-800 rounded-2xl bg-zinc-900 p-6">
                        <h3 className="font-semibold mb-4 text-sm text-zinc-400 uppercase tracking-wider">Your Progress</h3>
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-3xl font-bold">45%</span>
                            <span className="text-zinc-500 text-sm mb-1">completed</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 w-[45%]" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
