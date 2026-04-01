'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

interface LessonData {
    id: string
    title: string
    order: number
    duration: number | null
    type?: string
    progress?: Array<{ completed: boolean }>
}

const lessonTypeIcon: Record<string, string> = {
    VIDEO: 'play_circle',
    TEXT: 'article',
    FORM: 'assignment',
    EXAM: 'quiz',
}

interface ModuleData {
    id: string
    title: string
    order: number
    lessons: LessonData[]
}

interface CourseModuleAccordionProps {
    modules: ModuleData[]
    isEnrolled: boolean
}

function formatDuration(minutes: number): string {
    if (minutes >= 60) {
        const h = Math.floor(minutes / 60)
        const rm = minutes % 60
        return rm > 0 ? `${h}h ${rm}m` : `${h}h`
    }
    return `${minutes} min`
}

function moduleDuration(lessons: LessonData[]): number {
    return lessons.reduce((sum, l) => sum + (l.duration || 0), 0)
}

export function CourseModuleAccordion({ modules, isEnrolled }: CourseModuleAccordionProps) {
    // Expand first module by default
    const [expanded, setExpanded] = useState<Set<string>>(
        new Set(modules.length > 0 ? [modules[0].id] : []),
    )

    function toggle(id: string) {
        setExpanded((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    return (
        <div className="space-y-4">
            {modules.map((mod) => {
                const isOpen = expanded.has(mod.id)
                const totalMin = moduleDuration(mod.lessons)

                return (
                    <div
                        key={mod.id}
                        className="bg-surface-container-low rounded-xl overflow-hidden"
                    >
                        {/* Module header */}
                        <button
                            type="button"
                            onClick={() => toggle(mod.id)}
                            className="w-full p-6 flex items-center justify-between cursor-pointer hover:bg-surface-container-high transition-all text-left"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                                    isEnrolled
                                        ? 'bg-primary-container text-on-primary-container'
                                        : 'bg-surface-container-highest text-on-surface-variant'
                                }`}>
                                    {String(mod.order).padStart(2, '0')}
                                </div>
                                <div className={!isEnrolled ? 'opacity-60' : ''}>
                                    <h3 className="font-bold text-lg text-on-surface">{mod.title}</h3>
                                    <p className="text-sm text-on-surface-variant">
                                        {mod.lessons.length} {mod.lessons.length === 1 ? 'Lección' : 'Lecciones'}
                                        {totalMin > 0 && ` • ${totalMin} Minutos`}
                                    </p>
                                </div>
                            </div>
                            <MaterialIcon
                                    name="expand_more"
                                    size="text-xl"
                                    className={`text-on-surface-variant transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                                />
                        </button>

                        {/* Lessons (expanded) */}
                        <div
                            className="transition-all duration-300 overflow-hidden"
                            style={{ maxHeight: isOpen ? `${mod.lessons.length * 80 + 32}px` : '0px' }}
                        >
                            <div className="px-6 pb-6 space-y-3">
                                {mod.lessons.map((lesson) => {
                                    const completed = Array.isArray(lesson.progress) && lesson.progress[0]?.completed

                                    if (!isEnrolled) {
                                        return (
                                            <div
                                                key={lesson.id}
                                                className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-lg opacity-75"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <MaterialIcon name="lock" size="text-xl" className="text-on-surface-variant" />
                                                    <span className="font-medium text-on-surface-variant">
                                                        {lesson.title}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {lesson.duration && (
                                                        <span className="text-xs text-on-surface-variant">
                                                            {formatDuration(lesson.duration)}
                                                        </span>
                                                    )}
                                                    <MaterialIcon name={lessonTypeIcon[lesson.type || 'VIDEO'] || 'play_circle'} size="text-sm" className="text-on-surface-variant" />
                                                </div>
                                            </div>
                                        )
                                    }

                                    return (
                                        <Link
                                            key={lesson.id}
                                            href={`/lesson/${lesson.id}`}
                                            className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-lg hover:bg-surface-container transition-colors group/item"
                                        >
                                            <div className="flex items-center gap-4">
                                                {completed ? (
                                                    <span className="material-symbols-outlined text-blue-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                                                        check_circle
                                                    </span>
                                                ) : (
                                                    <MaterialIcon name="radio_button_unchecked" size="text-xl" className="text-on-surface-variant" />
                                                )}
                                                <span className={`font-medium ${completed ? 'text-on-surface' : 'text-on-surface'}`}>
                                                    {lesson.title}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {lesson.duration && (
                                                    <span className="text-xs text-on-surface-variant">
                                                        {formatDuration(lesson.duration)}
                                                    </span>
                                                )}
                                                <MaterialIcon name={lessonTypeIcon[lesson.type || 'VIDEO'] || 'play_circle'} size="text-sm" className="text-on-surface-variant" />
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
