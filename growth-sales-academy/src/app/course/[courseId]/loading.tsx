export default function CourseLoading() {
    return (
        <div className="min-h-screen bg-surface animate-pulse">
            {/* Hero skeleton */}
            <div className="pt-20">
                <div className="h-[450px] relative" style={{ background: 'linear-gradient(135deg, #0c1a3e 0%, #080d18 100%)' }}>
                    <div className="absolute bottom-12 left-8 right-8 max-w-7xl mx-auto space-y-4">
                        <div className="h-4 w-32 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
                        <div className="h-12 w-2/3 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)' }} />
                        <div className="h-5 w-1/2 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    </div>
                </div>
            </div>
            {/* Content skeleton */}
            <div className="max-w-7xl mx-auto px-8 py-16 grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-8 space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 rounded-xl" style={{ background: 'var(--bg-surface)' }} />
                    ))}
                </div>
                <div className="lg:col-span-4">
                    <div className="h-48 rounded-2xl" style={{ background: 'var(--bg-surface)' }} />
                </div>
            </div>
        </div>
    )
}
