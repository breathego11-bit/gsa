import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { academyService } from '../../services/academyService';
import { useNavigate } from 'react-router-dom';
import { BookOpen, PlayCircle, Trophy, Sparkles } from 'lucide-react';
import CircularProgress from '../../components/academy/CircularProgress';

export default function AcademyDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            setLoading(true);
            try {
                const publishedCourses = await academyService.getCourses();

                // Fetch progress for each course
                const coursesWithProgress = await Promise.all(
                    publishedCourses.map(async (course) => {
                        const progress = await academyService.getCourseProgress(user.email, course.id);
                        return { ...course, progress };
                    })
                );

                setCourses(coursesWithProgress);
            } catch (error) {
                console.error("Error fetching academy dashboard:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user?.email) fetchDashboard();
    }, [user]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center text-blue-500 animate-pulse">
                Cargando tu progreso...
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col pt-4 animate-fadeIn">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-blue-900/60 to-black/60 border border-blue-500/30 rounded-2xl p-8 mb-8 relative overflow-hidden shadow-[0_0_30px_rgba(59,130,246,0.15)] group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 group-hover:bg-blue-500/30 transition-all duration-700 pointer-events-none"></div>
                <Sparkles className="absolute top-8 right-8 text-blue-400/20 w-32 h-32 animate-pulse-slow pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight mb-2 flex items-center">
                            <Trophy className="mr-3 text-blue-400" size={28} />
                            GSA Academy
                        </h1>
                        <p className="text-gray-300 max-w-xl text-sm leading-relaxed">
                            Bienvenido a tu centro de excelencia. Aquí es donde forjas tu mentalidad y pules tus habilidades de cierre high-ticket.
                        </p>
                    </div>
                    <div className="mt-6 md:mt-0 flex gap-4">
                        <button
                            onClick={() => navigate('/academy/courses')}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-glow-blue border border-blue-400/50 flex items-center"
                        >
                            <BookOpen size={18} className="mr-2" />
                            Explorar Cursos
                        </button>
                    </div>
                </div>
            </div>

            {/* Enrolled Courses Grid */}
            <div>
                <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                    Mis Cursos Activos
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map(course => (
                        <div key={course.id} className="glass-panel bg-black/40 border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all duration-300 group flex flex-col relative">
                            {/* Circular Progress Overlay Top Right */}
                            <div className="absolute top-3 right-3 z-20 bg-black/60 backdrop-blur-md rounded-full border border-white/10 p-1 shadow-lg">
                                <CircularProgress value={course.progress || 0} size={50} strokeWidth={4} />
                            </div>

                            <div className="h-48 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
                                <img
                                    src={course.thumbnail}
                                    alt={course.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                />
                            </div>
                            <div className="p-6 flex-1 flex flex-col justify-between relative z-10 -mt-8 bg-gradient-to-b from-transparent to-black/90">
                                <div>
                                    <h3 className="text-lg font-bold text-white leading-tight mb-2">{course.title}</h3>
                                    <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">{course.description}</p>
                                </div>
                                <div className="mt-6">
                                    <button
                                        onClick={() => navigate(`/academy/course/${course.id}`)}
                                        className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm font-semibold transition-all flex items-center justify-center group-hover:border-blue-500/30 group-hover:text-blue-400"
                                    >
                                        <PlayCircle size={18} className="mr-2" />
                                        {course.progress > 0 ? 'Continuar Aprendiendo' : 'Empezar Curso'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {courses.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-500 border border-dashed border-white/10 rounded-2xl bg-white/5">
                            No estás inscrito en ningún curso aún. <br /> <span className="text-blue-400 cursor-pointer hover:underline" onClick={() => navigate('/academy/courses')}>Explorar el catálogo.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
