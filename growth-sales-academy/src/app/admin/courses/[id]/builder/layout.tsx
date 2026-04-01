export default function BuilderLayout({ children }: { children: React.ReactNode }) {
    // Override the admin layout's padding/max-width for the builder page
    return <div className="!p-0 !max-w-none -m-6 md:-m-10">{children}</div>
}
