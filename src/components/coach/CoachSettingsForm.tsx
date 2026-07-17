'use client'

import { useState } from 'react'
import { Save, Loader2, Check } from 'lucide-react'

export function CoachSettingsForm({ initial }: { initial: string }) {
    const [value, setValue] = useState(initial)
    const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

    async function save() {
        setStatus('saving')
        try {
            const res = await fetch('/api/admin/coach-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ extra_instructions: value }),
            })
            setStatus(res.ok ? 'saved' : 'error')
            if (res.ok) setTimeout(() => setStatus('idle'), 2500)
        } catch {
            setStatus('error')
        }
    }

    return (
        <div className="max-w-3xl">
            <p className="text-[13.5px] leading-relaxed mb-1.5" style={{ color: '#9ca3b8' }}>
                Estas instrucciones se <strong style={{ color: '#dee2f2' }}>añaden</strong> al método base
                del coach (el documento maestro). Úsalas para afinar su comportamiento: enfatizar algo,
                corregir un matiz, ajustar el tono… sin tocar el método completo.
            </p>
            <p className="text-[12px] mb-4" style={{ color: '#5a6178' }}>
                Ejemplo: “Sé más estricto puntuando el cierre” · “Cuando el alumno venda The Breath Act,
                recuerda que el precio del retiro es 4.888€”.
            </p>

            <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                rows={12}
                placeholder="Instrucciones adicionales para el coach (opcional)…"
                className="w-full resize-y rounded-xl p-4 outline-none text-[13.5px] leading-relaxed"
                style={{
                    background: '#0e131e',
                    border: '1px solid rgba(129,140,248,0.2)',
                    color: '#dee2f2',
                    fontFamily: 'Inter, system-ui, sans-serif',
                }}
            />

            <div className="flex items-center gap-3 mt-3">
                <button
                    onClick={save}
                    disabled={status === 'saving'}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold"
                    style={{
                        background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
                        color: '#fff',
                        opacity: status === 'saving' ? 0.5 : 1,
                        cursor: status === 'saving' ? 'not-allowed' : 'pointer',
                    }}
                >
                    {status === 'saving' ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    Guardar
                </button>
                {status === 'saved' && (
                    <span className="flex items-center gap-1.5 text-[12.5px]" style={{ color: '#34d399' }}>
                        <Check size={14} /> Guardado. Aplica a las próximas evaluaciones.
                    </span>
                )}
                {status === 'error' && (
                    <span className="text-[12.5px]" style={{ color: '#f87171' }}>
                        Error al guardar. Inténtalo de nuevo.
                    </span>
                )}
            </div>
        </div>
    )
}
