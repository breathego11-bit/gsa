import React, { useEffect, useState } from 'react';
import {
    DollarSign,
    TrendingUp,
    Users,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    Loader2
} from 'lucide-react';
import Speedometer from '../components/Speedometer';
import ProgressLineChart from '../components/ProgressLineChart';
import { airtableService } from '../services/airtableService';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
    const { user } = useAuth();
    const [email, setEmail] = useState('');
    const [netProfit, setNetProfit] = useState(0);
    const [dailyCash, setDailyCash] = useState(0);
    const [newBilling, setNewBilling] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user && user.email) {
            setEmail(user.email);
            const fetchData = async () => {
                setLoading(true);
                try {
                    const [profit, cash, billing] = await Promise.all([
                        airtableService.getNetProfit(user.email),
                        airtableService.getDailyCash(user.email),
                        airtableService.getNewBilling(user.email)
                    ]);
                    setNetProfit(profit);
                    setDailyCash(cash);
                    setNewBilling(billing);
                } catch (error) {
                    console.error("Error fetching dashboard data:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, [user]);

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const stats = [
        {
            name: 'Cash Collected Hoy',
            value: loading ? 'Cargando...' : formatCurrency(dailyCash),
            change: '+12.5%',
            changeType: 'increase',
            icon: DollarSign,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/20',
            border: 'border-emerald-500/30'
        },
        {
            name: 'Cash (Mes)',
            value: loading ? 'Cargando...' : formatCurrency(netProfit),
            change: '+18.2%',
            changeType: 'increase',
            icon: TrendingUp,
            color: 'text-blue-400',
            bg: 'bg-blue-500/20',
            border: 'border-blue-500/30'
        },
        {
            name: 'Facturación Nueva',
            value: loading ? 'Cargando...' : formatCurrency(newBilling),
            change: '-4.3%',
            changeType: 'decrease',
            icon: Activity,
            color: 'text-cyan-400',
            bg: 'bg-cyan-500/20',
            border: 'border-cyan-500/30'
        },
        {
            name: 'Ratio de Cierre',
            value: '32%',
            change: '+2.1%',
            changeType: 'increase',
            icon: Users,
            color: 'text-purple-400',
            bg: 'bg-purple-500/20',
            border: 'border-purple-500/30'
        },
    ];

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
                        Dashboard <span className="text-blue-500 text-glow">Closer</span>
                    </h1>
                    <p className="text-gray-400 font-medium">Bienvenido a tu centro de control, {email.split('@')[0]}</p>
                </div>
                <div className="hidden sm:block">
                    <span className="px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full text-xs font-semibold text-gray-400 border border-white/10 shadow-sm">
                        Última actualización: {new Date().toLocaleTimeString()}
                    </span>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div key={stat.name} className={`relative group overflow-hidden bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300`}>
                        {/* Hover Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <p className="text-sm font-medium text-gray-400 mb-1">{stat.name}</p>
                                <h3 className="text-2xl font-bold text-white tracking-tight">
                                    {stat.value}
                                </h3>
                            </div>
                            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} ${stat.border} border shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                                <stat.icon size={20} />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center relative z-10">
                            <span className={`flex items-center text-xs font-semibold ${stat.changeType === 'increase' ? 'text-emerald-400' : 'text-red-400'
                                }`}>
                                {stat.changeType === 'increase' ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
                                {stat.change}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">vs mes anterior</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Performance Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart Area */}
                <div className="lg:col-span-2 glass-panel p-6 sm:p-8 bg-black/40 border-white/10 flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-xl font-bold text-white">Rendimiento de Ventas</h2>
                            <p className="text-sm text-gray-400">Resumen de actividad diaria</p>
                        </div>
                        <select className="bg-black/50 text-sm font-medium text-gray-300 border border-white/10 rounded-lg cursor-pointer hover:bg-black/70 transition-colors focus:ring-2 focus:ring-blue-500/20 outline-none py-2 px-4 shadow-sm">
                            <option>Últimos 7 días</option>
                            <option>Este Mes</option>
                            <option>Trimestre</option>
                        </select>
                    </div>

                    {/* Chart Area */}
                    <div className="flex-1 w-full bg-gradient-to-b from-white/5 to-transparent rounded-2xl border border-white/10 p-4 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
                        <ProgressLineChart />
                    </div>
                </div>

                {/* Goals / Speedometer */}
                <div className="glass-panel p-6 sm:p-8 flex flex-col items-center justify-center text-center relative overflow-hidden bg-black/40 border-white/10">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                    <h2 className="text-xl font-bold text-white mb-2 relative z-10">Meta Mensual</h2>
                    <p className="text-sm text-gray-400 mb-8 relative z-10">Progreso de Comisiones</p>

                    <div className="relative group scale-100 hover:scale-105 transition-transform duration-500">
                        <div className="absolute inset-0 bg-blue-600/20 blur-2xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                        {/* Speedometer component likely handles its own text color, might need check if it renders SVG text */}
                        <Speedometer value={netProfit} target={10000} label="Comisión" />
                    </div>

                    <div className="mt-8 w-full">
                        <div className="flex justify-between text-sm text-gray-400 mb-2 font-medium">
                            <span>Progreso</span>
                            <span className="text-cyan-500 font-bold">45%</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-600 to-cyan-500 h-2.5 rounded-full w-[45%] shadow-[0_0_10px_rgba(59,130,246,0.4)] animate-pulse-slow"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
