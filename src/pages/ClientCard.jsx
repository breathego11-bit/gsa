import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    User, Phone, Mail, MapPin, Calendar, DollarSign,
    FileText, MessageSquare, Clock, ArrowLeft, Edit, Save
} from 'lucide-react';
import { airtableService } from '../services/airtableService';

export default function ClientCard() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview'); // overview | timeline | notes

    useEffect(() => {
        const fetchClient = async () => {
            setLoading(true);
            const data = await airtableService.getLeadById(id);
            setClient(data);
            setLoading(false);
        };
        if (id) fetchClient();
    }, [id]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center text-blue-500">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="p-8 text-center text-white">
                <h2 className="text-xl font-bold">Cliente no encontrado</h2>
                <button onClick={() => navigate(-1)} className="mt-4 text-blue-400 hover:underline">Volver</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black/20 p-4 sm:p-8 animate-fadeIn">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-gray-400 hover:text-white mb-4 transition-colors"
                >
                    <ArrowLeft size={16} className="mr-2" /> Volver al Pipeline
                </button>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0F1115] p-6 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>

                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg border border-white/20">
                            {client.name.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-1">{client.name}</h1>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                <span className="flex items-center gap-1"><Mail size={14} /> {client.email}</span>
                                <span className="flex items-center gap-1"><Phone size={14} /> {client.phone}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 relative z-10">
                        <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10 text-center">
                            <span className="block text-xs text-gray-500 uppercase font-bold">Estado</span>
                            <span className="text-emerald-400 font-bold">{client.status}</span>
                        </div>
                        <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10 text-center">
                            <span className="block text-xs text-gray-500 uppercase font-bold">Valor</span>
                            <span className="text-white font-bold text-lg">€{client.dealValue}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Details */}
                <div className="space-y-6">
                    <div className="bg-[#0F1115] rounded-2xl border border-white/10 p-6 shadow-md">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                            <User size={18} className="mr-2 text-blue-500" /> Detalles del Cliente
                        </h3>
                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between py-2 border-b border-white/5">
                                <span className="text-gray-500">Ubicación</span>
                                <span className="text-gray-300 text-right">{client.location || '—'}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-white/5">
                                <span className="text-gray-500">Último Contacto</span>
                                <span className="text-gray-300 text-right">{new Date(client.lastContact).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-white/5">
                                <span className="text-gray-500">Fuente</span>
                                <span className="text-gray-300 text-right">Inbound (Ad)</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#0F1115] rounded-2xl border border-white/10 p-6 shadow-md">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                            <FileText size={18} className="mr-2 text-purple-500" /> Notas Rápidas
                        </h3>
                        <p className="text-gray-400 text-sm italic leading-relaxed">
                            {client.notes || "Sin notas registradas."}
                        </p>
                    </div>
                </div>

                {/* Right Column: Timeline / 360 View */}
                <div className="lg:col-span-2">
                    <div className="bg-[#0F1115] rounded-2xl border border-white/10 shadow-md flex flex-col h-full min-h-[500px]">
                        {/* Tabs */}
                        <div className="flex border-b border-white/10">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'overview' ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                            >
                                Visión General
                            </button>
                            <button
                                onClick={() => setActiveTab('timeline')}
                                className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'timeline' ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                            >
                                Historial (Timeline)
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 flex-1 bg-black/20">
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                                            <h4 className="text-blue-400 font-bold mb-2">Próxima Acción</h4>
                                            <p className="text-white text-sm">Llamada de Seguimiento (Cierre)</p>
                                            <p className="text-xs text-gray-500 mt-1">Mañana a las 10:00 AM</p>
                                        </div>
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                                            <h4 className="text-emerald-400 font-bold mb-2">Probabilidad de Cierre</h4>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-gray-700 rounded-full">
                                                    <div className="h-full bg-emerald-500 rounded-full w-[75%]"></div>
                                                </div>
                                                <span className="text-white font-bold">75%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <h4 className="text-white font-bold mt-6 mb-4">Interacciones Recientes</h4>
                                    <div className="space-y-4">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="flex gap-4 items-start group">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-8 h-8 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                        <MessageSquare size={14} />
                                                    </div>
                                                    <div className="w-0.5 h-full bg-gray-800 my-1 group-hover:bg-blue-900/50"></div>
                                                </div>
                                                <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex-1 hover:bg-white/10 transition-colors">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <p className="text-gray-200 font-medium text-sm">Llamada de Descubrimiento</p>
                                                        <span className="text-xs text-gray-500">Hace {i} días</span>
                                                    </div>
                                                    <p className="text-gray-400 text-xs">El cliente mostró interés en el paquete High Ticket. Mencionó objeción de precio.</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'timeline' && (
                                <div className="text-center py-20 text-gray-500">
                                    <Clock size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>Historial completo en desarrollo...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
