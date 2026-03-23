import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function LeadCard({ lead, commissionRate, onEscalate, onClick }) {
    // Format currency
    const formatCurrency = (val) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);

    // Calculate commission for this specific deal
    const potentialCommission = lead.dealValue * commissionRate;

    // TBA Visual Logic (Circles)
    const getTbaCircle = (phase) => {
        let colorClass = 'bg-gray-600';

        switch (phase?.toLowerCase()) {
            case 'mañana':
            case 'manana':
                colorClass = 'bg-blue-500'; // Azul
                break;
            case 'día':
            case 'dia':
                colorClass = 'bg-yellow-400'; // Amarillo
                break;
            case 'noche':
                colorClass = 'bg-purple-500'; // Púrpura (brighter for dark mode)
                break;
            default:
                colorClass = 'bg-gray-600';
        }

        return (
            <div
                className={`w-3 h-3 rounded-full ${colorClass} shadow-sm border border-black/20 ring-1 ring-white/10`}
                title={`Fase TBA: ${phase}`}
            />
        );
    };

    return (
        <div
            onClick={onClick}
            className={`
        glass-card p-4 mb-3 relative group transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-500/30
        ${lead.isEscalated ? 'ring-2 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)] bg-red-900/20' : 'bg-white/5 border border-white/10'}
        cursor-pointer border-l-[3px] ${lead.isEscalated ? 'border-l-red-500' : 'border-l-transparent hover:border-l-blue-500'}
      `}
        >
            {/* Header: Name & TBA Indicator */}
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-200 truncate pr-2 text-sm">{lead.name}</h4>
                <div className="flex-shrink-0 mt-1">
                    {getTbaCircle(lead.tbaPhase)}
                </div>
            </div>

            {/* Details: Value, Closer, Commission */}
            <div className="space-y-1.5 text-xs text-gray-400 mb-4">
                <div className="flex justify-between items-center">
                    <span className="text-gray-500">Valor Contrato:</span>
                    <span className="font-semibold text-gray-300 text-sm">{formatCurrency(lead.dealValue)}</span>
                </div>

                <div className="flex justify-between items-center">
                    <span className="text-gray-500">Closer:</span>
                    <span className="font-medium text-gray-400">{lead.closerName || '—'}</span>
                </div>

                <div className="pt-2 mt-2 border-t border-dashed border-white/10 flex justify-between items-center">
                    <span className="text-gray-500">Comisión Est.:</span>
                    <span className="font-bold text-cyan-500">
                        {formatCurrency(potentialCommission)}
                    </span>
                </div>
            </div>

            {/* Actions: Escalar */}
            <div className="pt-1">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onEscalate(lead.id);
                    }}
                    className={`
            w-full flex items-center justify-center py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-all
            ${lead.isEscalated
                            ? 'bg-red-500 text-white shadow-md shadow-red-900/50'
                            : 'text-gray-400 bg-white/5 hover:bg-white/10 hover:text-white'
                        }
          `}
                >
                    <AlertCircle className={`w-3 h-3 mr-1.5 ${lead.isEscalated ? 'animate-pulse' : ''}`} />
                    {lead.isEscalated ? 'ESCALADO !!!' : 'Escalar'}
                </button>
            </div>
        </div>
    );
}
