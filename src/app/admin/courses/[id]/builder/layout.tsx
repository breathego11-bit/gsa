export default function BuilderLayout({ children }: { children: React.ReactNode }) {
    // Override the admin layout's padding/max-width for the builder page
    // Hide the global BottomNav since the builder has its own footer
    return (
        <div className="!p-0 !max-w-none -m-6 md:-m-10 [&~*_.bottom-nav-global]:hidden">
            <style>{`.bottom-nav-global { display: none !important; }`}</style>
            {children}
        </div>
    )
}
