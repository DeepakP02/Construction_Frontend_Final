import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    Wrench, Plus, Search, Filter, AlertTriangle, CheckCircle,
    Clock, MoreHorizontal, Trash2, Edit, Eye, Download,
    TrendingUp, Activity, MapPin, Calendar, Hash, X, Save,
    Fuel, Settings, Shield, ArrowUpRight, BarChart2, Zap, LayoutGrid, List,
    Hammer, Box, RotateCcw, Link2, AlertCircle, Camera, ImageIcon, Briefcase,
    History, FileText, Printer, DollarSign, Check
} from 'lucide-react';
import api, { getServerUrl } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../../assets/images/Logo.png';

// ─── Stat Card ───────────────────────────────────────────────────────────────
const StatCard = ({ title, value, sub, icon: Icon, color, trend }) => (
    <div className="bg-white p-3.5 md:p-4 rounded-xl md:rounded-2xl shadow-sm border border-slate-200/60 flex items-center gap-4 hover:shadow-md transition-all duration-300 group">
        <div className={`p-2.5 rounded-lg md:rounded-xl ${color} shadow-sm group-hover:scale-105 transition-transform duration-300`}>
            <Icon size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[9px] md:text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1">{title}</p>
            <p className="text-xl md:text-2xl font-black text-slate-900 leading-none tracking-tighter">{value}</p>
            {sub && <p className="text-[11px] font-bold text-slate-400 mt-0.5 leading-none">{sub}</p>}
        </div>
        {trend && (
            <div className="flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600">
                <ArrowUpRight size={12} />{trend}
            </div>
        )}
    </div>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const map = {
        operational: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        maintenance: 'bg-orange-50  text-orange-700  border-orange-100',
        idle: 'bg-slate-50   text-slate-600   border-slate-200',
        out_of_service: 'bg-red-50  text-red-700     border-red-100',
    };
    const labels = {
        operational: 'Operational',
        maintenance: 'Maintenance',
        idle: 'Idle',
        out_of_service: 'Out of Service',
    };
    return (
        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border shadow-sm ${map[status] || map.idle}`}>
            {labels[status] || status}
        </span>
    );
};

// ─── Equipment Card (Grid View) ───────────────────────────────────────────────
const EquipmentCard = ({ item, onEdit, onDelete, onAssign, onReturn, onViewHistory, userRole }) => {
    const isJobCompleted = item.assignedJob?.status === 'completed';
    const isSmallTool = item.category === 'Small Tools';
    const canManage = ['SUPER_ADMIN', 'COMPANY_OWNER', 'PM', 'FOREMAN'].includes(userRole);

    const icons = {
        excavator: '🚜', crane: '🏗️', truck: '🚛', bulldozer: '🚧', generator: '⚡', compactor: '🔩',
        'power drill': '🔌', ladder: '🪜', scaffolding: '🪜', 'power tool': '⚙️'
    };
    const emoji = icons[item.type?.toLowerCase()] || (isSmallTool ? '🛠️' : '🚜');

    return (
        <div className={`bg-white rounded-xl md:rounded-2xl shadow-sm border ${isJobCompleted ? 'border-red-200 bg-red-50/10' : 'border-slate-200/60'} overflow-hidden hover:shadow-xl hover:shadow-slate-100 transition-all duration-300 group`}>
            {/* Card Header */}
            <div className={`relative h-28 flex items-center justify-center overflow-hidden ${!item.imageUrl ? (isSmallTool ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-slate-800 to-slate-900') : ''}`}>
                {item.imageUrl ? (
                    <img
                        src={getServerUrl(item.imageUrl)}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <span className="text-5xl group-hover:scale-110 transition-transform duration-300">{emoji}</span>
                )}
                {isJobCompleted && (
                    <div className="absolute top-4 left-4 flex items-center gap-1 bg-red-600 text-white px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest animate-pulse shadow-lg">
                        <AlertCircle size={12} /> Job Finished
                    </div>
                )}
                <div className="absolute bottom-4 right-4">
                    <StatusBadge status={item.status} />
                </div>
            </div>

            {/* Card Body */}
            <div className="p-3.5 md:p-4">
                <div className="flex justify-between items-start mb-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-black text-slate-900 tracking-tight truncate max-w-[140px]">{item.name}</h3>
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${isSmallTool ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                                {item.category === 'Small Tools' ? 'Tool' : 'Heavy'}
                            </span>
                        </div>
                        <p className="text-xs font-bold text-slate-400 mt-0.5 uppercase tracking-tight">{item.type} · #{item.serialNumber || 'SN-NA'}</p>
                    </div>
                    {canManage && (
                        <div className="flex gap-1">
                            <button onClick={() => onEdit(item)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit size={14} /></button>
                            <button onClick={() => onDelete(item)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                        </div>
                    )}
                </div>

                <div className="space-y-2 py-3 border-y border-slate-50 mb-3 text-[10px]">
                    <div className="flex items-center gap-2 text-slate-500 font-bold">
                        <MapPin size={12} className="text-slate-400" />
                        <span className="uppercase tracking-widest truncate">{item.location || 'Warehouse'}</span>
                    </div>
                    {item.assignedJob && (
                        <div className="flex items-center gap-2 text-blue-600 font-bold">
                            <Briefcase size={12} className="text-blue-400" />
                            <span className="uppercase tracking-widest truncate">{item.assignedJob?.projectId?.name}</span>
                        </div>
                    )}
                </div>

                <div className="space-y-2 py-3 border-b border-slate-50 mb-3">
                    {item.assignedJob ? (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Job</span>
                                <button
                                    onClick={() => onReturn(item._id)}
                                    className="text-[9px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-700 flex items-center gap-1"
                                >
                                    <RotateCcw size={10} /> Return
                                </button>
                            </div>
                            <div className={`p-3 rounded-xl border ${isJobCompleted ? 'bg-red-50 border-red-100' : 'bg-blue-50/50 border-blue-100'}`}>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Briefcase size={12} className={isJobCompleted ? 'text-red-500' : 'text-blue-500'} />
                                        <span className={`text-[9px] font-black uppercase tracking-widest text-opacity-60 ${isJobCompleted ? 'text-red-400' : 'text-blue-400'}`}>Job:</span>
                                        <span className={`text-xs font-black truncate ${isJobCompleted ? 'text-red-700' : 'text-blue-700'}`}>
                                            {item.assignedJob?.name}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 py-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Equipment is Idle</p>
                            {canManage && (
                                <button
                                    onClick={() => onAssign(item)}
                                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm"
                                >
                                    <Link2 size={12} /> Assign to Job
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex flex-col">
                        <span className="text-[8px] text-slate-400">Hourly Rate</span>
                        <span className="text-slate-900 font-black">${(item.costPerHour || 0).toLocaleString()}/hr</span>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-[8px] text-slate-400">Last Used</span>
                        <span className="text-slate-900">{item.assignedDate ? new Date(item.assignedDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                </div>

                {/* View History Button */}
                <button
                    onClick={() => onViewHistory(item)}
                    className="mt-3 w-full py-2 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-500 hover:text-blue-600 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all"
                >
                    <History size={12} /> View History
                </button>
            </div>
        </div>
    );
};

// ─── Equipment Table (List View) ────────────────────────────────────────────────
const EquipmentTable = ({ items, onEdit, onDelete, onAssign, onReturn, onViewHistory, userRole }) => {
    const canManage = ['SUPER_ADMIN', 'COMPANY_OWNER', 'PM', 'FOREMAN'].includes(userRole);

    return (
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 overflow-hidden overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <th className="px-6 py-4">Equipment</th>
                        <th className="px-6 py-4">Asset ID / Type</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Rate</th>
                        <th className="px-6 py-4">Location</th>
                        <th className="px-6 py-4">Assigned Job</th>
                        <th className="px-6 py-4">Last Maint.</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {items.map(item => (
                        <tr key={item._id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl overflow-hidden">
                                        {item.imageUrl ? (
                                            <img src={getServerUrl(item.imageUrl)} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            item.category === 'Small Tools' ? '🛠️' : '🚜'
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 text-sm tracking-tight">{item.name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{item.type}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <p className="text-xs font-black text-slate-700">#{item.serialNumber || 'SN-NA'}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">{item.type}</p>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${item.category === 'Small Tools' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                    {item.category === 'Small Tools' ? 'Tool' : 'Heavy'}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <StatusBadge status={item.status} />
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5 text-xs font-black text-blue-600">
                                    <DollarSign size={13} className="text-blue-400" />
                                    ${(item.costPerHour || 0).toLocaleString()}/h
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                    <MapPin size={12} className="text-slate-400" />
                                    {item.location || 'Warehouse'}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                {item.assignedJob ? (
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-black text-blue-600 uppercase truncate max-w-[120px]">{item.assignedJob?.name}</p>
                                        <p className="text-[9px] font-bold text-slate-400 truncate max-w-[120px]">{item.assignedJob?.projectId?.name}</p>
                                    </div>
                                ) : (
                                    <span className="text-[10px] font-bold text-slate-300 uppercase">Idle</span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-xs font-bold text-slate-600">
                                {item.lastServiceDate ? new Date(item.lastServiceDate).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-1">
                                    <button onClick={() => onViewHistory(item)} title="View History" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition"><History size={15} /></button>
                                    {canManage && (
                                        <>
                                            {item.assignedJob ? (
                                                <button onClick={() => onReturn(item._id)} title="Return" className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition"><RotateCcw size={15} /></button>
                                            ) : (
                                                <button onClick={() => onAssign(item)} title="Assign" className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition"><Link2 size={15} /></button>
                                            )}
                                            <button onClick={() => onEdit(item)} title="Edit" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition"><Edit size={15} /></button>
                                            <button onClick={() => onDelete(item)} title="Delete" className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"><Trash2 size={15} /></button>
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
const EMPTY_FORM = {
    name: '',
    category: 'Heavy Equipment',
    type: 'Excavator',
    status: 'operational',
    serialNumber: '',
    location: 'Warehouse',
    notes: '',
    imageUrl: '',
    costPerHour: 0
};

const Equipment = () => {
    const [equipment, setEquipment] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [assignTarget, setAssignTarget] = useState(null);
    const [selectedJobId, setSelectedJobId] = useState('');
    const [form, setForm] = useState(EMPTY_FORM);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [imageUploading, setImageUploading] = useState(false);
    const fileInputRef = useRef(null);
    const [historyItem, setHistoryItem] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    // Overall full history
    const [showAllHistory, setShowAllHistory] = useState(false);
    const [allHistory, setAllHistory] = useState([]);
    const [allHistoryLoading, setAllHistoryLoading] = useState(false);
    const [allHistoryDateFrom, setAllHistoryDateFrom] = useState('');
    const [allHistoryDateTo, setAllHistoryDateTo] = useState('');
    const [allHistorySearch, setAllHistorySearch] = useState('');

    const { user } = useAuth();

    // New State for View Toggle and Sorting
    const [viewMode, setViewMode] = useState(() => localStorage.getItem('equipmentViewMode') || 'list');
    const [sortBy, setSortBy] = useState('name'); // 'name' | 'status' | 'date'
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        localStorage.setItem('equipmentViewMode', viewMode);
    }, [viewMode]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [eqRes, jobRes] = await Promise.all([
                api.get('/equipment'),
                api.get('/jobs')
            ]);
            setEquipment(eqRes.data || []);
            setJobs(jobRes.data || []);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async () => {
        try {
            let savedItem;
            if (editingItem) {
                const res = await api.patch(`/equipment/${editingItem._id}`, form);
                savedItem = res.data;
                setEquipment(prev => prev.map(e => e._id === editingItem._id ? savedItem : e));
            } else {
                const res = await api.post('/equipment', form);
                savedItem = res.data;
                setEquipment(prev => [...prev, savedItem]);
            }

            // Upload image if a file was selected
            if (imageFile && savedItem?._id) {
                setImageUploading(true);
                const fd = new FormData();
                fd.append('image', imageFile);
                const imgRes = await api.post(`/equipment/${savedItem._id}/upload-image`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                // Update the item with the returned imageUrl
                setEquipment(prev => prev.map(e =>
                    e._id === savedItem._id ? { ...e, imageUrl: imgRes.data.imageUrl } : e
                ));
            }

            setIsModalOpen(false);
            setImageFile(null);
            setImagePreview('');
        } catch (err) {
            console.error(err);
        } finally {
            setImageUploading(false);
        }
    };

    const handleDelete = item => {
        setItemToDelete(item);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await api.delete(`/equipment/${itemToDelete._id}`);
            setEquipment(prev => prev.filter(e => e._id !== itemToDelete._id));
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
        } catch (err) {
            console.error('Delete error:', err);
            alert('Failed to delete equipment');
        }
    };

    const handleAssign = async () => {
        if (!selectedJobId || !assignTarget) return;
        try {
            const res = await api.post(`/equipment/${assignTarget._id}/assign`, { jobId: selectedJobId });
            setEquipment(prev => prev.map(e => e._id === assignTarget._id ? res.data : e));
            setIsAssignModalOpen(false);
            setAssignTarget(null);
            setSelectedJobId('');
        } catch (err) { }
    };

    const handleReturn = async id => {
        if (!window.confirm('Mark this equipment as returned?')) return;
        try {
            const res = await api.post(`/equipment/${id}/return`);
            setEquipment(prev => prev.map(e => e._id === id ? res.data : e));
        } catch (err) { }
    };

    const openCreate = () => {
        setEditingItem(null);
        setForm(EMPTY_FORM);
        setImageFile(null);
        setImagePreview('');
        setIsModalOpen(true);
    };
    const openEdit = item => {
        setEditingItem(item);
        setForm({ ...item, assignedJob: item.assignedJob?._id });
        setImageFile(null);
        setImagePreview(item.imageUrl ? getServerUrl(item.imageUrl) : '');
        setIsModalOpen(true);
    };

    const handleImageFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };
    const openAssign = item => { setAssignTarget(item); setIsAssignModalOpen(true); };

    const openHistory = async (item) => {
        setHistoryItem(item);
        setHistoryLoading(true);
        try {
            const res = await api.get(`/equipment/${item._id}/history`);
            setHistoryData(res.data.history || []);
        } catch (e) {
            setHistoryData([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const downloadHistoryPDF = () => {
        if (!historyItem) return;
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;

            // 1. Header Section
            // Company Logo
            const img = new Image();
            img.src = logo;
            doc.addImage(img, 'PNG', 20, 15, 20, 20);

            // Company Info (Left)
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            doc.text('Kaal Construction Ltd', 20, 42);

            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text('Equipment History Report', pageWidth - 20, 25, { align: 'right' });

            const now = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            doc.text(`Generated on ${now}`, pageWidth - 20, 32, { align: 'right' });

            doc.setDrawColor(30, 58, 95);
            doc.setLineWidth(1);
            doc.line(20, 50, pageWidth - 20, 50);

            // 2. Equipment Details Info
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(148, 163, 184);
            doc.text('EQUIPMENT DETAILS', 20, 60);

            const metaY = 68;
            autoTable(doc, {
                startY: metaY,
                body: [
                    ['Asset Name:', historyItem.name, 'Type:', historyItem.type],
                    ['Category:', historyItem.category, 'Serial Number:', historyItem.serialNumber || 'N/A']
                ],
                theme: 'plain',
                styles: { fontSize: 10, cellPadding: 2 },
                columnStyles: {
                    0: { fontStyle: 'bold', textColor: [100, 116, 139], cellWidth: 30 },
                    1: { fontStyle: 'bold', textColor: [15, 23, 42], cellWidth: 60 },
                    2: { fontStyle: 'bold', textColor: [100, 116, 139], cellWidth: 30 },
                    3: { fontStyle: 'bold', textColor: [15, 23, 42] }
                }
            });

            // 3. Table Section
            const finalY = doc.lastAutoTable.finalY + 10;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(148, 163, 184);
            doc.text(`ASSIGNMENT RECORDS (${historyData.length})`, 20, finalY);

            const tableColumn = ["#", "PROJECT", "JOB", "ASSIGNED DATE", "RETURNED DATE", "DURATION", "NOTES"];
            const tableRows = historyData.map((h, i) => {
                const days = h.returnedDate && h.assignedDate ? Math.ceil((new Date(h.returnedDate) - new Date(h.assignedDate)) / 86400000) : null;
                return [
                    i + 1,
                    h.projectName || '—',
                    h.jobName || '—',
                    h.assignedDate ? new Date(h.assignedDate).toLocaleDateString('en-GB') : '—',
                    h.returnedDate ? new Date(h.returnedDate).toLocaleDateString('en-GB') : 'Active',
                    days !== null ? `${days} days` : '—',
                    h.notes || '—'
                ];
            });

            autoTable(doc, {
                startY: finalY + 5,
                head: [tableColumn],
                body: tableRows,
                theme: 'grid',
                headStyles: {
                    fillColor: [30, 58, 95],
                    textColor: [255, 255, 255],
                    fontSize: 8,
                    fontStyle: 'bold'
                },
                styles: { fontSize: 9, cellPadding: 4 },
                alternateRowStyles: { fillColor: [248, 250, 252] }
            });

            // 4. Footer
            const pageHeight = doc.internal.pageSize.height;
            doc.setFontSize(9);
            doc.setTextColor(148, 163, 184);
            doc.text('KAAL Construction Management System - Confidential Document', pageWidth / 2, pageHeight - 15, { align: 'center' });
            doc.text(`Page 1 of 1`, pageWidth - 20, pageHeight - 15, { align: 'right' });

            doc.save(`History_${historyItem.name.replace(/\s+/g, '_')}.pdf`);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            alert('Failed to generate PDF.');
        }
    };

    const filtered = useMemo(() => {
        let result = equipment.filter(e => {
            const matchSearch = e.name?.toLowerCase().includes(search.toLowerCase()) ||
                e.type?.toLowerCase().includes(search.toLowerCase()) ||
                e.serialNumber?.toLowerCase().includes(search.toLowerCase());
            const matchCat = categoryFilter === 'all' || e.category === categoryFilter;
            const matchStatus = statusFilter === 'all' || e.status === statusFilter;
            return matchSearch && matchCat && matchStatus;
        });

        // Apply Sorting
        result.sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'status') return a.status.localeCompare(b.status);
            if (sortBy === 'date') {
                const dateA = a.lastServiceDate ? new Date(a.lastServiceDate) : new Date(0);
                const dateB = b.lastServiceDate ? new Date(b.lastServiceDate) : new Date(0);
                return dateB - dateA; // Newest first
            }
            return 0;
        });

        return result;
    }, [equipment, search, categoryFilter, statusFilter, sortBy]);

    const counts = {
        heavy: equipment.filter(e => e.category === 'Heavy Equipment').length,
        tools: equipment.filter(e => e.category === 'Small Tools').length,
        assigned: equipment.filter(e => e.assignedJob).length,
        alerts: equipment.filter(e => e.assignedJob?.status === 'completed').length
    };

    const categories = ['Heavy Equipment', 'Small Tools'];
    const types = form.category === 'Heavy Equipment'
        ? ['Excavator', 'Crane', 'Truck', 'Bulldozer', 'Generator', 'Compactor', 'Other']
        : ['Power Drill', 'Circular Saw', 'Scaffolding', 'Ladder', 'Concrete Mixer', 'Hand Tool', 'Other'];

    return (
        <div className="space-y-8 animate-fade-in pb-12">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Inventory & Fleet</h1>
                    <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-widest flex items-center gap-2">
                        <Wrench size={14} className="text-blue-600" /> Equipment tracking and job assignments
                    </p>
                </div>
                <div className="flex gap-3">
                    {['SUPER_ADMIN', 'COMPANY_OWNER', 'PM', 'FOREMAN'].includes(user?.role) && (
                        <>
                            <button
                                onClick={async () => {
                                    setShowAllHistory(true);
                                    setAllHistoryLoading(true);
                                    setAllHistoryDateFrom('');
                                    setAllHistoryDateTo('');
                                    setAllHistorySearch('');
                                    try {
                                        const res = await api.get('/equipment/all-history');
                                        setAllHistory(res.data || []);
                                    } catch { setAllHistory([]); }
                                    finally { setAllHistoryLoading(false); }
                                }}
                                className="px-6 py-3 border-2 border-slate-200 bg-white text-slate-700 rounded-xl flex items-center gap-2 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-all font-black text-sm uppercase tracking-tight shadow-sm"
                            >
                                <History size={18} /> Full History
                            </button>
                            <button onClick={openCreate}
                                className="bg-blue-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200 font-black text-sm uppercase tracking-tight">
                                <Plus size={18} /> Add New Item
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Notification Banner for Pending Returns */}
            {counts.alerts > 0 && (
                <div className="bg-red-50 border-2 border-red-100 rounded-[32px] p-6 flex flex-col md:flex-row items-center justify-between gap-6 animate-pulse">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center shadow-xl shadow-red-200">
                            <AlertTriangle size={28} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-red-900 tracking-tight">Active Warning: Pending Returns</h3>
                            <p className="text-sm font-bold text-red-600/70 leading-relaxed max-w-lg">
                                There are <span className="font-black text-red-900">{counts.alerts}</span> items still assigned to jobs that have been marked as "Completed". Please recall these items to make them available for other projects.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard title="Heavy Assets" value={counts.heavy} sub="Large units" icon={Box} color="bg-slate-900" />
                <StatCard title="Small Tools" value={counts.tools} sub="Power & Hand tools" icon={Hammer} color="bg-indigo-600" />
                <StatCard title="Assigned" value={counts.assigned} sub="Currently on site" icon={Link2} color="bg-blue-600" />
                <StatCard title="Alerts" value={counts.alerts} sub="Pending Return" icon={AlertTriangle} color={counts.alerts > 0 ? "bg-red-500 shadow-lg shadow-red-100" : "bg-emerald-500"} />
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col xl:flex-row gap-4 items-center">
                {/* View Toggle */}
                <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl shrink-0">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        title="List View"
                    >
                        <List size={18} />
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Grid View"
                    >
                        <LayoutGrid size={18} />
                    </button>
                </div>

                {/* Category filter tabs */}
                <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl shrink-0">
                    <button onClick={() => setCategoryFilter('all')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${categoryFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                        All Assets
                    </button>
                    {categories.map(c => (
                        <button key={c} onClick={() => setCategoryFilter(c)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight whitespace-nowrap transition-all ${categoryFilter === c ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                            {c}
                        </button>
                    ))}
                </div>

                {/* Status Filter */}
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-tight text-slate-700 outline-none focus:border-blue-500/50 transition-all shrink-0 min-w-[140px]"
                >
                    <option value="all">All Statuses</option>
                    <option value="operational">Operational</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="idle">Idle</option>
                    <option value="out_of_service">Out of Service</option>
                </select>

                {/* Sort Dropdown */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-1.5 shrink-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sort:</span>
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className="bg-transparent text-xs font-black text-slate-900 outline-none cursor-pointer uppercase tracking-tight"
                    >
                        <option value="name">Name</option>
                        <option value="status">Status</option>
                        <option value="date">Last Service</option>
                    </select>
                </div>

                <div className="flex-1 relative w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Search by name, type, or SN..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 text-sm font-bold text-slate-700 placeholder:text-slate-400" />
                </div>
            </div>

            {/* Content Container with Animation */}
            <div className="transition-all duration-300">
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="bg-white rounded-[28px] h-80 animate-pulse border border-slate-100" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="col-span-full py-24 text-center flex flex-col items-center gap-4 text-slate-300 bg-white rounded-[32px] border border-slate-100">
                        <Box size={48} className="opacity-30" />
                        <p className="font-bold uppercase tracking-widest text-[11px]">No equipment found matching your criteria</p>
                    </div>
                ) : viewMode === 'list' ? (
                    <EquipmentTable
                        items={filtered}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                        onAssign={openAssign}
                        onReturn={handleReturn}
                        onViewHistory={openHistory}
                        userRole={user?.role}
                    />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                        {filtered.map(item => (
                            <EquipmentCard
                                key={item._id}
                                item={item}
                                onEdit={openEdit}
                                onDelete={handleDelete}
                                onAssign={openAssign}
                                onReturn={handleReturn}
                                onViewHistory={openHistory}
                                userRole={user?.role}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && createPortal(
                <div onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }} style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.65)' }}>
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg"><Plus size={22} /></div>
                                    <div>
                                        <h2 className="text-xl font-black tracking-tight">{editingItem ? 'Edit Asset' : 'Add New Asset'}</h2>
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Inventory Management</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"><X size={20} /></button>
                            </div>
                        </div>

                        <div className="p-8 space-y-5">
                            {/* Image Upload Field */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Camera size={13} /> Equipment Photo
                                </label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full h-40 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/30 flex flex-col items-center justify-center cursor-pointer transition-all group overflow-hidden relative"
                                >
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 rounded-2xl bg-slate-200 group-hover:bg-blue-100 flex items-center justify-center transition-colors mb-2">
                                                <ImageIcon size={22} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                            </div>
                                            <p className="text-xs font-black text-slate-400 group-hover:text-blue-500 uppercase tracking-widest">Click to upload photo</p>
                                            <p className="text-[10px] text-slate-300 font-bold mt-1">JPG, PNG up to 5MB</p>
                                        </>
                                    )}
                                    {imagePreview && (
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <p className="text-white text-xs font-black uppercase tracking-widest">Change Photo</p>
                                        </div>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageFileChange}
                                    className="hidden"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Asset Name</label>
                                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g. DeWalt DCK283D2 Drill Set"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-500/50 transition-all" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Category</label>
                                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none appearance-none">
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Type</label>
                                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none appearance-none">
                                        {types.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Serial Number</label>
                                    <input type="text" value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Location</label>
                                    <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                                        placeholder="e.g. Yard 1, Warehouse"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Last Maint. Date</label>
                                    <input type="date" value={form.lastServiceDate ? new Date(form.lastServiceDate).toISOString().split('T')[0] : ''}
                                        onChange={e => setForm({ ...form, lastServiceDate: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Hourly Cost ($)</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</div>
                                        <input type="number" value={form.costPerHour} onChange={e => setForm({ ...form, costPerHour: Number(e.target.value) })}
                                            placeholder="0.00"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-8 pr-4 py-3 font-bold text-slate-800 outline-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Initial Status</label>
                                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none appearance-none">
                                        <option value="operational">Operational</option>
                                        <option value="maintenance">Maintenance</option>
                                        <option value="idle">Idle</option>
                                        <option value="out_of_service">Out of Service</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-sm uppercase tracking-tight transition-all">
                                    Cancel
                                </button>
                                <button onClick={handleSave} disabled={!form.name || imageUploading}
                                    className={`flex-1 px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-tight transition-all shadow-xl flex items-center justify-center gap-2 ${form.name && !imageUploading ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}>
                                    {imageUploading ? (
                                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading...</>
                                    ) : (
                                        <><Save size={16} /> {editingItem ? 'Save Changes' : 'Add Item'}</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                , document.body)}

            {/* Assign Modal */}
            {isAssignModalOpen && createPortal(
                <div onClick={(e) => { if (e.target === e.currentTarget) setIsAssignModalOpen(false); }} style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.65)' }}>
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-slate-900 p-8 text-white text-center">
                            <div className="w-16 h-16 rounded-3xl bg-blue-600 flex items-center justify-center shadow-lg mx-auto mb-4 border-4 border-slate-800"><Link2 size={24} /></div>
                            <h2 className="text-xl font-black tracking-tight">Assign Equipment</h2>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Select an active job for {assignTarget?.name}</p>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Select Job</label>
                                <select value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 font-bold text-slate-800 outline-none appearance-none focus:ring-4 focus:ring-blue-500/5">
                                    <option value="">Choose a Job...</option>
                                    {jobs.filter(j => j.status !== 'completed').map(j => (
                                        <option key={j._id} value={j._id}>{j.name} ({j.projectId?.name})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button onClick={handleAssign} disabled={!selectedJobId}
                                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-tight transition-all shadow-lg flex items-center justify-center gap-2 ${selectedJobId ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 outline-none' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                                    <CheckCircle size={18} /> Confirm Assignment
                                </button>
                                <button onClick={() => setIsAssignModalOpen(false)}
                                    className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-sm uppercase tracking-tight transition-all">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                , document.body)}

            {/* ─── Equipment History Modal ─────────────────────────────── */}
            {historyItem && createPortal(
                <div onClick={(e) => { if (e.target === e.currentTarget) setHistoryItem(null); }} style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.65)' }}>
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
                                        <History size={22} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black tracking-tight">{historyItem.name} — Assignment History</h2>
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">
                                            {historyItem.type} · {historyItem.category} · #{historyItem.serialNumber || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={downloadHistoryPDF}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-tight transition-all shadow-lg"
                                    >
                                        <Printer size={15} /> Download PDF
                                    </button>
                                    <button onClick={() => setHistoryItem(null)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Summary Strip */}
                        <div className="flex gap-4 px-8 py-4 bg-slate-50 border-b border-slate-100 flex-shrink-0">
                            <div className="flex items-center gap-2 text-sm font-black text-slate-600">
                                <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs">{historyData.length}</span>
                                Total Assignments
                            </div>
                            <div className="flex items-center gap-2 text-sm font-black text-slate-600">
                                <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">
                                    {historyData.filter(h => h.returnedDate).length}
                                </span>
                                Completed
                            </div>
                            <div className="flex items-center gap-2 text-sm font-black text-slate-600">
                                <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-xs">
                                    {historyData.filter(h => !h.returnedDate).length}
                                </span>
                                Active / Pending Return
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-y-auto flex-1">
                            {historyLoading ? (
                                <div className="flex flex-col items-center justify-center h-48 gap-3">
                                    <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading History...</p>
                                </div>
                            ) : historyData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-300">
                                    <History size={40} className="opacity-30" />
                                    <p className="text-xs font-black uppercase tracking-widest">No assignment history yet</p>
                                    <p className="text-[10px] text-slate-400">History is recorded when equipment is assigned to a job</p>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="sticky top-0">
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">#</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Project</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Job</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned Date</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Returned Date</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Duration</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {historyData.map((h, i) => {
                                            const days = h.returnedDate && h.assignedDate
                                                ? Math.ceil((new Date(h.returnedDate) - new Date(h.assignedDate)) / 86400000)
                                                : null;
                                            return (
                                                <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="px-6 py-4 text-xs font-black text-slate-400">{historyData.length - i}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="font-black text-slate-900 text-sm">{h.projectName || '—'}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm font-bold text-slate-600">{h.jobName || '—'}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-slate-900">
                                                                {h.assignedDate ? new Date(h.assignedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm font-bold text-slate-700">
                                                            {h.returnedDate ? new Date(h.returnedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm font-bold text-slate-600">
                                                            {days !== null ? `${days} day${days !== 1 ? 's' : ''}` : '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {h.returnedDate ? (
                                                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-wider">Returned</span>
                                                        ) : (
                                                            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse">Active</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-100 flex justify-end flex-shrink-0">
                            <button onClick={() => setHistoryItem(null)}
                                className="px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-sm uppercase tracking-tight transition-all">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
                , document.body)}

            {/* ─── Company-Wide Full History Modal ─────────────────────────── */}
            {showAllHistory && createPortal(
                <div onClick={(e) => { if (e.target === e.currentTarget) setShowAllHistory(false); }} style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.65)' }}>
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">

                        {/* Header */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
                                        <History size={22} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black tracking-tight">Full Equipment Assignment History</h2>
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">All equipment · All projects · Complete log</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            try {
                                                const doc = new jsPDF('landscape');
                                                const pageWidth = doc.internal.pageSize.width;

                                                // 1. Header Section
                                                // Company Logo
                                                const img = new Image();
                                                img.src = logo;
                                                doc.addImage(img, 'PNG', 20, 10, 15, 15);

                                                // Company Info (Left)
                                                doc.setFontSize(12);
                                                doc.setFont('helvetica', 'bold');
                                                doc.setTextColor(30, 41, 59);
                                                doc.text('Kaal Construction Ltd', 20, 32);

                                                doc.setFontSize(20);
                                                doc.setFont('helvetica', 'bold');
                                                doc.setTextColor(15, 23, 42);
                                                doc.text('Full Equipment Assignment History', pageWidth - 20, 20, { align: 'right' });

                                                const now = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
                                                doc.setFontSize(10);
                                                doc.setFont('helvetica', 'normal');
                                                doc.setTextColor(100);
                                                let subTitle = `Generated on ${now}`;
                                                if (allHistoryDateFrom || allHistoryDateTo) {
                                                    subTitle += ` · Filtered: ${allHistoryDateFrom || 'Start'} to ${allHistoryDateTo || 'Today'}`;
                                                }
                                                doc.text(subTitle, pageWidth - 20, 27, { align: 'right' });

                                                doc.setDrawColor(30, 58, 95);
                                                doc.setLineWidth(0.5);
                                                doc.line(20, 38, pageWidth - 20, 38);

                                                // 2. Stats Section
                                                const filteredRecords = allHistory.filter(h => {
                                                    const d = new Date(h.assignedDate);
                                                    const fromOk = !allHistoryDateFrom || d >= new Date(allHistoryDateFrom);
                                                    const toEnd = allHistoryDateTo ? new Date(allHistoryDateTo) : null;
                                                    if (toEnd) toEnd.setHours(23, 59, 59, 999);
                                                    const toOk = !toEnd || d <= toEnd;
                                                    const q = allHistorySearch.toLowerCase();
                                                    const searchOk = !q || h.equipmentName?.toLowerCase().includes(q) || h.projectName?.toLowerCase().includes(q) || h.jobName?.toLowerCase().includes(q);
                                                    return fromOk && toOk && searchOk;
                                                });

                                                const stats = [
                                                    { label: 'Total Records', value: filteredRecords.length },
                                                    { label: 'Unique Equipment', value: new Set(filteredRecords.map(h => h.equipmentId)).size },
                                                    { label: 'Completed', value: filteredRecords.filter(h => h.returnedDate).length },
                                                    { label: 'Active', value: filteredRecords.filter(h => !h.returnedDate).length }
                                                ];

                                                let startX = 20;
                                                stats.forEach(s => {
                                                    doc.setFontSize(8);
                                                    doc.setFont('helvetica', 'bold');
                                                    doc.setTextColor(148, 163, 184);
                                                    doc.text(s.label.toUpperCase(), startX, 48);
                                                    doc.setFontSize(14);
                                                    doc.setTextColor(15, 23, 42);
                                                    doc.text(String(s.value), startX, 55);
                                                    startX += 50;
                                                });

                                                // 3. Table Section
                                                const tableColumn = ["#", "EQUIPMENT", "TYPE", "PROJECT", "JOB", "ASSIGNED", "RETURNED", "DURATION"];
                                                const tableRows = filteredRecords.map((h, i) => {
                                                    const days = h.returnedDate && h.assignedDate ? Math.ceil((new Date(h.returnedDate) - new Date(h.assignedDate)) / 86400000) : null;
                                                    return [
                                                        i + 1,
                                                        h.equipmentName || '—',
                                                        h.equipmentType || '—',
                                                        h.projectName || '—',
                                                        h.jobName || '—',
                                                        h.assignedDate ? new Date(h.assignedDate).toLocaleDateString('en-GB') : '—',
                                                        h.returnedDate ? new Date(h.returnedDate).toLocaleDateString('en-GB') : 'Active',
                                                        days !== null ? `${days} days` : '—'
                                                    ];
                                                });

                                                autoTable(doc, {
                                                    startY: 65,
                                                    head: [tableColumn],
                                                    body: tableRows,
                                                    theme: 'grid',
                                                    headStyles: {
                                                        fillColor: [30, 58, 95],
                                                        textColor: [255, 255, 255],
                                                        fontSize: 8,
                                                        fontStyle: 'bold'
                                                    },
                                                    styles: { fontSize: 8, cellPadding: 3 },
                                                    alternateRowStyles: { fillColor: [248, 250, 252] }
                                                });

                                                doc.save(`Full_Equipment_History_${new Date().toISOString().split('T')[0]}.pdf`);
                                            } catch (error) {
                                                console.error('PDF Generation Error:', error);
                                                alert('Failed to generate PDF.');
                                            }
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-tight transition-all shadow-lg"
                                    >
                                        <Printer size={15} /> Download PDF
                                    </button>
                                    <button onClick={() => setShowAllHistory(false)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="flex flex-col md:flex-row gap-3 px-8 py-4 bg-slate-50 border-b border-slate-100 flex-shrink-0">
                            {/* Search */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search equipment, project, or job..."
                                    value={allHistorySearch}
                                    onChange={e => setAllHistorySearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-400"
                                />
                            </div>
                            {/* From */}
                            <div className="flex items-center gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">From</label>
                                <input type="date" value={allHistoryDateFrom} onChange={e => setAllHistoryDateFrom(e.target.value)}
                                    className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-400 bg-white" />
                            </div>
                            {/* To */}
                            <div className="flex items-center gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">To</label>
                                <input type="date" value={allHistoryDateTo} onChange={e => setAllHistoryDateTo(e.target.value)}
                                    className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-400 bg-white" />
                            </div>
                            {(allHistoryDateFrom || allHistoryDateTo || allHistorySearch) && (
                                <button onClick={() => { setAllHistoryDateFrom(''); setAllHistoryDateTo(''); setAllHistorySearch(''); }}
                                    className="px-4 py-2.5 text-xs font-black uppercase text-red-400 hover:text-red-600 transition-colors whitespace-nowrap">
                                    Clear All
                                </button>
                            )}
                        </div>

                        {/* Summary */}
                        {(() => {
                            const filt = allHistory.filter(h => {
                                const d = new Date(h.assignedDate);
                                const fromOk = !allHistoryDateFrom || d >= new Date(allHistoryDateFrom);
                                const toEnd = allHistoryDateTo ? new Date(allHistoryDateTo) : null;
                                if (toEnd) toEnd.setHours(23, 59, 59, 999);
                                const toOk = !toEnd || d <= toEnd;
                                const q = allHistorySearch.toLowerCase();
                                const searchOk = !q || h.equipmentName?.toLowerCase().includes(q) || h.projectName?.toLowerCase().includes(q) || h.jobName?.toLowerCase().includes(q);
                                return fromOk && toOk && searchOk;
                            });
                            return (
                                <>
                                    <div className="flex gap-5 px-8 py-3 bg-white border-b border-slate-100 flex-shrink-0">
                                        {[
                                            { label: 'Total Records', val: filt.length, color: 'bg-blue-100 text-blue-700' },
                                            { label: 'Equipment', val: new Set(filt.map(h => h.equipmentId)).size, color: 'bg-slate-100 text-slate-700' },
                                            { label: 'Returned', val: filt.filter(h => h.returnedDate).length, color: 'bg-emerald-100 text-emerald-700' },
                                            { label: 'Active', val: filt.filter(h => !h.returnedDate).length, color: 'bg-amber-100 text-amber-700' },
                                        ].map(s => (
                                            <div key={s.label} className="flex items-center gap-2 text-sm font-black text-slate-600">
                                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${s.color}`}>{s.val}</span>
                                                {s.label}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Table */}
                                    <div className="overflow-y-auto flex-1">
                                        {allHistoryLoading ? (
                                            <div className="flex flex-col items-center justify-center h-48 gap-3">
                                                <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading history...</p>
                                            </div>
                                        ) : filt.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-300">
                                                <History size={40} className="opacity-30" />
                                                <p className="text-xs font-black uppercase tracking-widest">No records match your filter</p>
                                            </div>
                                        ) : (
                                            <table className="w-full text-left text-sm">
                                                <thead className="sticky top-0 z-10">
                                                    <tr className="bg-slate-50 border-b border-slate-100">
                                                        {['#', 'Equipment', 'Type', 'Project', 'Job', 'Assigned Date', 'Returned Date', 'Duration', 'Status'].map(h => (
                                                            <th key={h} className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {filt.map((h, i) => {
                                                        const days = h.returnedDate && h.assignedDate
                                                            ? Math.ceil((new Date(h.returnedDate) - new Date(h.assignedDate)) / 86400000) : null;
                                                        return (
                                                            <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                                                                <td className="px-5 py-3.5 text-xs font-black text-slate-300">{i + 1}</td>
                                                                <td className="px-5 py-3.5">
                                                                    <div className="font-black text-slate-900 text-sm">{h.equipmentName}</div>
                                                                    <div className="text-[10px] font-bold text-slate-400">#{h.serialNumber || 'N/A'}</div>
                                                                </td>
                                                                <td className="px-5 py-3.5 text-xs font-bold text-slate-500">{h.equipmentType || '—'}</td>
                                                                <td className="px-5 py-3.5 font-black text-slate-900 text-sm">{h.projectName || '—'}</td>
                                                                <td className="px-5 py-3.5 text-sm font-bold text-slate-600">{h.jobName || '—'}</td>
                                                                <td className="px-5 py-3.5 text-sm font-bold text-slate-700">
                                                                    {h.assignedDate ? new Date(h.assignedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                                </td>
                                                                <td className="px-5 py-3.5 text-sm font-bold text-slate-700">
                                                                    {h.returnedDate ? new Date(h.returnedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                                </td>
                                                                <td className="px-5 py-3.5 text-sm font-bold text-slate-500">
                                                                    {days !== null ? `${days} day${days !== 1 ? 's' : ''}` : '—'}
                                                                </td>
                                                                <td className="px-5 py-3.5">
                                                                    {h.returnedDate ? (
                                                                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[9px] font-black uppercase tracking-wider">Returned</span>
                                                                    ) : (
                                                                        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse">Active</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </>
                            );
                        })()}

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-100 flex justify-end flex-shrink-0">
                            <button onClick={() => setShowAllHistory(false)}
                                className="px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-sm uppercase tracking-tight transition-all">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
                , document.body)}
            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && createPortal(
                <div onClick={(e) => { if (e.target === e.currentTarget) setIsDeleteModalOpen(false); }} style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.65)' }}>
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
                        <div className="p-8 text-center space-y-6">
                            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center text-red-500 mx-auto border border-red-100 shadow-sm transform -rotate-6 transition-transform duration-500">
                                <Trash2 size={40} />
                            </div>
                            
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Delete Asset?</h3>
                                <p className="text-slate-500 font-bold text-sm mt-2 leading-relaxed px-4">
                                    Are you sure you want to remove <span className="text-red-600 font-black italic underline">"{itemToDelete?.name}"</span>? This action cannot be reversed.
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
                                    onClick={confirmDelete}
                                    className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl transition shadow-lg shadow-red-200 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Check size={16} /> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Equipment;
