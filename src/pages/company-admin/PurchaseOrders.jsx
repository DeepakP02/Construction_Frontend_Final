import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    ShoppingCart, Plus, Search, Filter, CheckCircle, XCircle,
    FileText, Truck, AlertCircle, DollarSign, Trash2, Loader,
    MoreHorizontal, ChevronRight, Hash, Check, MapPin, Calendar, Clock,
    Eye, FilterX, Pencil
} from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import '../../styles/PurchaseOrders.css';
import Modal from '../../components/Modal';

const PurchaseOrders = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isOwner = user?.role === 'COMPANY_OWNER';
    const isPM = user?.role === 'PM';
    const isForeman = user?.role === 'FOREMAN';
    const isOwnerOrPM = isOwner || isPM;

    const [orders, setOrders] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [poToDelete, setPoToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [projectFilter, setProjectFilter] = useState('all');
    const [jobFilter, setJobFilter] = useState('all');
    const [jobs, setJobs] = useState([]);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [ordersRes, projectsRes] = await Promise.all([
                api.get('/purchase-orders'),
                api.get('/projects')
            ]);
            setOrders(ordersRes.data);
            setProjects(projectsRes.data);
        } catch (error) {
            console.error('Error fetching purchase orders:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Fetch jobs when projectFilter changes
    useEffect(() => {
        const fetchJobs = async () => {
            if (projectFilter !== 'all') {
                try {
                    const res = await api.get(`/jobs?projectId=${projectFilter}`);
                    setJobs(res.data);
                } catch (err) {
                    console.error('Error fetching jobs:', err);
                }
            } else {
                setJobs([]);
                setJobFilter('all');
            }
        };
        fetchJobs();
    }, [projectFilter]);
    const handleDelete = (e, id) => {
        e.stopPropagation();
        const po = orders.find(o => o._id === id);
        setPoToDelete(po);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!poToDelete) return;
        try {
            setIsDeleting(true);
            await api.delete(`/purchase-orders/${poToDelete._id}`);
            setOrders(orders.filter(o => o._id !== poToDelete._id));
            toast.success('Purchase order deleted');
            setIsDeleteModalOpen(false);
            setPoToDelete(null);
        } catch (error) {
            console.error('Error deleting purchase order:', error);
            toast.error('Failed to delete purchase order');
        } finally {
            setIsDeleting(false);
        }
    };

    const stats = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'Pending Approval').reduce((sum, o) => sum + (o.totalAmount || 0), 0),
        approved: orders.filter(o => o.status === 'Approved').reduce((sum, o) => sum + (o.totalAmount || 0), 0)
    };

    const filteredOrders = orders.filter(o => {
        const matchesSearch =
            o.vendorId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.vendorName?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
        const matchesProject = projectFilter === 'all' || o.projectId?._id === projectFilter || o.projectId === projectFilter;
        const matchesJob = jobFilter === 'all' || o.jobId?._id === jobFilter || o.jobId === jobFilter;
        const poDate = new Date(o.createdAt);
        const matchesDate = (!dateRange.start || poDate >= new Date(dateRange.start)) &&
            (!dateRange.end || poDate <= new Date(dateRange.end));

        return matchesSearch && matchesStatus && matchesProject && matchesJob && matchesDate;
    });

    const getStatusStyles = (status) => {
        const map = {
            'Draft': 'bg-slate-100 text-slate-600 border-slate-200',
            'Pending Approval': 'bg-orange-50 text-orange-600 border-orange-100',
            'Approved': 'bg-blue-50 text-blue-600 border-blue-100',
            'Sent': 'bg-purple-50 text-purple-600 border-purple-100',
            'Delivered': 'bg-emerald-50 text-emerald-600 border-emerald-100',
            'Closed': 'bg-slate-800 text-slate-200 border-slate-700',
            'Cancelled': 'bg-red-50 text-red-600 border-red-100'
        };
        return map[status] || map['Draft'];
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Purchase Orders</h1>
                    <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-widest flex items-center gap-2">
                        <ShoppingCart size={14} className="text-blue-600" />
                        Procurement Management System
                    </p>
                </div>
                {!isForeman && (
                    <button
                        onClick={() => navigate('/company-admin/purchase-orders/new')}
                        className="bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center gap-3 hover:bg-blue-700 transition shadow-xl shadow-blue-200 font-black text-sm uppercase tracking-tight"
                    >
                        <Plus size={20} /> Raise PO Request
                    </button>
                )}
                {isForeman && (
                    <button
                        onClick={() => navigate('/company-admin/purchase-orders/new')}
                        className="bg-slate-800 text-white px-8 py-4 rounded-2xl flex items-center gap-3 hover:bg-slate-900 transition shadow-xl shadow-slate-200 font-black text-sm uppercase tracking-tight"
                    >
                        <Plus size={20} /> Raise PO Request
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <POStatCard title="Active Volume" value={stats.total} subtext="Total POs in system" icon={FileText} color="blue" />
                <POStatCard title="Awaiting Approval" value={`$${stats.pending.toLocaleString()}`} subtext="Total pending spend" icon={Clock} color="orange" />
                <POStatCard title="Committed Budget" value={`$${stats.approved.toLocaleString()}`} subtext="Approved material costs" icon={CheckCircle} color="emerald" />
            </div>

            {/* Advanced Filters */}
            <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200/60 space-y-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search PO #, Vendor name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/50 text-sm font-bold text-slate-700 placeholder:text-slate-400"
                        />
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <select
                            value={projectFilter}
                            onChange={e => setProjectFilter(e.target.value)}
                            className="px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 pr-10 outline-none focus:border-blue-500/50"
                        >
                            <option value="all">All Projects</option>
                            {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>
                        <select
                            value={jobFilter}
                            onChange={e => setJobFilter(e.target.value)}
                            disabled={projectFilter === 'all'}
                            className="px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 pr-10 outline-none focus:border-blue-500/50 disabled:opacity-50"
                        >
                            <option value="all">All Jobs</option>
                            {jobs.map(j => <option key={j._id} value={j._id}>{j.name}</option>)}
                        </select>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 pr-10 outline-none focus:border-blue-500/50"
                        >
                            <option value="all">All Status</option>
                            <option value="Draft">Draft</option>
                            <option value="Pending Approval">Pending Approval</option>
                            <option value="Approved">Approved</option>
                            <option value="Sent">Sent</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Closed">Closed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                        <button
                            onClick={() => {
                                setStatusFilter('all');
                                setProjectFilter('all');
                                setJobFilter('all');
                                setSearchTerm('');
                                setDateRange({ start: '', end: '' });
                            }}
                            className="p-3.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl border border-slate-200 transition-all"
                            title="Reset Filters"
                        >
                            <FilterX size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-[40px] shadow-sm border border-slate-200/60 overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">PO Number</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Project</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor</th>
                                {/* <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Total Amount</th> */}
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="7" className="py-20 text-center"><Loader className="animate-spin mx-auto text-blue-600" /></td></tr>
                            ) : filteredOrders.length > 0 ? filteredOrders.map((order) => (
                                <tr
                                    key={order._id}
                                    onClick={() => navigate(`/company-admin/purchase-orders/${order._id}`)}
                                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                                >
                                    <td className="px-8 py-5 font-black text-slate-900">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                <Hash size={16} />
                                            </div>
                                            {order.poNumber}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="font-bold text-slate-800">{order.projectId?.name || '---'}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{order.projectId?.clientName || 'Construction Site'}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-[10px] uppercase border border-blue-100">
                                                {(order.vendorName || order.vendorId?.name || 'V').charAt(0)}
                                            </div>
                                            <span className="font-bold text-slate-700">{order.vendorName || order.vendorId?.name}</span>
                                        </div>
                                    </td>
                                    {/* <td className="px-8 py-5 text-right font-black text-slate-900">
                                        ${order.totalAmount?.toLocaleString()}
                                    </td> */}
                                    <td className="px-8 py-5">
                                        <span className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border shadow-sm ${getStatusStyles(order.status)}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-slate-400 font-bold text-xs">
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/company-admin/purchase-orders/${order._id}`);
                                                }}
                                                className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            {(isOwner || isPM) && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/company-admin/purchase-orders/edit/${order._id}`);
                                                    }}
                                                    className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                            )}
                                            {(isOwner || isPM) && (
                                                <button
                                                    onClick={(e) => handleDelete(e, order._id)}
                                                    className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <ShoppingCart size={48} className="text-slate-100" />
                                            <p className="font-black text-slate-300 uppercase tracking-widest text-xs">No matching purchase orders found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* ── Delete Confirmation Modal ── */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Purchase Order"
            >
                <div className="p-2 space-y-6">
                    <div className="bg-red-50 rounded-3xl p-6 border border-red-100 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-red-500 shadow-sm border border-red-100 mb-4 transition-transform hover:scale-110">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Destructive Action</h3>
                        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-2 px-6 leading-relaxed">
                            Are you sure you want to delete <span className="text-red-600 font-black">PO #{poToDelete?.poNumber}</span>? This action cannot be undone.
                        </p>
                    </div>

                    <div className="flex gap-3 px-2 pb-2">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition shadow-lg shadow-red-200 active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {isDeleting ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            Delete Forever
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const POStatCard = ({ title, value, subtext, icon: Icon, color }) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100 shadow-blue-100/20',
        orange: 'bg-orange-50 text-orange-600 border-orange-100 shadow-orange-100/20',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-100/20'
    };

    return (
        <div className="bg-white p-3.5 md:p-4 rounded-xl md:rounded-2xl shadow-sm border border-slate-200/60 flex items-center gap-4 hover:shadow-md transition-all duration-300 cursor-default group">
            <div className={`p-2 rounded-lg md:rounded-xl border transition-transform duration-300 group-hover:scale-105 ${colors[color]}`}>
                <Icon size={18} strokeWidth={2.5} />
            </div>
            <div className="space-y-0.5">
                <p className="text-[9px] md:text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none">{title}</p>
                <p className="text-xl md:text-2xl font-black text-slate-900 leading-none tracking-tighter">{value}</p>
                <p className="text-[9px] font-black text-slate-400/60 uppercase tracking-tight leading-none truncate">{subtext}</p>
            </div>
        </div>
    );
};

export default PurchaseOrders;
