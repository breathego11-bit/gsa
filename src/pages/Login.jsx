import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export default function Login() {
    const { user, loginWithGoogle, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-200/30 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-200/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>

            <div className="relative z-10 w-full max-w-md px-4">
                <div className="premium-card p-8 md:p-12 text-center backdrop-blur-xl bg-white/80 border border-white/50 shadow-2xl">
                    <div className="mb-8 flex justify-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-gsa-red to-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-200 transform rotate-3">
                            <ShieldCheck className="w-8 h-8" />
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">GSA Sales OS</h1>
                    <p className="text-gray-500 mb-8 text-sm">El sistema operativo para Closers de Alto Rendimiento. Inicia sesión para acceder.</p>

                    <div className="space-y-4">
                        <button
                            onClick={loginWithGoogle}
                            disabled={loading}
                            className="group relative w-full flex items-center justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        >
                            {loading ? (
                                <span className="animate-pulse">Conectando...</span>
                            ) : (
                                <>
                                    <span>Entrar con Google</span>
                                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center space-x-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">Sistema Seguro & Encriptado</p>
                    </div>
                </div>

                <p className="text-center mt-6 text-xs text-gray-400">
                    &copy; 2024 Growth Sales Academy. Todos los derechos reservados.
                </p>
            </div>
        </div>
    );
}
