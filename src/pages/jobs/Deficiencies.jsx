import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    AlertCircle, CheckCircle2, Clock, Filter, Plus, Search,
    MoreHorizontal, Edit, Trash2, ShieldAlert, Hammer,
    Layers, AlertTriangle, User, ArrowLeft, ChevronRight,
    Info, Check, Calendar, Image as ImageIcon, Eye, X, FileText
} from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import DeficiencyModal from '../../components/deficiencies/DeficiencyModal';
import Modal from '../../components/Modal';
import '../../styles/Deficiencies.css';

const statusConfig = {
    open: { label: 'Open', cls: 'bg-red-50 text-red-600 border-red-100', dot: 'bg-red-500' },
    in_progress: { label: 'In Progress', cls: 'bg-orange-50 text-orange-600 border-orange-100', dot: 'bg-orange-500' },
    fixed: { label: 'Fixed', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-500' },
    closed: { label: 'Closed', cls: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-500' },
};

const categoryConfig = {
    safety: { label: 'Safety', icon: ShieldAlert, color: 'text-red-500' },
    work: { label: 'Quality', icon: Hammer, color: 'text-blue-500' },
    material: { label: 'Material', icon: Layers, color: 'text-orange-500' },
    other: { label: 'Other', icon: AlertTriangle, color: 'text-slate-500' },
};

const priorityConfig = {
    low: { label: 'Low', cls: 'bg-slate-100 text-slate-600' },
    medium: { label: 'Medium', cls: 'bg-blue-50 text-blue-600' },
    high: { label: 'High', cls: 'bg-orange-50 text-orange-600' },
    critical: { label: 'Critical', cls: 'bg-red-600 text-white' },
};

const Deficiencies = () => {
    const { projectId, jobId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [deficiencies, setDeficiencies] = useState([]);
    const [users, setUsers] = useState([]);
    const [projectMembers, setProjectMembers] = useState([]);
    const [project, setProject] = useState(null);
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'view'
    const [selectedDeficiency, setSelectedDeficiency] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deficiencyToDelete, setDeficiencyToDelete] = useState(null);

    const canManage = ['COMPANY_OWNER', 'PM', 'FOREMAN', 'WORKER'].includes(user?.role);
    const canUpdate = ['COMPANY_OWNER', 'PM', 'FOREMAN', 'WORKER'].includes(user?.role);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [defRes, userRes, projRes, jobRes, membersRes] = await Promise.all([
                api.get(`/issues?jobId=${jobId}`).catch(err => {
                    console.error('Deficiencies fetch failed:', err);
                    return { data: [] };
                }),
                api.get('/auth/users?role=COMPANY_OWNER&role=PM&role=FOREMAN&role=WORKER&role=SUBCONTRACTOR').catch(err => {
                    console.log('Auth users restricted for this role');
                    return { data: [] };
                }),
                api.get(`/projects/${projectId}`).catch(err => {
                    console.error('Project fetch failed:', err);
                    return { data: null };
                }),
                api.get(`/jobs/${jobId}`).catch(err => {
                    console.error('Job fetch failed:', err);
                    return { data: null };
                }),
                api.get(`/projects/${projectId}/members`).catch(err => {
                    console.error('Members fetch failed:', err);
                    return { data: [] };
                })
            ]);
            setDeficiencies(defRes.data || []);
            setUsers(userRes.data || []);
            setProject(projRes.data);
            setJob(jobRes.data);
            setProjectMembers(membersRes.data || []);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [jobId]);

    const handleSave = async (formData) => {
        try {
            setIsSubmitting(true);

            // Use FormData to handle file uploads
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                if (key === 'newImages') {
                    formData.newImages.forEach(file => data.append('images', file));
                } else if (key === 'images') {
                    // Send existing images as currentImages for partial updates
                    data.append('currentImages', JSON.stringify(formData.images));
                } else {
                    data.append(key, formData[key]);
                }
            });
            data.append('projectId', projectId);
            data.append('jobId', jobId);

            if (selectedDeficiency) {
                await api.patch(`/issues/${selectedDeficiency._id}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await api.post('/issues', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            await fetchData();
            setIsModalOpen(false);
            setSelectedDeficiency(null);
        } catch (err) {
            console.error('Error saving deficiency:', err);
            alert('Failed to save deficiency. Please check file size and network.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = (id) => {
        setDeficiencyToDelete(id);
    };

    const confirmDelete = async () => {
        if (!deficiencyToDelete) return;
        try {
            await api.delete(`/issues/${deficiencyToDelete}`);
            setDeficiencies(prev => prev.filter(d => d._id !== deficiencyToDelete));
            setDeficiencyToDelete(null);
        } catch (err) {
            console.error('Error deleting issue:', err);
            alert('Failed to delete issue');
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            await api.patch(`/issues/${id}`, { status });
            setDeficiencies(prev => prev.map(d => d._id === id ? { ...d, status } : d));
        } catch (err) {
            console.error('Error updating status:', err);
        }
    };

    const filteredDeficiencies = deficiencies.filter(d => {
        const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) ||
            d.assignedTo?.fullName?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'all' || d.status === filterStatus;
        return matchSearch && matchStatus;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-40">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-slate-900/10 border-t-slate-900 rounded-full animate-spin" />
                    <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Loading Tracker...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="deficiencies-container space-y-8 w-full pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-3 text-sm font-bold text-slate-400 mb-4">
                        <button onClick={() => navigate(`/company-admin/projects/${projectId}`)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-all">
                            <ArrowLeft size={18} />
                        </button>
                        <span className="hover:text-slate-900 cursor-pointer" onClick={() => navigate('/company-admin/projects')}>Projects</span>
                        <ChevronRight size={14} />
                        <span className="hover:text-slate-900 cursor-pointer" onClick={() => navigate(`/company-admin/projects/${projectId}`)}>{project?.name}</span>
                        <ChevronRight size={14} />
                        <span className="text-slate-900 font-black">{job?.name}</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Deficiencies List</h1>
                    <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-widest flex items-center gap-2">
                        <AlertCircle size={14} className="text-red-500" />
                        Project Issue & Punch List Tracker
                    </p>
                </div>
                {canManage && (
                    <button
                        onClick={() => { setModalMode('add'); setSelectedDeficiency(null); setIsModalOpen(true); }}
                        className="bg-slate-900 text-white px-8 py-3 rounded-2xl flex items-center gap-2 hover:bg-slate-800 transition shadow-xl font-black text-sm uppercase tracking-tight"
                    >
                        <Plus size={18} /> Add Deficiency
                    </button>
                )}
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by title or worker..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm font-bold"
                    />
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="flex-1 md:w-48 px-4 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-sm text-slate-600 outline-none hover:bg-slate-50 transition-all custom-select-appearance"
                    >
                        <option value="all">All Statuses</option>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="fixed">Fixed</option>
                        <option value="closed">Closed</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[40px] shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="deficiency-table-container">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Issue Details</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Category</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Priority</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned To</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Created</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredDeficiencies.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 text-slate-300">
                                            <CheckCircle2 size={40} className="text-emerald-500/30" />
                                            <p className="font-bold uppercase tracking-widest text-[11px]">No active deficiencies found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredDeficiencies.map((d) => {
                                    const status = statusConfig[d.status] || statusConfig.open;
                                    const category = categoryConfig[d.category] || categoryConfig.other;
                                    const priority = priorityConfig[d.priority] || priorityConfig.medium;
                                    const CatIcon = category.icon;

                                    return (
                                        <tr key={d._id} className="deficiency-row transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    {d.images && d.images.length > 0 ? (
                                                        <div className="w-12 h-12 rounded-xl border border-slate-200 overflow-hidden flex-shrink-0 bg-slate-50 flex items-center justify-center">
                                                            {d.images[0].toLowerCase().includes('.pdf') ? (
                                                                <FileText size={24} className="text-red-500" />
                                                            ) : (
                                                                <img src={d.images[0]} alt="Issue" className="w-full h-full object-cover" />
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-xl border border-slate-200 overflow-hidden flex-shrink-0 bg-slate-50 flex items-center justify-center text-slate-300">
                                                            <ImageIcon size={18} />
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-slate-900 group-hover:text-slate-700 transition-colors uppercase tracking-tight">{d.title}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 mt-0.5 line-clamp-1">{d.description || 'No description provided'}</span>
                                                        {d.images && d.images.length > 1 && (
                                                            <span className="text-[8px] font-black text-blue-500 uppercase mt-1">+{d.images.length - 1} more photos</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <CatIcon size={14} className={category.color} />
                                                    <span className="text-xs font-bold text-slate-600">{category.label}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`priority-badge px-2 py-0.5 rounded-full ${priority.cls}`}>
                                                    {priority.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200">
                                                        {d.assignedTo ? d.assignedTo.fullName.charAt(0) : '?'}
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
                                                        {d.assignedTo?.fullName || 'Unassigned'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className={`status-badge ${status.cls}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot} shadow-sm animate-pulse-slow`} />
                                                    {status.label}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                    <Calendar size={12} />
                                                    <span className="text-[11px] font-bold">{new Date(d.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setModalMode('view');
                                                            setSelectedDeficiency(d);
                                                            setIsModalOpen(true);
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="View Details"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    {canUpdate && d.status !== 'fixed' && d.status !== 'closed' && (
                                                        <button
                                                            onClick={() => handleStatusUpdate(d._id, 'fixed')}
                                                            className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                                                            title="Mark as Fixed"
                                                        >
                                                            <Check size={18} />
                                                        </button>
                                                    )}
                                                    {canUpdate && (
                                                        <button
                                                            onClick={() => { setModalMode('edit'); setSelectedDeficiency(d); setIsModalOpen(true); }}
                                                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                    )}
                                                    {canManage && (
                                                        <button
                                                            onClick={() => handleDelete(d._id)}
                                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <DeficiencyModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                initialData={selectedDeficiency}
                mode={modalMode}
                users={users}
                projectMembers={projectMembers}
                currentUser={user}
                isSubmitting={isSubmitting}
            />

            <Modal
                isOpen={deficiencyToDelete !== null}
                onClose={() => setDeficiencyToDelete(null)}
                title="Delete Deficiency"
            >
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mb-6 border border-red-100">
                        <Trash2 size={32} />
                    </div>

                    <h3 className="text-xl font-black text-slate-900 mb-2">Delete Issue?</h3>
                    <p className="text-slate-500 font-bold text-sm leading-relaxed mb-8 max-w-[280px]">
                        Are you sure you want to remove this deficiency? This action cannot be undone.
                    </p>

                    <div className="flex gap-3 w-full">
                        <button 
                            onClick={() => setDeficiencyToDelete(null)}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-500 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmDelete}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            <Trash2 size={16} /> Delete
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Deficiencies;
