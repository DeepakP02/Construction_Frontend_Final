import React, { useState, useEffect } from 'react';
import { Activity, Clock, User, Shield, AlertCircle, RefreshCw, Search, Terminal, Filter } from 'lucide-react';
import api from '../../utils/api';

const SystemLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const response = await api.get('/super-admin/logs');
            setLogs(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching logs:', err);
            setError('Failed to load system audit logs.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const getActionColor = (action) => {
        if (action.includes('CREATE') || action.includes('UPLOAD')) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
        if (action.includes('DELETE') || action.includes('REJECT')) return 'text-rose-600 bg-rose-50 border-rose-100';
        if (action.includes('UPDATE') || action.includes('EDIT')) return 'text-blue-600 bg-blue-50 border-blue-100';
        return 'text-slate-600 bg-slate-50 border-slate-100';
    };

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userId?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && logs.length === 0) {
        return (
            <div className="flex h-96 items-center justify-center">
                <RefreshCw className="animate-spin text-blue-600" size={48} />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
                        <Terminal size={32} className="text-blue-600" /> System Audit Logs
                    </h1>
                    <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-widest flex items-center gap-2">
                        <Activity size={14} className="text-blue-600" />
                        Administrative actions and security events system-wide
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchLogs}
                        className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-400 hover:text-blue-600 hover:shadow-sm transition-all shadow-sm"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <div className="relative group/search">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-blue-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search actions, users, modules..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-80 pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/50 text-sm font-bold text-slate-700 placeholder:text-slate-400 shadow-sm transition-all"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[40px] shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Module</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">IP Address</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredLogs.map((log) => (
                                <tr key={log._id} className="hover:bg-slate-50/50 transition-all duration-300 group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            <Clock size={14} className="text-slate-300" />
                                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-tight">
                                                {new Date(log.createdAt).toLocaleString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    second: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getActionColor(log.action)}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-slate-600 font-black px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[10px] uppercase tracking-widest">
                                            {log.module}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 shadow-sm">
                                                {log.userId?.fullName?.charAt(0) || 'S'}
                                            </div>
                                            <span className="text-sm font-black text-slate-900 leading-none">{log.userId?.fullName || 'System'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-sm font-bold text-slate-700 max-w-sm leading-relaxed truncate group-hover:whitespace-normal group-hover:overflow-visible transition-all">
                                            {log.details}
                                        </p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-100">
                                            <Shield size={12} className="text-slate-400" />
                                            <span className="text-[11px] font-black text-slate-500 font-mono">
                                                {log.ipAddress || '127.0.0.1'}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredLogs.length === 0 && (
                        <div className="py-24 flex flex-col items-center justify-center gap-6">
                            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
                                <Terminal size={40} />
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-black text-slate-900">No System Logs Found</h3>
                                <p className="text-slate-500 font-bold max-w-xs mx-auto mt-2 text-sm">
                                    We couldn't find any audit logs matching your search parameters.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* <div className="bg-blue-600 rounded-[32px] p-8 shadow-xl shadow-blue-200 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                <div className="flex items-center gap-5 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
                        <Shield size={28} />
                    </div>
                    <div>
                        <h4 className="text-white text-lg font-black tracking-tight">Log Retention Policy</h4>
                        <p className="text-blue-100 text-sm font-bold">System audit logs are retained for 365 days for compliance.</p>
                    </div>
                </div>
                <button className="px-8 py-3 bg-white text-blue-600 rounded-2xl font-black text-sm uppercase tracking-tight hover:shadow-2xl transition-all relative z-10">
                    Request Export
                </button>
            </div> */}
        </div>
    );
};

export default SystemLogs;
