export default function DashboardLoading() {
    return (
        <div className="space-y-8 animate-pulse">
            <div className="space-y-2">
                <div className="h-8 w-56 rounded-lg" style={{ background: 'var(--bg-raised)' }} />
                <div className="h-4 w-80 rounded-lg" style={{ background: 'var(--bg-raised)' }} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-24 rounded-2xl" style={{ background: 'var(--bg-surface)' }} />
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 h-72 rounded-2xl" style={{ background: 'var(--bg-surface)' }} />
                <div className="h-72 rounded-2xl" style={{ background: 'var(--bg-surface)' }} />
            </div>
        </div>
    )
}
