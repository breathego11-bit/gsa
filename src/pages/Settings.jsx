import React, { useState } from 'react';
import { User, Bell, Shield, Moon, Sun, Camera, Save, Zap, Calendar, Video, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function Settings() {
    const { user, isInstructor, setIsInstructor } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [theme, setTheme] = useState('dark'); // Default to dark for Fluxer
    const [loading, setLoading] = useState(false);

    // Integrations State
    const [integrations, setIntegrations] = useState({
        zoom: { api_key: '', api_secret: '', personal_link: '' },
        fathom: { api_key: '' },
        google: { connected: false, email: '' }
    });

    React.useEffect(() => {
        if (activeTab === 'integrations') {
            fetchIntegrations();
        }
    }, [activeTab]);

    const fetchIntegrations = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data } = await supabase.from('crm_integrations').select('*').eq('user_id', user.id);
            if (data) {
                const newState = { ...integrations };
                data.forEach(item => {
                    if (item.provider === 'zoom') newState.zoom = item.settings || {};
                    if (item.provider === 'fathom') newState.fathom = item.settings || {};
                    if (item.provider === 'google') newState.google = { connected: true, email: item.settings?.email };
                });
                setIntegrations(newState);
            }
        } catch (error) {
            console.error("Error fetching integrations", error);
        } finally {
            setLoading(false);
        }
    };

    const saveIntegration = async (provider, settings) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('crm_integrations')
                .upsert({
                    user_id: user.id,
                    provider: provider,
                    settings: settings,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, provider' });

            if (error) throw error;
            alert(`${provider.charAt(0).toUpperCase() + provider.slice(1)} settings saved!`);
        } catch (error) {
            console.error(`Error saving ${provider} `, error);
            alert("Error saving settings.");
        } finally {
            setLoading(false);
        }
    };

    const toggleInstructor = async () => {
        setLoading(true);
        try {
            const newStatus = !isInstructor;
            const { error } = await supabase
                .from('profiles')
                .update({ is_instructor: newStatus })
                .eq('id', user.id);

            if (error) throw error;

            // Instantly update the Context and UI without reloading
            setIsInstructor(newStatus);

        } catch (error) {
            console.error("Error toggling instructor mode", error);
            alert("Error al actualizar perfil. Inténtalo de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    const connectGoogleCalendar = async () => {
        // Trigger Supabase OAuth for Google with Calendar Scope
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                scopes: 'https://www.googleapis.com/auth/calendar',
                redirectTo: window.location.origin + '/settings?tab=integrations&connected=google'
            }
        });
        if (error) alert("Error initiating Google Login: " + error.message);
    };

    const tabs = [
        { id: 'profile', label: 'Mi Perfil', icon: User },
        { id: 'notifications', label: 'Notificaciones', icon: Bell },
        { id: 'integrations', label: 'Integraciones', icon: Zap },
        { id: 'security', label: 'Seguridad', icon: Shield },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-12">
            <div>
                <h1 className="text-3xl font-bold text-white">Configuración</h1>
                <p className="text-gray-400 mt-1">Gestiona tu cuenta y preferencias personales.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 space-y-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w - full flex items - center px - 4 py - 3 rounded - xl font - medium transition - all ${activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                } `}
                        >
                            <tab.icon size={18} className="mr-3" />
                            {tab.label}
                        </button>
                    ))}

                    <div className="pt-4 mt-4 border-t border-white/10">
                        <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Apariencia</p>
                        <div className="flex bg-black/40 border border-white/10 p-1 rounded-xl mx-2">
                            <button
                                onClick={() => setTheme('light')}
                                className={`flex - 1 flex items - center justify - center py - 1.5 rounded - lg text - sm font - medium transition - all ${theme === 'light' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-white'
                                    } `}
                            >
                                <Sun size={14} className="mr-2" />
                                Claro
                            </button>
                            <button
                                onClick={() => setTheme('dark')}
                                className={`flex - 1 flex items - center justify - center py - 1.5 rounded - lg text - sm font - medium transition - all ${theme === 'dark' ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/20' : 'text-gray-500 hover:text-white'
                                    } `}
                            >
                                <Moon size={14} className="mr-2" />
                                Oscuro
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 space-y-6">
                    {activeTab === 'profile' && (
                        <div className="space-y-6">
                            {/* Profile Card */}
                            <div className="bg-[#0F1115] border border-white/10 rounded-2xl p-8 flex flex-col items-center sm:flex-row sm:items-start gap-6 shadow-xl">
                                <div className="relative group cursor-pointer">
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-700 to-black border-4 border-[#0F1115] shadow-lg flex items-center justify-center text-3xl font-bold text-white overflow-hidden ring-2 ring-white/10">
                                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="text-white" size={24} />
                                    </div>
                                </div>
                                <div className="text-center sm:text-left flex-1">
                                    <h2 className="text-xl font-bold text-white">Ivan Abad</h2>
                                    <p className="text-gray-400">Senior Closer</p>
                                    <div className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start">
                                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold">GSA Certified</span>
                                        <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-xs font-bold">Manager</span>
                                    </div>
                                </div>
                                <button className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm font-bold shadow-md hover:bg-white/10 transition-all">
                                    Editar
                                </button>
                            </div>

                            {/* Personal Info Form */}
                            <div className="bg-[#0F1115] border border-white/10 rounded-2xl p-8 shadow-xl">
                                <h3 className="text-lg font-bold text-white mb-6">Información Personal</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-400">Nombre Completo</label>
                                        <input type="text" defaultValue="Ivan Abad" className="w-full px-4 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder-gray-600" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-400">Email</label>
                                        <input type="email" defaultValue={user?.email} disabled className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/5 text-gray-500 cursor-not-allowed" />
                                    </div>
                                    <div className="col-span-full">
                                        <label className="text-sm font-medium text-gray-400">Bio</label>
                                        <textarea className="w-full px-4 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all h-24 placeholder-gray-600" defaultValue="Closer de alto rendimiento enfocado en SaaS B2B." />
                                    </div>
                                </div>
                                <div className="mt-8 flex justify-end">
                                    <button className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-lg shadow-blue-900/40 hover:bg-blue-500 transition-all">
                                        <Save size={18} className="mr-2" />
                                        Guardar Cambios
                                    </button>
                                </div>
                            </div>

                            {/* Role & Permissions Form */}
                            <div className="bg-[#0F1115] border border-white/10 rounded-2xl p-8 shadow-xl">
                                <h3 className="text-lg font-bold text-white mb-6">Permisos de Plataforma</h3>
                                <div className="flex items-center justify-between p-4 bg-black/20 border border-white/10 rounded-xl">
                                    <div>
                                        <h4 className="text-white font-bold">Modo Formador (Instructor)</h4>
                                        <p className="text-sm text-gray-400">Habilita esta opción para poder crear y subir cursos a la GSA Academy.</p>
                                    </div>
                                    <button
                                        onClick={toggleInstructor}
                                        disabled={loading}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black ${isInstructor ? 'bg-blue-600' : 'bg-gray-700'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isInstructor ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>

                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="bg-[#0F1115] border border-white/10 rounded-2xl p-8 flex items-center justify-center min-h-[400px]">
                            <p className="text-gray-500 font-medium">Configuración de notificaciones próximamente...</p>
                        </div>
                    )}

                    {activeTab === 'integrations' && (
                        <div className="space-y-6 animate-slideUp">

                            {/* Google Calendar Card */}
                            <div className="bg-[#0F1115] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full -mr-10 -mt-10 blur-2xl group-hover:bg-blue-500/20 transition-all"></div>

                                <div className="flex justify-between items-start mb-6 z-10 relative">
                                    <div className="flex items-center">
                                        <div className="p-3 bg-white/5 rounded-xl border border-white/10 mr-4">
                                            <Calendar className="w-8 h-8 text-blue-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">Google Calendar</h3>
                                            <p className="text-gray-400 text-sm">Sincronización bidireccional de eventos y reuniones.</p>
                                        </div>
                                    </div>
                                    {integrations.google.connected ? (
                                        <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20 flex items-center">
                                            <CheckCircle size={12} className="mr-1" /> Conectado
                                        </span>
                                    ) : (
                                        <span className="bg-gray-500/10 text-gray-400 px-3 py-1 rounded-full text-xs font-bold border border-gray-500/20">No Conectado</span>
                                    )}
                                </div>

                                <div className="bg-black/20 rounded-xl p-4 border border-white/5 mb-6">
                                    <h4 className="text-sm font-bold text-gray-300 mb-2">Permisos Requeridos</h4>
                                    <ul className="text-xs text-gray-500 space-y-1">
                                        <li>• Ver y editar eventos en todos tus calendarios</li>
                                        <li>• Ver tu lista de calendarios</li>
                                    </ul>
                                </div>

                                <button
                                    onClick={connectGoogleCalendar}
                                    className={`w - full py - 3 rounded - xl font - bold transition - all shadow - lg flex items - center justify - center ${integrations.google.connected
                                        ? 'bg-white/5 text-gray-400 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40'
                                        } `}
                                    disabled={integrations.google.connected}
                                >
                                    {integrations.google.connected ? 'Cuenta Vinculada' : 'Conectar con Google'}
                                </button>
                            </div>

                            {/* Zoom Integration */}
                            <div className="bg-[#0F1115] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center">
                                        <div className="p-3 bg-white/5 rounded-xl border border-white/10 mr-4">
                                            <Video className="w-8 h-8 text-blue-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">Zoom Meetings</h3>
                                            <p className="text-gray-400 text-sm">Generación automática de links para reuniones.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Personal Meeting Link (Simple)</label>
                                        <input
                                            type="text"
                                            placeholder="https://zoom.us/j/12345678"
                                            value={integrations.zoom.personal_link || ''}
                                            onChange={(e) => setIntegrations({ ...integrations, zoom: { ...integrations.zoom, personal_link: e.target.value } })}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">API Key (Advanced - Optional)</label>
                                        <input
                                            type="password"
                                            placeholder="Zoom JWT / OAuth Key"
                                            value={integrations.zoom.api_key || ''}
                                            onChange={(e) => setIntegrations({ ...integrations, zoom: { ...integrations.zoom, api_key: e.target.value } })}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500/50 outline-none"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => saveIntegration('zoom', integrations.zoom)}
                                    disabled={loading}
                                    className="w-full py-2 bg-white/5 border border-white/10 text-white rounded-lg font-bold hover:bg-white/10 transition-all flex items-center justify-center"
                                >
                                    {loading ? <RefreshCw className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4 mr-2" />}
                                    Guardar Configuración Zoom
                                </button>
                            </div>

                            {/* Fathom */}
                            <div className="bg-[#0F1115] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center">
                                        <div className="p-3 bg-white/5 rounded-xl border border-white/10 mr-4">
                                            <div className="w-8 h-8 bg-purple-500/20 rounded flex items-center justify-center font-bold text-purple-400">F</div>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">Fathom AI Notetaker</h3>
                                            <p className="text-gray-400 text-sm">Sincronización de grabaciones y notas.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Fathom API Key</label>
                                    <input
                                        type="password"
                                        placeholder="sk_..."
                                        value={integrations.fathom.api_key || ''}
                                        onChange={(e) => setIntegrations({ ...integrations, fathom: { ...integrations.fathom, api_key: e.target.value } })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:ring-2 focus:ring-purple-500/50 outline-none"
                                    />
                                </div>
                                <button
                                    onClick={() => saveIntegration('fathom', integrations.fathom)}
                                    disabled={loading}
                                    className="w-full py-2 bg-purple-600/20 border border-purple-500/30 text-purple-400 rounded-lg font-bold hover:bg-purple-600/30 transition-all flex items-center justify-center"
                                >
                                    {loading ? <RefreshCw className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4 mr-2" />}
                                    Guardar Integración Fathom
                                </button>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
