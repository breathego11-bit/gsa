"use client";

import Link from "next/link";
import { PlayCircle } from "lucide-react";

export default function DashboardPage() {
    const courses = [
        { id: "1", title: "Mastering the Close", progress: 45, image: "bg-gradient-to-br from-blue-600 to-indigo-900" },
        { id: "2", title: "Personal Development Blueprint", progress: 80, image: "bg-gradient-to-br from-indigo-500 to-purple-900" },
        { id: "3", title: "Advanced Lead Gen", progress: 100, image: "bg-gradient-to-br from-emerald-500 to-teal-900" }
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Welcome back, Ivan</h1>
                <p className="text-zinc-400 mt-2">Continue your learning journey.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => (
                    <div key={course.id} className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 hover:border-blue-500/50 transition-colors">
                        {/* Thumbnail Placeholder */}
                        <div className={`h-40 w-full ${course.image} opacity-80 group-hover:opacity-100 transition-opacity`} />

                        <div className="p-6">
                            <h3 className="font-semibold text-lg text-white mb-4 line-clamp-1">{course.title}</h3>

                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    {/* Circular Progress Indicator */}
                                    <div className="relative flex items-center justify-center h-12 w-12">
                                        <svg className="h-full w-full transform -rotate-90">
                                            <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-zinc-800" />
                                            <circle
                                                cx="24" cy="24" r="18"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                                fill="transparent"
                                                strokeDasharray={2 * Math.PI * 18}
                                                strokeDashoffset={(2 * Math.PI * 18) - ((course.progress / 100) * (2 * Math.PI * 18))}
                                                className={`transition-all duration-1000 ease-out ${course.progress === 100 ? 'text-emerald-500' : 'text-blue-500'}`}
                                            />
                                        </svg>
                                        <span className="absolute text-xs font-medium">{course.progress}%</span>
                                    </div>
                                    <span className="text-sm text-zinc-400">
                                        {course.progress === 100 ? 'Completed' : 'In Progress'}
                                    </span>
                                </div>
                            </div>

                            <Link
                                href={`/course/${course.id}`}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 transition-all"
                            >
                                <PlayCircle className="h-4 w-4" />
                                {course.progress === 0 ? 'Start Course' : course.progress === 100 ? 'Review Course' : 'Continue Learning'}
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
