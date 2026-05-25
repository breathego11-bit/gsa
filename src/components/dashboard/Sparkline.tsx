interface Props {
    data: number[]
    color: string
}

export function Sparkline({ data, color }: Props) {
    if (data.length === 0) return null
    const max = Math.max(...data, 1)
    const len = Math.max(data.length - 1, 1)
    const points = data
        .map((v, i) => `${(i / len) * 100},${28 - (v / max) * 24}`)
        .join(' ')

    return (
        <svg
            width="100%"
            height="32"
            viewBox="0 0 100 32"
            preserveAspectRatio="none"
            style={{ marginTop: 6 }}
        >
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
            />
            {data.map((v, i) => (
                <circle
                    key={i}
                    cx={(i / len) * 100}
                    cy={28 - (v / max) * 24}
                    r={1.2}
                    fill={color}
                />
            ))}
        </svg>
    )
}
