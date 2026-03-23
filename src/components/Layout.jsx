import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
    LayoutDashboard,
    Trello,
    Users,
    GraduationCap,
    ShieldCheck,
    LogOut,
    MessageCircle,
    Sparkles,
    Settings,
    Menu,
    FileSpreadsheet,
    Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
    const { logout, user, isInstructor } = useAuth();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Pipeline', href: '/pipeline', icon: Trello },
        { name: 'Ficha Cliente', href: '/client/new', icon: Users },
        { name: 'GSA Academy', href: '/academy/dashboard', icon: GraduationCap },
        ...(isInstructor ? [{ name: 'Academy Admin', href: '/admin/academy', icon: ShieldCheck }] : []),
        { name: 'AI Sales Coach', href: '/ai-coach', icon: Sparkles },
        { name: 'Setter Hub', href: '/setter', icon: MessageCircle },
        { name: 'Manager Hub', href: '/manager', icon: ShieldCheck },
        { name: 'Documentos', href: '/documents', icon: FileSpreadsheet },
        { name: 'Configuración', href: '/settings', icon: Settings, spacer: true },
    ];

    const isActive = (path) => location.pathname.startsWith(path);

    return (
        <div className="h-screen w-screen flex relative overflow-hidden bg-deep-space text-text-main">
            {/* --- FLUXER BLUE UNIVERSE BACKGROUND --- */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                {/* 1. Infinite Grid (MAX VISIBILITY) */}
                <div className="absolute inset-0 bg-grid-pattern opacity-80 transform perspective-1000 rotate-x-60 scale-150 origin-top animate-pulse-slow" />

                {/* 2. The Fountain Core (SOLID & BRIGHT) - No blend modes, just raw brightness */}
                <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[90vw] h-[70vh] bg-[radial-gradient(circle_at_center,_#3b82f6_0%,_#06b6d4_30%,_transparent_70%)] opacity-90 blur-[80px]" />

                {/* 3. The Upward Beam (MASSIVE & FAST) */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[300px] h-[150vh] bg-gradient-to-t from-cyan-500/80 via-blue-600/50 to-transparent blur-3xl animate-beam-flow" style={{ backgroundSize: '100% 200%' }} />

                {/* 3b. The Core Shaft (Solid White/Cyan) */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[10px] h-[100vh] bg-white shadow-[0_0_60px_#22d3ee] opacity-100" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[40px] h-[100vh] bg-cyan-400 blur-md opacity-60" />

                {/* 4. Sub-beams (High Contrast) */}
                <div className="absolute bottom-[-10%] left-[40%] w-[4px] h-[100vh] bg-gradient-to-t from-blue-400 to-transparent opacity-80 rotate-[-12deg] blur-[1px]" />
                <div className="absolute bottom-[-10%] right-[40%] w-[4px] h-[100vh] bg-gradient-to-t from-blue-400 to-transparent opacity-80 rotate-[12deg] blur-[1px]" />

                {/* 5. Floating Particles (Large & Bright) */}
                <div className="absolute inset-0 overflow-hidden">
                    {[...Array(40)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute bg-white rounded-full"
                            style={{
                                width: Math.random() * 6 + 2 + 'px', // Much larger
                                height: Math.random() * 6 + 2 + 'px',
                                top: Math.random() * 100 + '%',
                                left: Math.random() * 100 + '%',
                                opacity: Math.random() * 0.5 + 0.5, // Always visible
                                animation: `float ${Math.random() * 5 + 5}s infinite linear`, // Fast
                                animationDelay: `-${Math.random() * 5}s`,
                                boxShadow: '0 0 20px rgba(34, 211, 238, 1)'
                            }}
                        />
                    ))}
                </div>

                {/* 6. Random Screen Flash (Noticeable) */}
                <div className="absolute inset-0 bg-blue-500/30 mix-blend-overlay pointer-events-none animate-[flash_8s_infinite_ease-in-out]" />
            </div>

            {/* --- MOBILE HEADER --- */}
            <div className="lg:hidden fixed top-0 left-0 w-full z-50 bg-black/50 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex justify-between items-center shadow-lg">
                <span className="text-xl font-bold tracking-tight text-white flex items-center">
                    <Zap className="text-blue-500 mr-2 w-5 h-5 fill-current" />
                    GSA <span className="text-blue-500">OS</span>
                </span>
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-white/70">
                    <Menu size={24} />
                </button>
            </div>

            {/* --- SIDEBAR --- */}
            <aside className={`
                fixed inset-y-0 left-0 z-40 w-72 flex flex-col transition-transform duration-300 ease-in-out
                lg:static lg:translate-x-0 lg:h-full lg:bg-transparent lg:p-6
                ${mobileMenuOpen ? 'translate-x-0 bg-black/90 shadow-2xl border-r border-white/10' : '-translate-x-full'}
            `}>
                <div className="flex-1 glass-panel flex flex-col h-full overflow-hidden relative border-white/5 bg-black/20">
                    {/* Brand Header */}
                    <div className="flex items-center justify-center py-8 border-b border-white/5 relative z-10">
                        <div className="flex items-center space-x-3 group cursor-pointer">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-600 blur-md opacity-40 group-hover:opacity-60 transition-opacity"></div>
                                <div className="relative w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-900 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg border border-white/10 group-hover:scale-105 transition-transform">
                                    G
                                </div>
                            </div>
                            <span className="text-2xl font-bold tracking-tight text-white/90 group-hover:text-white transition-colors">
                                GSA <span className="text-blue-500">OS</span>
                            </span>
                        </div>
                    </div>

                    {/* Navigation Items */}
                    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar relative z-10">
                        {navigation.map((item) => (
                            <React.Fragment key={item.name}>
                                {item.spacer && <div className="my-4 border-t border-white/5" />}
                                <Link
                                    to={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 relative overflow-hidden ${isActive(item.href)
                                        ? 'nav-item-active'
                                        : 'nav-item-inactive'
                                        }`}
                                >
                                    <item.icon
                                        className={`mr-3 h-5 w-5 transition-transform duration-300 group-hover:scale-110 ${isActive(item.href) ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'text-gray-500 group-hover:text-white'
                                            }`}
                                    />
                                    <span className={`${isActive(item.href) ? 'font-bold' : ''}`}>{item.name}</span>

                                    {/* Active Glow Pill */}
                                    {isActive(item.href) && (
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] rounded-l-lg" />
                                    )}
                                </Link>
                            </React.Fragment>
                        ))}
                    </nav>

                    {/* User Profile */}
                    <div className="p-4 mt-auto relative z-10">
                        <div className="p-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 shadow-inner group transition-all hover:bg-white/5 hover:border-white/20">
                            <div className="flex items-center mb-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center text-sm font-bold text-white shadow-md mr-3 border border-white/10">
                                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-bold text-gray-200 truncate group-hover:text-white transition-colors">{user?.email?.split('@')[0]}</p>
                                    <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1 shadow-cyan-500/20 drop-shadow-sm">
                                        <Sparkles size={10} /> Closer Pro
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={logout}
                                className="flex items-center justify-center w-full px-3 py-2 text-xs font-bold text-gray-400 bg-white/5 rounded-lg hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 border border-transparent transition-all duration-200"
                            >
                                <LogOut className="mr-2 h-3 w-3" />
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 flex flex-col h-full relative z-10 lg:pr-6 lg:py-6 overflow-hidden">
                {/* Mobile Header Spacer */}
                <div className="h-16 lg:hidden" />

                <div className="flex-1 glass-panel rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col bg-black/40 backdrop-blur-2xl">
                    {/* Content Container with internal Scroll */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 scroll-smooth hover:scroll-auto">
                        <Outlet />
                    </div>
                </div>
            </main>

            {/* Mobile Backdrop */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-md z-30 lg:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}
        </div>
    );
}
