import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { academyService } from '../../services/academyService';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Plus, Edit2, Trash2, Video, List, Image, Check } from 'lucide-react';

export default function AcademyAdmin() {
    const { user } = useAuth();
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [loading, setLoading] = useState(true);

    // Form states
    const [showCourseForm, setShowCourseForm] = useState(false);
    const [newCourse, setNewCourse] = useState({ title: '', description: '', thumbnail: '' });

    const [showModuleForm, setShowModuleForm] = useState(false);
    const [newModule, setNewModule] = useState({ title: '' });

    const [showLessonForm, setShowLessonForm] = useState(false);
    const [activeModuleForLesson, setActiveModuleForLesson] = useState(null);
    const [newLesson, setNewLesson] = useState({ title: '', description: '', videoUrl: '' });
    const [videoFile, setVideoFile] = useState(null);
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);

    const fetchCourses = async () => {
        setLoading(true);
        // Using getCourses here returns published. If we need a dedicated getAdminCourses, we'd add it to service. 
        // For mock, getCourses works but we might want all. Let's assume getCourses returns all for Admin.
        const all = await academyService.getCourses();
        setCourses(all);
        setLoading(false);
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    const handleSelectCourse = async (courseId) => {
        setLoading(true);
        const details = await academyService.getCourseDetails(courseId);
        setSelectedCourse(details);
        setLoading(false);
    };

    // --- CRUD Actions ---

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        const created = await academyService.createCourse({ ...newCourse, published: false });
        setCourses([...courses, created]);
        setShowCourseForm(false);
        setNewCourse({ title: '', description: '', thumbnail: '' });
    };

    const handleCreateModule = async (e) => {
        e.preventDefault();
        if (!selectedCourse) return;
        const newOrder = selectedCourse.modules ? selectedCourse.modules.length + 1 : 1;
        const created = await academyService.createModule({
            courseId: selectedCourse.id,
            title: newModule.title,
            order: newOrder
        });

        // Optimistic refresh
        const updatedCourse = { ...selectedCourse, modules: [...(selectedCourse.modules || []), { ...created, lessons: [] }] };
        setSelectedCourse(updatedCourse);
        setShowModuleForm(false);
        setNewModule({ title: '' });
    };

    const handleCreateLesson = async (e) => {
        e.preventDefault();
        if (!activeModuleForLesson) return;

        setIsUploadingVideo(true);

        const targetModule = selectedCourse.modules.find(m => m.id === activeModuleForLesson);
        const newOrder = targetModule.lessons ? targetModule.lessons.length + 1 : 1;

        try {
            let finalVideoUrl = newLesson.videoUrl;

            // Upload video file if present
            if (videoFile) {
                finalVideoUrl = await academyService.uploadLessonVideo(videoFile);
            }

            const created = await academyService.createLesson({
                moduleId: activeModuleForLesson,
                title: newLesson.title,
                description: newLesson.description,
                videoUrl: finalVideoUrl,
                order: newOrder
            });

            // Update local state
            const updatedModules = selectedCourse.modules.map(m => {
                if (m.id === activeModuleForLesson) {
                    return { ...m, lessons: [...m.lessons, created] };
                }
                return m;
            });

            setSelectedCourse({ ...selectedCourse, modules: updatedModules });
            setShowLessonForm(false);
            setNewLesson({ title: '', description: '', videoUrl: '' });
            setVideoFile(null);
            setActiveModuleForLesson(null);
        } catch (error) {
            console.error("Error creating lesson:", error);
            alert("Error al subir el video o crear la lección.");
        } finally {
            setIsUploadingVideo(false);
        }
    };



    // Drag and Drop reordering lessons within a module
    const onDragEnd = (result) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const moduleId = source.droppableId;
        const moduleIndex = selectedCourse.modules.findIndex(m => m.id === moduleId);

        if (moduleIndex === -1) return;

        const targetModule = selectedCourse.modules[moduleIndex];
        const updatedLessons = Array.from(targetModule.lessons);

        // Remove from old index, insert at new index
        const [movedLesson] = updatedLessons.splice(source.index, 1);
        updatedLessons.splice(destination.index, 0, movedLesson);

        // Reassign order
        const reorderedLessons = updatedLessons.map((l, index) => ({ ...l, order: index + 1 }));

        // Update local state
        const newModules = [...selectedCourse.modules];
        newModules[moduleIndex] = { ...targetModule, lessons: reorderedLessons };

        setSelectedCourse({ ...selectedCourse, modules: newModules });
        // In a real app, fire an API call to save 'reorderedLessons' array here
    };

    if (loading && !selectedCourse && courses.length === 0) {
        return <div className="p-8 text-blue-500 animate-pulse">Cargando Admin Panel...</div>;
    }

    return (
        <div className="h-full flex flex-col pt-4 animate-fadeIn">
            {/* Header */}
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Edit2 className="text-emerald-500" size={28} />
                        Content Manager
                    </h1>
                    <p className="text-gray-400 mt-2 text-sm">Administración del Academy LMS</p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0 overflow-hidden">

                {/* Left Panel: Course List */}
                <div className="lg:w-1/3 flex flex-col glass-panel rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <h2 className="font-bold text-white flex items-center"><List size={18} className="mr-2 text-blue-400" /> Catálogo</h2>
                        <button
                            onClick={() => setShowCourseForm(true)}
                            className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="Nuevo Curso"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                        {courses.map(course => (
                            <div
                                key={course.id}
                                onClick={() => handleSelectCourse(course.id)}
                                className={`p-4 mb-2 rounded-xl cursor-pointer border transition-all flex items-center gap-3 ${selectedCourse?.id === course.id
                                    ? 'bg-blue-600/20 border-blue-500/50 text-white'
                                    : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                <img src={course.thumbnail} className="w-12 h-12 rounded-lg object-cover bg-black" alt="" />
                                <div className="flex-1 overflow-hidden">
                                    <h3 className="font-bold truncate text-sm">{course.title}</h3>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${course.published ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                        {course.published ? 'Público' : 'Borrador'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Panel: Course Editor */}
                <div className="lg:w-2/3 flex flex-col glass-panel rounded-2xl border border-white/10 bg-black/40 overflow-hidden relative">
                    {!selectedCourse ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-20">
                            <List size={48} className="mb-4 text-white/10" />
                            <p className="text-lg font-medium text-gray-400">Selecciona un curso para editar su contenido</p>
                            <p className="text-sm mt-2">O crea uno nuevo desde el panel lateral</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {/* Course Data Header */}
                            <div className="p-6 md:p-8 border-b border-white/10 bg-gradient-to-br from-blue-900/20 to-black relative">
                                <div className="absolute top-0 right-0 p-4">
                                    <button className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors border border-white/10 flex items-center">
                                        <Edit2 size={12} className="mr-1" /> Editar Info
                                    </button>
                                </div>
                                <h2 className="text-3xl font-extrabold text-white mb-2">{selectedCourse.title}</h2>
                                <p className="text-gray-400 text-sm max-w-2xl">{selectedCourse.description}</p>
                            </div>

                            {/* Modules & Lessons Curriculum */}
                            <div className="p-6 md:p-8">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-white">Curriculum</h3>
                                    <button
                                        onClick={() => setShowModuleForm(true)}
                                        className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 px-4 py-2 rounded-xl text-sm font-bold flex items-center transition-colors"
                                    >
                                        <Plus size={16} className="mr-2" /> Nuevo Módulo
                                    </button>
                                </div>

                                <DragDropContext onDragEnd={onDragEnd}>
                                    <div className="space-y-6">
                                        {selectedCourse.modules?.map((mod, index) => (
                                            <div key={mod.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-sm">
                                                {/* Module Header */}
                                                <div className="bg-black/40 p-4 border-b border-white/5 flex justify-between items-center">
                                                    <h4 className="font-bold text-white flex items-center">
                                                        <span className="text-gray-500 mr-3 text-sm font-mono">M{index + 1}</span>
                                                        {mod.title}
                                                    </h4>
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => { setActiveModuleForLesson(mod.id); setShowLessonForm(true); }}
                                                            className="text-xs text-blue-400 bg-blue-400/10 px-3 py-1.5 rounded-lg hover:bg-blue-400/20 transition-colors flex items-center"
                                                        >
                                                            <Plus size={14} className="mr-1" /> Lección
                                                        </button>
                                                        <button className="text-red-400 bg-red-400/10 p-1.5 rounded-lg hover:bg-red-400/20 transition-colors">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Lessons List (Draggable) */}
                                                <Droppable droppableId={mod.id}>
                                                    {(provided) => (
                                                        <div
                                                            {...provided.droppableProps}
                                                            ref={provided.innerRef}
                                                            className="p-2 min-h-[50px] space-y-2"
                                                        >
                                                            {mod.lessons?.map((les, lIndex) => (
                                                                <Draggable key={les.id} draggableId={les.id} index={lIndex}>
                                                                    {(provided, snapshot) => (
                                                                        <div
                                                                            ref={provided.innerRef}
                                                                            {...provided.draggableProps}
                                                                            className={`group flex items-center p-3 rounded-xl border transition-all ${snapshot.isDragging
                                                                                ? 'bg-blue-900/40 border-blue-500/50 shadow-xl z-50'
                                                                                : 'bg-white/5 border-transparent hover:border-white/10 hover:bg-white/10'
                                                                                }`}
                                                                        >
                                                                            <div {...provided.dragHandleProps} className="text-gray-500 hover:text-white mr-3 cursor-grab p-1">
                                                                                <GripVertical size={16} />
                                                                            </div>

                                                                            <Video size={16} className="text-blue-400 mr-3 flex-shrink-0" />

                                                                            <div className="flex-1 overflow-hidden pr-4">
                                                                                <p className="font-semibold text-gray-200 text-sm truncate">{les.title}</p>
                                                                            </div>

                                                                            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                <button className="text-gray-400 hover:text-white p-1 rounded-md"><Edit2 size={14} /></button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </Draggable>
                                                            ))}
                                                            {provided.placeholder}
                                                        </div>
                                                    )}
                                                </Droppable>
                                            </div>
                                        ))}
                                    </div>
                                </DragDropContext>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- Modals --- */}

            {showCourseForm && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel w-full max-w-lg bg-gray-900 rounded-2xl border border-white/10 p-6">
                        <h3 className="text-xl font-bold text-white mb-6">Crear Nuevo Curso</h3>
                        <form onSubmit={handleCreateCourse}>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-400 mb-1 block">Título</label>
                                    <input required type="text" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 outline-none" value={newCourse.title} onChange={e => setNewCourse({ ...newCourse, title: e.target.value })} placeholder="Ej: Masterclass Ventas B2B" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-400 mb-1 block">Descripción breve</label>
                                    <textarea required className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 outline-none resize-none h-24" value={newCourse.description} onChange={e => setNewCourse({ ...newCourse, description: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-400 mb-1 block">URL Thumbnail</label>
                                    <input required type="url" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 outline-none" value={newCourse.thumbnail} onChange={e => setNewCourse({ ...newCourse, thumbnail: e.target.value })} placeholder="https://..." />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-8">
                                <button type="button" onClick={() => setShowCourseForm(false)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancelar</button>
                                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-bold shadow-lg">Crear Curso</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showModuleForm && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel w-full max-w-md bg-gray-900 rounded-2xl border border-white/10 p-6">
                        <h3 className="text-xl font-bold text-white mb-6">Nuevo Módulo</h3>
                        <form onSubmit={handleCreateModule}>
                            <div>
                                <label className="text-sm font-medium text-gray-400 mb-1 block">Nombre del módulo</label>
                                <input required type="text" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 outline-none" value={newModule.title} onChange={e => setNewModule({ title: e.target.value })} placeholder="Ej: Fase 1: Descubrimiento" />
                            </div>
                            <div className="flex justify-end gap-3 mt-8">
                                <button type="button" onClick={() => setShowModuleForm(false)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancelar</button>
                                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold shadow-lg">Añadir Módulo</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showLessonForm && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="glass-panel w-full max-w-lg bg-gray-900 rounded-2xl border border-white/10 p-6">
                        <h3 className="text-xl font-bold text-white mb-6">Añadir Lección al Módulo</h3>
                        <form onSubmit={handleCreateLesson}>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-400 mb-1 block">Título de la Lección</label>
                                    <input required type="text" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 outline-none" value={newLesson.title} onChange={e => setNewLesson({ ...newLesson, title: e.target.value })} placeholder="Ej: Objeción 'No tengo dinero'" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-400 mb-1 block">Subir Archivo de Video MP4 (Recomendado)</label>
                                    <input
                                        type="file"
                                        accept="video/*"
                                        onChange={e => setVideoFile(e.target.files[0])}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-400 mb-1 block">O usar URL externa (YouTube/Vimeo)</label>
                                    <input type="url" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 outline-none" value={newLesson.videoUrl} onChange={e => setNewLesson({ ...newLesson, videoUrl: e.target.value })} placeholder="https://..." disabled={!!videoFile} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-400 mb-1 block">Mensaje / Notas / Texto adjunto</label>
                                    <textarea className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 outline-none resize-none h-20" value={newLesson.description} onChange={e => setNewLesson({ ...newLesson, description: e.target.value })} placeholder="Teoría de soporte para la clase..." />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-8">
                                <button type="button" onClick={() => { setShowLessonForm(false); setActiveModuleForLesson(null); setVideoFile(null); setNewLesson({ ...newLesson, videoUrl: '' }); }} className="px-4 py-2 text-gray-400 hover:text-white transition-colors" disabled={isUploadingVideo}>Cancelar</button>
                                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-bold shadow-lg flex items-center" disabled={isUploadingVideo}>
                                    {isUploadingVideo ? (
                                        <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span> Subiendo video...</>
                                    ) : (
                                        "Guardar Lección"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
