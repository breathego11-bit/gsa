import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { academyService } from '../../services/academyService';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Compass, PlayCircle } from 'lucide-react';

export default function CoursesList() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCatalogue = async () => {
            setLoading(true);
            try {
                const catalogue = await academyService.getCourses();
                setCourses(catalogue);
            } catch (error) {
                console.error("Error fetching catalogue:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user?.email) fetchCatalogue();
    }, [user]);

    if (loading) {
        return <div className="flex h-full items-center justify-center text-blue-500 animate-pulse">Cargando Catálogo...</div>;
    }

    return (
        <div className="h-full flex flex-col pt-4 animate-fadeIn">
            {/* Nav */}
            <button
                onClick={() => navigate('/academy/dashboard')}
                className="flex items-center text-gray-400 hover:text-white transition-colors mb-6 text-sm font-medium w-fit"
            >
                <ChevronLeft size={16} className="mr-1" /> Volver al Tablero
            </button>

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center">
                    <Compass className="mr-3 text-cyan-400" size={28} />
                    Catálogo de Formación
                </h1>
                <p className="text-gray-400 mt-2">Explora todos los programas disponibles para desarrollar tus habilidades.</p>
            </div>

            {/* Catalogue Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8">
                {courses.map(course => (
                    <div key={course.id} className="glass-panel relative group rounded-2xl overflow-hidden border border-white/10 hover:border-cyan-500/50 transition-all duration-300 flex flex-col cursor-pointer" onClick={() => navigate(`/academy/course/${course.id}`)}>
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-0" />

                        <div className="h-40 relative overflow-hidden bg-black/50 z-10 w-full">
                            <img
                                src={course.thumbnail}
                                alt={course.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                            />
                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black to-transparent" />
                        </div>

                        <div className="p-5 flex-1 flex flex-col justify-between relative z-10 bg-black/40">
                            <div>
                                <h3 className="text-lg font-bold text-white mb-2 leading-tight group-hover:text-cyan-400 transition-colors">{course.title}</h3>
                                <p className="text-gray-400 text-xs line-clamp-3 leading-relaxed">{course.description}</p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                                <span className="text-xs font-semibold px-3 py-1 bg-white/5 rounded-full text-gray-300">Programa Completo</span>
                                <PlayCircle className="text-gray-500 group-hover:text-white transition-colors" size={20} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
