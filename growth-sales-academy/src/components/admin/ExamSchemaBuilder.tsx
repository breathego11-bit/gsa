'use client'

import { MaterialIcon } from '@/components/ui/MaterialIcon'

interface ExamQuestion {
    id: string
    text: string
    options: string[]
    correctOptions: number[]
    points?: number
    explanation?: string
}

interface ExamSchemaBuilderProps {
    value: ExamQuestion[]
    onChange: (questions: ExamQuestion[]) => void
}

export function ExamSchemaBuilder({ value, onChange }: ExamSchemaBuilderProps) {

    function addQuestion() {
        const newQuestion: ExamQuestion = {
            id: `q_${Date.now()}`,
            text: '',
            options: ['', '', '', ''],
            correctOptions: [],
            points: 1,
            explanation: '',
        }
        onChange([...value, newQuestion])
    }

    function updateQuestion(index: number, patch: Partial<ExamQuestion>) {
        const updated = value.map((q, i) => (i === index ? { ...q, ...patch } : q))
        onChange(updated)
    }

    function removeQuestion(index: number) {
        onChange(value.filter((_, i) => i !== index))
    }

    function moveQuestion(index: number, direction: -1 | 1) {
        const target = index + direction
        if (target < 0 || target >= value.length) return
        const updated = [...value]
        const temp = updated[index]
        updated[index] = updated[target]
        updated[target] = temp
        onChange(updated)
    }

    function addOption(qIndex: number) {
        const q = value[qIndex]
        updateQuestion(qIndex, { options: [...q.options, ''] })
    }

    function updateOption(qIndex: number, optIndex: number, text: string) {
        const q = value[qIndex]
        const opts = [...q.options]
        opts[optIndex] = text
        updateQuestion(qIndex, { options: opts })
    }

    function removeOption(qIndex: number, optIndex: number) {
        const q = value[qIndex]
        const opts = q.options.filter((_, i) => i !== optIndex)
        const corrected = q.correctOptions
            .filter((ci) => ci !== optIndex)
            .map((ci) => (ci > optIndex ? ci - 1 : ci))
        updateQuestion(qIndex, { options: opts, correctOptions: corrected })
    }

    function toggleCorrect(qIndex: number, optIndex: number) {
        const q = value[qIndex]
        const isCorrect = q.correctOptions.includes(optIndex)
        const corrected = isCorrect
            ? q.correctOptions.filter((ci) => ci !== optIndex)
            : [...q.correctOptions, optIndex]
        updateQuestion(qIndex, { correctOptions: corrected })
    }

    function getWarnings(q: ExamQuestion): string[] {
        const warnings: string[] = []
        if (q.options.length < 2) warnings.push('Se necesitan al menos 2 opciones')
        if (q.correctOptions.length === 0) warnings.push('Debes marcar al menos 1 respuesta correcta')
        if (q.options.some((o) => !o.trim())) warnings.push('Completa el texto de todas las opciones')
        if (!q.text.trim()) warnings.push('Escribe el enunciado de la pregunta')
        return warnings
    }

    const totalPoints = value.reduce((sum, q) => sum + (q.points || 1), 0)

    return (
        <div className="space-y-3">
            {value.length > 0 && (
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {value.length} {value.length === 1 ? 'pregunta' : 'preguntas'} • {totalPoints} {totalPoints === 1 ? 'punto' : 'puntos'} en total
                    </span>
                </div>
            )}

            {value.length === 0 && (
                <p className="text-sm py-4 text-center rounded-xl border" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)', background: 'var(--bg-raised)' }}>
                    No hay preguntas. Haz clic en &quot;Agregar pregunta&quot; para empezar.
                </p>
            )}

            {value.map((question, qIndex) => {
                const warnings = getWarnings(question)

                return (
                    <div
                        key={question.id}
                        className="rounded-xl border p-4 space-y-4"
                        style={{ background: 'var(--bg-raised)', borderColor: 'var(--border)' }}
                    >
                        {/* Header row */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                                    Pregunta {qIndex + 1}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="number"
                                        min="1"
                                        value={question.points || 1}
                                        onChange={(e) => updateQuestion(qIndex, { points: Math.max(1, Number(e.target.value) || 1) })}
                                        className="form-input text-xs w-16 text-center py-1 px-2"
                                        title="Puntos de esta pregunta"
                                    />
                                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>pts</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button type="button" onClick={() => moveQuestion(qIndex, -1)} disabled={qIndex === 0} className="btn-ghost p-1 disabled:opacity-30" title="Mover arriba">
                                    <MaterialIcon name="arrow_upward" size="text-lg" />
                                </button>
                                <button type="button" onClick={() => moveQuestion(qIndex, 1)} disabled={qIndex === value.length - 1} className="btn-ghost p-1 disabled:opacity-30" title="Mover abajo">
                                    <MaterialIcon name="arrow_downward" size="text-lg" />
                                </button>
                                <button type="button" onClick={() => removeQuestion(qIndex)} className="btn-ghost p-1 hover:!text-red-400" title="Eliminar pregunta">
                                    <MaterialIcon name="delete" size="text-lg" />
                                </button>
                            </div>
                        </div>

                        {/* Question text */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Enunciado</label>
                            <textarea
                                value={question.text}
                                onChange={(e) => updateQuestion(qIndex, { text: e.target.value })}
                                placeholder="Escribe la pregunta..."
                                rows={2}
                                className="form-input text-sm resize-none"
                            />
                        </div>

                        {/* Options with correct answer selection */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                    Opciones de respuesta
                                </label>
                                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)' }}>
                                    Haz clic en el icono para marcar la correcta
                                </span>
                            </div>

                            {question.options.map((opt, optIndex) => {
                                const isCorrect = question.correctOptions.includes(optIndex)

                                return (
                                    <div key={optIndex} className="flex items-center gap-2">
                                        {/* Correct answer toggle */}
                                        <button
                                            type="button"
                                            onClick={() => toggleCorrect(qIndex, optIndex)}
                                            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border-2 transition-all"
                                            style={{
                                                borderColor: isCorrect ? 'var(--success)' : 'var(--border)',
                                                background: isCorrect ? 'rgba(16,185,129,0.15)' : 'transparent',
                                            }}
                                            title={isCorrect ? 'Respuesta correcta (clic para desmarcar)' : 'Marcar como respuesta correcta'}
                                        >
                                            {isCorrect ? (
                                                <MaterialIcon name="check" size="text-base" className="text-emerald-400" />
                                            ) : (
                                                <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                                                    {String.fromCharCode(65 + optIndex)}
                                                </span>
                                            )}
                                        </button>

                                        <input
                                            type="text"
                                            value={opt}
                                            onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                                            placeholder={`Opción ${String.fromCharCode(65 + optIndex)}`}
                                            className="form-input text-sm flex-1"
                                            style={isCorrect ? { borderColor: 'var(--success)', background: 'rgba(16,185,129,0.05)' } : undefined}
                                        />

                                        {isCorrect && (
                                            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                                                Correcta
                                            </span>
                                        )}

                                        <button type="button" onClick={() => removeOption(qIndex, optIndex)} className="btn-ghost p-1 hover:!text-red-400 shrink-0" title="Eliminar opción">
                                            <MaterialIcon name="close" size="text-base" />
                                        </button>
                                    </div>
                                )
                            })}

                            <button type="button" onClick={() => addOption(qIndex)} className="btn-ghost text-xs gap-1">
                                <MaterialIcon name="add" size="text-base" />
                                Agregar opción
                            </button>
                        </div>

                        {/* Explanation */}
                        <div className="flex flex-col gap-1">
                            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                Explicación (se muestra al alumno tras responder)
                            </label>
                            <textarea
                                value={question.explanation || ''}
                                onChange={(e) => updateQuestion(qIndex, { explanation: e.target.value })}
                                placeholder="¿Por qué esta es la respuesta correcta?"
                                rows={2}
                                className="form-input text-sm resize-none"
                            />
                        </div>

                        {/* Validation warnings */}
                        {warnings.length > 0 && (
                            <div className="flex items-start gap-2 rounded-lg px-3 py-2" style={{ background: 'rgba(245,158,11,0.08)' }}>
                                <MaterialIcon name="warning" size="text-base" className="shrink-0 mt-0.5" />
                                <div className="text-xs space-y-0.5" style={{ color: 'var(--warning)' }}>
                                    {warnings.map((w, i) => (
                                        <p key={i}>• {w}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )
            })}

            <button type="button" onClick={addQuestion} className="btn-secondary w-full justify-center gap-2">
                <MaterialIcon name="add" size="text-lg" />
                Agregar pregunta
            </button>
        </div>
    )
}
