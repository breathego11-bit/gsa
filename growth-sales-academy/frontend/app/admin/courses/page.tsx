import { Plus } from "lucide-react";

export default function AdminCoursesPage() {
    return (
        <div className="p-10 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manage Courses</h1>
                    <p className="text-zinc-400 mt-2">Create, edit, and publish course content.</p>
                </div>
                <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-500 transition-colors">
                    <Plus className="h-4 w-4" /> Create Course
                </button>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
                        <tr>
                            <th className="px-6 py-4 font-medium">Course Title</th>
                            <th className="px-6 py-4 font-medium">Modules</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                            <th className="px-6 py-4 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        <tr>
                            <td className="px-6 py-4 font-medium text-white">Mastering the Close</td>
                            <td className="px-6 py-4 text-zinc-400">4 Modules</td>
                            <td className="px-6 py-4"><span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 text-xs">Published</span></td>
                            <td className="px-6 py-4"><button className="text-blue-500 hover:text-blue-400">Edit course</button></td>
                        </tr>
                        <tr>
                            <td className="px-6 py-4 font-medium text-white">Advanced Lead Gen</td>
                            <td className="px-6 py-4 text-zinc-400">0 Modules</td>
                            <td className="px-6 py-4"><span className="px-2 py-1 rounded bg-zinc-800 text-zinc-400 text-xs">Draft</span></td>
                            <td className="px-6 py-4"><button className="text-blue-500 hover:text-blue-400">Edit course</button></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
