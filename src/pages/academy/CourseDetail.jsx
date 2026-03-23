import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { academyService } from '../../services/academyService';
import { ChevronLeft, CheckCircle, PlayCircle, Lock } from 'lucide-react';
import CircularProgress from '../../components/academy/CircularProgress';

export default function CourseDetail() {
    const { courseId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [course, setCourse] = useState(null);
    const [progress, setProgress] = useState(0);
    const [completedLessons, setCompletedLessons] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCourseData = async () => {
            setLoading(true);
            try {
                const courseData = await academyService.getCourseDetails(courseId);
                const progressData = await academyService.getCourseProgress(user.email, courseId);
                const completedData = await academyService.getUserCompletedLessons(user.email);

                setCourse(courseData);
                setProgress(progressData);
                setCompletedLessons(completedData);
            } catch (error) {
                console.error("Error fetching course detail:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user?.email && courseId) fetchCourseData();
    }, [courseId, user]);

    if (loading) {
        return <div className="flex h-full items-center justify-center text-blue-500 animate-pulse">Cargando Módulos...</div>;
    }

    if (!course) {
        return <div className="text-white">Curso no encontrado.</div>;
    }

    // Determine next unfinished lesson
    let nextLessonId = null;
    if (course.modules) {
        for (const mod of course.modules) {
            for (const les of mod.lessons) {
                if (!completedLessons.includes(les.id)) {
                    nextLessonId = les.id;
                    break;
                }
            }
            if (nextLessonId) break;
        }
    }

    return (
        <div className="h-full flex flex-col pt-4 animate-fadeIn overflow-y-auto custom-scrollbar pr-2 pb-12">

            {/* Nav */}
            <button
                onClick={() => navigate('/academy/dashboard')}
                className="flex items-center text-gray-400 hover:text-white transition-colors mb-6 text-sm font-medium w-fit"
            >
                <ChevronLeft size={16} className="mr-1" /> Volver al Inicio
            </button>

            {/* Course Header Banner */}
            <div className="relative rounded-3xl overflow-hidden mb-10 border border-white/10 group shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent z-10" />
                <img src={course.thumbnail} alt={course.title} className="w-full h-64 object-cover object-center group-hover:scale-105 transition-transform duration-1000" />

                <div className="absolute bottom-0 left-0 right-0 p-8 z-20 flex justify-between items-end flex-wrap gap-6">
                    <div className="max-w-3xl">
                        <span className="px-3 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-bold uppercase tracking-wider mb-4 inline-block">Masterclass</span>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">{course.title}</h1>
                        <p className="text-gray-300 text-lg leading-relaxed">{course.description}</p>
                    </div>

                    <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-5 rounded-2xl flex items-center gap-6 shadow-xl">
                        <div>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Tu Progreso</p>
                            <div className="text-white font-bold">{progress}% Completado</div>
                        </div>
                        <CircularProgress value={progress} size={65} strokeWidth={5} />
                    </div>
                </div>
            </div>

            {/* Modules Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Col: Modules List */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-2xl font-bold text-white flex items-center mb-6">Contenido del Programa</h2>

                    {course.modules?.map((module, mIdx) => (
                        <div key={module.id} className="glass-panel bg-black/40 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center border-b border-white/5 pb-4">
                                <span className="bg-white/10 text-gray-300 w-8 h-8 rounded-lg flex items-center justify-center text-sm mr-3 font-mono">{mIdx + 1}</span>
                                {module.title}
                            </h3>

                            <div className="space-y-3">
                                {module.lessons?.map((lesson, lIdx) => {
                                    const isCompleted = completedLessons.includes(lesson.id);

                                    return (
                                        <div
                                            key={lesson.id}
                                            onClick={() => navigate(`/academy/lesson/${lesson.id}?courseId=${course.id}`)}
                                            className="group flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer border border-transparent hover:border-white/10 transition-all duration-300"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${isCompleted
                                                        ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                                        : 'bg-white/10 text-gray-400 group-hover:bg-blue-500/20 group-hover:text-blue-400'
                                                    }`}>
                                                    {isCompleted ? <CheckCircle size={20} /> : <PlayCircle size={20} className="ml-0.5 group-hover:scale-110 transition-transform" />}
                                                </div>
                                                <div>
                                                    <p className={`font-semibold text-base transition-colors ${isCompleted ? 'text-gray-300' : 'text-white group-hover:text-blue-400'}`}>
                                                        {lIdx + 1}. {lesson.title}
                                                    </p>
                                                    <p className="text-gray-500 text-sm mt-0.5 line-clamp-1">{lesson.description}</p>
                                                </div>
                                            </div>

                                            <button className={`flex-shrink-0 text-sm font-medium px-4 py-1.5 rounded-full transition-all ${isCompleted
                                                    ? 'bg-transparent text-emerald-500'
                                                    : 'bg-blue-600/20 text-blue-400 opacity-0 group-hover:opacity-100'
                                                }`}>
                                                {isCompleted ? 'Completado' : 'Reproducir'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right Col: Call to action */}
                <div className="space-y-6">
                    <div className="glass-panel p-6 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-900/40 to-black relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl" />

                        <h3 className="text-xl font-bold text-white mb-2 relative z-10">Siguiente Paso</h3>
                        <p className="text-gray-400 text-sm mb-6 relative z-10">
                            {progress === 100
                                ? '¡Felicidades! Has completado todo el material.'
                                : 'Continúa donde lo dejaste para no perder el ritmo.'}
                        </p>

                        {progress < 100 && nextLessonId && (
                            <button
                                onClick={() => navigate(`/academy/lesson/${nextLessonId}?courseId=${course.id}`)}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg hover:shadow-glow-blue border border-blue-400/50 transition-all flex items-center justify-center text-lg relative z-10"
                            >
                                <PlayCircle size={24} className="mr-2" />
                                {progress === 0 ? 'Empezar Curso' : 'Continuar Lección'}
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
