import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
    Plus, Search, Filter, Eye, XCircle,
    ChevronUp, ChevronDown, AlertTriangle, Clock,
    Loader, RefreshCw, CheckCircle2, FileQuestion, X, Trash2
} from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import { AlertCircle } from 'lucide-react';

const statusColors = {
    open: 'bg-blue-100 text-blue-700 border border-blue-200',
    in_review: 'bg-amber-100 text-amber-700 border border-amber-200',
    answered: 'bg-violet-100 text-violet-700 border border-violet-200',
    closed: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
};
const statusLabels = { open: 'Open', in_review: 'In Review', answered: 'Answered', closed: 'Closed' };
const priorityColors = {
    low: 'bg-slate-100 text-slate-500',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-red-100 text-red-700 font-bold'
};



const RFIList = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [rfis, setRfis] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({ projectId: '', status: '', priority: '' });
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
    const [rfiToClose, setRfiToClose] = useState(null);
    const [closing, setClosing] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [rfiToDelete, setRfiToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });

    const basePath = window.location.pathname.startsWith('/client-portal') ? '/client-portal' : '/company-admin';
    const isAdmin = ['COMPANY_OWNER', 'PM'].includes(user?.role);

    useEffect(() => {
        Promise.all([
            api.get('/rfis'),
            api.get('/projects')
        ]).then(([rfiRes, projRes]) => {
            setRfis(rfiRes.data);
            setProjects(Array.isArray(projRes.data) ? projRes.data : []);
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    const handleCloseRFI = (id, e) => {
        e.stopPropagation();
        setRfiToClose(id);
        setIsCloseModalOpen(true);
    };

    const confirmCloseRFI = async () => {
        if (!rfiToClose) return;
        try {
            setClosing(true);
            await api.patch(`/rfis/${rfiToClose}`, { status: 'closed' });
            setRfis(prev => prev.map(r => r._id === rfiToClose ? { ...r, status: 'closed' } : r));
            setIsCloseModalOpen(false);
            setRfiToClose(null);
        } catch (err) {
            setErrorModal({ isOpen: true, message: 'Failed to close RFI' });
        } finally {
            setClosing(false);
        }
    };

    const handleDeleteClick = (id, e) => {
        e.stopPropagation();
        setRfiToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteRFI = async () => {
        if (!rfiToDelete) return;
        try {
            setDeleting(true);
            await api.delete(`/rfis/${rfiToDelete}`);
            setRfis(prev => prev.filter(r => r._id !== rfiToDelete));
            setIsDeleteModalOpen(false);
            setRfiToDelete(null);
        } catch (err) {
            setErrorModal({ isOpen: true, message: 'Failed to delete RFI' });
        } finally {
            setDeleting(false);
        }
    };

    const filtered = rfis.filter(r => {
        const matchSearch = !search ||
            r.subject?.toLowerCase().includes(search.toLowerCase()) ||
            r.rfiNumber?.toLowerCase().includes(search.toLowerCase()) ||
            r.raisedBy?.fullName?.toLowerCase().includes(search.toLowerCase());
        const matchProject = !filters.projectId || r.projectId?._id === filters.projectId;
        const matchStatus = !filters.status || r.status === filters.status;
        const matchPriority = !filters.priority || r.priority === filters.priority;
        const matchClient = user?.role !== 'CLIENT' || r.raisedBy?.role !== 'SUBCONTRACTOR';
        return matchSearch && matchProject && matchStatus && matchPriority && matchClient;
    });

    return (
        <div className="space-y-6 pb-12 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter">RFI List</h1>
                    <p className="text-slate-500 text-sm mt-1">{filtered.length} RFIs found</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => navigate(`${basePath}/rfi`)}
                        className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-bold border border-slate-200 transition text-sm"
                    >
                        Dashboard
                    </button>
                    {user?.role !== 'CLIENT' && (
                        <button
                            onClick={() => navigate(`${basePath}/rfi/create`)}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 transition text-sm"
                        >
                            <Plus size={18} /> New RFI
                        </button>
                    )}
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Search */}
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search RFIs..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition"
                        />
                    </div>
                    {/* Project Filter */}
                    <select
                        value={filters.projectId}
                        onChange={e => setFilters(f => ({ ...f, projectId: e.target.value }))}
                        className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition text-slate-700"
                    >
                        <option value="">All Projects</option>
                        {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                    {/* Status Filter */}
                    <select
                        value={filters.status}
                        onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                        className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition text-slate-700"
                    >
                        <option value="">All Statuses</option>
                        <option value="open">Open</option>
                        <option value="in_review">In Review</option>
                        <option value="answered">Answered</option>
                        <option value="closed">Closed</option>
                    </select>
                    {/* Priority Filter */}
                    <select
                        value={filters.priority}
                        onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}
                        className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition text-slate-700"
                    >
                        <option value="">All Priorities</option>
                        <option value="high">🔴 High</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="low">🟢 Low</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center p-16">
                        <Loader className="animate-spin text-blue-500" size={28} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-16 text-slate-400 gap-3">
                        <FileQuestion size={40} className="text-slate-200" />
                        <p className="font-bold">No RFIs Found</p>
                        {user?.role !== 'CLIENT' && (
                            <button onClick={() => navigate(`${basePath}/rfi/create`)} className="text-sm text-blue-600 hover:underline font-medium">
                                + Create your first RFI
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        {['RFI #', 'Project', 'Subject', 'Raised By', 'Assigned To', 'Priority', 'Status', 'Due Date', 'Created', 'Action'].map(h => (
                                            <th key={h} className="px-4 py-3 text-[11px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filtered.map(rfi => (
                                        <tr
                                            key={rfi._id}
                                            className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                                            onClick={() => navigate(`${basePath}/rfi/${rfi._id}`)}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-black text-slate-800">{rfi.rfiNumber}</span>
                                                    {rfi.isOverdue && <Clock size={12} className="text-red-500" title="Overdue" />}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600 font-medium max-w-[120px] truncate">{rfi.projectId?.name || '—'}</td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-bold text-slate-800 max-w-[160px] truncate">{rfi.subject}</p>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{rfi.raisedBy?.fullName || '—'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{rfi.assignedTo?.fullName || <span className="text-slate-300">Unassigned</span>}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2.5 py-1 rounded-full font-bold capitalize ${priorityColors[rfi.priority]}`}>
                                                    {rfi.priority}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${statusColors[rfi.status]}`}>
                                                    {statusLabels[rfi.status]}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                                                {rfi.dueDate ? (
                                                    <span className={rfi.isOverdue ? 'text-red-500 font-bold' : ''}>
                                                        {new Date(rfi.dueDate).toLocaleDateString()}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
                                                {new Date(rfi.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => navigate(`${basePath}/rfi/${rfi._id}`)}
                                                        className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                                                        title="View"
                                                    >
                                                        <Eye size={14} />
                                                    </button>
                                                    {rfi.status !== 'closed' && user?.role !== 'CLIENT' && (
                                                        <button
                                                            onClick={e => handleCloseRFI(rfi._id, e)}
                                                            className="p-1.5 bg-slate-50 text-slate-500 rounded-lg hover:bg-red-50 hover:text-red-500 transition"
                                                            title="Close"
                                                        >
                                                            <XCircle size={14} />
                                                        </button>
                                                    )}
                                                    {isAdmin && (
                                                        <button
                                                            onClick={e => handleDeleteClick(rfi._id, e)}
                                                            className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden divide-y divide-slate-100">
                            {filtered.map(rfi => (
                                <div
                                    key={rfi._id}
                                    onClick={() => navigate(`${basePath}/rfi/${rfi._id}`)}
                                    className="p-4 hover:bg-slate-50 transition cursor-pointer"
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div>
                                            <p className="text-xs font-black text-slate-400">{rfi.rfiNumber}</p>
                                            <p className="text-sm font-bold text-slate-800">{rfi.subject}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{rfi.projectId?.name}</p>
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${statusColors[rfi.status]}`}>
                                            {statusLabels[rfi.status]}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${priorityColors[rfi.priority]}`}>
                                            {rfi.priority}
                                        </span>
                                        {rfi.isOverdue && (
                                            <span className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                                                <Clock size={10} /> Overdue
                                            </span>
                                        )}
                                        <span className="text-[10px] text-slate-400 ml-auto">
                                            {new Date(rfi.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Close Confirmation Modal */}
            <Modal isOpen={isCloseModalOpen} onClose={() => setIsCloseModalOpen(false)} title="Close RFI">
                <div className="text-center space-y-6">
                    <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-500 mx-auto border border-amber-100 shadow-sm animate-pulse">
                        <AlertTriangle size={40} />
                    </div>
                    
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Finalize RFI?</h3>
                        <p className="text-slate-500 font-bold text-sm mt-2 leading-relaxed">
                            Are you sure you want to mark this RFI as <span className="text-emerald-600">Closed</span>? This indicates that all queries have been resolved.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2 font-black uppercase tracking-widest text-[10px]">
                        <button
                            onClick={() => setIsCloseModalOpen(false)}
                            className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl transition active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmCloseRFI}
                            disabled={closing}
                            className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl transition shadow-lg shadow-emerald-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {closing ? <Loader size={16} className="animate-spin" /> : "Close RFI"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete RFI">
                <div className="text-center space-y-6">
                    <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mx-auto border border-red-100 shadow-sm animate-pulse">
                        <Trash2 size={40} />
                    </div>
                    
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Delete RFI?</h3>
                        <p className="text-slate-500 font-bold text-sm mt-2 leading-relaxed">
                            Are you sure you want to <span className="text-red-600">Permanently Delete</span> this RFI? This action cannot be undone and all data will be lost.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2 font-black uppercase tracking-widest text-[10px]">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl transition active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDeleteRFI}
                            disabled={deleting}
                            className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl transition shadow-lg shadow-red-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {deleting ? <Loader size={16} className="animate-spin" /> : "Delete RFI"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Error Modal */}
            <Modal 
                isOpen={errorModal.isOpen} 
                onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
                title="Notice"
                maxWidth="max-w-sm"
            >
                <div className="flex flex-col items-center text-center py-4">
                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle size={32} />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mb-2">Notice</h3>
                    <p className="text-slate-500 text-sm font-medium mb-6">
                        {errorModal.message}
                    </p>
                    <button
                        onClick={() => setErrorModal({ ...errorModal, isOpen: false })}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition shadow-lg active:scale-95"
                    >
                        Okay
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default RFIList;
