import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ExternalLink, AlertCircle, CheckCircle, Brain, Target, DollarSign, Calendar, Eye } from 'lucide-react';

export default function LeadDetailModal({ lead, onClose }) {
    const navigate = useNavigate();
    if (!lead) return null;

    const [notes, setNotes] = useState(lead.notes || '');
    // Mock commission rate if not provided in lead, defaulting to logged in user's rate from context in a real app
    // For now we use a passed prop or default. Assuming generic 10% for visualization or using lead data if available
    const commissionRate = 0.10; // This should ideally come from props or context

    // ... (rest of the code unchanged until the return)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative bg-[#0F1115] rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-white/10">

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-white/10 bg-[#0F1115] z-10">
                    <div className="flex items-center space-x-6">
                        <h2 className="text-3xl font-bold text-white">{lead.name}</h2>
                        <span className="bg-emerald-500/10 text-emerald-400 text-sm font-bold px-3 py-1 rounded-full border border-emerald-500/20">
                            {formatCurrency(lead.dealValue)}
                        </span>
                    </div>

                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => navigate(`/client/${lead.id}`)}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm transition-colors shadow-lg shadow-blue-900/20"
                        >
                            <Eye className="w-4 h-4" />
                            <span>Ver Ficha 360</span>
                        </button>

                        <button className={`
                            flex items-center space-x-2 px-4 py-2 rounded-lg font-bold text-sm tracking-wide uppercase transition-all
                            ${lead.isEscalated
                                ? 'bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'}
                        `}>
                            <AlertCircle className="w-4 h-4" />
                            <span>Regla de Escalado</span>
                        </button>

                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="flex flex-1 overflow-hidden">

                    {/* LEFT PANEL: Growth Sales Coach */}
                    <div className="w-1/2 overflow-y-auto p-8 border-r border-white/10 bg-white/[0.02]">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Brain className="w-6 h-6 text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Growth Sales Coach</h3>
                        </div>

                        <div className="space-y-6">
                            {mockCalls.map((call) => (
                                <div key={call.id} className="bg-white/5 rounded-xl p-5 shadow-sm border border-white/10">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-bold text-gray-200">{call.type}</h4>
                                            <span className="text-xs text-gray-500">{call.date}</span>
                                        </div>
                                        <span className="bg-white/10 text-gray-400 text-xs font-medium px-2 py-1 rounded border border-white/5">
                                            AI Summary
                                        </span>
                                    </div>

                                    <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                                        {call.summary}
                                    </p>

                                    {/* Objection */}
                                    <div className="mb-4 bg-red-500/10 rounded-lg p-3 border border-red-500/10">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <Target className="w-4 h-4 text-red-400" />
                                            <span className="text-xs font-bold text-red-400 uppercase">Main Objection</span>
                                        </div>
                                        <p className="text-gray-200 font-medium text-sm">{call.objection}</p>
                                    </div>

                                    {/* Coach Tips */}
                                    <div>
                                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 block">GSA Coach Tips</span>
                                        <div className="flex flex-wrap gap-2">
                                            {call.tips.map((tip, idx) => (
                                                <span key={idx} className="bg-blue-500/10 text-blue-300 text-xs px-3 py-1.5 rounded-lg border border-blue-500/20 font-medium">
                                                    💡 {tip}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT PANEL: Payment Control & Actions */}
                    <div className="w-1/2 flex flex-col overflow-y-auto bg-[#0F1115]">

                        {/* Payments Section */}
                        <div className="p-8 pb-0">
                            <div className="flex items-center space-x-3 mb-6">
                                <div className="p-2 bg-emerald-500/10 rounded-lg">
                                    <DollarSign className="w-6 h-6 text-emerald-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white">Control de Pagos</h3>
                            </div>

                            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden mb-8">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-white/5 text-gray-400 font-medium border-b border-white/10">
                                        <tr>
                                            <th className="px-4 py-3">Cuota</th>
                                            <th className="px-4 py-3">Fecha</th>
                                            <th className="px-4 py-3 text-right">Monto</th>
                                            <th className="px-4 py-3 text-right">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {mockPayments.map((payment, index) => (
                                            <tr key={payment.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 text-gray-200 font-medium">#{index + 1}</td>
                                                <td className="px-4 py-3 text-gray-500">{payment.date}</td>
                                                <td className="px-4 py-3 text-right font-medium text-white">{formatCurrency(payment.amount)}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${payment.status === 'Pagado'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                        }`}>
                                                        {payment.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="px-8 mt-auto sticky bottom-0 bg-[#0F1115] pb-8">
                            {/* Profit Widget */}
                            <div className="bg-gradient-to-r from-gray-900 to-black rounded-2xl p-6 mb-6 shadow-xl border border-white/10 text-white relative overflow-hidden group">
                                <div className="relative z-10 flex justify-between items-center">
                                    <div>
                                        <p className="text-gray-400 text-sm font-medium mb-1">Tu Ganancia Neta Estimada</p>
                                        <div className="text-3xl font-bold tracking-tight text-white flex items-baseline space-x-2">
                                            <span>{formatCurrency(estimatedProfit)}</span>
                                            <span className="text-sm font-normal text-gray-500">
                                                ({(commissionRate * 100).toFixed(0)}% de {formatCurrency(cashCollected)})
                                            </span>
                                        </div>
                                    </div>
                                    <div className="bg-white/10 p-3 rounded-full">
                                        <DollarSign className="w-8 h-8 text-emerald-400" />
                                    </div>
                                </div>
                                {/* Decorative gradient */}
                                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-gradient-to-br from-blue-500 to-transparent opacity-10 blur-3xl rounded-full group-hover:opacity-20 transition-opacity"></div>
                            </div>

                            {/* Actions & Notes */}
                            <div className="grid grid-cols-3 gap-4">
                                <button className="col-span-1 flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-white/20 text-gray-400 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-500/10 transition-all group">
                                    <ExternalLink className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Link Fathom</span>
                                </button>

                                <div className="col-span-2 relative">
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Escribe una actualización rápida..."
                                        className="w-full h-full min-h-[100px] rounded-xl border border-white/20 bg-white/5 p-4 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none placeholder-gray-600"
                                    />
                                    <div className="absolute bottom-3 right-3">
                                        <span className="text-[10px] uppercase font-bold text-gray-500">Syncs to Airtable</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
