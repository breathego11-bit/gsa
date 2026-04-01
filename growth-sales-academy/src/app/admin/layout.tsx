import Link from "next/link";
import { Settings, Users, BookOpen, Layers, PlaySquare, ShieldAlert } from "lucide-react";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen bg-black text-white">
            {/* Admin Sidebar */}
            <aside className="fixed inset-y-0 left-0 w-64 bg-zinc-950 border-r border-zinc-900 hidden lg:flex flex-col">
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-1">
                        <ShieldAlert className="h-5 w-5 text-red-500" />
                        <h2 className="text-xl font-bold">Admin Hub</h2>
                    </div>
                    <p className="text-xs text-zinc-500 ml-7">System Management</p>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    <Link href="/admin" className="flex items-center gap-3 px-3 py-2 text-zinc-300 rounded-lg hover:bg-zinc-900 transition-colors">
                        <Settings className="h-4 w-4" /> <span className="text-sm">Overview</span>
                    </Link>
                    <Link href="/admin/courses" className="flex items-center gap-3 px-3 py-2 text-zinc-300 rounded-lg hover:bg-zinc-900 transition-colors">
                        <BookOpen className="h-4 w-4" /> <span className="text-sm">Manage Courses</span>
                    </Link>
                    <Link href="/admin/modules" className="flex items-center gap-3 px-3 py-2 text-zinc-300 rounded-lg hover:bg-zinc-900 transition-colors">
                        <Layers className="h-4 w-4" /> <span className="text-sm">Manage Modules</span>
                    </Link>
                    <Link href="/admin/lessons" className="flex items-center gap-3 px-3 py-2 text-zinc-300 rounded-lg hover:bg-zinc-900 transition-colors">
                        <PlaySquare className="h-4 w-4" /> <span className="text-sm">Manage Lessons</span>
                    </Link>
                    <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2 text-zinc-300 rounded-lg hover:bg-zinc-900 transition-colors">
                        <Users className="h-4 w-4" /> <span className="text-sm">Students & Progress</span>
                    </Link>
                </nav>
            </aside>

            <main className="flex-1 lg:pl-64">
                {children}
            </main>
        </div>
    );
}
