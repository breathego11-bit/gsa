export function AnimatedBackground() {
    return (
        <>
            {/* Animated blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
                <div
                    className="absolute w-[600px] h-[600px] rounded-full blur-[120px] animate-blob1"
                    style={{
                        background: 'radial-gradient(circle, #3755c3 0%, transparent 70%)',
                        top: '-20%',
                        left: '-10%',
                    }}
                />
                <div
                    className="absolute w-[700px] h-[700px] rounded-full blur-[140px] animate-blob2"
                    style={{
                        background: 'radial-gradient(circle, #0566d9 0%, transparent 70%)',
                        top: '30%',
                        right: '-15%',
                    }}
                />
                <div
                    className="absolute w-[500px] h-[500px] rounded-full blur-[100px] animate-blob3"
                    style={{
                        background: 'radial-gradient(circle, #b8c4ff 0%, transparent 70%)',
                        bottom: '-20%',
                        left: '20%',
                    }}
                />
                <div
                    className="absolute w-[400px] h-[400px] rounded-full blur-[90px] animate-blob4"
                    style={{
                        background: 'radial-gradient(circle, #adc6ff 0%, transparent 70%)',
                        top: '60%',
                        left: '10%',
                    }}
                />
            </div>

            {/* Grain overlay */}
            <div
                className="fixed inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay z-0"
                aria-hidden="true"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' /%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)' /%3E%3C/svg%3E")`,
                }}
            />
        </>
    )
}
