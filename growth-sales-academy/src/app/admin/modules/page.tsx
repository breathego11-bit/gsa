export default function AdminModulesPage() {
    return (
        <div className="p-10 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manage Modules</h1>
                    <p className="text-zinc-400 mt-2">Create and map modules to existing courses.</p>
                </div>
            </div>
            <div className="p-6 border border-zinc-800 rounded-xl bg-zinc-950">
                <p className="text-zinc-400">Select a course to edit its modules or create a new module directly.</p>
            </div>
        </div>
    );
}
