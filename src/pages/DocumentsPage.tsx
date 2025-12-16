import { FileText, Search, Filter } from 'lucide-react';
import { Button } from '../components/ui/Button';

// ... imports
import { useEffect, useState } from 'react';
import { supabase, getUserDocuments, getSignedUrl, deleteDocument } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { Trash2, ExternalLink } from 'lucide-react';

interface Document {
    id: string;
    doc_type: string;
    created_at: string;
    file_path: string;
    extracted_data: any;
}

export function DocumentsPage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadDocuments();
    }, []);

    const loadDocuments = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const docs = await getUserDocuments(session.user.id);
                setDocuments(docs || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleView = async (filePath: string) => {
        try {
            const url = await getSignedUrl(filePath);
            window.open(url, '_blank');
        } catch (error) {
            alert('Failed to load document');
        }
    };

    const handleDelete = async (id: string, filePath: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;

        try {
            await deleteDocument(id, filePath);
            // Optimistic update
            setDocuments(docs => docs.filter(d => d.id !== id));
        } catch (error) {
            alert('Failed to delete document');
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Documents</h2>
                    <p className="text-slate-500">Manage and review your processed documents.</p>
                </div>
                <Button onClick={() => navigate('/')}>
                    <FileText size={16} className="mr-2" />
                    Upload New
                </Button>
            </header>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search documents..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                </div>
                <Button variant="outline" className="flex items-center gap-2">
                    <Filter size={18} />
                    Filter
                </Button>
            </div>

            {/* Documents List */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 font-medium text-slate-500">Document Name</th>
                            <th className="px-6 py-3 font-medium text-slate-500">Type</th>
                            <th className="px-6 py-3 font-medium text-slate-500">Date Uploaded</th>
                            <th className="px-6 py-3 font-medium text-slate-500">Status</th>
                            <th className="px-6 py-3 font-medium text-slate-500 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading documents...</td></tr>
                        ) : documents.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">No documents found. Upload one to get started!</td></tr>
                        ) : (
                            documents.map((doc) => (
                                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-800 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center">
                                            <FileText size={16} />
                                        </div>
                                        {doc.file_path.split('/').pop()}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{doc.doc_type || 'Unknown'}</td>
                                    <td className="px-6 py-4 text-slate-600">{new Date(doc.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Processed
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-slate-500 hover:text-primary"
                                            onClick={() => handleView(doc.file_path)}
                                            title="View Document"
                                        >
                                            <ExternalLink size={16} />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-slate-500 hover:text-red-600"
                                            onClick={() => handleDelete(doc.id, doc.file_path)}
                                            title="Delete Document"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
