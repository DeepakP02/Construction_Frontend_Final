import React, { useState, useEffect } from 'react';
import { 
    Briefcase, DollarSign, Clock, Users, HardHat, Wrench, 
    Box, ChevronDown, ChevronUp, AlertCircle, Search, 
    Calendar, CheckCircle2, TrendingUp, ArrowRight
} from 'lucide-react';
import api from '../../utils/api';

const JobCard = ({ job }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden mb-4 transition-all hover:shadow-md">
            <div 
                className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-slate-50/50"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${job.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                        <Briefcase size={22} />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-900 tracking-tight text-lg">{job.jobName}</h3>
                        <div className="flex items-center gap-3 mt-1">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${job.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                {job.status}
                            </span>
                            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold font-mono">
                                <DollarSign size={13} />
                                Budget: ${(job.budget || 0).toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-8 w-full md:w-auto">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Actual Cost</p>
                        <p className="text-xl font-black text-slate-900">${(job.totalCost || 0).toLocaleString()}</p>
                    </div>
                    {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                </div>
            </div>

            {isExpanded && (
                <div className="p-6 pt-0 border-t border-slate-50 animate-fade-in">
                    {/* Cost Breakdown Strip */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6">
                        {[
                            { label: 'Worker Cost', value: job.financials?.workerCost || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
                            { label: 'Subcontractor', value: job.financials?.subcontractorCost || 0, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                            { label: 'Equipment', value: job.financials?.equipmentCost || 0, color: 'text-orange-600', bg: 'bg-orange-50' },
                            { label: 'Materials', value: job.financials?.materialCost || 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        ].map((stat, i) => (
                            <div key={i} className={`p-4 rounded-xl border border-slate-100/50 ${stat.bg}`}>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                <p className={`text-sm font-black ${stat.color}`}>${Number(stat.value).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>

                    {/* Tables Section */}
                    <div className="space-y-8">
                        {/* Workers */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <HardHat size={18} className="text-blue-600" />
                                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Workers Time Tracking</h4>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs font-bold border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-4 py-3 text-slate-400 uppercase tracking-widest border-b border-slate-100">Worker</th>
                                            <th className="px-4 py-3 text-slate-400 uppercase tracking-widest border-b border-slate-100">Role</th>
                                            <th className="px-4 py-3 text-slate-400 uppercase tracking-widest border-b border-slate-100">Total Hours</th>
                                            <th className="px-4 py-3 text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {job.workers.length > 0 ? job.workers.map((w, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/30">
                                                <td className="px-4 py-3 text-slate-900">{w.name}</td>
                                                <td className="px-4 py-3 text-slate-500 uppercase text-[10px]">{w.role}</td>
                                                <td className="px-4 py-3 text-slate-900 font-mono">{w.totalHours}h</td>
                                                <td className="px-4 py-3 text-right text-blue-600 font-black">${Number(w.cost).toLocaleString()}</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-400 italic">No attendance data recorded</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Subcontractors */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <Users size={18} className="text-indigo-600" />
                                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Subcontractor Work</h4>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs font-bold border-collapse">
                                    <thead>
                                        <tr className="bg-indigo-50/30">
                                            <th className="px-4 py-3 text-indigo-400 uppercase tracking-widest border-b border-indigo-100/50">Name</th>
                                            <th className="px-4 py-3 text-indigo-400 uppercase tracking-widest border-b border-indigo-100/50">Work</th>
                                            <th className="px-4 py-3 text-indigo-400 uppercase tracking-widest border-b border-indigo-100/50 text-right">Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {job.subcontractors.length > 0 ? job.subcontractors.map((s, idx) => (
                                            <tr key={idx} className="hover:bg-indigo-50/10">
                                                <td className="px-4 py-3 text-slate-900">{s.name}</td>
                                                <td className="px-4 py-3 text-slate-500 italic">{s.work}</td>
                                                <td className="px-4 py-3 text-right text-indigo-600 font-black">${Number(s.cost).toLocaleString()}</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="3" className="px-4 py-8 text-center text-slate-400 italic">No subcontractor work recorded</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Equipment & Materials Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Equipment */}
                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <Wrench size={18} className="text-orange-600" />
                                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Equipment Usage</h4>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs font-bold border-collapse">
                                        <thead>
                                            <tr className="bg-orange-50/30">
                                                <th className="px-4 py-3 text-orange-400 uppercase tracking-widest border-b border-orange-100/50">Asset</th>
                                                <th className="px-4 py-3 text-orange-400 uppercase tracking-widest border-b border-orange-100/50">Usage</th>
                                                <th className="px-4 py-3 text-orange-400 uppercase tracking-widest border-b border-orange-100/50 text-right">Cost</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {job.equipment.length > 0 ? job.equipment.map((e, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-4 py-3 text-slate-900">{e.name}</td>
                                                    <td className="px-4 py-3 text-slate-500 font-mono">{e.hoursUsed}h</td>
                                                    <td className="px-4 py-3 text-right text-orange-600 font-black">${Number(e.cost).toLocaleString()}</td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan="3" className="px-4 py-8 text-center text-slate-400 italic">No equipment usage recorded</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            {/* Materials */}
                            <section>
                                <div className="flex items-center gap-2 mb-4">
                                    <Box size={18} className="text-emerald-600" />
                                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Material Consumption</h4>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs font-bold border-collapse">
                                        <thead>
                                            <tr className="bg-emerald-50/30">
                                                <th className="px-4 py-3 text-emerald-400 uppercase tracking-widest border-b border-emerald-100/50">Material</th>
                                                <th className="px-4 py-3 text-emerald-400 uppercase tracking-widest border-b border-emerald-100/50">Qty</th>
                                                <th className="px-4 py-3 text-emerald-400 uppercase tracking-widest border-b border-emerald-100/50 text-right">Cost</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {job.materials.length > 0 ? job.materials.map((m, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-4 py-3 text-slate-900">{m.name}</td>
                                                    <td className="px-4 py-3 text-emerald-700 font-black">{m.quantity}</td>
                                                    <td className="px-4 py-3 text-right text-emerald-600 font-black">${Number(m.cost).toLocaleString()}</td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan="3" className="px-4 py-8 text-center text-slate-400 italic">No material receipts found</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const DetailedReportView = () => {
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [loading, setLoading] = useState(false);
    const [detailedData, setDetailedData] = useState(null);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const res = await api.get('/projects');
                setProjects(res.data);
                if (res.data.length > 0) {
                    setSelectedProjectId(res.data[0]._id);
                }
            } catch (err) {
                console.error('Error fetching projects:', err);
            }
        };
        fetchProjects();
    }, []);

    useEffect(() => {
        if (!selectedProjectId) return;
        const fetchDetailed = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/reports/detailed/${selectedProjectId}`);
                setDetailedData(res.data);
            } catch (err) {
                console.error('Error fetching detailed report:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetailed();
    }, [selectedProjectId]);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Project Selector & Summary Card */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Selector */}
                <div className="bg-slate-900 rounded-[32px] p-8 text-white flex flex-col justify-between shadow-xl shadow-slate-200">
                    <div>
                        <h3 className="text-xl font-black tracking-tight mb-2 flex items-center gap-2">
                            <TrendingUp className="text-blue-400" size={24} /> Project Scope
                        </h3>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.1em] mb-8">Select project for drill-down analysis</p>
                        
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Target Project</label>
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-blue-400 transition-colors" size={18} />
                                <select 
                                    value={selectedProjectId}
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-blue-500/50 appearance-none font-bold text-sm transition-all"
                                >
                                    <option value="" disabled className="bg-slate-800 text-white">Select a project</option>
                                    {projects.map(p => (
                                        <option key={p._id} value={p._id} className="bg-slate-800 text-white font-bold">{p.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary Card */}
                {detailedData && (
                    <div className="xl:col-span-2 bg-white rounded-[32px] p-8 border border-slate-200/60 shadow-sm flex flex-col md:flex-row gap-8">
                        <div className="flex-1 space-y-6">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Project Financial Health</h4>
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Total Budget</p>
                                    <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none">${Number(detailedData.project.budget).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Total Jobs</p>
                                    <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{detailedData.project.totalJobs}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Current Cost</p>
                                    <p className="text-3xl font-black text-indigo-600 tracking-tighter leading-none">${Number(detailedData.project.totalCost).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Remaining</p>
                                    <p className={`text-3xl font-black tracking-tighter leading-none ${Number(detailedData.project.remainingBudget) < 0 ? 'text-red-500' : 'text-emerald-500'}`}>${Number(detailedData.project.remainingBudget).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                        <div className="w-full md:w-[1px] h-[1px] md:h-auto bg-slate-100"></div>
                        <div className="flex flex-col justify-center items-center gap-4 text-center">
                            <div className="w-20 h-20 rounded-full border-8 border-slate-100 border-t-blue-600 flex items-center justify-center -rotate-45">
                                <span className="font-black text-slate-900 text-lg rotate-45">
                                    {Math.round((Number(detailedData.project.totalCost) / Number(detailedData.project.budget || 1)) * 100)}%
                                </span>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Budget Used</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Job Wise Reports */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
                        <HardHat size={28} className="text-blue-600" /> Job-Wise Detailed Report
                    </h2>
                    <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-2xl shadow-sm">
                        <AlertCircle size={16} className="text-slate-400" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Live construction data synced</span>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center py-20 gap-4">
                        <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Aggregating Job Data...</p>
                    </div>
                ) : detailedData?.jobs?.length > 0 ? (
                    <div className="space-y-4 pb-20">
                        {detailedData.jobs.map((job, idx) => (
                            <JobCard key={idx} job={job} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] p-20 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
                            <Search size={32} className="text-slate-200" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">No job data found</h3>
                        <p className="text-slate-400 text-sm font-bold max-w-xs">There are no jobs recorded for this project yet. Start by creating jobs and logging time.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DetailedReportView;
