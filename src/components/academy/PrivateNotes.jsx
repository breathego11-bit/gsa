import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { academyService } from '../../services/academyService';
import { Save, Edit3, Loader2 } from 'lucide-react';

export default function PrivateNotes({ lessonId }) {
    const { user } = useAuth();
    const [noteContent, setNoteContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [loading, setLoading] = useState(true);

    // Auto-save debouncer ref
    const timeoutRef = useRef(null);

    useEffect(() => {
        const fetchNote = async () => {
            setLoading(true);
            try {
                const content = await academyService.getNote(user.email, lessonId);
                setNoteContent(content || '');
                setIsDirty(false);
            } catch (error) {
                console.error("Error fetching notes:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchNote();

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        }
    }, [lessonId, user]);

    const saveNote = async (content) => {
        setIsSaving(true);
        try {
            await academyService.saveNote(user.email, lessonId, content);
            setIsDirty(false);
        } catch (error) {
            console.error("Error saving note: ", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (e) => {
        const val = e.target.value;
        setNoteContent(val);
        setIsDirty(true);

        // Auto-save after 1.5 seconds of inactivity
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            saveNote(val);
        }, 1500);
    };

    return (
        <div className="flex flex-col h-full bg-black/60 relative">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h3 className="text-white font-bold flex items-center gap-2">
                    <Edit3 size={18} className="text-blue-400" />
                    Tus Notas Privadas
                </h3>

                <div className="text-xs font-semibold px-3 py-1 bg-white/5 rounded-full border border-white/5 flex items-center">
                    {loading ? (
                        <><Loader2 size={12} className="animate-spin mr-1 text-gray-400" /> Cargando</>
                    ) : isSaving ? (
                        <><Loader2 size={12} className="animate-spin mr-1 text-blue-400" /> Guardando</>
                    ) : isDirty ? (
                        <><span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mr-2"></span> Sin Guardar</>
                    ) : (
                        <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span> Guardado</>
                    )}
                </div>
            </div>

            <div className="flex-1 relative group">
                <textarea
                    value={noteContent}
                    onChange={handleChange}
                    placeholder="Escribe aquí tus ideas, aprendizajes u objeciones descubiertas en esta lección... Tus notas son 100% privadas."
                    className="w-full h-full resize-none bg-transparent p-5 text-gray-300 focus:outline-none focus:bg-white/5 transition-colors custom-scrollbar placeholder:text-gray-600 text-sm leading-relaxed"
                />

                {/* Manual Save Button Trigger (Visible on hover if dirt) */}
                <button
                    onClick={() => {
                        if (timeoutRef.current) clearTimeout(timeoutRef.current);
                        saveNote(noteContent);
                    }}
                    disabled={!isDirty || isSaving}
                    className={`absolute bottom-4 right-4 p-3 rounded-xl shadow-lg transition-all transform ${isDirty && !isSaving
                            ? 'bg-blue-600 text-white hover:scale-105 opacity-100 translate-y-0'
                            : 'opacity-0 translate-y-4 pointer-events-none'
                        }`}
                >
                    <Save size={20} />
                </button>
            </div>
        </div>
    );
}
