import React, { useState, useRef, useEffect } from 'react';
import { Bot, Sparkles, Send, Mic, UploadCloud, User, X, FileText, Video, Music, Trash2, CheckCircle, Brain, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function AICoach() {
    const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'training'
    const [messages, setMessages] = useState([
        { id: 1, sender: 'ai', text: 'Hola Closer. Soy tu GSA Coach. Sube material de entrenamiento o pregúntame algo sobre tus ventas.', type: 'text' }
    ]);
    const [trainingFiles, setTrainingFiles] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // Fetch existing training files (mock for now, or could query DB if we had a table for files metadata)
        // For MVP we just show what's uploaded in this session or we could list from storage.
        // To be properly implemented, we'd need a 'training_files' table.
    }, []);

    const handleSendMessage = async () => {
        if (!inputText.trim()) return;

        const userMsg = { id: Date.now(), sender: 'user', text: inputText, type: 'text' };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('chat-completion', {
                body: {
                    messages: [...messages, userMsg]
                }
            });

            if (error) throw error;

            const aiResponse = {
                id: Date.now() + 1,
                sender: 'ai',
                text: data.text || "No response generated.",
                type: 'text' // We can expand to 'analysis' type later if we structure the JSON response
            };
            setMessages(prev => [...prev, aiResponse]);

        } catch (err) {
            console.error("Chat Error:", err);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                sender: 'ai',
                text: "Error conectando con el cerebro GSA. (Revisa tu API Key)",
                type: 'text'
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (file) => {
        if (activeTab === 'training') {
            const newFileId = Date.now();
            // Optimistic UI
            setTrainingFiles(prev => [...prev, {
                id: newFileId,
                name: file.name,
                type: file.type.includes('video') ? 'video' : file.type.includes('pdf') ? 'document' : 'audio',
                status: 'uploading', // uploading | indexing | indexed | error
                date: new Date().toLocaleDateString()
            }]);

            try {
                // 1. Upload to Supabase Storage
                // Sanitize filename
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('training_uploads')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                setTrainingFiles(prev => prev.map(f => f.id === newFileId ? { ...f, status: 'indexing' } : f));

                // 2. Trigger Edge Function (RAG Indexing)
                const { data, error: funcError } = await supabase.functions.invoke('process-training-material', {
                    body: {
                        file_path: fileName,
                        file_type: file.type,
                        file_name: file.name
                    }
                });

                if (funcError) throw funcError;

                console.log("Indexing Result:", data);
                setTrainingFiles(prev => prev.map(f => f.id === newFileId ? { ...f, status: 'indexed' } : f));

            } catch (error) {
                console.error("Upload/Index Error:", error);
                setTrainingFiles(prev => prev.map(f => f.id === newFileId ? { ...f, status: 'error' } : f));
                alert(`Error: ${error.message || "Fallo en la subida/indexación"}`);
            }
            return;
        }
    };

    return (
        <div className="h-full flex flex-col gap-4 animate-fadeIn">
            {/* Hidden Input Global */}
            <input
                ref={fileInputRef}
                type="file"
                hidden
                onChange={(e) => {
                    if (e.target.files.length > 0) handleFileUpload(e.target.files[0]);
                    e.target.value = '';
                }}
                accept="video/*,audio/*,.pdf,.txt,.md,.doc,.docx"
            />

            {/* Header */}
            <div className="flex justify-between items-center px-2">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center tracking-tight">
                        <Brain className="w-8 h-8 text-blue-500 mr-3" />
                        AI Sales Coach
                    </h1>
                    <p className="text-gray-400 text-sm ml-11">Tu auditor de ventas personal 24/7</p>
                </div>

                {/* Tabs */}
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 backdrop-blur-sm">
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-all ${activeTab === 'chat' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}
                    >
                        <MessageSquare size={16} className="mr-2" />
                        Auditoría
                    </button>
                    <button
                        onClick={() => setActiveTab('training')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-all ${activeTab === 'training' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}
                    >
                        <UploadCloud size={16} className="mr-2" />
                        Entrenamiento
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 glass-panel relative overflow-hidden flex flex-col shadow-2xl border border-white/10 mx-2 mb-4 bg-black/40 backdrop-blur-xl rounded-2xl">
                {activeTab === 'chat' ? (
                    <>
                        {/* Messages Feed */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {/* AI Avatar */}
                                    {msg.sender === 'ai' && (
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-black flex items-center justify-center text-white shadow-lg mr-3 flex-shrink-0 mt-1 border border-blue-500/30">
                                            <Bot size={20} />
                                        </div>
                                    )}

                                    {/* Message Bubble */}
                                    <div className={`
                                        max-w-[80%] rounded-2xl p-4 shadow-sm relative
                                        ${msg.sender === 'user'
                                            ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-tr-sm shadow-blue-500/20'
                                            : 'bg-white/5 backdrop-blur-md border border-white/10 text-gray-200 rounded-tl-sm'
                                        }
                                    `}>
                                        <p className="text-sm leading-relaxed text-gray-200 whitespace-pre-wrap">{msg.text}</p>
                                    </div>

                                    {/* User Avatar */}
                                    {msg.sender === 'user' && (
                                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-gray-300 shadow-sm ml-3 flex-shrink-0 mt-1 border border-white/10">
                                            <User size={20} />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Loading Indicator */}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-black flex items-center justify-center text-white shadow-lg mr-3 flex-shrink-0 border border-blue-500/30">
                                        <Bot size={20} />
                                    </div>
                                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl rounded-tl-sm p-4 flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-black/60 backdrop-blur-xl border-t border-white/10 relative z-20">
                            <div className="flex items-end gap-2">
                                <div className="flex-1 bg-white/5 rounded-xl border border-white/10 focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 transition-all shadow-inner relative">
                                    <textarea
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                                        placeholder="Pregunta a tu GSA Coach..."
                                        className="w-full bg-transparent p-3 max-h-32 min-h-[50px] resize-none focus:outline-none text-sm text-gray-200 placeholder-gray-500 custom-scrollbar"
                                        rows={1}
                                    />
                                </div>

                                <button
                                    onClick={handleSendMessage}
                                    disabled={!inputText.trim() || loading}
                                    className={`p-3 rounded-xl shadow-lg transition-all transform hover:scale-105 ${!inputText.trim() || loading
                                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-white/5'
                                        : 'bg-blue-600 text-white hover:shadow-glow-blue border border-blue-500/50'
                                        }`}
                                >
                                    <Send size={24} />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="p-8 h-full overflow-y-auto">
                        <div className="max-w-3xl mx-auto space-y-8">
                            {/* Upload Banner */}
                            <div className="bg-gradient-to-br from-black to-gray-900 rounded-2xl p-8 text-white text-center relative overflow-hidden shadow-2xl group border border-white/10">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full filter blur-3xl transform translate-x-1/2 -translate-y-1/2 group-hover:bg-blue-500/30 transition-all"></div>
                                <Sparkles className="absolute top-4 right-4 text-white/10 w-24 h-24" />

                                <h2 className="text-3xl font-bold mb-2 relative z-10 text-white">Entrena a tu Coach IA</h2>
                                <p className="text-gray-400 mb-8 max-w-lg mx-auto relative z-10">
                                    Sube tus PDFs, TXTs o Transcripts. El sistema los leerá para responderte basándose en TU información.
                                </p>

                                <div className="flex justify-center gap-4 relative z-10">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center shadow-xl hover:scale-105 active:scale-95"
                                    >
                                        <UploadCloud className="mr-2" />
                                        Subir Archivos
                                    </button>
                                </div>
                            </div>

                            {/* Knowledge Base List */}
                            <div>
                                <h3 className="font-bold text-white mb-4 flex items-center text-lg">
                                    <CheckCircle size={20} className="text-emerald-500 mr-2" />
                                    Cerebro Digital ({trainingFiles.length} Archivos en Sesión)
                                </h3>
                                <div className="space-y-3">
                                    {trainingFiles.map(file => (
                                        <div key={file.id} className="bg-white/5 p-5 rounded-2xl border border-white/10 flex items-center justify-between shadow-sm hover:bg-white/10 transition-all group">
                                            <div className="flex items-center space-x-4">
                                                <div className={`p-3 rounded-xl ${file.type === 'video' ? 'bg-purple-500/20 text-purple-400' :
                                                    file.type === 'document' ? 'bg-blue-500/20 text-blue-400' : 'bg-cyan-500/20 text-cyan-400'
                                                    }`}>
                                                    {file.type === 'video' ? <Video size={24} /> :
                                                        file.type === 'document' ? <FileText size={24} /> : <Music size={24} />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-lg">{file.name}</p>
                                                    <div className="flex items-center text-xs text-gray-400 space-x-2 mt-1">
                                                        <span>{file.date}</span>
                                                        <span>•</span>
                                                        {file.status === 'uploading' && <span className="text-yellow-400">Subiendo...</span>}
                                                        {file.status === 'indexing' && <span className="text-blue-400 animate-pulse">Leyendo...</span>}
                                                        {file.status === 'indexed' && <span className="text-emerald-400 font-bold">Listo</span>}
                                                        {file.status === 'error' && <span className="text-red-400 font-bold">Error</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {trainingFiles.length === 0 && (
                                        <p className="text-center text-gray-500 py-8 italic">No has subido archivos en esta sesión.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
