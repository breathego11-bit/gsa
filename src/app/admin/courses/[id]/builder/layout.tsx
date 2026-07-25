export default function BuilderLayout({ children }: { children: React.ReactNode }) {
    /*
     * El builder se dibuja borde a borde, cancelando el padding del wrapper de
     * admin/layout.tsx (`p-4 sm:p-6 md:p-8`) con márgenes negativos equivalentes.
     *
     * Antes era `-m-6 md:-m-10`: a partir de `md` el margen (−40px) no casaba con el
     * padding real (32px), así que el div sobresalía 8px por lado. Como `<main>` es
     * `overflow-y-auto` (y por spec eso hace que el eje X compute a `auto`), esos 16px
     * generaban scroll horizontal de TODA la página entre 768px y ~1344px.
     *
     * Se eliminaron también `!p-0 !max-w-none` (se aplicaban a este mismo div, que no
     * tiene ni padding ni max-width — quien los tiene es el wrapper padre) y el
     * selector `[&~*_.bottom-nav-global]:hidden` (el BottomNav no es hermano posterior
     * de este div). Lo que de verdad oculta la barra es el <style> de abajo.
     */
    return (
        <div className="-m-4 sm:-m-6 md:-m-8">
            {/* El builder tiene su propio footer fijo: la barra inferior global sobra. */}
            <style>{`.bottom-nav-global { display: none !important; }`}</style>
            {children}
        </div>
    )
}
