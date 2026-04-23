type Founder = {
    name: string
    role: string
    quote: string
    bio: [string, string]
    image: string
    hue: number
    accent: string
}

// TODO: los quotes son propuesta del UI/UX — cambiar por los reales del cliente
const founders: Founder[] = [
    {
        name: 'Ivan',
        role: 'Cofundador · Director de Formación',
        quote: 'Enseñar a vender sin presión es enseñar a estar presente. Nada más. Nada menos.',
        bio: [
            'Formador de alto rendimiento con experiencia guiando a más de 500 vendedores.',
            'En GSA diseña la pedagogía: metodologías prácticas, medibles y con foco en resultados reales.',
        ],
        image: '/ivan.PNG',
        hue: 205,
        accent: '#38bdf8',
    },
    {
        name: 'Pau',
        role: 'Cofundador · Head Coach',
        quote: 'Si tienes que presionar para cerrar, la venta ya se perdió antes de empezar.',
        bio: [
            'Más de una década liderando equipos de venta consultiva en B2B y formando vendedores en LATAM.',
            'Obsesionado con el cierre ético y la relación a largo plazo: analiza cada silencio, cada pausa, cada palabra que inclina la balanza.',
        ],
        image: '/pau.png',
        hue: 225,
        accent: '#818cf8',
    },
]

export function AboutSection() {
    return (
        <section
            id="about"
            className="relative overflow-hidden py-[100px]"
            style={{ color: '#dee2f2' }}
        >
            {/* Ambient glows */}
            <div
                aria-hidden
                className="pointer-events-none absolute rounded-full"
                style={{
                    width: 500, height: 500,
                    top: '5%', left: '-10%',
                    filter: 'blur(70px)',
                    background: 'radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 60%)',
                }}
            />
            <div
                aria-hidden
                className="pointer-events-none absolute rounded-full"
                style={{
                    width: 500, height: 500,
                    bottom: '5%', right: '-8%',
                    filter: 'blur(70px)',
                    background: 'radial-gradient(circle, rgba(129,140,248,0.1) 0%, transparent 60%)',
                }}
            />

            <div className="relative z-10 max-w-[1320px] mx-auto px-6 sm:px-10 lg:px-20">
                {/* Header */}
                <div className="max-w-[820px] mb-[72px]">
                    <div
                        className="inline-flex items-center gap-2.5 mb-6 px-4 py-2 rounded-full backdrop-blur-xl"
                        style={{
                            background: 'rgba(27,31,43,0.7)',
                            border: '1px solid rgba(129,140,248,0.25)',
                            fontSize: 12.5,
                            fontWeight: 500,
                            letterSpacing: 0.3,
                            color: '#c4c5d5',
                        }}
                    >
                        <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: '#38bdf8', boxShadow: '0 0 14px #38bdf8' }}
                        />
                        Quiénes somos · La historia detrás del método
                    </div>
                    <h2
                        style={{
                            fontSize: 'clamp(36px, 5vw, 56px)',
                            lineHeight: 1.1,
                            letterSpacing: '-1.5px',
                            fontWeight: 600,
                            margin: '0 0 20px',
                        }}
                    >
                        Dos personas. Una obsesión:
                        <br />
                        <span
                            style={{
                                background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                fontStyle: 'italic',
                                fontWeight: 500,
                            }}
                        >
                            que vender vuelva a sentirse humano.
                        </span>
                    </h2>
                    <p
                        style={{
                            fontSize: 17,
                            lineHeight: 1.6,
                            color: '#c4c5d5',
                            maxWidth: 640,
                            margin: 0,
                        }}
                    >
                        GSA no nació en una sala de ventas. Nació en cientos de llamadas donde
                        alguien, al otro lado, decidió confiar.
                    </p>
                </div>

                {/* Founder stories */}
                <div className="flex flex-col gap-[72px] mb-16">
                    {founders.map((f, i) => (
                        <FounderStory key={f.name} founder={f} side={i % 2 === 0 ? 'left' : 'right'} />
                    ))}
                </div>

                {/* Shared belief */}
                <div
                    className="relative flex items-center flex-wrap gap-7 backdrop-blur-xl"
                    style={{
                        padding: '36px 40px',
                        borderRadius: 18,
                        background:
                            'linear-gradient(135deg, rgba(56,189,248,0.08) 0%, rgba(129,140,248,0.06) 100%)',
                        border: '1px solid rgba(129,140,248,0.2)',
                    }}
                >
                    <div
                        className="font-[family-name:var(--font-instrument-serif)]"
                        style={{
                            fontSize: 72,
                            lineHeight: 0.7,
                            background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            flexShrink: 0,
                            alignSelf: 'flex-start',
                            marginTop: 10,
                        }}
                    >
                        “
                    </div>
                    <p
                        style={{
                            flex: 1,
                            fontSize: 17,
                            lineHeight: 1.55,
                            color: '#dee2f2',
                            fontWeight: 400,
                            margin: 0,
                            letterSpacing: '-0.2px',
                            minWidth: 280,
                        }}
                    >
                        Creemos que la mejor venta es la que{' '}
                        <em style={beliefEmStyle}>no se siente como una venta</em>. Creemos en el
                        silencio, en la escucha, en la pregunta incómoda. Creemos que esto se
                        puede <em style={beliefEmStyle}>entrenar</em>.
                    </p>
                    <div
                        style={{
                            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                            fontSize: 11,
                            letterSpacing: 1.3,
                            color: '#38bdf8',
                            flexBasis: '100%',
                            textAlign: 'right',
                            opacity: 0.85,
                        }}
                    >
                        — Ivan &amp; Pau, fundadores GSA
                    </div>
                </div>
            </div>
        </section>
    )
}

function FounderStory({ founder, side }: { founder: Founder; side: 'left' | 'right' }) {
    const reverse = side === 'right'
    return (
        <article
            className={`flex flex-col gap-10 lg:gap-[56px] items-center ${
                reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'
            }`}
        >
            {/* Portrait */}
            <div className="relative w-full max-w-[300px] lg:w-[300px] lg:flex-[0_0_300px]">
                <div
                    aria-hidden
                    className="pointer-events-none absolute rounded-full"
                    style={{
                        inset: -40,
                        filter: 'blur(36px)',
                        zIndex: 0,
                        background: `radial-gradient(circle, oklch(0.55 0.18 ${founder.hue} / 0.35) 0%, transparent 65%)`,
                    }}
                />
                <div
                    className="relative overflow-hidden"
                    style={{ aspectRatio: '4 / 5', borderRadius: 20, zIndex: 1 }}
                >
                    <img
                        src={founder.image}
                        alt={`Retrato de ${founder.name}`}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                </div>
            </div>

            {/* Body */}
            <div className="relative z-10 flex-1 text-left">
                <div
                    style={{
                        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                        fontSize: 11,
                        letterSpacing: 1.3,
                        color: founder.accent,
                        textTransform: 'uppercase',
                        fontWeight: 500,
                        marginBottom: 12,
                    }}
                >
                    {founder.role}
                </div>
                <h3
                    style={{
                        fontSize: 'clamp(28px, 3.2vw, 38px)',
                        lineHeight: 1.1,
                        letterSpacing: '-1px',
                        fontWeight: 600,
                        margin: '0 0 22px',
                    }}
                >
                    {founder.name}
                </h3>
                <blockquote
                    style={{
                        fontSize: 17,
                        lineHeight: 1.5,
                        color: '#dee2f2',
                        fontWeight: 400,
                        fontStyle: 'italic',
                        margin: '0 0 22px',
                        borderLeft: `2px solid ${founder.accent}`,
                        paddingLeft: 18,
                    }}
                >
                    &ldquo;{founder.quote}&rdquo;
                </blockquote>
                {founder.bio.map((p, i) => (
                    <p
                        key={i}
                        style={{
                            fontSize: 15,
                            lineHeight: 1.65,
                            color: '#c4c5d5',
                            margin: '0 0 12px',
                            maxWidth: 540,
                        }}
                    >
                        {p}
                    </p>
                ))}
            </div>
        </article>
    )
}

const beliefEmStyle: React.CSSProperties = {
    fontStyle: 'italic',
    background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontWeight: 500,
}
