export default function AdminLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="space-y-2">
                <div className="h-7 w-48 rounded-lg" style={{ background: 'var(--bg-raised)' }} />
                <div className="h-4 w-72 rounded-lg" style={{ background: 'var(--bg-raised)' }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-28 rounded-2xl" style={{ background: 'var(--bg-surface)' }} />
                ))}
            </div>
            <div className="h-64 rounded-2xl" style={{ background: 'var(--bg-surface)' }} />
        </div>
    )
}
