import React, { useState } from 'react';
import { X, User, Mail, Phone, MapPin, FileText, CheckCircle } from 'lucide-react';

export default function NewLeadModal({ onClose, onSubmit }) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        status: 'Llamada agendada',
        dealValue: '',
        location: '',
        notes: '',
        tbaPhase: 'Mañana'
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'dealValue' ? Number(value) : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Clean up numeric inputs
        const processedData = {
            ...formData,
            dealValue: Number(formData.dealValue) || 0
        };
        await onSubmit(processedData);
        setIsSubmitting(false);
    };

    const stages = [
        'Llamada agendada',
        'No Contestó',
        'Follow Up',
        'No calificado',
        'TBA',
        'Cierre',
        'Perdido'
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
            <div className="glass-panel w-full max-w-2xl bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/10 bg-gradient-to-r from-blue-900/30 to-black relative">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                            <User size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Nuevo Lead Analógico</h2>
                            <p className="text-sm text-gray-400">Ingreso manual al Pipeline</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                    >
                        <X size={24} />
                    </button>
                    {/* Decorative glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl pointer-events-none" />
                </div>

                {/* Form Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <form id="new-lead-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* Section 1: Basic Info */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 border-b border-gray-700 pb-2">Información de Contacto</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm text-gray-400 font-medium ml-1">Nombre Completo *</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <User size={16} className="text-gray-500" />
                                        </div>
                                        <input
                                            required
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="Ej: Elon Musk"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm text-gray-400 font-medium ml-1">Email</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Mail size={16} className="text-gray-500" />
                                        </div>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="ejemplo@email.com"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm text-gray-400 font-medium ml-1">Teléfono</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Phone size={16} className="text-gray-500" />
                                        </div>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="+34 600..."
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm text-gray-400 font-medium ml-1">Ubicación / País</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <MapPin size={16} className="text-gray-500" />
                                        </div>
                                        <input
                                            type="text"
                                            name="location"
                                            value={formData.location}
                                            onChange={handleChange}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="España, México, etc."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Deal Info */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 border-b border-gray-700 pb-2">Datos de Negocio</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm text-gray-400 font-medium ml-1">Etapa Inicial (Status) *</label>
                                    <select
                                        required
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-blue-500 outline-none appearance-none"
                                    >
                                        {stages.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm text-gray-400 font-medium ml-1">Net Profit Estimado (€)</label>
                                    <input
                                        type="number"
                                        name="dealValue"
                                        value={formData.dealValue}
                                        onChange={handleChange}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:border-blue-500 outline-none"
                                        placeholder="Ej: 2500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Notes */}
                        <div>
                            <div className="space-y-1">
                                <label className="text-sm text-gray-400 font-medium ml-1 flex items-center gap-2">
                                    <FileText size={14} /> Notas de Cualificación Inicial
                                </label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    rows="3"
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:border-blue-500 outline-none resize-none"
                                    placeholder="Detalles sobre por qué agendó, pain points principales, etc."
                                />
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-white/10 bg-black/40 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-bold text-gray-400 hover:text-white transition-colors"
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="new-lead-form"
                        disabled={isSubmitting}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        ) : (
                            <CheckCircle size={16} />
                        )}
                        Ingresar Lead
                    </button>
                </div>

            </div>
        </div>
    );
}
