export default function CoursesLoading() {
    return (
        <div className="min-h-screen bg-surface animate-pulse">
            <div className="pt-28 max-w-7xl mx-auto px-8 space-y-8">
                <div className="space-y-3">
                    <div className="h-10 w-64 rounded-lg" style={{ background: 'var(--bg-raised)' }} />
                    <div className="h-4 w-96 rounded-lg" style={{ background: 'var(--bg-raised)' }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                            <div className="h-56" style={{ background: 'var(--bg-raised)' }} />
                            <div className="p-8 space-y-4">
                                <div className="h-5 w-3/4 rounded" style={{ background: 'var(--bg-raised)' }} />
                                <div className="h-4 w-full rounded" style={{ background: 'var(--bg-raised)' }} />
                                <div className="h-10 w-full rounded-full" style={{ background: 'var(--bg-raised)' }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
