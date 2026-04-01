export default function LessonLoading() {
    return (
        <div className="min-h-screen bg-surface flex flex-col animate-pulse">
            {/* Nav skeleton */}
            <div className="h-16" style={{ background: 'var(--bg-surface)' }} />
            <div className="pt-16 flex flex-1">
                {/* Main content */}
                <div className="flex-1 p-8 max-w-5xl mx-auto space-y-8">
                    <div className="aspect-video rounded-2xl" style={{ background: 'var(--bg-raised)' }} />
                    <div className="space-y-3">
                        <div className="h-4 w-24 rounded-full" style={{ background: 'var(--bg-raised)' }} />
                        <div className="h-8 w-2/3 rounded-lg" style={{ background: 'var(--bg-raised)' }} />
                        <div className="h-4 w-full rounded-lg" style={{ background: 'var(--bg-raised)' }} />
                    </div>
                </div>
                {/* Sidebar skeleton */}
                <div className="w-96 shrink-0 hidden lg:block border-l border-white/5 p-6 space-y-4" style={{ background: 'var(--bg-surface)' }}>
                    <div className="h-5 w-3/4 rounded" style={{ background: 'var(--bg-raised)' }} />
                    <div className="h-2 w-full rounded-full" style={{ background: 'var(--bg-raised)' }} />
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-10 rounded-lg" style={{ background: 'var(--bg-raised)' }} />
                    ))}
                </div>
            </div>
        </div>
    )
}
