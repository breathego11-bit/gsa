import React from 'react';
import { CheckCircle, PlayCircle, Clock } from 'lucide-react';

export default function VideoCard({ module }) {
    return (
        <div className="bg-[#0F1115] rounded-xl shadow-lg border border-white/10 overflow-hidden hover:shadow-blue-500/20 hover:border-blue-500/30 transition-all duration-300 group flex flex-col h-full ring-1 ring-white/5">
            <div className="relative h-48 bg-black/40 flex items-center justify-center overflow-hidden">
                {/* Thumbnail / Placeholder */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F1115] to-transparent z-10" />
                <span className="text-6xl group-hover:scale-110 transition-transform duration-500 block opacity-80 group-hover:opacity-100">
                    {module.emoji || '🎓'}
                </span>

                <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-blue-500/90 backdrop-blur-sm p-3 rounded-full shadow-lg shadow-blue-500/20 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        <PlayCircle className="w-8 h-8 text-white fill-white stroke-blue-500" />
                    </div>
                </div>

                <div className="absolute bottom-3 right-3 z-20 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 text-xs text-gray-300 font-medium flex items-center">
                    <Clock className="w-3 h-3 mr-1 text-cyan-400" />
                    {module.duration}
                </div>
            </div>

            <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wide bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20">{module.category}</span>
                    {module.completed ? (
                        <span className="flex items-center text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                            <CheckCircle className="w-3 h-3 mr-1" /> Completado
                        </span>
                    ) : (
                        <span className="text-xs font-bold text-gray-500 bg-white/5 px-2 py-1 rounded-full border border-white/10">
                            Pendiente
                        </span>
                    )}
                </div>

                <h3 className="font-bold text-white text-lg mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">{module.title}</h3>
                <p className="text-sm text-gray-400 line-clamp-3 mb-4 flex-1 leading-relaxed">{module.description}</p>

                <button className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all ${module.completed
                    ? 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                    : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:shadow-lg hover:shadow-blue-500/25 border border-blue-400/20'
                    }`}>
                    {module.completed ? 'Repasar Módulo' : 'Comenzar Lección'}
                </button>
            </div>
        </div>
    );
}
