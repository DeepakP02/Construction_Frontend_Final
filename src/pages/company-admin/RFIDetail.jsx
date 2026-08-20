import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, Clock, AlertTriangle, CheckCircle2, XCircle,
    RefreshCw, MessageSquare, Send, Loader, User,
    MapPin, Tag, Calendar, Paperclip, Download,
    ChevronDown, Edit2, CheckCheck, X, Trash2
} from 'lucide-react';
import api, { getServerUrl } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import { AlertCircle } from 'lucide-react';

const statusColors = {
    open: 'bg-blue-100 text-blue-700 border-blue-200',
    in_review: 'bg-amber-100 text-amber-700 border-amber-200',
    answered: 'bg-violet-100 text-violet-700 border-violet-200',
    closed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};
const statusLabels = { open: 'Open', in_review: 'In Review', answered: 'Answered', closed: 'Closed' };
const statusFlow = ['open', 'in_review', 'answered', 'closed'];
const priorityBadge = {
    low: 'bg-slate-100 text-slate-600',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-red-100 text-red-700 font-bold',
};

const RFIDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [rfi, setRfi] = useState(null);
    const [loading, setLoading] = useState(true);
    const [comment, setComment] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const [response, setResponse] = useState('');
    const [showResponseBox, setShowResponseBox] = useState(false);
    const [statusChanging, setStatusChanging] = useState(false);
    const [users, setUsers] = useState([]);
    const [reassignTo, setReassignTo] = useState('');
    const [showReassign, setShowReassign] = useState(false);
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });
    const commentRef = useRef(null);

    const basePath = window.location.pathname.startsWith('/client-portal') ? '/client-portal' : '/company-admin';

    const isAdmin = ['COMPANY_OWNER', 'PM'].includes(user?.role);

    useEffect(() => {
        fetchRFI();
        if (isAdmin) {
            api.get('/auth/users').then(res => {
                setUsers((Array.isArray(res.data) ? res.data : []).filter(u => ['PM', 'COMPANY_OWNER', 'FOREMAN'].includes(u.role)));
            }).catch(console.error);
        }
    }, [id]);

    const fetchRFI = async () => {
        try {
            const res = await api.get(`/rfis/${id}`);
            setRfi(res.data);
            setResponse(res.data.officialResponse || '');
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (!comment.trim()) return;
        setSubmittingComment(true);
        try {
            const res = await api.post(`/rfis/${id}/comments`, { text: comment });
            setRfi(res.data);
            setComment('');
        } catch (e) {
            setErrorModal({ isOpen: true, message: 'Failed to add comment' });
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleStatusChange = async (newStatus) => {
        setStatusChanging(true);
        try {
            const res = await api.patch(`/rfis/${id}`, { status: newStatus });
            setRfi(prev => ({ ...prev, status: res.data.status }));
        } catch (e) {
            setErrorModal({ isOpen: true, message: 'Failed to update status' });
        } finally {
            setStatusChanging(false);
        }
    };

    const handleSaveResponse = async () => {
        try {
            const res = await api.patch(`/rfis/${id}`, { officialResponse: response, status: 'answered' });
            setRfi(prev => ({ ...prev, officialResponse: res.data.officialResponse, status: res.data.status }));
            setShowResponseBox(false);
        } catch (e) {
            setErrorModal({ isOpen: true, message: 'Failed to save response' });
        }
    };

    const handleReassign = async () => {
        if (!reassignTo) return;
        try {
            const res = await api.patch(`/rfis/${id}`, { assignedTo: reassignTo });
            setRfi(prev => ({ ...prev, assignedTo: res.data.assignedTo }));
            setShowReassign(false);
            setReassignTo('');
        } catch (e) {
            setErrorModal({ isOpen: true, message: 'Failed to reassign' });
        }
    };

    const handleClose = async () => {
        setIsCloseModalOpen(true);
    };

    const confirmCloseRFI = async () => {
        setIsCloseModalOpen(false);
        await handleStatusChange('closed');
    };

    const handleDelete = () => {
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteRFI = async () => {
        try {
            setDeleting(true);
            await api.delete(`/rfis/${id}`);
            navigate(`${basePath}/rfi/list`);
        } catch (e) {
            setErrorModal({ isOpen: true, message: 'Failed to delete RFI' });
        } finally {
            setDeleting(false);
            setIsDeleteModalOpen(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    if (!rfi) {
        return (
            <div className="text-center py-20">
                <p className="text-slate-400 font-bold">RFI not found</p>
                <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 text-sm hover:underline">← Go Back</button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition">
                    <ArrowLeft size={18} className="text-slate-600" />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-slate-400 uppercase tracking-widest">{rfi.rfiNumber}</span>
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${statusColors[rfi.status]}`}>
                            {statusLabels[rfi.status]}
                        </span>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold capitalize ${priorityBadge[rfi.priority]}`}>
                            {rfi.priority} priority
                        </span>
                        {rfi.isOverdue && (
                            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold flex items-center gap-1">
                                <Clock size={10} /> Overdue
                            </span>
                        )}
                    </div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5 truncate">{rfi.subject}</h1>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Main Content */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Description */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <h3 className="font-black text-slate-800 mb-4 pb-3 border-b border-slate-100">Description</h3>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{rfi.description}</p>
                        {rfi.location && (
                            <div className="flex items-center gap-2 mt-4 text-sm text-slate-500">
                                <MapPin size={14} className="text-slate-400" />
                                <span className="font-medium">{rfi.location}</span>
                            </div>
                        )}
                        {rfi.category && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                                <Tag size={14} className="text-slate-400" />
                                <span className="capitalize font-medium">{rfi.category}</span>
                            </div>
                        )}
                    </div>

                    {/* Official Response */}
                    {(rfi.officialResponse || isAdmin) && (
                        <div className="bg-violet-50 rounded-2xl border border-violet-100 p-6">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-black text-violet-800 flex items-center gap-2">
                                    <CheckCheck size={18} /> Official Response
                                </h3>
                                {isAdmin && !showResponseBox && (
                                    <button
                                        onClick={() => setShowResponseBox(true)}
                                        className="text-xs text-violet-600 hover:underline font-bold flex items-center gap-1"
                                    >
                                        <Edit2 size={12} /> {rfi.officialResponse ? 'Edit' : 'Add Response'}
                                    </button>
                                )}
                            </div>
                            {showResponseBox ? (
                                <div className="space-y-3">
                                    <textarea
                                        value={response}
                                        onChange={e => setResponse(e.target.value)}
                                        rows={4}
                                        placeholder="Type official response..."
                                        className="w-full bg-white border border-violet-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-400 transition resize-none"
                                    />
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => setShowResponseBox(false)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
                                        <button onClick={handleSaveResponse} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-bold hover:bg-violet-700 transition">Save & Mark Answered</button>
                                    </div>
                                </div>
                            ) : rfi.officialResponse ? (
                                <p className="text-sm text-violet-700 leading-relaxed whitespace-pre-wrap">{rfi.officialResponse}</p>
                            ) : (
                                <p className="text-sm text-violet-400 italic">No official response yet.</p>
                            )}
                        </div>
                    )}

                    {/* Attachments */}
                    {rfi.attachments?.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                            <h3 className="font-black text-slate-800 mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
                                <Paperclip size={16} className="text-slate-500" /> Attachments ({rfi.attachments.length})
                            </h3>
                            <div className="space-y-2">
                                {rfi.attachments.map((att, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <Paperclip size={14} className="text-slate-400" />
                                            <span className="text-sm font-medium text-slate-700">{att.name}</span>
                                        </div>
                                        <a href={getServerUrl(att.url)} target="_blank" rel="noreferrer" className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition">
                                            <Download size={14} />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Comments / Conversation */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                            <MessageSquare size={18} className="text-blue-500" />
                            <h3 className="font-black text-slate-800">Conversation</h3>
                            <span className="ml-1 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">{rfi.comments?.length || 0}</span>
                        </div>

                        <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
                            {rfi.comments?.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm">No comments yet. Start the conversation.</div>
                            ) : rfi.comments?.map((c, i) => (
                                <div key={i} className="p-4 hover:bg-slate-50/50 transition">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black">
                                            {c.author?.fullName?.charAt(0) || 'U'}
                                        </div>
                                        <span className="text-sm font-bold text-slate-800">{c.author?.fullName || 'Unknown'}</span>
                                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{c.author?.role}</span>
                                        <span className="text-xs text-slate-400 ml-auto">{new Date(c.createdAt).toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm text-slate-700 leading-relaxed ml-9">{c.text}</p>
                                </div>
                            ))}
                        </div>

                        {/* Comment Input */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                            <div className="flex gap-2">
                                <textarea
                                    ref={commentRef}
                                    value={comment}
                                    onChange={e => setComment(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                                    placeholder="Write a reply... (Enter to send)"
                                    rows={2}
                                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 transition resize-none"
                                />
                                <button
                                    onClick={handleAddComment}
                                    disabled={submittingComment || !comment.trim()}
                                    className="px-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center"
                                >
                                    {submittingComment ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Meta + Actions */}
                <div className="space-y-5">
                    {/* Info Card */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                        <h3 className="font-black text-slate-800 pb-3 border-b border-slate-100">RFI Information</h3>
                        {[
                            { label: 'Project', value: rfi.projectId?.name },
                            { label: 'Raised By', value: rfi.raisedBy?.fullName, sub: rfi.raisedBy?.role },
                            { label: 'Assigned To', value: rfi.assignedTo?.fullName, sub: rfi.assignedTo?.role, fallback: 'Unassigned' },
                            { label: 'Due Date', value: rfi.dueDate ? new Date(rfi.dueDate).toLocaleDateString() : null, fallback: 'Not set', warn: rfi.isOverdue },
                            { label: 'Created', value: new Date(rfi.createdAt).toLocaleDateString() },
                            { label: 'Last Updated', value: new Date(rfi.updatedAt).toLocaleDateString() },
                        ].map(item => (
                            <div key={item.label}>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                                <p className={`text-sm font-bold mt-0.5 ${item.warn ? 'text-red-500' : 'text-slate-800'}`}>
                                    {item.value || <span className="text-slate-400 font-normal">{item.fallback || '—'}</span>}
                                </p>
                                {item.sub && <p className="text-xs text-slate-400">{item.sub}</p>}
                            </div>
                        ))}
                    </div>

                    {/* Admin Actions */}
                    {isAdmin && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
                            <h3 className="font-black text-slate-800 pb-3 border-b border-slate-100">Actions</h3>

                            {/* Change Status */}
                            <div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Change Status</p>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {statusFlow.map(s => (
                                        <button
                                            key={s}
                                            onClick={() => handleStatusChange(s)}
                                            disabled={rfi.status === s || statusChanging}
                                            className={`text-xs py-2 px-2 rounded-lg font-bold border transition ${rfi.status === s
                                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-default'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                                                }`}
                                        >
                                            {statusChanging && rfi.status !== s ? <Loader size={10} className="animate-spin mx-auto" /> : statusLabels[s]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Add Response */}
                            <button
                                onClick={() => setShowResponseBox(true)}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-xl text-sm font-bold hover:bg-violet-100 transition"
                            >
                                <CheckCheck size={16} /> Add / Edit Response
                            </button>

                            {/* Reassign */}
                            {showReassign ? (
                                <div className="space-y-2">
                                    <select
                                        value={reassignTo}
                                        onChange={e => setReassignTo(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                                    >
                                        <option value="">Select User...</option>
                                        {users.map(u => <option key={u._id} value={u._id}>{u.fullName} ({u.role})</option>)}
                                    </select>
                                    <div className="flex gap-2">
                                        <button onClick={() => setShowReassign(false)} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition">Cancel</button>
                                        <button onClick={handleReassign} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition">Confirm</button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowReassign(true)}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-bold hover:bg-blue-100 transition"
                                >
                                    <User size={16} /> Reassign RFI
                                </button>
                            )}

                            {/* Close RFI */}
                            {rfi.status !== 'closed' && (
                                <button
                                    onClick={handleClose}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-100 transition"
                                >
                                    <XCircle size={16} /> Close RFI
                                </button>
                            )}

                            {/* Delete RFI */}
                            <button
                                onClick={handleDelete}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white border border-red-600 rounded-xl text-sm font-bold hover:bg-red-700 transition shadow-lg shadow-red-200"
                            >
                                <Trash2 size={16} /> Delete RFI Permanently
                            </button>
                        </div>
                    )}
                </div>
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
                            disabled={statusChanging}
                            className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl transition shadow-lg shadow-emerald-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {statusChanging ? <Loader size={16} className="animate-spin" /> : "Close RFI"}
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

export default RFIDetail;
