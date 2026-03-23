import { Users, BookOpen, Layers } from "lucide-react";

export default function AdminDashboard() {
    return (
        <div className="p-10 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Platform Overview</h1>
                <p className="text-zinc-400 mt-2">Manage all system content and user data from here.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-zinc-400 text-sm">Total Students</h3>
                        <Users className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="text-4xl font-bold">1,024</div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-zinc-400 text-sm">Active Courses</h3>
                        <BookOpen className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="text-4xl font-bold">3</div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-zinc-400 text-sm">Total Lessons</h3>
                        <Layers className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="text-4xl font-bold">42</div>
                </div>
            </div>
        </div>
    );
}
