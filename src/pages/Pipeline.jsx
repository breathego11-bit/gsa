import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { airtableService, calculateCommission } from '../services/airtableService';
import KanbanBoard from '../components/KanbanBoard';
import LeadDetailModal from '../components/LeadDetailModal';
import NewLeadModal from '../components/NewLeadModal';
import { Plus } from 'lucide-react';

export default function Pipeline() {
    const { user } = useAuth();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [commissionRate, setCommissionRate] = useState(0.09); // Default
    const [closerProfit, setCloserProfit] = useState(0);
    const [selectedLead, setSelectedLead] = useState(null);
    const [showNewLeadModal, setShowNewLeadModal] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        if (user?.email) {
            // 1. Get Closer's stats for Commission Rate
            const closerData = await airtableService.getCloserDetails(user.email);
            setCloserProfit(closerData.netProfit);
            const rate = calculateCommission(closerData.netProfit);
            setCommissionRate(rate);

            // 2. Get Leads
            const leadsData = await airtableService.getLeads();
            setLeads(leadsData);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handleEscalate = (leadId) => {
        // In a real app, this might update Airtable. For now, local state toggle.
        setLeads(prevLeads => prevLeads.map(lead =>
            lead.id === leadId
                ? { ...lead, isEscalated: !lead.isEscalated }
                : lead
        ));
    };

    const handleDragEnd = async (result) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        // Optimistic UI Update
        const newStatus = destination.droppableId;

        setLeads(prevLeads => prevLeads.map(lead =>
            lead.id === draggableId
                ? { ...lead, status: newStatus }
                : lead
        ));

        // API Update
        try {
            await airtableService.updateLeadStatus(draggableId, newStatus);
        } catch (error) {
            console.error("Failed to update lead status:", error);
            // Optional: Revert state on error if critical
        }
    };

    const handleCreateLead = async (leadData) => {
        try {
            const newLead = await airtableService.createLead(leadData, user?.email);
            if (newLead) {
                // Optimistic UI Append
                setLeads(prev => [newLead, ...prev]);
                setShowNewLeadModal(false);
            }
        } catch (error) {
            console.error("Error creating lead:", error);
        }
    };

    if (loading) { // Simple loading state
        return (
            <div className="flex h-full items-center justify-center text-gray-500 animate-pulse">
                Cargando Pipeline...
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header with Stats */}
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Pipeline de Ventas</h1>
                    <p className="text-gray-400 text-sm mt-1">Gestión activa de leads y oportunidades</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 md:items-end">
                    <div className="flex space-x-6 text-right order-2 md:order-1">
                        <div className="hidden md:block">
                            <span className="block text-xs uppercase tracking-wide text-gray-500 font-semibold">Profit Acumulado</span>
                            <span className="text-xl font-bold text-white">
                                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(closerProfit)}
                            </span>
                        </div>
                        <div className="bg-gradient-to-r from-blue-900/40 to-black/40 border border-blue-500/20 text-white px-4 py-2 rounded-lg shadow-lg">
                            <span className="block text-xs uppercase tracking-wide text-gray-400 font-semibold mb-0.5">Comisión Actual</span>
                            <span className="text-2xl font-bold text-cyan-500 text-glow">
                                {(commissionRate * 100).toFixed(0)}%
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowNewLeadModal(true)}
                        className="order-1 md:order-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg flex items-center justify-center transition-colors"
                    >
                        <Plus size={18} className="mr-2" />
                        Nuevo Lead
                    </button>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 min-h-0">
                <KanbanBoard
                    leads={leads}
                    commissionRate={commissionRate}
                    onEscalate={handleEscalate}
                    onCardClick={setSelectedLead}
                    onDragEnd={handleDragEnd}
                />
            </div>

            {/* Lead Detail Modal */}
            {selectedLead && (
                <LeadDetailModal
                    lead={selectedLead}
                    onClose={() => setSelectedLead(null)}
                />
            )}

            {/* New Lead Modal */}
            {showNewLeadModal && (
                <NewLeadModal
                    onClose={() => setShowNewLeadModal(false)}
                    onSubmit={handleCreateLead}
                />
            )}
        </div>
    );
}
