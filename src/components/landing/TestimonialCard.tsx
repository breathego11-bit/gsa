interface TestimonialCardProps {
    quote: string
    name: string
    role: string
    avatar?: string
    offset?: boolean
}

export function TestimonialCard({ quote, name, role, avatar, offset = false }: TestimonialCardProps) {
    return (
        <div className={`bg-surface-container p-8 rounded-xl relative ${offset ? 'translate-y-8' : ''}`}>
            <div className="text-secondary text-4xl font-serif absolute top-4 left-4 opacity-20">
                &ldquo;
            </div>
            <p className="text-on-surface italic mb-8 relative z-10">&ldquo;{quote}&rdquo;</p>
            <div className="flex items-center gap-4">
                {avatar ? (
                    <img src={avatar} alt={name} className="w-12 h-12 rounded-full object-cover border-2 border-outline-variant/30" />
                ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-700" />
                )}
                <div>
                    <div className="font-bold text-on-surface">{name}</div>
                    <div className="text-sm text-on-surface-variant">{role}</div>
                </div>
            </div>
        </div>
    )
}
