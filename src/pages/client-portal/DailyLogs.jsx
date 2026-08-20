import { useState, useEffect } from 'react';
import {
    CloudSun, Sun, CloudRain, Wind,
    Calendar, Search, Filter, FileText, Users, Loader,
    Clock, ChevronRight, Hash, Check, LayoutGrid, List
} from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
const WeatherIcon = ({ status, size = 20 }) => {
    switch (status) {
        case 'Sunny': return <Sun size={size} className="text-orange-500" />;
        case 'Cloudy': return <CloudSun size={size} className="text-slate-500" />;
        case 'Rainy': return <CloudRain size={size} className="text-blue-500" />;
        case 'Windy': return <Wind size={size} className="text-sky-500" />;
        default: return <Sun size={size} className="text-orange-500" />;
    }
};

const ClientDailyLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid');
  const { user } = useAuth();

    useEffect(() => {
        if (!user) return;
        const fetchLogs = async () => {
            try {
                setLoading(true);
                const isWorker = user?.role?.toLowerCase() === 'worker';
                const endpoint = isWorker ? `/dailylogs?userId=${user._id}` : '/dailylogs';
                const res = await api.get(endpoint);
                setLogs(res.data);
            } catch (error) {
                console.error('Error fetching daily logs:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [user]);

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            log.projectId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.workPerformed?.toLowerCase().includes(searchTerm.toLowerCase());
        const isWorker = user?.role?.toLowerCase() === 'worker';
        const matchesOwner = !isWorker || (log.reportedBy && String(log.reportedBy._id) === String(user._id));
        return matchesSearch && matchesOwner;
    });

    return (
        <div className="space-y-8 animate-fade-in max-w-[1600px] mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Daily Site Logs</h1>
                    <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-widest flex items-center gap-2">
                        <FileText size={14} className="text-blue-600" />
                        View daily site progress and operations
                    </p>
                </div>
            </div>

            {/* Search Toolbar */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search logs by project or content..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 text-sm font-bold text-slate-700 placeholder:text-slate-400"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button className="flex-1 md:flex-none px-6 py-3 border border-slate-200 rounded-2xl hover:bg-slate-50 text-slate-600 font-bold text-sm flex items-center justify-center gap-2 transition-all">
                        <Filter size={18} /> Filters
                    </button>
                    <button className="flex-1 md:flex-none px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 font-bold text-sm flex items-center justify-center gap-2 transition-all">
                        <Calendar size={18} /> This Week
                    </button>
                </div>

                {/* View Toggle */}
                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 ml-auto">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Grid View"
                    >
                        <LayoutGrid size={20} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        title="List View"
                    >
                        <List size={20} />
                    </button>
                </div>
            </div>

            {/* Log Cards */}
            {loading ? (
                <div className="flex flex-col justify-center items-center h-96 gap-4 text-slate-400">
                    <div className="w-16 h-16 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="font-bold uppercase tracking-widest text-xs">Loading logs...</p>
                </div>
            ) : (
                viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredLogs.map(log => (
                            <div key={log._id} className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                                {/* Card Header */}
                                <div className="h-28 bg-slate-100 relative overflow-hidden">
                                    <img
                                        src={`https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=400`}
                                        className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700"
                                        alt="Site"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
                                    <div className="absolute top-4 left-4">
                                        <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl border border-white/50 shadow-sm flex items-center gap-2">
                                            <Hash size={12} className="text-blue-600" />
                                            <span className="text-[11px] font-black text-slate-800 truncate max-w-[120px] uppercase tracking-tight">
                                                {log.projectId?.name || 'Unassigned'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 pt-0 space-y-5 flex-1 flex flex-col -mt-4 relative z-10">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 text-slate-400 mb-1">
                                                <Calendar size={14} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">
                                                    {new Date(log.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                                                Daily Summary
                                            </h3>
                                        </div>
                                        {/* <div className="flex flex-col items-end">
                                            <WeatherIcon status={log.weather?.status} size={24} />
                                            <span className="text-xs font-black text-slate-800 mt-1">{log.weather?.temperature}°F</span>
                                        </div> */}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pb-4 border-b border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                                <Users size={16} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-900 leading-none">
                                                    {log.manpower?.reduce((acc, m) => acc + m.count, 0) || 0}
                                                </p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Manpower</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                                <Clock size={16} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-900 leading-none">
                                                    {log.manpower?.reduce((acc, m) => acc + (m.hours * m.count), 0) || 0}h
                                                </p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Total Hours</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <Check size={14} className="text-blue-600" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Work Performed</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-700 leading-relaxed line-clamp-4 italic bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                                            "{log.workPerformed}"
                                        </p>
                                    </div>

                                    <div className="pt-4 mt-auto border-t border-slate-50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[10px] font-black text-slate-600">
                                                {log.reportedBy?.fullName?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-900 leading-none">{log.reportedBy?.fullName || 'Unknown'}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">
                                                    {log.reportedBy?.role === 'PM' ? 'Project Manager' :
                                                        log.reportedBy?.role === 'FOREMAN' ? 'Site Foreman' : 'Lead Worker'}
                                                </p>
                                            </div>
                                        </div>
                                        <button className="text-blue-600 hover:text-blue-800 transition-colors">
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filteredLogs.length === 0 && (
                            <div className="col-span-full py-24 flex flex-col items-center justify-center bg-white rounded-[40px] border-2 border-dashed border-slate-200 gap-6">
                                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                                    <FileText size={40} />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-black text-slate-900">No Daily Logs Available</h3>
                                    <p className="text-slate-500 font-bold max-w-xs mx-auto mt-2">
                                        No site logs have been recorded yet. Check back later for updates.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Project</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Published By</th>
                                    {/* <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Weather</th> */}
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Team</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map(log => (
                                    <tr key={log._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-black text-slate-900 leading-none">
                                                {new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                                                {new Date(log.date).toLocaleDateString(undefined, { weekday: 'short' })}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                <span className="text-sm font-bold text-slate-700">{log.projectId?.name || 'Unassigned'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 shrink-0">
                                                    {log.reportedBy?.fullName?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-900 leading-none">
                                                        {log.reportedBy?.fullName || 'Unknown'}
                                                    </p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                                                        {log.reportedBy?.role === 'PM' ? 'Project Manager' :
                                                         log.reportedBy?.role === 'FOREMAN' ? 'Site Foreman' : 'Lead Worker'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        {/* <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <WeatherIcon status={log.weather?.status} size={16} />
                                                <span className="text-xs font-bold text-slate-600">{log.weather?.temperature}°F</span>
                                            </div>
                                        </td> */}
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-medium text-slate-600 line-clamp-1 max-w-[300px]">
                                                {log.workPerformed}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex -space-x-2">
                                                {[...Array(Math.min(log.manpower?.reduce((acc, m) => acc + m.count, 0) || 0, 3))].map((_, i) => (
                                                    <div key={i} className="w-7 h-7 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-blue-600">
                                                        P
                                                    </div>
                                                ))}
                                                {(log.manpower?.reduce((acc, m) => acc + m.count, 0) || 0) > 3 && (
                                                    <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                        +{(log.manpower?.reduce((acc, m) => acc + m.count, 0) || 0) - 3}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                                                <ChevronRight size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredLogs.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                                            No logs found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )
            )}
        </div>
    );
};

export default ClientDailyLogs;
