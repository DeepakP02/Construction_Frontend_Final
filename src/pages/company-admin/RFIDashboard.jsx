import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileQuestion, AlertTriangle, Clock, CheckCircle2,
    XCircle, Plus, ArrowRight, RefreshCw, TrendingUp,
    ChevronRight, Eye, AlertCircle
} from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const statusColors = {
    open: 'bg-blue-100 text-blue-700 border-blue-200',
    in_review: 'bg-amber-100 text-amber-700 border-amber-200',
    answered: 'bg-violet-100 text-violet-700 border-violet-200',
    closed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};
const statusLabels = {
    open: 'Open', in_review: 'In Review',
    answered: 'Answered', closed: 'Closed'
};
const priorityColors = {
    low: 'bg-slate-100 text-slate-600',
    medium: 'bg-amber-100 text-amber-700',
    high: 'bg-red-100 text-red-700'
};

const RFIDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const basePath = window.location.pathname.startsWith('/client-portal') ? '/client-portal' : '/company-admin';

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await api.get('/rfis/stats');
                let result = res.data;
                if (user?.role === 'CLIENT') {
                    const filterFn = r => r.raisedBy?.role !== 'SUBCONTRACTOR';
                    if (result.recentRFIs) result.recentRFIs = result.recentRFIs.filter(filterFn);
                    if (result.highPriorityRFIs) result.highPriorityRFIs = result.highPriorityRFIs.filter(filterFn);
                    if (result.overdueRFIs) result.overdueRFIs = result.overdueRFIs.filter(filterFn);
                }
                setData(result);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    const statCards = data ? [
        { label: 'Total RFIs', value: data.stats.total, icon: FileQuestion, color: 'bg-blue-500', light: 'bg-blue-50 border-blue-200', text: 'text-blue-600' },
        { label: 'Open', value: data.stats.open, icon: AlertCircle, color: 'bg-sky-500', light: 'bg-sky-50 border-sky-200', text: 'text-sky-600' },
        { label: 'In Review', value: data.stats.inReview, icon: RefreshCw, color: 'bg-amber-500', light: 'bg-amber-50 border-amber-200', text: 'text-amber-600' },
        { label: 'Answered', value: data.stats.answered, icon: TrendingUp, color: 'bg-violet-500', light: 'bg-violet-50 border-violet-200', text: 'text-violet-600' },
        { label: 'Closed', value: data.stats.closed, icon: CheckCircle2, color: 'bg-emerald-500', light: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-600' },
        { label: 'Overdue', value: data.stats.overdue, icon: AlertTriangle, color: 'bg-red-500', light: 'bg-red-50 border-red-200', text: 'text-red-600' },
    ] : [];

    return (
        <div className="space-y-8 pb-12 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter">RFI Dashboard</h1>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Request for Information — Overview & Summary</p>
                </div>
                {user?.role !== 'CLIENT' && (
                    <button
                        onClick={() => navigate(`${basePath}/rfi/create`)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5 text-sm"
                    >
                        <Plus size={18} /> New RFI
                    </button>
                )}
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {loading
                    ? Array(6).fill(0).map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 animate-pulse">
                            <div className="h-10 w-10 bg-slate-100 rounded-xl mb-4" />
                            <div className="h-7 w-12 bg-slate-100 rounded mb-2" />
                            <div className="h-3 w-16 bg-slate-100 rounded" />
                        </div>
                    ))
                    : statCards.map((card, i) => (
                        <div
                            key={i}
                            onClick={() => navigate(`${basePath}/rfi/list`)}
                            className={`bg-white rounded-2xl p-5 border ${card.light} cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 group`}
                        >
                            <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                <card.icon size={20} className="text-white" />
                            </div>
                            <p className={`text-3xl font-black ${card.text}`}>{card.value}</p>
                            <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wide">{card.label}</p>
                        </div>
                    ))
                }
            </div>

            {/* Bottom 3 sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent RFIs */}
                <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between p-5 border-b border-slate-100">
                        <h3 className="font-black text-slate-800 tracking-tight">Recent RFIs</h3>
                        <button onClick={() => navigate(`${basePath}/rfi/list`)} className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline">
                            View All <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {loading ? (
                            <div className="p-8 text-center text-slate-400">Loading...</div>
                        ) : data?.recentRFIs?.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">No RFIs yet</div>
                        ) : data?.recentRFIs?.map((rfi) => (
                            <div
                                key={rfi._id}
                                onClick={() => navigate(`${basePath}/rfi/${rfi._id}`)}
                                className="flex items-start gap-3 p-4 hover:bg-slate-50 cursor-pointer transition"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider">{rfi.rfiNumber}</p>
                                    <p className="text-sm font-bold text-slate-800 truncate mt-0.5">{rfi.subject}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{rfi.projectId?.name}</p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[rfi.status]} whitespace-nowrap`}>
                                    {statusLabels[rfi.status]}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* High Priority RFIs */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between p-5 border-b border-red-50 bg-red-50/50">
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={16} className="text-red-500" />
                            <h3 className="font-black text-slate-800 tracking-tight">High Priority</h3>
                        </div>
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                            {data?.highPriorityRFIs?.length || 0}
                        </span>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {loading ? (
                            <div className="p-8 text-center text-slate-400">Loading...</div>
                        ) : data?.highPriorityRFIs?.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">🎉 No high priority RFIs</div>
                        ) : data?.highPriorityRFIs?.map((rfi) => (
                            <div
                                key={rfi._id}
                                onClick={() => navigate(`${basePath}/rfi/${rfi._id}`)}
                                className="flex items-start gap-3 p-4 hover:bg-red-50/30 cursor-pointer transition"
                            >
                                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle size={14} className="text-red-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-slate-400">{rfi.rfiNumber}</p>
                                    <p className="text-sm font-bold text-slate-800 truncate">{rfi.subject}</p>
                                    <p className="text-xs text-slate-400">{rfi.projectId?.name} • {rfi.raisedBy?.fullName}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Overdue RFIs */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between p-5 border-b border-orange-50 bg-orange-50/50">
                        <div className="flex items-center gap-2">
                            <Clock size={16} className="text-orange-500" />
                            <h3 className="font-black text-slate-800 tracking-tight">Overdue</h3>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${data?.stats?.overdue > 0 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                            {data?.overdueRFIs?.length || 0}
                        </span>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {loading ? (
                            <div className="p-8 text-center text-slate-400">Loading...</div>
                        ) : data?.overdueRFIs?.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">✅ No overdue RFIs</div>
                        ) : data?.overdueRFIs?.map((rfi) => (
                            <div
                                key={rfi._id}
                                onClick={() => navigate(`${basePath}/rfi/${rfi._id}`)}
                                className="flex items-start gap-3 p-4 hover:bg-orange-50/30 cursor-pointer transition"
                            >
                                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                                    <Clock size={14} className="text-orange-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-slate-400">{rfi.rfiNumber}</p>
                                    <p className="text-sm font-bold text-slate-800 truncate">{rfi.subject}</p>
                                    <p className="text-xs text-red-400 font-semibold">
                                        Due: {new Date(rfi.dueDate).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* CTA */}
            <div
                onClick={() => navigate(`${basePath}/rfi/list`)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-6 flex items-center justify-between cursor-pointer hover:shadow-xl hover:shadow-blue-200 transition-all hover:-translate-y-0.5"
            >
                <div>
                    <h3 className="font-black text-lg tracking-tight">View All RFIs</h3>
                    <p className="text-blue-100 text-sm">Filter, search and manage all requests</p>
                </div>
                <ArrowRight size={24} className="text-blue-200" />
            </div>
        </div>
    );
};

export default RFIDashboard;
