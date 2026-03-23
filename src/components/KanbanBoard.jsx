import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'; // Using hello-pangea/dnd for React 18+ support
import confetti from 'canvas-confetti';
import LeadCard from './LeadCard';

const COLUMNS = [
    { id: 'Agendado', label: 'Llamada Agendada' },
    { id: 'No-Show', label: 'No Show' },
    { id: 'Venta', label: 'Venta Cerrada' },
    { id: 'Perdido', label: 'Perdido (Dinero)' },
    { id: 'Ghosting', label: 'Ghosting' },
    { id: 'Seguimiento', label: 'Seguimiento' },
    { id: 'Pendiente Pago', label: 'Pendiente Pago' },
];

export default function KanbanBoard({ leads, commissionRate, onEscalate, onCardClick, onDragEnd }) {

    // Internal Drag End Handler to trigger visuals before propagating
    const handleDragEnd = (result) => {
        const { destination, source } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        // If dropped in 'Venta' column, trigger confetti
        if (destination.droppableId === 'Venta' && source.droppableId !== 'Venta') {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#3b82f6', '#22d3ee', '#10b981'] // Blue, Cyan, Green
            });
        }

        // Propagate to parent to handle data update
        if (onDragEnd) {
            onDragEnd(result);
        }
    };

    const getLeadsByStatus = (statusId) => {
        return leads.filter(l => l.status === statusId);
    };

    const getColumnTotal = (statusId) => {
        const columnLeads = getLeadsByStatus(statusId);
        return columnLeads.reduce((sum, lead) => sum + (lead.dealValue || 0), 0);
    };

    const formatCurrency = (val) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex h-[calc(100vh-140px)] overflow-x-auto pb-6 space-x-6 px-4 snap-x custom-scrollbar">
                {COLUMNS.map(col => (
                    <div key={col.id} className="min-w-[320px] w-[320px] flex flex-col bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl overflow-hidden snap-center">
                        {/* Column Header */}
                        <div className={`p-4 border-b border-white/10 flex flex-col space-y-2 sticky top-0 backdrop-blur-xl z-10 transition-colors ${col.id === 'Venta' ? 'bg-emerald-900/20' : 'bg-white/5'
                            }`}>
                            <div className="flex items-center justify-between">
                                <h3 className={`font-bold text-sm tracking-tight ${col.id === 'Venta' ? 'text-emerald-400' : 'text-gray-200'}`}>{col.label}</h3>
                                <span className="bg-white/10 border border-white/10 text-gray-300 text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
                                    {getLeadsByStatus(col.id).length}
                                </span>
                            </div>
                            {/* Column Value Counter */}
                            <div className="text-right">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Valor Total</span>
                                <span className="text-lg font-bold text-white tracking-tight">
                                    {formatCurrency(getColumnTotal(col.id))}
                                </span>
                            </div>
                        </div>

                        {/* Drop Zone */}
                        <Droppable droppableId={col.id}>
                            {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`p-3 flex-1 overflow-y-auto custom-scrollbar space-y-3 transition-colors ${snapshot.isDraggingOver ? 'bg-white/5' : ''}`}
                                >
                                    {getLeadsByStatus(col.id).map((lead, index) => (
                                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    style={{ ...provided.draggableProps.style }}
                                                    className={snapshot.isDragging ? 'rotate-2 opacity-90 scale-105 transition-transform' : ''}
                                                >
                                                    <LeadCard
                                                        lead={lead}
                                                        commissionRate={commissionRate}
                                                        onEscalate={onEscalate}
                                                        onClick={() => onCardClick && onCardClick(lead)}
                                                    />
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}

                                    {getLeadsByStatus(col.id).length === 0 && !snapshot.isDraggingOver && (
                                        <div className="py-12 flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-white/10 rounded-xl m-2 opacity-60">
                                            <span className="text-xs font-medium uppercase tracking-widest">Sin leads</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Droppable>
                    </div>
                ))}
            </div>
        </DragDropContext>
    );
}
