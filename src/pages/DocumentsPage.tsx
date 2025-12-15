import { FileText, Search, Filter } from 'lucide-react';
import { Button } from '../components/ui/Button';

// Mock data for documents
const MOCK_DOCUMENTS = [
    { id: 1, name: 'Loan Estimate - John Doe.pdf', type: 'Loan Estimate', date: '2025-05-15', status: 'Verified' },
    { id: 2, name: 'Pay Stub - Jane Smith.pdf', type: 'Pay Stub', date: '2025-05-14', status: 'Pending Review' },
    { id: 3, name: 'Bank Statement - Mar 2025.pdf', type: 'Bank Statement', date: '2025-05-12', status: 'Verified' },
    { id: 4, name: 'Tax Return 2024.pdf', type: 'Tax Return', date: '2025-05-10', status: 'Processing' },
    { id: 5, name: 'Closing Disclosure - Refi.pdf', type: 'Closing Disclosure', date: '2025-05-08', status: 'Verified' },
];

export function DocumentsPage() {
    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Documents</h2>
                    <p className="text-slate-500">Manage and review your processed documents.</p>
                </div>
                <Button>
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
                        {MOCK_DOCUMENTS.map((doc) => (
                            <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-800 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center">
                                        <FileText size={16} />
                                    </div>
                                    {doc.name}
                                </td>
                                <td className="px-6 py-4 text-slate-600">{doc.type}</td>
                                <td className="px-6 py-4 text-slate-600">{doc.date}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${doc.status === 'Verified' ? 'bg-green-100 text-green-800' :
                                            doc.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                                                'bg-amber-100 text-amber-800'
                                        }`}>
                                        {doc.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-primary hover:text-primary/80 font-medium text-sm">View</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
