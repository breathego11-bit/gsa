import Link from 'next/link'

export default function PaymentCancelPage() {
    return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg-base)' }}>
            <div className="max-w-md w-full text-center space-y-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-surface-container-high flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-surface-variant text-4xl">
                        close
                    </span>
                </div>
                <h1 className="text-3xl font-black text-on-surface tracking-tight">
                    Pago Cancelado
                </h1>
                <p className="text-on-surface-variant">
                    No se ha realizado ningún cobro. Puedes volver a intentarlo cuando quieras.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/payment"
                        className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-container to-secondary-container text-white px-8 py-4 rounded-xl font-bold hover:shadow-lg active:scale-95 transition-all"
                    >
                        Intentar de nuevo
                    </Link>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 text-on-surface-variant px-8 py-4 rounded-xl font-bold hover:bg-white/5 transition-all"
                    >
                        Volver al inicio
                    </Link>
                </div>
            </div>
        </div>
    )
}
