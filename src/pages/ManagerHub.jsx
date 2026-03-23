import React, { useEffect, useState } from 'react';
import { Trophy, TrendingUp, DollarSign, Users, Loader2 } from 'lucide-react';
import { airtableService } from '../services/airtableService';

export default function ManagerHub() {
    const [closers, setClosers] = useState([]);
    const [setters, setSetters] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const { closers, setters } = await airtableService.getLeaderboard();
                setClosers(closers);
                setSetters(setters);
            } catch (error) {
                console.error("Error fetching leaderboard:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const formatCurrency = (val) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">Manager Hub 👑</h1>
                    <p className="text-gray-400 mt-1">Visión global del equipo y control financiero.</p>
                </div>
                <div className="bg-gradient-to-r from-blue-900 to-black border border-blue-500/20 text-white px-4 py-2 rounded-xl flex items-center space-x-2 shadow-lg">
                    <DollarSign size={18} className="text-blue-500" />
                    <span className="font-bold">Total Comisiones (Mes): <span className="text-cyan-400 text-glow">
                        {loading ? '...' : formatCurrency(closers.reduce((acc, c) => acc + c.commission, 0))}
                    </span></span>
                </div>
            </div>

            {/* Closers Leaderboard */}
            <div className="bg-[#0F1115] rounded-2xl shadow-lg border border-white/10 overflow-hidden">
                <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-white/5 backdrop-blur-sm">
                    <h3 className="font-bold text-white flex items-center">
                        <Trophy className="w-5 h-5 text-yellow-500 mr-2 drop-shadow-md" />
                        Ranking de Closers
                    </h3>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Facturación Neta</span>
                </div>

                {loading ? (
                    <div className="p-8 flex justify-center">
                        <Loader2 className="animate-spin text-blue-500" size={32} />
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-black/40 text-xs text-gray-400 font-medium uppercase tracking-wider text-left">
                            <tr>
                                <th className="px-6 py-3">Rank</th>
                                <th className="px-6 py-3">Closer</th>
                                <th className="px-6 py-3">Cierres</th>
                                <th className="px-6 py-3 text-right">Facturado</th>
                                <th className="px-6 py-3 text-right">Comisión</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {closers.map((closer, idx) => (
                                <tr key={closer.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${idx === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : (idx === 1 ? 'bg-gray-500/20 text-gray-300 border border-gray-500/30' : 'bg-cyan-700/20 text-cyan-400 border border-cyan-700/30')}`}>
                                            {idx + 1}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-white">{closer.name}</td>
                                    <td className="px-6 py-4 text-gray-400">{closer.deals}</td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-200">{formatCurrency(closer.sales)}</td>
                                    <td className="px-6 py-4 text-right text-emerald-400 font-medium text-glow">{formatCurrency(closer.commission)}</td>
                                </tr>
                            ))}
                            {closers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">
                                        No se encontraron closers activos.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Setters Leaderboard */}
            <div className="bg-[#0F1115] rounded-2xl shadow-lg border border-white/10 overflow-hidden">
                <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center bg-white/5 backdrop-blur-sm">
                    <h3 className="font-bold text-white flex items-center">
                        <Users className="w-5 h-5 text-blue-400 mr-2 drop-shadow-md" />
                        Rendimiento Setters
                    </h3>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Volumen Agendado</span>
                </div>

                {loading ? (
                    <div className="p-8 flex justify-center">
                        <Loader2 className="animate-spin text-blue-500" size={32} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                        {setters.map((setter, idx) => (
                            <div key={setter.id} className="bg-black/20 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-bold text-gray-300 group-hover:text-white transition-colors">
                                        {setter.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white group-hover:text-blue-400 transition-colors">{setter.name}</p>
                                        <p className="text-xs text-gray-500">Total Agendado: <span className="text-gray-300">{setter.booked}</span></p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xl font-bold text-white text-glow">{(setter.conversion * 100).toFixed(0)}%</span>
                                    <span className="text-xs text-gray-500 font-medium">Show Rate</span>
                                </div>
                            </div>
                        ))}
                        {setters.length === 0 && (
                            <p className="col-span-2 text-center text-gray-500 italic">No hay datos de setters.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
