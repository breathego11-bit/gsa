import Link from "next/link";
import { BookOpen, UserCircle, LayoutDashboard, LogOut } from "lucide-react";

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen bg-zinc-950 text-white">
            {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 w-64 bg-zinc-900 border-r border-zinc-800 hidden lg:flex flex-col">
                <div className="p-6">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                        Growth Sales
                    </h2>
                    <p className="text-xs text-zinc-500 font-medium">ACADEMY</p>
                </div>
                <nav className="flex-1 px-4 space-y-2 mt-4">
                    <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-zinc-300 rounded-xl hover:bg-zinc-800 hover:text-white transition-colors">
                        <LayoutDashboard className="h-5 w-5" />
                        <span className="text-sm font-medium">Dashboard</span>
                    </Link>
                    <Link href="/courses" className="flex items-center gap-3 px-3 py-2 text-zinc-400 rounded-xl hover:bg-zinc-800 hover:text-white transition-colors">
                        <BookOpen className="h-5 w-5" />
                        <span className="text-sm font-medium">My Courses</span>
                    </Link>
                    <Link href="/profile" className="flex items-center gap-3 px-3 py-2 text-zinc-400 rounded-xl hover:bg-zinc-800 hover:text-white transition-colors">
                        <UserCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">Profile</span>
                    </Link>
                </nav>
                <div className="p-4 border-t border-zinc-800">
                    <button className="flex w-full items-center gap-3 px-3 py-2 text-zinc-400 rounded-xl hover:bg-zinc-800 hover:text-red-400 transition-colors">
                        <LogOut className="h-5 w-5" />
                        <span className="text-sm font-medium">Sign out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:pl-64">
                {/* Mobile Header Placeholder */}
                <header className="h-16 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md flex items-center px-6 lg:hidden sticky top-0 z-10">
                    <h2 className="text-lg font-bold">Growth Sales Academy</h2>
                </header>

                <div className="p-6 md:p-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
