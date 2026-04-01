import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, PenLine } from "lucide-react";

export default function LessonPage({ params }: { params: { lessonId: string } }) {
    return (
        <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">

            {/* Main Content Area (Video + Description) */}
            <div className="flex-1 lg:overflow-y-auto">
                {/* Top Nav */}
                <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950 sticky top-0 z-20">
                    <Link href="/course/1" className="flex items-center text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Course
                    </Link>
                    <div className="text-sm font-medium text-zinc-300">Module 1 • Lesson 2</div>
                </header>

                {/* Video Player Placeholder */}
                <div className="w-full aspect-video bg-zinc-900 relative group border-b border-zinc-800 flex items-center justify-center">
                    {/* Fake Player UI */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-16 w-16 bg-blue-600/90 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-lg shadow-blue-500/20">
                            <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent ml-1" />
                        </div>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-black/80 to-transparent p-4 flex items-end">
                        <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                            <div className="h-full w-1/3 bg-blue-500" />
                        </div>
                    </div>
                </div>

                <div className="p-6 md:p-10 max-w-4xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">The 4 Emotional Triggers</h1>
                            <p className="text-zinc-400">Discover the psychological buttons that cause prospects to take action and pull out their credit cards.</p>
                        </div>

                        <button className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-4 py-2 rounded-xl font-medium hover:bg-emerald-500/20 transition-colors shrink-0">
                            <CheckCircle2 className="h-5 w-5" />
                            Mark as Completed
                        </button>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between pt-8 border-t border-zinc-800">
                        <button className="flex items-center gap-2 text-zinc-400 hover:text-white font-medium transition-colors">
                            <ChevronLeft className="h-5 w-5" /> Previous Lesson
                        </button>
                        <button className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium transition-colors">
                            Next Lesson <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Sidebar Area (Private Notes) */}
            <div className="w-full lg:w-[400px] border-l border-zinc-800 bg-zinc-950 flex flex-col h-[600px] lg:h-screen lg:sticky lg:top-0">
                <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
                    <PenLine className="h-5 w-5 text-blue-500" />
                    <h2 className="font-semibold text-lg">Private Notes</h2>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                    <p className="text-sm text-zinc-400 mb-4">
                        These notes are private and only visible to you. Use this space to jot down key takeaways while watching.
                    </p>

                    <textarea
                        className="flex-1 w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none transition-all"
                        placeholder="Type your notes here... They save automatically."
                        defaultValue="Trigger 1: Fear of missing out (FOMO) - Use this when establishing the timeline."
                    />
                </div>
            </div>

        </div>
    );
}
