import React from 'react';
import VideoCard from '../components/VideoCard';
import { supabase } from '../lib/supabaseClient';
import { Plus, Loader2, UploadCloud, X } from 'lucide-react';

export default function Training() {
    const [modules, setModules] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [showUploadModal, setShowUploadModal] = React.useState(false);

    // Fetch Modules
    React.useEffect(() => {
        fetchModules();
    }, []);

    const fetchModules = async () => {
        try {
            const { data, error } = await supabase
                .from('training_modules')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setModules(data || []);
        } catch (error) {
            console.error('Error fetching modules:', error);
        } finally {
            setLoading(false);
        }
    };

    // Upload Logic
    const handleUpload = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const title = formData.get('title');
        const category = formData.get('category');
        const file = formData.get('file');

        if (!file || !title) return;

        try {
            setLoading(true); // Re-use loading or create specific uploading state
            setShowUploadModal(false); // Close modal optimistic

            // 1. Upload to Storage
            const fileName = `${Date.now()}_${file.name.replace(/\s/g, '_')}`;
            const { error: uploadError } = await supabase.storage
                .from('training_uploads')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // 2. Insert into DB
            const { error: dbError } = await supabase
                .from('training_modules')
                .insert({
                    title,
                    category,
                    description: 'Nuevo módulo subido por Admin',
                    duration: 'Pendiente', // Could calculate from file metadata if possible
                    video_url: fileName,
                    emoji: '📹'
                });

            if (dbError) throw dbError;

            // 3. Trigger AI Indexing
            await supabase.functions.invoke('process-training-material', {
                body: {
                    file_path: fileName,
                    file_type: file.type,
                    file_name: file.name
                }
            });

            alert('Módulo subido y enviado al AI Coach con éxito!');
            fetchModules(); // Refresh list

        } catch (error) {
            console.error('Upload Error:', error);
            alert('Error al subir el módulo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-center justify-between w-full md:w-auto">
                    <div>
                        <h1 className="text-3xl font-bold text-white">GSA Academy</h1>
                        <p className="text-gray-400 mt-1">Formación continua y obligatoria para closers de alto rendimiento.</p>
                    </div>
                    {/* Admin Add Button */}
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="ml-4 bg-white/10 border border-white/20 text-white p-3 rounded-xl hover:bg-white/20 transition-all shadow-lg flex items-center gap-2"
                    >
                        <Plus size={20} />
                        <span className="hidden sm:inline font-bold">Nuevo Módulo</span>
                    </button>
                </div>

                <div className="bg-black/40 px-4 py-2 rounded-lg border border-white/10 shadow-sm flex items-center space-x-3 backdrop-blur-md">
                    <span className="text-sm font-medium text-gray-400">Progreso Global</span>
                    <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 w-[33%]"></div>
                    </div>
                    <span className="text-sm font-bold text-white">33%</span>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {modules.length > 0 ? modules.map(module => (
                        <VideoCard key={module.id} module={module} />
                    )) : (
                        <div className="col-span-full text-center py-10 text-gray-400 opacity-60">
                            No hay módulos disponibles aún. ¡Sube el primero!
                        </div>
                    )}
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#0F1115] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-fadeIn">
                        <button
                            onClick={() => setShowUploadModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            <X size={24} />
                        </button>

                        <h2 className="text-2xl font-bold mb-1 text-white">Subir Clase Maestra</h2>
                        <p className="text-sm text-gray-400 mb-6">Se publicará en Academy y se enviará al AI Coach.</p>

                        <form onSubmit={handleUpload} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-300 mb-1">Título de la Clase</label>
                                <input name="title" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none placeholder-gray-600" placeholder="Ej: Objeciones de Precio" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-300 mb-1">Categoría</label>
                                <select name="category" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50 outline-none appearance-none">
                                    <option className="bg-gray-900">Ventas</option>
                                    <option className="bg-gray-900">Mentalidad</option>
                                    <option className="bg-gray-900">Cierre</option>
                                    <option className="bg-gray-900">Prospecting</option>
                                </select>
                            </div>

                            <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:bg-white/5 transition-colors cursor-pointer relative group">
                                <input type="file" name="file" required accept="video/*" className="absolute inset-0 opacity-0 cursor-pointer" />
                                <UploadCloud className="mx-auto text-gray-400 group-hover:text-blue-500 transition-colors mb-2" size={32} />
                                <p className="text-sm font-bold text-gray-300">Arrastra tu video aquí</p>
                                <p className="text-xs text-gray-500">MP4, MOV (Max 500MB)</p>
                            </div>

                            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/40 mt-4">
                                Subir y Procesar
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
