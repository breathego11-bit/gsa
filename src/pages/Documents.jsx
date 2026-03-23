import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, FileSpreadsheet, Search, CheckCircle, AlertCircle, Loader2, Database, X, Link as LinkIcon, ExternalLink, Folder, Plus, ArrowLeft, File, Image as ImageIcon, MoreVertical, FolderInput, Share2, Users, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { airtableService } from '../services/airtableService';


class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Documents Error Boundary Caught:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-10 text-white bg-red-900/20 m-4 rounded-xl border border-red-500/50">
                    <h2 className="text-xl font-bold mb-2 flex items-center"><AlertCircle className="mr-2" /> Algo salió mal en Documentos</h2>
                    <pre className="bg-black/50 p-4 rounded text-xs overflow-auto text-red-200">
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </pre>
                </div>
            );
        }

        return this.props.children;
    }
}

function DocumentsContent() {
    const [documents, setDocuments] = useState([]);
    const [folders, setFolders] = useState([]);
    const [currentFolder, setCurrentFolder] = useState(null); // ID of current folder, null means root
    const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'Inicio' }]);
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    console.log("RENDER: Folders:", folders.length, "Docs:", documents.length); // DEBUG LOG

    const [uploading, setUploading] = useState(false);
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [searching, setSearching] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [previewDoc, setPreviewDoc] = useState(null); // Document to preview
    const [newLink, setNewLink] = useState({ name: '', url: '' });

    // Move to Folder State
    const [movingDoc, setMovingDoc] = useState(null);
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [sharingDoc, setSharingDoc] = useState(null);
    const [selectedShareUsers, setSelectedShareUsers] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);

    const fileInputRef = useRef(null);

    // Mock initial fetch if DB is empty or fails
    useEffect(() => {
        fetchFolders();
        fetchDocuments();
    }, [currentFolder]); // Re-fetch when folder changes

    // --- FOLDER LOGIC ---

    // Mock initial fetch if DB is empty or fails
    useEffect(() => {
        fetchFolders();
        fetchDocuments();
        fetchTeamMembers(); // Fetch potential share targets
    }, [currentFolder]); // Re-fetch when folder changes

    const fetchTeamMembers = async () => {
        try {
            const { data } = await supabase.from('profiles').select('*');
            if (data) setTeamMembers(data);
        } catch (e) {
            console.warn("Failed to fetch team members", e);
        }
    };
    const fetchFolders = async () => {
        let dbFolders = [];
        try {
            let queryBuilder = supabase
                .from('crm_folders')
                .select('*')
                .order('name', { ascending: true });

            if (currentFolder && !String(currentFolder).startsWith('local-')) {
                queryBuilder = queryBuilder.eq('parent_id', currentFolder);
            } else if (!currentFolder) {
                queryBuilder = queryBuilder.is('parent_id', null);
            } else {
                // Current folder is local, so no DB children likely
            }

            // Only execute query if we aren't in a local folder
            if (!currentFolder || !String(currentFolder).startsWith('local-')) {
                const { data, error } = await queryBuilder;
                if (!error) dbFolders = data || [];
            }
        } catch (error) {
            console.error("Error fetching folders:", error);
        }

        // Merge with LocalStorage
        try {
            const localFolders = JSON.parse(localStorage.getItem('crm_local_folders') || '[]');
            const relevantLocal = localFolders.filter(f => f.parent_id === currentFolder);
            setFolders([...dbFolders, ...relevantLocal]);
        } catch (e) {
            console.error("Local storage error", e);
            setFolders(dbFolders);
        }
    };

    const createFolder = async () => {
        console.log("Creating folder:", newFolderName); // DEBUG
        if (!newFolderName.trim()) return;

        try {
            const { data, error } = await supabase
                .from('crm_folders')
                .insert([{
                    name: newFolderName,
                    parent_id: currentFolder,
                    user_id: (await supabase.auth.getUser()).data.user?.id
                }])
                .select();

            if (error) throw error;
            console.log("Folder created in DB:", data); // DEBUG
            setFolders(prev => [...prev, data[0]]);
            setIsFolderModalOpen(false);
            setNewFolderName('');
        } catch (error) {
            console.error("Error creating folder (caught):", error);
            // Fallback: Create local-only folder for session & PERSIST
            const fakeFolder = {
                id: `local-${Date.now()}`,
                name: newFolderName,
                parent_id: currentFolder,
                is_local: true,
                created_at: new Date().toISOString()
            };
            console.log("Adding FAKE folder:", fakeFolder); // DEBUG

            // Save to LocalStorage
            const currentLocal = JSON.parse(localStorage.getItem('crm_local_folders') || '[]');
            localStorage.setItem('crm_local_folders', JSON.stringify([...currentLocal, fakeFolder]));

            setFolders(prev => [...prev, fakeFolder]);
            setIsFolderModalOpen(false);
            setNewFolderName('');
        }
    };

    const handleFolderClick = (folder) => {
        setCurrentFolder(folder.id);
        setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
    };

    const navigateBreadcrumb = (index) => {
        const target = breadcrumbs[index];
        setCurrentFolder(target.id);
        setBreadcrumbs(prev => prev.slice(0, index + 1));
    };

    // --- DOCUMENT LOGIC ---

    const fetchDocuments = async () => {
        let dbDocs = [];
        try {
            // Attempt 1: Try to fetch with folder filtering (Correct Schema)
            let queryBuilder = supabase
                .from('crm_documents')
                .select('*')
                .order('created_at', { ascending: false });

            // Filter by folder
            if (currentFolder) {
                // Check if currentFolder is local
                if (String(currentFolder).startsWith('local-')) {
                    // Can't fetch from DB for local folder ID (UUID mismatch)
                    // skip DB query
                } else {
                    queryBuilder = queryBuilder.eq('folder_id', currentFolder);
                    const { data, error } = await queryBuilder;
                    if (!error && data) dbDocs = data;
                }
            } else {
                queryBuilder = queryBuilder.is('folder_id', null);
                const { data, error } = await queryBuilder;
                if (!error && data) dbDocs = data;
            }

        } catch (err) {
            console.warn("Schema mismatch or fetch error.", err);
            // On DB error, we might fallback to all docs, but for now let's show what we have + local
        }

        // Merge with LocalStorage
        try {
            const localDocs = JSON.parse(localStorage.getItem('crm_local_documents') || '[]');
            const relevantLocal = localDocs.filter(d => d.folder_id === currentFolder);

            // Deduplicate roughly (if ID clashes)
            setDocuments([...dbDocs, ...relevantLocal]);
        } catch (e) {
            setDocuments(dbDocs);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        console.log("File selected:", file); // DEBUG
        if (!file) return;

        setUploading(true);
        try {
            // 1. Determine Type & Parse Logic
            let parsedData = [];
            const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv');

            if (isExcel) {
                parsedData = await parseExcel(file);
            }

            // 2. Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

            console.log("Uploading to storage:", fileName); // DEBUG

            // Note: If storage bucket doesn't exist, this might not throw but return error?
            const { error: storageError } = await supabase.storage
                .from('crm_documents')
                .upload(fileName, file);

            if (storageError) {
                console.warn("Storage upload failed (Bucket missing?):", storageError);
                // We continue anyway to at least show the entry
            }

            // 3. Save Metadata
            // 3. Save Metadata (Try with folder first, fallback if migration missing)
            let insertPayload = {
                name: file.name,
                file_url: fileName,
                file_type: isExcel ? 'excel' : file.type,
                parsed_content: parsedData,
                folder_id: currentFolder,
                user_id: (await supabase.auth.getUser()).data.user?.id
            };

            console.log("Inserting metadata (attempt 1)..."); // DEBUG

            let { data: dbData, error: dbError } = await supabase
                .from('crm_documents')
                .insert([insertPayload])
                .select();

            // RETRY LOGIC: If 'folder_id' column is missing, try again without it
            if (dbError && dbError.message && (dbError.message.includes('folder_id') || dbError.code === '42703')) {
                console.warn("Folder ID column missing? Retrying without it.");
                delete insertPayload.folder_id;
                const retry = await supabase
                    .from('crm_documents')
                    .insert([insertPayload])
                    .select();
                dbData = retry.data;
                dbError = retry.error;
            }

            // Optimistic Update / Fallback
            if (dbData && dbData[0]) {
                console.log("DB Insert Success:", dbData[0]); // DEBUG
                setDocuments(prev => [dbData[0], ...prev]);
            } else {
                console.warn("DB Insert Failed even after retry. Using local object.", dbError); // DEBUG
                // If DB failed but we caught it and continued (e.g. column missing), manually create object
                const fallbackDoc = {
                    id: Date.now(),
                    name: file.name,
                    file_url: URL.createObjectURL(file), // Use blob for immediate display
                    file_type: isExcel ? 'excel' : file.type,
                    parsed_content: parsedData,
                    folder_id: currentFolder,
                    created_at: new Date().toISOString(),
                    is_local: true
                };

                // Save to LocalStorage
                const currentLocal = JSON.parse(localStorage.getItem('crm_local_documents') || '[]');
                localStorage.setItem('crm_local_documents', JSON.stringify([fallbackDoc, ...currentLocal]));

                setDocuments(prev => [fallbackDoc, ...prev]);
            }

        } catch (error) {
            console.error("Upload failed (caught block):", error);
            // Fallback for demo if DB/Storage fails (likely due to permissions or missing table)
            const fallbackDoc = {
                id: Date.now(),
                name: file.name,
                parsed_content: file.name.endsWith('.xls') || file.name.endsWith('.xlsx') || file.name.endsWith('.csv') ? await parseExcel(file) : [],
                created_at: new Date().toISOString(),
                file_url: URL.createObjectURL(file), // Generate local Blob URL
                is_local: true,
                folder_id: currentFolder,
                file_type: file.type
            };
            console.log("Adding FALLBACK doc:", fallbackDoc); // DEBUG

            // Save to LocalStorage
            const currentLocal = JSON.parse(localStorage.getItem('crm_local_documents') || '[]');
            localStorage.setItem('crm_local_documents', JSON.stringify([fallbackDoc, ...currentLocal]));

            setDocuments(prev => [fallbackDoc, ...prev]);
            // alert("Documento procesado localmente (Modo Demo/Fallo DB)");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleAddLink = async () => {
        if (!newLink.name || !newLink.url) return;

        const linkDoc = {
            name: newLink.name,
            file_url: newLink.url,
            file_type: 'external_link',
            parsed_content: [], // No content for links
            user_id: (await supabase.auth.getUser()).data.user?.id
        };

        try {
            const { data, error } = await supabase
                .from('crm_documents')
                .insert([linkDoc])
                .select();

            if (error) throw error;
            setDocuments(prev => [data[0], ...prev]);
        } catch (error) {
            console.error("Link save failed", error);
            // Fallback
            const fallbackDoc = {
                ...linkDoc,
                id: Date.now(),
                created_at: new Date().toISOString(),
                is_local: true
            };
            setDocuments(prev => [fallbackDoc, ...prev]);
        } finally {
            setIsLinkModalOpen(false);
            setNewLink({ name: '', url: '' });
        }
    };

    const handleShare = async () => {
        if (!sharingDoc) return;

        try {
            const { error } = await supabase
                .from('crm_documents')
                .update({ shared_with: selectedShareUsers }) // Overwrite array (simple version)
                .eq('id', sharingDoc.id);

            if (error) throw error;

            // Update local state to reflect sharing status
            setDocuments(prev => prev.map(d =>
                d.id === sharingDoc.id ? { ...d, shared_with: selectedShareUsers } : d
            ));

            alert("Documento compartido exitosamente");
        } catch (error) {
            console.error("Share failed", error);
            alert("Error al compartir (Verifique permisos de Manager)");
        } finally {
            setIsShareModalOpen(false);
            setSharingDoc(null);
            setSelectedShareUsers([]);
        }
    };

    const openShareModal = (e, doc) => {
        e.stopPropagation();
        setSharingDoc(doc);
        setSelectedShareUsers(doc.shared_with || []); // Pre-fill existing
        setIsShareModalOpen(true);
    };

    const openMoveModal = (e, doc) => {
        e.stopPropagation(); // Prevent opening preview
        setMovingDoc(doc);
        setIsMoveModalOpen(true);
    };

    const moveDocument = async (targetFolderId) => {
        if (!movingDoc) return;

        // Optimistic Update: Remove from current view
        setDocuments(prev => prev.filter(d => d.id !== movingDoc.id));

        try {
            if (movingDoc.is_local) {
                // Local move logic (localStorage)
                console.log("Moving local doc", movingDoc.id, "to", targetFolderId);

                const localDocs = JSON.parse(localStorage.getItem('crm_local_documents') || '[]');
                const updatedDocs = localDocs.map(d =>
                    d.id === movingDoc.id ? { ...d, folder_id: targetFolderId } : d
                );
                localStorage.setItem('crm_local_documents', JSON.stringify(updatedDocs));

            } else {
                const { error } = await supabase
                    .from('crm_documents')
                    .update({ folder_id: targetFolderId })
                    .eq('id', movingDoc.id);
                if (error) throw error;
            }
        } catch (error) {
            console.error("Move failed", error);
            // alert("Error al mover documento");
        } finally {
            setIsMoveModalOpen(false);
            setMovingDoc(null);
        }
    };

    const openDocumentFile = async (doc) => {
        if (!doc.file_url) {
            alert("Error: No valid URL for this document.");
            return;
        }

        if (doc.is_local || doc.file_type === 'external_link' || doc.file_url.startsWith('http')) {
            window.open(doc.file_url, '_blank');
        } else {
            // Internal File: Get Signed URL
            try {
                const { data, error } = await supabase.storage
                    .from('crm_documents')
                    .createSignedUrl(doc.file_url, 3600); // 1 hour expiry

                if (error) {
                    console.error("Error signing URL:", error);
                    alert("Error al abrir el archivo. Intente nuevamente.");
                    return;
                }

                if (data?.signedUrl) {
                    window.open(data.signedUrl, '_blank');
                }
            } catch (err) {
                console.error("Unexpected error opening file:", err);
            }
        }
    };

    const handleDocumentClick = async (doc) => {
        // ALWAYS use preview modal for supported types now
        setPreviewDoc(doc);

        // If it's not a local file and not an external link, we might need a signed URL for the preview (e.g. PDF/Image)
        if (!doc.is_local && doc.file_type !== 'external_link' && !doc.file_url.startsWith('http')) {
            // We'll handle signed URL fetching inside the modal logic or just pass it here if needed
            // Ideally the Preview Modal component Effect would handle it.
            // For now, let's just set the doc, and the Modal's button can fetch the download link.
            // If we want to display the image/pdf, we need the link.

            const { data } = await supabase.storage
                .from('crm_documents')
                .createSignedUrl(doc.file_url, 3600);

            if (data?.signedUrl) {
                setPreviewDoc(prev => ({ ...prev, temp_url: data.signedUrl }));
            }
        }

        if (doc.is_local) {
            setPreviewDoc(prev => ({ ...prev, temp_url: doc.file_url }));
        }
    };

    const parseExcel = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    resolve(jsonData);
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    };

    const handleSearch = async () => {
        if (!query.trim()) return;
        setSearching(true);
        setSearchResults(null);

        // Simulate "AI" Processing Delay
        await new Promise(r => setTimeout(r, 1500));

        const results = [];

        // 1. Search in Documents
        documents.forEach(doc => {
            const matches = doc.parsed_content.filter(row =>
                Object.values(row).some(val =>
                    String(val).toLowerCase().includes(query.toLowerCase())
                )
            );

            if (matches.length > 0) {
                results.push({
                    source: 'Excel: ' + doc.name,
                    matches: matches
                });
            }
        });

        // 2. Cross-Reference with CRM (Airtable)
        // We'll search Airtable for the same query to see if we have a match
        try {
            // Simplified: Fetch all leads and filter. In production, use API filter.
            const leads = await airtableService.getLeads();
            const crmMatches = leads.filter(lead =>
                lead.name.toLowerCase().includes(query.toLowerCase())
            );

            if (crmMatches.length > 0) {
                results.push({
                    source: 'CRM Pipeline',
                    matches: crmMatches.map(l => ({ ...l, status_label: l.status }))
                });
            }

        } catch (err) {
            console.error("CRM Search Error", err);
        }

        setSearchResults(results);
        setSearching(false);
    };

    return (
        <div className="h-full flex flex-col p-6 space-y-6 animate-fadeIn" >
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center">
                        <Database className="w-8 h-8 text-blue-500 mr-3" />
                        Centro de Documentos
                    </h1>
                    <p className="text-gray-400 mt-1">Sube tus Excel y cruza datos con el CRM automáticamente.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setIsFolderModalOpen(true)}
                        className="bg-blue-600 border border-blue-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:bg-blue-500 hover:scale-105 transition-all flex items-center"
                    >
                        <Plus className="mr-2 w-5 h-5" />
                        Nueva Carpeta
                    </button>
                    <button
                        onClick={() => setIsLinkModalOpen(true)}
                        className="bg-purple-600 border border-purple-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:bg-purple-500 hover:scale-105 transition-all flex items-center"
                    >
                        <LinkIcon className="mr-2 w-5 h-5" />
                        Agregar Link
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="bg-emerald-600 border border-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:bg-emerald-500 hover:scale-105 transition-all flex items-center"
                    >
                        {uploading ? <Loader2 className="animate-spin mr-2" /> : <UploadCloud className="mr-2" />}
                        Subir Archivo
                    </button>
                </div>
                <input
                    type="file"
                    hidden
                    ref={fileInputRef}
                    // accept=".xlsx, .xls, .csv" // Removed to allow generic
                    onChange={handleFileUpload}
                />
            </div>

            {/* "White Paper" Preview Modal - FULL SCREEN */}
            {previewDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-white animate-fadeIn">
                    <div className="bg-white w-full h-full flex flex-col shadow-none overflow-hidden">
                        {/* Header (White Theme) */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center">
                                {previewDoc.file_type === 'excel' ? (
                                    <FileSpreadsheet className="w-6 h-6 text-emerald-600 mr-3" />
                                ) : (
                                    <File className="w-6 h-6 text-blue-600 mr-3" />
                                )}
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">{previewDoc.name}</h3>
                                    {previewDoc.parsed_content && (
                                        <p className="text-sm text-gray-500">{previewDoc.parsed_content.length} Filas detectadas</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-3">
                                {previewDoc.file_url && (
                                    <button
                                        onClick={() => openDocumentFile(previewDoc)}
                                        className="text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center font-medium"
                                    >
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        Descargar Original
                                    </button>
                                )}
                                <button onClick={() => setPreviewDoc(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <X size={28} />
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        {/* Content Area */}
                        <div className="flex-1 overflow-auto bg-gray-50 p-0 flex justify-center">
                            <div className="bg-white shadow-lg min-h-full w-full max-w-5xl rounded-lg overflow-hidden">

                                {/* Case 1: Excel Data Table */}
                                {previewDoc.parsed_content && previewDoc.parsed_content.length > 0 && (
                                    <div className="overflow-auto max-h-full">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    {Object.keys(previewDoc.parsed_content[0]).map((header) => (
                                                        <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            {header}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {previewDoc.parsed_content.slice(0, 500).map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50">
                                                        {Object.values(row).map((val, vIdx) => (
                                                            <td key={vIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                                {String(val)}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Case 2: Image Preview */}
                                {previewDoc.file_type && previewDoc.file_type.startsWith('image/') && previewDoc.temp_url && (
                                    <div className="flex items-center justify-center p-10">
                                        <img src={previewDoc.temp_url} alt="Preview" className="max-w-full max-h-full shadow-md rounded" />
                                    </div>
                                )}

                                {/* Case 3: PDF Preview */}
                                {previewDoc.file_type === 'application/pdf' && previewDoc.temp_url && (
                                    <iframe src={previewDoc.temp_url} className="w-full h-full min-h-[600px]" title="PDF Preview"></iframe>
                                )}

                                {/* Case 4: Fallback / External Link / Unpreviewable */}
                                {(!previewDoc.parsed_content || previewDoc.parsed_content.length === 0) && !previewDoc.file_type?.startsWith('image/') && previewDoc.file_type !== 'application/pdf' && (
                                    <div className="flex flex-col items-center justify-center h-full py-20 text-gray-500">
                                        <File className="w-20 h-20 mb-4 text-gray-300" />
                                        <p className="text-lg font-medium">Vista previa no disponible para este tipo de archivo.</p>
                                        <p className="text-sm">Por favor, descargue el archivo para verlo.</p>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Link Modal */}
            {/* Folder Modal */}
            {
                isFolderModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scaleIn">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Nueva Carpeta</h3>
                                <button onClick={() => setIsFolderModalOpen(false)} className="text-gray-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>
                            <input
                                type="text"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                                placeholder="Nombre de la carpeta..."
                            />
                            <button
                                onClick={createFolder}
                                disabled={!newFolderName.trim()}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                            >
                                Crear Carpeta
                            </button>
                        </div>
                    </div>
                )
            }

            {
                isLinkModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scaleIn">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Agregar Link Externo</h3>
                                <button onClick={() => setIsLinkModalOpen(false)} className="text-gray-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Nombre del Documento</label>
                                    <input
                                        type="text"
                                        value={newLink.name}
                                        onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Ej: Carpeta Drive Ventas"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">URL (Link)</label>
                                    <input
                                        type="url"
                                        value={newLink.url}
                                        onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="https://docs.google.com/..."
                                    />
                                </div>
                                <button
                                    onClick={handleAddLink}
                                    disabled={!newLink.name || !newLink.url}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                                >
                                    Guardar Link
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Move Modal */}
            {
                isMoveModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scaleIn">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-white">Mover a...</h3>
                                <button onClick={() => setIsMoveModalOpen(false)} className="text-gray-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                <div
                                    onClick={() => moveDocument(null)}
                                    className={`p-3 rounded-xl cursor-pointer flex items-center ${currentFolder === null ? 'bg-blue-600/20 border border-blue-500/50' : 'bg-white/5 hover:bg-white/10'}`}
                                >
                                    <Folder className="w-5 h-5 text-yellow-400 mr-3" />
                                    <span className="text-gray-200 text-sm font-bold">Inicio (Raíz)</span>
                                </div>
                                {folders.filter(f => f.id !== currentFolder).map(f => (
                                    <div
                                        key={f.id}
                                        onClick={() => moveDocument(f.id)}
                                        className="p-3 bg-white/5 rounded-xl hover:bg-white/10 cursor-pointer flex items-center border border-transparent hover:border-white/10"
                                    >
                                        <Folder className="w-5 h-5 text-yellow-400 mr-3" />
                                        <span className="text-gray-200 text-sm">{f.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Share Modal */}
            {
                isShareModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scaleIn">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-white flex items-center">
                                    <Share2 className="w-5 h-5 mr-2 text-blue-500" />
                                    Compartir
                                </h3>
                                <button onClick={() => setIsShareModalOpen(false)} className="text-gray-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <p className="text-gray-400 text-sm mb-4">Selecciona los usuarios con los que deseas compartir este documento.</p>

                            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar mb-4">
                                {teamMembers.length === 0 ? (
                                    <div className="text-gray-500 text-center py-4 bg-white/5 rounded-xl">
                                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        No se encontraron miembros del equipo.
                                    </div>
                                ) : (
                                    teamMembers.map(member => (
                                        <div
                                            key={member.id}
                                            onClick={() => {
                                                const isSelected = selectedShareUsers.includes(member.id);
                                                if (isSelected) {
                                                    setSelectedShareUsers(prev => prev.filter(id => id !== member.id));
                                                } else {
                                                    setSelectedShareUsers(prev => [...prev, member.id]);
                                                }
                                            }}
                                            className={`p-3 rounded-xl cursor-pointer flex items-center justify-between border ${selectedShareUsers.includes(member.id) ? 'bg-blue-600/20 border-blue-500/50' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                                        >
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white mr-3">
                                                    {member.email.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-gray-200 text-sm font-bold">{member.full_name || member.email.split('@')[0]}</p>
                                                    <p className="text-gray-500 text-xs">{member.role || 'Miembro'}</p>
                                                </div>
                                            </div>
                                            {selectedShareUsers.includes(member.id) && <CheckCircle className="w-5 h-5 text-blue-400" />}
                                        </div>
                                    ))
                                )}
                            </div>

                            <button
                                onClick={handleShare}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all"
                            >
                                Guardar Cambios
                            </button>
                        </div>
                    </div>
                )
            }

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-0">

                {/* Left Col: Document List */}
                <div className="lg:col-span-1 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center px-4 py-3">
                        <div className="flex items-center text-gray-200">
                            {breadcrumbs.length > 1 ? (
                                <button onClick={() => navigateBreadcrumb(breadcrumbs.length - 2)} className="mr-2 hover:bg-white/10 p-1 rounded transition-colors">
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                            ) : (
                                <Database className="w-5 h-5 mr-2 text-blue-500" />
                            )}
                            <div className="flex items-center text-sm font-bold">
                                {breadcrumbs.map((crumb, index) => (
                                    <React.Fragment key={crumb.id || 'home'}>
                                        {index > 0 && <span className="mx-1 text-gray-500">/</span>}
                                        <span
                                            className={`cursor-pointer hover:text-white ${index === breadcrumbs.length - 1 ? 'text-white' : 'text-gray-400'}`}
                                            onClick={() => navigateBreadcrumb(index)}
                                        >
                                            {crumb.name}
                                        </span>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="overflow-y-auto p-4 space-y-3 flex-1 custom-scrollbar">
                        {/* 1. Folders */}
                        {folders.map(folder => (
                            <div
                                key={folder.id}
                                onClick={() => handleFolderClick(folder)}
                                className="p-3 border border-white/5 bg-white/5 rounded-xl hover:bg-white/10 transition-colors group cursor-pointer flex items-center"
                            >
                                <Folder className="w-8 h-8 text-yellow-400 mr-3 fill-yellow-400/20" />
                                <span className="font-bold text-gray-200 text-sm">{folder.name}</span>
                            </div>
                        ))}

                        {/* 2. Documents */}
                        {documents.length === 0 && folders.length === 0 ? (
                            <div className="text-center text-gray-500 py-10">
                                <UploadCloud className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">Carpeta vacía.</p>
                            </div>
                        ) : (
                            documents.map(doc => (
                                <div
                                    key={doc.id}
                                    onClick={() => handleDocumentClick(doc)}
                                    className="p-3 border border-white/10 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center overflow-hidden">
                                            {doc.file_type === 'external_link' ? (
                                                <LinkIcon className="w-8 h-8 p-1.5 bg-blue-500/20 text-blue-400 rounded-lg mr-3 flex-shrink-0" />
                                            ) : doc.file_type && doc.file_type.includes('image') ? (
                                                <ImageIcon className="w-8 h-8 p-1.5 bg-purple-500/20 text-purple-400 rounded-lg mr-3 flex-shrink-0" />
                                            ) : doc.parsed_content && doc.parsed_content.length > 0 ? (
                                                <FileSpreadsheet className="w-8 h-8 p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg mr-3 flex-shrink-0" />
                                            ) : (
                                                <File className="w-8 h-8 p-1.5 bg-gray-500/20 text-gray-400 rounded-lg mr-3 flex-shrink-0" />
                                            )}

                                            <div className="min-w-0">
                                                <p className="font-bold text-gray-200 text-sm truncate">{doc.name}</p>
                                                <p className="text-xs text-gray-500 mt-0.5 flex items-center">
                                                    {new Date(doc.created_at || Date.now()).toLocaleDateString()}
                                                    {doc.file_type === 'external_link' && <ExternalLink size={10} className="ml-1" />}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            {doc.file_type !== 'external_link' && doc.parsed_content && doc.parsed_content.length > 0 && (
                                                <div className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0 ml-2 mr-2">
                                                    DATA
                                                </div>
                                            )}
                                            <button
                                                onClick={(e) => openMoveModal(e, doc)}
                                                className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors mr-1"
                                                title="Mover a carpeta"
                                            >
                                                <FolderInput className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => openShareModal(e, doc)}
                                                className={`p-1.5 rounded-lg transition-colors ${doc.shared_with?.length > 0 ? 'text-blue-400 bg-blue-500/10' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
                                                title="Compartir"
                                            >
                                                <Share2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Col: Intelligence / Search */}
                <div className="lg:col-span-2 flex flex-col gap-6">

                    {/* Search Box */}
                    <div className="bg-gradient-to-r from-gray-900 to-black p-6 rounded-2xl shadow-xl border border-white/10">
                        <h3 className="text-lg font-bold mb-4 flex items-center text-white">
                            <Search className="w-5 h-5 mr-2 text-blue-500" />
                            Consultar "AI"
                        </h3>
                        <div className="relative">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Ej: 'Pagos de Carolina Ramón' o 'Buscar cliente...'"
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                            <button
                                onClick={handleSearch}
                                className="absolute right-2 top-2 p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                            >
                                {searching ? <Loader2 className="animate-spin w-5 h-5" /> : <Search className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {/* Results Area */}
                    <div className="flex-1 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 overflow-y-auto shadow-inner min-h-[300px] custom-scrollbar">
                        {!searchResults && !searching && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-60">
                                <Search className="w-16 h-16 mb-4" />
                                <p>Haz una consulta para cruzar datos</p>
                            </div>
                        )}

                        {searchResults && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-gray-200 text-lg">Resultados del Análisis</h3>
                                    <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-gray-400 border border-white/10">
                                        {searchResults.reduce((acc, curr) => acc + curr.matches.length, 0)} Coincidencias
                                    </span>
                                </div>

                                {searchResults.length === 0 ? (
                                    <div className="text-center py-10 text-gray-500">
                                        No se encontraron coincidencias en los documentos ni en el CRM.
                                    </div>
                                ) : (
                                    searchResults.map((result, idx) => (
                                        <div key={idx} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden animate-slideUp" style={{ animationDelay: `${idx * 100}ms` }}>
                                            <div className="bg-white/5 px-4 py-2 border-b border-white/5 flex items-center">
                                                <div className={`w-2 h-2 rounded-full mr-2 ${result.source.includes('CRM') ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                                                <span className="font-bold text-gray-300 text-sm uppercase tracking-wide">{result.source}</span>
                                            </div>
                                            <div className="p-0">
                                                {result.matches.map((match, mIdx) => (
                                                    <div key={mIdx} className="p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                                            {Object.entries(match).slice(0, 6).map(([key, val]) => (
                                                                <div key={key} className="flex flex-col">
                                                                    <span className="text-[10px] text-gray-500 uppercase font-bold">{key}</span>
                                                                    <span className="text-gray-300 font-medium truncate">{String(val)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
}

export default function Documents() {
    return (
        <ErrorBoundary>
            <DocumentsContent />
        </ErrorBoundary>
    );
}
