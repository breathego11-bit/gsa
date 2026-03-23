import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { academyService } from '../../services/academyService';
import { ChevronLeft, CheckCircle, ChevronRight, Check } from 'lucide-react';
import PrivateNotes from '../../components/academy/PrivateNotes';
import CustomVideoPlayer from '../../components/academy/CustomVideoPlayer';

export default function LessonPlayer() {
    const { lessonId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Extract courseId from URL to allow backward navigation
    const queryParams = new URLSearchParams(location.search);
    const courseId = queryParams.get('courseId');

    const [lesson, setLesson] = useState(null);
    const [isCompleted, setIsCompleted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [courseContext, setCourseContext] = useState(null);

    useEffect(() => {
        const fetchLessonAndContext = async () => {
            setLoading(true);
            try {
                const lessonData = await academyService.getLesson(lessonId);
                const completedList = await academyService.getUserCompletedLessons(user.email);

                setLesson(lessonData);
                setIsCompleted(completedList.includes(lessonId));

                if (courseId) {
                    const ctx = await academyService.getCourseDetails(courseId);
                    setCourseContext(ctx);
                }
            } catch (error) {
                console.error("Error fetching lesson:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user?.email && lessonId) fetchLessonAndContext();
    }, [lessonId, courseId, user]);

    const handleToggleComplete = async () => {
        const newState = !isCompleted;
        setIsCompleted(newState);
        try {
            await academyService.toggleLessonProgress(user.email, lessonId, newState);
        } catch (error) {
            console.error("Failed to update progress:", error);
            setIsCompleted(!newState); // revert on error
        }
    };

    // Determine Prev/Next Lessons for Navigation
    let prevLessonId = null;
    let nextLessonId = null;

    if (courseContext && courseContext.modules && lesson) {
        // Flatten all lessons into a single ordered array
        const allLessons = courseContext.modules.reduce((acc, mod) => [...acc, ...mod.lessons], []);
        const currentIndex = allLessons.findIndex(l => l.id === lesson.id);

        if (currentIndex > 0) prevLessonId = allLessons[currentIndex - 1].id;
        if (currentIndex < allLessons.length - 1) nextLessonId = allLessons[currentIndex + 1].id;
    }

    const goToLesson = (id) => {
        if (id) navigate(`/academy/lesson/${id}?courseId=${courseId}`);
    }

    if (loading) {
        return <div className="flex h-full items-center justify-center text-blue-500 animate-pulse">Cargando Clase...</div>;
    }

    if (!lesson) {
        return <div className="text-white">Lección no encontrada.</div>;
    }

    return (
        <div className="h-full flex flex-col pt-2 animate-fadeIn overflow-hidden">

            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between mb-4 px-2">
                <button
                    onClick={() => navigate(courseId ? `/academy/course/${courseId}` : '/academy/dashboard')}
                    className="flex items-center text-gray-400 hover:text-white transition-colors text-sm font-medium"
                >
                    <ChevronLeft size={18} className="mr-1" /> Volver al Curso
                </button>

                {/* Next/Prev Navigation */}
                <div className="flex gap-2">
                    <button
                        onClick={() => goToLesson(prevLessonId)}
                        disabled={!prevLessonId}
                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all ${prevLessonId ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10' : 'bg-transparent text-gray-600 cursor-not-allowed hidden md:flex'}`}
                    >
                        <ChevronLeft size={16} className="mr-1" /> Anterior
                    </button>
                    <button
                        onClick={() => goToLesson(nextLessonId)}
                        disabled={!nextLessonId}
                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all ${nextLessonId ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10' : 'bg-transparent text-gray-600 cursor-not-allowed hidden md:flex'}`}
                    >
                        Siguiente <ChevronRight size={16} className="ml-1" />
                    </button>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 pb-6">

                {/* Visual Area (70%) */}
                <div className="lg:w-2/3 flex flex-col overflow-y-auto custom-scrollbar pr-2 space-y-6">

                    {/* Video Player Box */}
                    <div className="w-full bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative aspect-video group">
                        <CustomVideoPlayer
                            url={lesson.videoUrl}
                            poster={courseContext?.thumbnail}
                        />
                    </div>

                    {/* Lesson Meta Data */}
                    <div className="glass-panel p-6 rounded-2xl border border-white/10">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{lesson.title}</h1>
                                <p className="text-gray-400 leading-relaxed text-sm md:text-base">{lesson.description}</p>
                            </div>

                            {/* Mark as read button */}
                            <button
                                onClick={handleToggleComplete}
                                className={`flex-shrink-0 flex items-center justify-center px-6 py-3 rounded-xl font-bold transition-all border ${isCompleted
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                    : 'bg-blue-600 text-white border-blue-500/50 hover:bg-blue-500 hover:shadow-glow-blue'
                                    }`}
                            >
                                {isCompleted ? (
                                    <><CheckCircle size={20} className="mr-2" /> Completado</>
                                ) : (
                                    <><Check size={20} className="mr-2" /> Marcar como Hecho</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tools Area (Private Notes 30%) */}
                <div className="lg:w-1/3 flex flex-col glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                    <PrivateNotes lessonId={lesson.id} />
                </div>
            </div>

        </div>
    );
}
