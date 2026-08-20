import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
    Users, Plus, Search, Filter, Mail, Phone, MoreVertical,
    Trash2, Edit2, CheckCircle, XCircle, Loader, Save, X, Eye,
    FileText, Paperclip, ExternalLink, Briefcase, ShieldCheck
} from 'lucide-react';
import api, { getServerUrl } from '../../utils/api';
import emailjs from '@emailjs/browser';

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

const TradeManagement = () => {
    const { user } = useAuth();
    const [trades, setTrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBidModalOpen, setIsBidModalOpen] = useState(false);
    const [isDeleteBidModalOpen, setIsDeleteBidModalOpen] = useState(false);
    const [isDeleteTradeModalOpen, setIsDeleteTradeModalOpen] = useState(false);
    const [bidToDelete, setBidToDelete] = useState(null);
    const [tradeToDelete, setTradeToDelete] = useState(null);
    const [bids, setBids] = useState([]);
    const [view, setView] = useState('trades'); // 'trades' or 'bids'
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewTrade, setViewTrade] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        category: 'Flooring',
        customCategory: '',
        contactPerson: '',
        email: '',
        phone: '',
        status: 'active'
    });
    const [taskAttachments, setTaskAttachments] = useState([]); // Pending new attachments

    const [filters, setFilters] = useState({
        category: 'All Categories',
        status: 'All Status',
        search: ''
    });

    const [editingId, setEditingId] = useState(null);

    const categories = ['Flooring', 'Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Other'];

    const fetchTrades = async () => {
        try {
            setLoading(true);
            const res = await api.get('/vendors');
            setTrades(res.data);
        } catch (err) {
            console.error('Error fetching trades:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBids = async () => {
        try {
            const res = await api.get('/vendors/bids');
            setBids(res.data);
        } catch (err) {
            console.error('Error fetching bids:', err);
        }
    };

    useEffect(() => {
        fetchTrades();
        fetchBids();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const data = new FormData();

            // Map form data to FormData
            Object.keys(formData).forEach(key => {
                if (key === 'category' && formData.category === 'Other' && formData.customCategory) {
                    data.append('category', formData.customCategory);
                } else {
                    data.append(key, formData[key]);
                }
            });

            // Append files
            taskAttachments.forEach(file => {
                data.append('files', file);
            });

            if (editingId) {
                await api.patch(`/vendors/${editingId}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await api.post('/vendors', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            setIsModalOpen(false);
            setEditingId(null);
            setTaskAttachments([]);
            setFormData({
                name: '', category: 'Flooring', customCategory: '',
                contactPerson: '', email: '', phone: '', status: 'active'
            });
            fetchTrades();
        } catch (err) {
            console.error('Error saving trade:', err);
            alert('Error saving trade.');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (trade) => {
        setEditingId(trade._id);
        setFormData({
            name: trade.name,
            category: categories.includes(trade.category) ? trade.category : 'Other',
            customCategory: categories.includes(trade.category) ? '' : trade.category,
            contactPerson: trade.contactPerson || '',
            email: trade.email || '',
            phone: trade.phone || '',
            status: trade.status || 'active'
        });
        setIsModalOpen(true);
    };

    const handleView = (trade) => {
        setViewTrade(trade);
        setIsViewModalOpen(true);
    };

    const handleDelete = (id) => {
        setTradeToDelete(id);
        setIsDeleteTradeModalOpen(true);
    };

    const confirmDeleteTrade = async () => {
        try {
            await api.delete(`/vendors/${tradeToDelete}`);
            fetchTrades();
            setIsDeleteTradeModalOpen(false);
            setTradeToDelete(null);
        } catch (err) {
            console.error('Error deleting trade:', err);
            alert('Error deleting trade.');
        }
    };

    const handleDeleteBid = (id) => {
        setBidToDelete(id);
        setIsDeleteBidModalOpen(true);
    };

    const confirmDeleteBid = async () => {
        try {
            await api.delete(`/vendors/bids/${bidToDelete}`);
            setBids(bids.filter(b => b._id !== bidToDelete));
            setIsDeleteBidModalOpen(false);
            setBidToDelete(null);
        } catch (err) {
            console.error('Error deleting bid:', err);
            alert('Error deleting bid.');
        }
    };

    const handleUpdateBidStatus = async (id, status) => {
        try {
            const bidToUpdate = bids.find(b => b._id === id);
            await api.patch(`/vendors/bids/${id}`, { status });

            // EmailJS Notification
            if (bidToUpdate && bidToUpdate.vendorId?.email) {
                const fetchedCompany = bidToUpdate?.companyId || user?.companyId;
                const publicLogoUrl = (typeof fetchedCompany === 'object' && fetchedCompany?.logo)
                    ? getServerUrl(fetchedCompany.logo)
                    : "https://img.icons8.com/color/96/ring.png";

                const templateParams = {
                    to_email: bidToUpdate.vendorId.email,
                    email: bidToUpdate.vendorId.email,
                    trade_name: bidToUpdate.vendorId.name,
                    name: bidToUpdate.vendorId.name,
                    to_name: bidToUpdate.vendorId.name,
                    drawing_title: bidToUpdate.drawingId?.title || 'Construction Drawing',
                    title: bidToUpdate.drawingId?.title || 'Construction Drawing',
                    logoUrl: publicLogoUrl,
                    status: status.toUpperCase(),
                    message: status === 'Approved'
                        ? 'Congratulations! Your bid has been approved. We will be in touch shortly with contract details.'
                        : 'Thank you for your interest. Unfortunately, your bid was not selected for this project.'
                };

                try {
                    // Using your existing credentials
                    await emailjs.send(
                        'service_nwnykea',
                        'template_zfy7qdu',
                        templateParams,
                        'Vr5-H0-BgfNboKu2q'
                    );
                    alert(`Bid ${status.toLowerCase()}! Email sent to ${bidToUpdate.vendorId.name} successfully.`);
                } catch (emailErr) {
                    console.error('EmailJS Error:', emailErr);
                    alert(`Bid ${status.toLowerCase()} but failed to send email. Check console for EmailJS error.`);
                }
            } else {
                alert(`Bid ${status.toLowerCase()} successfully, but trade email is missing. No email sent.`);
            }

            fetchBids();
        } catch (err) {
            console.error('Error updating bid status:', err);
            alert('Error updating bid status.');
        }
    };

    const filteredTrades = trades.filter(trade => {
        const matchesCategory = filters.category === 'All Categories' || trade.category === filters.category;
        const matchesStatus = filters.status === 'All Status' || trade.status === filters.status.toLowerCase();
        const matchesSearch = trade.name.toLowerCase().includes(filters.search.toLowerCase());
        return matchesCategory && matchesStatus && matchesSearch;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Trade Management</h1>
                    <p className="text-slate-500 text-sm">Manage subcontractors and specialized trades.</p>
                </div>
                <div className="flex gap-2">
                    {['COMPANY_OWNER', 'PM', 'FOREMAN'].includes(user?.role) && (
                        <>
                            {['COMPANY_OWNER', 'PM', 'FOREMAN'].includes(user?.role) && (
                                <button
                                    onClick={() => setView(view === 'trades' ? 'bids' : 'trades')}
                                    className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 border shadow-sm
                        ${view === 'bids' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    {view === 'trades' ? 'View Bids Received' : 'View Trade List'}
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setEditingId(null);
                                    setFormData({ name: '', category: 'Flooring', customCategory: '', contactPerson: '', email: '', phone: '', status: 'active' });
                                    setIsModalOpen(true);
                                }}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center gap-2 transition"
                            >
                                <Plus size={18} /> Add Trade
                            </button>
                        </>
                    )}
                </div>
            </div>

            {view === 'trades' ? (
                <>
                    {/* Filters */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search trades..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            />
                        </div>
                        <select
                            value={filters.category}
                            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                            className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
                        >
                            <option>All Categories</option>
                            {categories.map(c => <option key={c}>{c}</option>)}
                        </select>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
                        >
                            <option>All Status</option>
                            <option>Active</option>
                            <option>Inactive</option>
                        </select>
                    </div>

                    {/* Trade Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                                    <tr>
                                        <th className="px-6 py-4">Trade Name</th>
                                        <th className="px-6 py-4">Category</th>
                                        <th className="px-6 py-4">Contact</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center">
                                                <Loader className="animate-spin text-blue-600 mx-auto" />
                                            </td>
                                        </tr>
                                    ) : filteredTrades.length > 0 ? (
                                        filteredTrades.map((trade) => (
                                            <tr key={trade._id} className="hover:bg-slate-50 transition group">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-800">{trade.name}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold uppercase tracking-tight">
                                                        {trade.category}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-slate-800 font-medium">{trade.contactPerson || 'N/A'}</div>
                                                    <div className="text-xs text-slate-500 flex flex-col mt-1">
                                                        {trade.email && <span className="flex items-center gap-1"><Mail size={12} /> {trade.email}</span>}
                                                        {trade.phone && <span className="flex items-center gap-1 mt-0.5"><Phone size={12} /> {trade.phone}</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1
                            ${trade.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                        {trade.status}
                                                    </span>
                                                </td>
                                                 <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => handleView(trade)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="View Details">
                                                            <Eye size={16} />
                                                        </button>
                                                        {['COMPANY_OWNER', 'PM', 'FOREMAN'].includes(user?.role) && (
                                                            <>
                                                                <button onClick={() => handleEdit(trade)} className="p-2 text-slate-500 hover:bg-blue-50 rounded-lg transition">
                                                                    <Edit2 size={16} />
                                                                </button>
                                                                <button onClick={() => handleDelete(trade._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-8 text-center text-slate-400 font-medium">No trades found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                /* Bids View */
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Trade Name</th>
                                    <th className="px-6 py-4">Project / Drawing</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Attachments</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {bids.length > 0 ? (
                                    bids.map((bid) => (
                                        <tr key={bid._id} className="hover:bg-slate-50 transition">
                                            <td className="px-6 py-4 font-bold text-slate-800">
                                                {bid.vendorId?.name || bid.vendorName || `ID: ${bid.vendorId?._id?.slice(-6) || 'Unknown'}`}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-slate-800 font-medium">{bid.drawingId?.title || 'Unknown'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-emerald-600 font-black">${bid.bidAmount.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {bid.attachments && bid.attachments.map((file, idx) => (
                                                        <a
                                                            key={idx}
                                                            href={getServerUrl(file.url)}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="p-1 px-2 bg-blue-50 text-blue-600 rounded border border-blue-100 flex items-center gap-1 text-[10px] font-bold hover:bg-blue-100 transition"
                                                            title={file.name}
                                                        >
                                                            <Paperclip size={10} /> {file.name.slice(0, 10)}...
                                                        </a>
                                                    ))}
                                                    {(!bid.attachments || bid.attachments.length === 0) && <span className="text-slate-300 italic text-xs">No files</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">{new Date(bid.createdAt).toLocaleDateString()}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase
                          ${bid.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                                                        bid.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {bid.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {bid.status === 'Pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleUpdateBidStatus(bid._id, 'Approved')}
                                                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title="Approve">
                                                                <CheckCircle size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdateBidStatus(bid._id, 'Rejected')}
                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Reject">
                                                                <XCircle size={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteBid(bid._id)}
                                                        className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition"
                                                        title="Delete Bid"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-medium">No bids received yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? "Edit Trade" : "Add New Trade"}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Trade Name</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. KAAL Plumbing Solutions"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition"
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    {formData.category === 'Other' && (
                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Manual Category</label>
                            <input
                                type="text"
                                required
                                value={formData.customCategory}
                                onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                                placeholder="Enter custom trade type..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Contact Person</label>
                        <input
                            type="text"
                            value={formData.contactPerson}
                            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                            placeholder="Name of primary contact"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="trade@example.com"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Phone</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+1"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:border-blue-500 outline-none transition"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 flex justify-between">
                            Attachments <span>(Insurance, License, etc.)</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {/* Existing Files if editing */}
                            {editingId && trades.find(t => t._id === editingId)?.attachments?.map((file, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                                    <FileText size={14} className="text-blue-500" />
                                    <span className="font-bold text-slate-600 truncate max-w-[100px]">{file.name}</span>
                                    <a href={getServerUrl(file.url)} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700">
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            ))}

                            {/* Pending uploads */}
                            {taskAttachments.map((file, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200 text-xs">
                                    <FileText size={14} className="text-blue-600" />
                                    <span className="font-bold text-blue-700 truncate max-w-[100px]">{file.name}</span>
                                    <button type="button" onClick={() => setTaskAttachments(prev => prev.filter((_, i) => i !== idx))} className="text-red-500">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}

                            <label className="cursor-pointer">
                                <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => setTaskAttachments([...taskAttachments, ...Array.from(e.target.files)])}
                                />
                                <div className="p-2 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center gap-2 text-xs font-bold">
                                    <Plus size={14} /> Add Files
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-slate-200 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                        >
                            <Save size={18} /> {editingId ? "Update Trade" : "Save Trade"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Bid Confirmation Modal */}
            <Modal isOpen={isDeleteBidModalOpen} onClose={() => setIsDeleteBidModalOpen(false)} title="Delete Bid">
                <div className="text-center space-y-4">
                    <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                        <Trash2 className="text-red-600" size={32} />
                    </div>
                    <div>
                        <p className="font-bold text-slate-800">Delete this bid?</p>
                        <p className="text-sm text-slate-500 mt-1">
                            This will permanently remove this bid from the records.
                            This action cannot be undone.
                        </p>
                    </div>
                    <div className="flex justify-center gap-3 pt-2">
                        <button
                            onClick={() => setIsDeleteBidModalOpen(false)}
                            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDeleteBid}
                            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition font-medium shadow-lg shadow-red-200"
                        >
                            Confirm Delete
                        </button>
                    </div>
                </div>
            </Modal>
            {/* View Trade Modal */}
            <Modal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                title="Trade Partner Details"
            >
                {viewTrade && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-100 shrink-0">
                                <Briefcase size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 leading-tight">{viewTrade.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase tracking-widest border border-slate-200">
                                        {viewTrade.category}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border
                                        ${viewTrade.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                        {viewTrade.status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Users size={12} className="text-blue-500" /> Primary Contact
                                </p>
                                <p className="text-sm font-black text-slate-800">{viewTrade.contactPerson || 'No contact person'}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Phone size={12} className="text-emerald-500" /> Phone Number
                                </p>
                                <p className="text-sm font-black text-slate-800">{viewTrade.phone || 'No phone provided'}</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Mail size={12} className="text-blue-500" /> Email Address
                            </p>
                            <p className="text-sm font-black text-slate-800">{viewTrade.email || 'No email provided'}</p>
                        </div>

                        <div className="space-y-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <ShieldCheck size={14} className="text-blue-600" /> Compliance & Documents
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {viewTrade.attachments && viewTrade.attachments.length > 0 ? (
                                    viewTrade.attachments.map((file, idx) => (
                                        <a
                                            key={idx}
                                            href={getServerUrl(file.url)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all group w-full sm:w-auto min-w-[200px]"
                                        >
                                            <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                <FileText size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-black text-slate-800 truncate">{file.name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">View Document</p>
                                            </div>
                                            <ExternalLink size={12} className="text-slate-300 group-hover:text-blue-600" />
                                        </a>
                                    ))
                                ) : (
                                    <div className="w-full py-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-2">
                                        <ShieldCheck size={24} className="opacity-20" />
                                        <p className="text-[10px] font-black uppercase tracking-tighter">No compliance documents uploaded</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => setIsViewModalOpen(false)}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl"
                        >
                            Close View
                        </button>
                    </div>
                )}
            </Modal>

            {/* Delete Trade Confirmation Modal */}
            <Modal isOpen={isDeleteTradeModalOpen} onClose={() => setIsDeleteTradeModalOpen(false)} title="Delete Trade Partner">
                <div className="text-center space-y-4">
                    <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                        <Trash2 className="text-red-600" size={32} />
                    </div>
                    <div>
                        <p className="font-bold text-slate-800 text-lg">Delete this trade partner?</p>
                        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                            This will permanently remove the trade partner and all their associated records.
                            This action cannot be undone.
                        </p>
                    </div>
                    <div className="flex justify-center gap-3 pt-4 border-t border-slate-50 mt-4">
                        <button
                            onClick={() => setIsDeleteTradeModalOpen(false)}
                            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition font-bold uppercase text-[10px] tracking-widest"
                        >
                            No, Cancel
                        </button>
                        <button
                            onClick={confirmDeleteTrade}
                            className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 transition font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-red-100"
                        >
                            Yes, Delete
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default TradeManagement;
