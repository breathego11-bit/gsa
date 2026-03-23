import React from 'react';
import { MessageCircle, Link as LinkIcon, Calendar, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SetterDashboard() {
    const { user } = useAuth();

    // Mock Data for Setter Metrics
    const metrics = {
        conversations: 145,
        linksSent: 42,
        bookedCalls: 18,
        conversionRate: 0.12 // 12%
    };

    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">Setter Hub</h1>
                    <p className="text-gray-400 mt-1">Monitorización de DMs y Agendamiento</p>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-[#0F1115] p-6 rounded-2xl shadow-lg border border-white/10 flex items-center space-x-4 hover:border-purple-500/30 transition-colors group">
                    <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20 group-hover:scale-105 transition-transform">
                        <MessageCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-400 font-medium">Conversaciones</p>
                        <p className="text-2xl font-bold text-white group-hover:text-purple-400 transition-colors">{metrics.conversations}</p>
                    </div>
                </div>

                <div className="bg-[#0F1115] p-6 rounded-2xl shadow-lg border border-white/10 flex items-center space-x-4 hover:border-blue-500/30 transition-colors group">
                    <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 group-hover:scale-105 transition-transform">
                        <LinkIcon size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-400 font-medium">Links Enviados</p>
                        <p className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">{metrics.linksSent}</p>
                    </div>
                </div>

                <div className="bg-[#0F1115] p-6 rounded-2xl shadow-lg border border-white/10 flex items-center space-x-4 hover:border-emerald-500/30 transition-colors group">
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 group-hover:scale-105 transition-transform">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-400 font-medium">Llamadas Agendadas</p>
                        <p className="text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors">{metrics.bookedCalls}</p>
                    </div>
                </div>

                <div className="bg-[#0F1115] p-6 rounded-2xl shadow-lg border border-white/10 flex items-center space-x-4 hover:border-cyan-500/30 transition-colors group">
                    <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20 group-hover:scale-105 transition-transform">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-400 font-medium">Conv. Agenda</p>
                        <p className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">{((metrics.bookedCalls / metrics.conversations) * 100).toFixed(1)}%</p>
                    </div>
                </div>
            </div>

            {/* Integration Status */}
            <div className="bg-gradient-to-r from-gray-900 to-black rounded-2xl p-8 text-white flex justify-between items-center border border-white/10 shadow-xl relative overflow-hidden group">
                <div className="relative z-10">
                    <h3 className="text-xl font-bold mb-2 text-white">ManyChat Integration</h3>
                    <p className="text-gray-400 text-sm max-w-md">
                        Estado: <span className="text-emerald-400 font-bold text-glow">Activo</span>.
                        Los leads generados desde Instagram (palabra clave "GSA") se sincronizan automáticamente.
                    </p>
                </div>
                <button className="relative z-10 px-6 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-sm font-semibold transition-all hover:scale-105">
                    Configurar Webhook
                </button>
                {/* Decorative background blur */}
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all"></div>
            </div>

            {/* Recent Interactions List (Mock) */}
            <div className="bg-[#0F1115] rounded-2xl shadow-lg border border-white/10 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 bg-white/5">
                    <h3 className="font-bold text-white">Últimas Interacciones (ManyChat)</h3>
                </div>
                <div className="divide-y divide-white/5">
                    {[1, 2, 3].map((_, i) => (
                        <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-xs font-bold text-gray-400">IG</div>
                                <div>
                                    <p className="font-medium text-white">@usuario_instagram_{i + 1}</p>
                                    <p className="text-xs text-gray-500">Trigger: "Quiero Info"</p>
                                </div>
                            </div>
                            <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full font-medium border border-blue-500/20">Nuevo Lead</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
