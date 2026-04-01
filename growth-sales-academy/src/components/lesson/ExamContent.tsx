'use client'

import { useState } from 'react'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

interface SanitizedExamQuestion {
    id: string
    text: string
    options: string[]
}

interface ExamContentProps {
    lessonId: string
    questions: SanitizedExamQuestion[]
    passingScore: number
    maxAttempts: number | null
    attemptCount: number
    hasPassed: boolean
    bestScore: number | null
}

interface GradedAnswer {
    questionId: string
    selectedOptions: number[]
    correct: boolean
    correctOptions: number[]
    explanation?: string
    points?: number
    earnedPoints?: number
}

interface ExamResult {
    score: number
    passed: boolean
    passingScore: number
    correctCount: number
    totalQuestions: number
    earnedPoints: number
    totalPoints: number
    gradedAnswers: GradedAnswer[]
}

type ExamState = 'pre' | 'taking' | 'results'

export function ExamContent({
    lessonId,
    questions,
    passingScore,
    maxAttempts,
    attemptCount,
    hasPassed,
    bestScore,
}: ExamContentProps) {
    const [state, setState] = useState<ExamState>('pre')
    const [answers, setAnswers] = useState<Record<string, number>>({})
    const [result, setResult] = useState<ExamResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [currentAttempts, setCurrentAttempts] = useState(attemptCount)

    const attemptsRemaining = maxAttempts !== null ? maxAttempts - currentAttempts : null
    const allAnswered = questions.every((q) => answers[q.id] !== undefined)
    const maxAttemptsReached = maxAttempts !== null && currentAttempts >= maxAttempts

    // ── Already passed ──
    if (hasPassed) {
        return (
            <div className="glass-card rounded-2xl border border-outline-variant p-8">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center">
                        <MaterialIcon name="emoji_events" size="text-5xl" className="text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-on-surface">Examen aprobado</h2>
                    <p className="text-on-surface-variant">
                        Has completado este examen exitosamente.
                    </p>
                    {bestScore !== null && (
                        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-5 py-2.5">
                            <MaterialIcon name="check_circle" size="text-lg" className="text-emerald-400" />
                            <span className="text-sm font-semibold text-emerald-400">
                                Mejor puntuacion: {bestScore}%
                            </span>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // ── Pre-exam info screen ──
    if (state === 'pre') {
        return (
            <div className="glass-card rounded-2xl border border-outline-variant p-8">
                <div className="flex flex-col items-center text-center space-y-6">
                    <div className="w-16 h-16 rounded-full bg-blue-accent/15 flex items-center justify-center">
                        <MaterialIcon name="quiz" size="text-4xl" className="text-blue-accent" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-on-surface">Examen</h2>
                        <p className="text-sm text-on-surface-variant">
                            Responde todas las preguntas para evaluar tu conocimiento.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-md">
                        <div className="bg-surface-container rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-on-surface">{questions.length}</p>
                            <p className="text-xs text-on-surface-variant mt-1">Preguntas</p>
                        </div>
                        <div className="bg-surface-container rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-on-surface">{passingScore}%</p>
                            <p className="text-xs text-on-surface-variant mt-1">Para aprobar</p>
                        </div>
                        <div className="bg-surface-container rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-on-surface">
                                {attemptsRemaining !== null ? attemptsRemaining : 'Ilimitados'}
                            </p>
                            <p className="text-xs text-on-surface-variant mt-1">
                                {attemptsRemaining !== null ? 'Intentos restantes' : 'Intentos'}
                            </p>
                        </div>
                    </div>

                    {maxAttemptsReached ? (
                        <div className="flex items-center gap-2 bg-error/10 border border-error/20 rounded-xl px-4 py-3 w-full max-w-md">
                            <MaterialIcon name="block" size="text-lg" className="text-error" />
                            <span className="text-sm text-error">
                                Has alcanzado el maximo de intentos permitidos.
                            </span>
                        </div>
                    ) : (
                        <button
                            onClick={() => {
                                setAnswers({})
                                setResult(null)
                                setError(null)
                                setState('taking')
                            }}
                            className="btn-primary px-8 py-3"
                        >
                            <MaterialIcon name="play_arrow" size="text-base" />
                            Comenzar Examen
                        </button>
                    )}
                </div>
            </div>
        )
    }

    // ── Taking exam ──
    if (state === 'taking') {
        async function handleSubmit() {
            setError(null)
            setLoading(true)

            try {
                const payload = {
                    lesson_id: lessonId,
                    answers: questions.map((q) => ({
                        questionId: q.id,
                        selectedOptions: [answers[q.id]],
                    })),
                }

                const res = await fetch('/api/exams/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })

                if (!res.ok) {
                    const body = await res.json().catch(() => null)
                    throw new Error(body?.error || 'Error al enviar el examen')
                }

                const data: ExamResult = await res.json()
                setResult(data)
                setCurrentAttempts((prev) => prev + 1)
                setState('results')

                if (data.passed) {
                    setTimeout(() => window.location.reload(), 2500)
                }
            } catch (err: any) {
                setError(err.message || 'Error al enviar el examen')
            } finally {
                setLoading(false)
            }
        }

        return (
            <div className="space-y-6">
                {/* Progress bar */}
                <div className="flex items-center justify-between text-sm text-on-surface-variant">
                    <span>
                        {Object.keys(answers).length} de {questions.length} respondidas
                    </span>
                    <span>{Math.round((Object.keys(answers).length / questions.length) * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-accent rounded-full transition-all duration-300"
                        style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
                    />
                </div>

                {/* Questions */}
                {questions.map((question, qIndex) => (
                    <div
                        key={question.id}
                        className="bg-surface-container rounded-2xl border border-outline-variant p-6 space-y-4"
                    >
                        <h3 className="text-base font-semibold text-on-surface">
                            <span className="text-blue-accent mr-2">{qIndex + 1}.</span>
                            {question.text}
                        </h3>

                        <div className="space-y-2">
                            {question.options.map((option, oIndex) => {
                                const isSelected = answers[question.id] === oIndex

                                return (
                                    <label
                                        key={oIndex}
                                        className={`flex items-center gap-3 cursor-pointer rounded-xl border px-4 py-3 transition-all duration-200 ${
                                            isSelected
                                                ? 'border-blue-accent bg-blue-accent/10'
                                                : 'border-outline-variant bg-surface-container-lowest hover:border-blue-accent/40'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name={`question-${question.id}`}
                                            checked={isSelected}
                                            onChange={() =>
                                                setAnswers((prev) => ({ ...prev, [question.id]: oIndex }))
                                            }
                                            className="accent-blue-accent"
                                        />
                                        <span className={`text-sm ${isSelected ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                                            {option}
                                        </span>
                                    </label>
                                )
                            })}
                        </div>
                    </div>
                ))}

                {error && (
                    <div className="flex items-center gap-2 bg-error/10 border border-error/20 rounded-xl px-4 py-3">
                        <MaterialIcon name="error" size="text-lg" className="text-error" />
                        <span className="text-sm text-error">{error}</span>
                    </div>
                )}

                <button
                    onClick={handleSubmit}
                    disabled={!allAnswered || loading}
                    className="btn-primary w-full py-3"
                >
                    {loading ? (
                        <>
                            <span className="spinner" />
                            Evaluando...
                        </>
                    ) : (
                        <>
                            <MaterialIcon name="send" size="text-base" />
                            Enviar Examen
                        </>
                    )}
                </button>
            </div>
        )
    }

    // ── Results ──
    if (state === 'results' && result) {
        const canRetry = maxAttempts === null || currentAttempts < maxAttempts

        return (
            <div className="space-y-6">
                {/* Score banner */}
                <div
                    className={`glass-card rounded-2xl border p-8 text-center space-y-4 ${
                        result.passed ? 'border-emerald-500/30' : 'border-error/30'
                    }`}
                >
                    <div
                        className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${
                            result.passed ? 'bg-emerald-500/15' : 'bg-error/15'
                        }`}
                    >
                        <MaterialIcon
                            name={result.passed ? 'emoji_events' : 'cancel'}
                            size="text-5xl"
                            className={result.passed ? 'text-emerald-400' : 'text-error'}
                        />
                    </div>

                    <div className="space-y-1">
                        <h2 className="text-3xl font-bold text-on-surface">{result.score}%</h2>
                        <div
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                                result.passed
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'bg-error/15 text-error'
                            }`}
                        >
                            <MaterialIcon
                                name={result.passed ? 'check_circle' : 'cancel'}
                                size="text-sm"
                            />
                            {result.passed ? 'Aprobado' : 'No aprobado'}
                        </div>
                    </div>

                    <p className="text-sm text-on-surface-variant">
                        {result.correctCount} de {result.totalQuestions} respuestas correctas
                        {' '}• {result.earnedPoints}/{result.totalPoints} puntos
                    </p>
                    <p className="text-xs text-on-surface-variant">
                        Se requiere {result.passingScore}% para aprobar
                    </p>
                </div>

                {/* Graded answers */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-on-surface">Revision de respuestas</h3>

                    {questions.map((question, qIndex) => {
                        const graded = result.gradedAnswers.find((g) => g.questionId === question.id)
                        if (!graded) return null

                        const userSelected = graded.selectedOptions[0]
                        const correctOption = graded.correctOptions[0]

                        return (
                            <div
                                key={question.id}
                                className={`bg-surface-container rounded-2xl border p-5 space-y-3 ${
                                    graded.correct ? 'border-emerald-500/20' : 'border-error/20'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <MaterialIcon
                                            name={graded.correct ? 'check_circle' : 'cancel'}
                                            size="text-xl"
                                            className={graded.correct ? 'text-emerald-400 mt-0.5' : 'text-error mt-0.5'}
                                        />
                                        <h4 className="text-sm font-semibold text-on-surface">
                                            <span className="text-on-surface-variant mr-1">{qIndex + 1}.</span>
                                            {question.text}
                                        </h4>
                                    </div>
                                    {graded.points && (
                                        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                                            graded.correct
                                                ? 'bg-emerald-500/15 text-emerald-400'
                                                : 'bg-error/15 text-error'
                                        }`}>
                                            {graded.earnedPoints || 0}/{graded.points} pts
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-1.5 pl-8">
                                    {question.options.map((option, oIndex) => {
                                        const isUserAnswer = oIndex === userSelected
                                        const isCorrect = oIndex === correctOption

                                        let optionClasses = 'rounded-lg px-3 py-2 text-sm flex items-center gap-2 '
                                        if (isCorrect) {
                                            optionClasses += 'bg-emerald-500/10 text-emerald-400 font-medium'
                                        } else if (isUserAnswer && !graded.correct) {
                                            optionClasses += 'bg-error/10 text-error line-through'
                                        } else {
                                            optionClasses += 'text-on-surface-variant'
                                        }

                                        return (
                                            <div key={oIndex} className={optionClasses}>
                                                {isCorrect && (
                                                    <MaterialIcon name="check" size="text-sm" className="text-emerald-400" />
                                                )}
                                                {isUserAnswer && !graded.correct && (
                                                    <MaterialIcon name="close" size="text-sm" className="text-error" />
                                                )}
                                                {!isCorrect && !(isUserAnswer && !graded.correct) && (
                                                    <span className="w-4" />
                                                )}
                                                {option}
                                            </div>
                                        )
                                    })}
                                </div>

                                {graded.explanation && (
                                    <div className="ml-8 mt-2 bg-surface-container-lowest rounded-xl px-4 py-3 border border-outline-variant">
                                        <p className="text-xs text-on-surface-variant">
                                            <span className="font-semibold text-on-surface">Explicacion: </span>
                                            {graded.explanation}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Retry button */}
                {!result.passed && canRetry && (
                    <button
                        onClick={() => {
                            setAnswers({})
                            setResult(null)
                            setError(null)
                            setState('taking')
                        }}
                        className="btn-secondary w-full py-3"
                    >
                        <MaterialIcon name="refresh" size="text-base" />
                        Reintentar
                    </button>
                )}

                {!result.passed && !canRetry && (
                    <div className="flex items-center gap-2 bg-error/10 border border-error/20 rounded-xl px-4 py-3">
                        <MaterialIcon name="block" size="text-lg" className="text-error" />
                        <span className="text-sm text-error">
                            Has alcanzado el maximo de intentos permitidos.
                        </span>
                    </div>
                )}
            </div>
        )
    }

    return null
}
