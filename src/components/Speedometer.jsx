import React from 'react';

export default function Speedometer({ value, target, label }) {
    // Determine target based on tier (60k or 75k)
    const maxVal = target > 60000 ? 75000 : 60000;

    // Calculate percentage (clamped 0 to 100)
    const percentage = Math.min(Math.max((value / maxVal) * 100, 0), 100);

    // SVG Geometry for semi-circle
    const radius = 90;
    const strokeWidth = 12;
    const normalizedRadius = radius - strokeWidth * 0.5;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * (circumference / 2); // Only use half circumference

    const formatCurrency = (val) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="flex flex-col items-center justify-center relative">
            <div className="relative w-64 h-32 overflow-hidden">
                <svg
                    height={radius * 2}
                    width={radius * 2}
                    className="rotate-[180deg] absolute bottom-0"
                    style={{ transformOrigin: '50% 100%' }} // Rotate around bottom center to make it a top arch
                >
                    {/* Background Track */}
                    <circle
                        stroke="#e5e7eb" // gray-200
                        strokeWidth={strokeWidth}
                        strokeLinecap="round" // Rounded ends
                        fill="transparent"
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                        style={{ strokeDasharray: `${circumference / 2} ${circumference}` }} // Half circle
                    />

                    {/* Progress Arc */}
                    <circle
                        stroke="url(#gradient)"
                        strokeWidth={strokeWidth}
                        strokeDasharray={`${circumference / 2} ${circumference}`}
                        style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease-out' }}
                        strokeLinecap="round"
                        fill="transparent"
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                    />

                    <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#3b82f6" /> {/* Blue-500 */}
                            <stop offset="100%" stopColor="#ef4444" /> {/* GSA Red */}
                        </linearGradient>
                    </defs>
                </svg>

                {/* Needle/Indicator (Optional based on design, defaulting to simple filled bar for clean look) */}
            </div>

            {/* Centered Text */}
            <div className="absolute bottom-0 flex flex-col items-center translate-y-2">
                <span className="text-3xl font-bold text-gray-900">{formatCurrency(value)}</span>
                <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold mt-1">
                    {percentage.toFixed(1)}% de {formatCurrency(maxVal)}
                </span>
            </div>

            <div className="mt-6 text-center">
                <p className="text-sm font-medium text-gray-500">{label}</p>
            </div>
        </div>
    );
}
