import { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    Download, Calendar, ArrowUpRight, ArrowDownRight, DollarSign,
    Activity, Briefcase, Clock, Shield, TrendingUp, Filter,
    ChevronDown, Printer, FileText, PieChart as PieIcon, BarChart2,
    Wrench, CheckSquare, Layers, AlertCircle, CheckCircle2, LayoutGrid, List
} from 'lucide-react';
import api from '../../utils/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../../assets/images/Logo.png';
import DetailedReportView from './DetailedReportView';

const Reports = () => {
    const [activeTab, setActiveTab] = useState('summary');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        financials: { totalRevenue: 0, totalInvoiced: 0, outstanding: 0, projectBudget: 0 },
        projects: { total: 0, preConstruction: 0, activeSites: 0, onHold: 0, handedOver: 0 },
        tasks: { total: 0, completed: 0, overdue: 0, completionRate: 0 },
        labor: { totalHours: 0, productivityData: [] },
        safety: { totalIncidents: 0, daysIncidentFree: 0 },
        equipment: { total: 0, operational: 0 },
        jobs: { total: 0, completed: 0 }
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/reports/company');
            setData(res.data);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleExportPDF = () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const now = new Date().toLocaleDateString();

        // Header
        const img = new Image();
        img.src = logo;
        doc.addImage(img, 'PNG', 15, 10, 15, 15);
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42);
        doc.text('Company Intelligence Report', 40, 21);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on ${now} | KAAL Construction Management`, 40, 27);

        doc.setLineWidth(0.5);
        doc.setDrawColor(226, 232, 240);
        doc.line(15, 35, 195, 35);

        // Stats Table
        autoTable(doc, {
            startY: 45,
            head: [['Department', 'Key Metric', 'Performance']],
            body: [
                ['FINANCE', 'Total Revenue Collected', `$${data.financials.totalRevenue.toLocaleString()}`],
                ['FINANCE', 'Outstanding Receivables', `$${data.financials.outstanding.toLocaleString()}`],
                ['PROJECTS', 'Active Sites', data.projects.activeSites],
                ['TASKS', 'Total Tasks Organized', data.tasks.total],
                ['TASKS', 'Tasks Overdue', data.tasks.overdue],
                ['TASKS', 'Completion Efficiency', `${data.tasks.completionRate}%`],
                ['WORKFORCE', 'Cumulative Labor Hours', `${data.labor.totalHours}h`],
                ['ASSETS', 'Equipment Operational', `${data.equipment.operational}/${data.equipment.total}`],
                ['JOBS', 'Job Completion Rate', `${data.jobs.total > 0 ? ((data.jobs.completed / data.jobs.total) * 100).toFixed(1) : 0}%`],
                ['SAFETY', 'Incident Free Days', data.safety.daysIncidentFree]
            ],
            theme: 'striped',
            headStyles: { fillColor: [30, 58, 95] }
        });

        doc.save(`KAAL_Intelligence_${now.replace(/\//g, '-')}.pdf`);
    };

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-[70vh] gap-4">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <TrendingUp size={24} className="text-blue-600 animate-pulse" />
                    </div>
                </div>
                <p className="text-slate-400 font-black text-xs uppercase tracking-[0.2em] animate-pulse">Syncing System Data...</p>
            </div>
        );
    }

    const { financials, projects, tasks, labor, safety, equipment, jobs } = data;

    const jobCompletionRate = jobs.total > 0 ? (jobs.completed / jobs.total) * 100 : 0;
    const equipmentHealth = equipment.total > 0 ? (equipment.operational / equipment.total) * 100 : 0;

    const projectStatusData = [
        { name: 'Pre-Construction', value: projects.preConstruction || 0, color: '#94a3b8' },
        { name: 'Active Site', value: projects.activeSites || 0, color: '#3b82f6' },
        { name: 'On Hold', value: projects.onHold || 0, color: '#f43f5e' },
        { name: 'Handed Over', value: projects.handedOver || 0, color: '#10b981' },
    ];

    return (
        <div className="space-y-8 pb-12 animate-fade-in">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Business Intelligence</h1>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-blue-100">Live System Feed</span>
                        <div className="h-4 w-[1px] bg-slate-200"></div>
                        <p className="text-slate-400 font-bold text-sm tracking-tight flex items-center gap-2">
                            <Calendar size={14} /> Analytics Hub · 2026
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => fetchData()}
                        className="p-3 bg-white border-2 border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-100 rounded-2xl transition-all shadow-sm"
                        title="Refresh Data"
                    >
                        <Activity size={20} />
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-slate-800 transition shadow-xl shadow-slate-200 font-black text-sm uppercase tracking-tight"
                    >
                        <Download size={18} /> Export Intel
                    </button>
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-2xl w-fit mb-8 border border-slate-200/60">
                <button 
                    onClick={() => setActiveTab('summary')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all ${activeTab === 'summary' ? 'bg-white text-slate-900 shadow-lg shadow-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                >
                    <LayoutGrid size={16} /> Summary Dashboard
                </button>
                <button 
                    onClick={() => setActiveTab('detailed')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all ${activeTab === 'detailed' ? 'bg-white text-slate-900 shadow-lg shadow-slate-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                >
                    <List size={16} /> Detailed Reports
                </button>
            </div>

            {activeTab === 'summary' ? (
                <>
                    {/* Core Metrics Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Revenue', value: financials.totalRevenue, sub: 'Confirmed Earnings', icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50', unit: '$' },
                            { label: 'Active Sites', value: projects.activeSites, sub: `${projects.total} Projects`, icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-50' },
                            { label: 'Resource Time', value: labor.totalHours, sub: 'Total Man-Hours', icon: Clock, color: 'text-violet-500', bg: 'bg-violet-50', unitAfter: 'h' },
                            { label: 'Safety Index', value: safety.daysIncidentFree, sub: `${safety.totalIncidents} Incidents`, icon: Shield, color: 'text-amber-500', bg: 'bg-amber-50', unitAfter: 'd' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-white p-3.5 md:p-4 rounded-xl md:rounded-2xl shadow-sm border border-slate-200/50 relative overflow-hidden group hover:shadow-md transition-all duration-300">
                                <div className={`absolute top-0 right-0 w-16 h-16 ${stat.bg} -mr-4 -mt-4 rounded-full blur-xl opacity-20 group-hover:scale-150 transition-transform duration-700`}></div>
                                <div className="relative z-10">
                                    <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-3 shadow-inner`}>
                                        <stat.icon size={18} />
                                    </div>
                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">{stat.label}</p>
                                    <div className="flex items-baseline gap-1">
                                        {stat.unit && <span className="text-sm font-black text-slate-400 tracking-tighter">{stat.unit}</span>}
                                        <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter leading-none">{stat.value.toLocaleString()}</h3>
                                        {stat.unitAfter && <span className="text-xs font-black text-slate-400 ml-0.5">{stat.unitAfter}</span>}
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                                        <p className="text-[10px] font-bold text-slate-400 tracking-tight">{stat.sub}</p>
                                        <ArrowUpRight size={12} className="text-slate-300" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Sub Metrics Area */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-white border border-slate-200/50 rounded-2xl flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-inner">
                                <CheckSquare size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Task Completion</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-black text-slate-900 leading-none">{tasks.completionRate}%</span>
                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${tasks.completionRate}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-white border border-slate-200/50 rounded-2xl flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shadow-inner">
                                <Clock size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Overdue Tasks</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-black text-slate-900 leading-none">{tasks.overdue}</span>
                                    <span className="text-[8px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md uppercase tracking-widest">Action Needed</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-white border border-slate-200/50 rounded-2xl flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                                <DollarSign size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Budget Allocation</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg font-black text-slate-900 leading-none">${(financials.projectBudget > 999999 ? (financials.projectBudget / 1000000).toFixed(1) + 'M' : (financials.projectBudget / 1000).toFixed(0) + 'K')}</span>
                                    <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md uppercase tracking-widest">Total</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Analytics Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* 1. Financial Velocity Area Chart */}
                        <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200/50">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                                        <BarChart2 size={20} className="text-blue-600" /> Financial Distribution
                                    </h3>
                                    <p className="text-xs text-slate-400 font-bold mt-1">Comparison of booked revenue vs. outstanding dues</p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Revenue</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Outstanding</span>
                                    </div>
                                </div>
                            </div>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={[
                                        { name: 'Total Invoiced', revenue: financials.totalInvoiced, outstanding: 0 },
                                        { name: 'Collected', revenue: financials.totalRevenue, outstanding: 0 },
                                        { name: 'Pending', revenue: 0, outstanding: financials.outstanding }
                                    ]} barSize={60} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 900 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 900 }} tickFormatter={(val) => `$${val > 999 ? (val / 1000).toFixed(0) + 'k' : val}`} />
                                        <RechartsTooltip
                                            cursor={{ fill: '#f8fafc' }}
                                            contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '15px' }}
                                        />
                                        <Bar dataKey="revenue" stackId="a" fill="#3b82f6" radius={[12, 12, 0, 0]} />
                                        <Bar dataKey="outstanding" stackId="a" fill="#f1f5f9" radius={[12, 12, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 2. Project Portfolio Pie */}
                        <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200/50 flex flex-col">
                            <div className="mb-0">
                                <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                                    <PieIcon size={20} className="text-indigo-600" /> Project Status Feed
                                </h3>
                                <p className="text-xs text-slate-400 font-bold mt-1">Status distribution across the fleet</p>
                            </div>
                            <div className="flex-1 min-h-[300px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={projectStatusData}
                                            cx="50%" cy="50%"
                                            innerRadius={75} outerRadius={105}
                                            paddingAngle={10}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {projectStatusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-3xl font-black text-slate-900 tracking-tighter">{projects.total}</span>
                                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-[.2em]">Total</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                {projectStatusData.map((s, i) => (
                                    <div key={i} className="bg-slate-50 p-3 rounded-2xl flex flex-col items-center">
                                        <div className="w-1.5 h-1.5 rounded-full mb-2" style={{ backgroundColor: s.color }}></div>
                                        <span className="text-[10px] font-black text-slate-900">{s.value}</span>
                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider text-center leading-tight">{s.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Productivity WaveSection */}
                    <div className="bg-slate-900 p-6 md:p-8 rounded-[32px] md:rounded-[40px] shadow-2xl shadow-slate-200/50">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                                    <Activity size={24} className="text-indigo-400" /> Site Labor Velocity
                                </h3>
                                <p className="text-slate-400 text-sm font-bold mt-1 uppercase tracking-[0.1em]">Total collective hours logged per day</p>
                            </div>
                            <div className="px-4 py-2 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-md bg-indigo-500"></div>
                                        <span className="text-[10px] font-black uppercase text-white tracking-widest">Efficiency Wave</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={labor.productivityData}>
                                    <defs>
                                        <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                    <XAxis
                                        dataKey="day"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 900 }}
                                        dy={15}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 900 }}
                                        tickFormatter={(val) => `${val}h`}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '15px' }}
                                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                        cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="hours"
                                        stroke="#818cf8"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorHours)"
                                        dot={{ fill: '#818cf8', strokeWidth: 2, r: 4, stroke: '#1e293b' }}
                                        activeDot={{ r: 7, fill: '#fff' }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Outstanding Tasks Section */}
                    <div className="bg-white rounded-[40px] border border-slate-200/60 shadow-sm overflow-hidden mb-8">
                        <div className="p-6 md:p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                    <AlertCircle size={20} className="text-red-500" /> Outstanding Tasks & Action Items
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Items requiring immediate site attention</p>
                            </div>
                            <div className="px-4 py-1.5 bg-red-50 rounded-full text-[10px] font-black text-red-500 uppercase tracking-widest border border-red-100 animate-pulse">
                                {tasks.overdue} OVERDUE
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/30">
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Task Title</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Site</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Due Date</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {tasks.outstandingTasks?.length > 0 ? (
                                        tasks.outstandingTasks.map((t, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-8 py-4">
                                                    <p className="text-sm font-black text-slate-900">{t.title}</p>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <Briefcase size={12} className="text-blue-500" />
                                                        <span className="text-xs font-bold text-slate-600">{t.projectName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-4">
                                                    <p className="text-xs font-black text-red-500 leading-none">
                                                        {new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </p>
                                                </td>
                                                <td className="px-8 py-4 text-right">
                                                    <span className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-red-100">
                                                        Overdue
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="px-8 py-12 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <CheckCircle2 size={32} className="text-emerald-500" />
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No overdue tasks found. All sites on track.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Operational Summary */}
                    <div className="bg-slate-50 p-4 md:p-6 rounded-[32px] border border-slate-200/60 pb-10">
                        <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Operational Summary</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-4 bg-white rounded-2xl border border-slate-200/40">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Invoicing Health</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-xl font-black text-slate-800">{financials.totalInvoiced > 0 ? ((financials.totalRevenue / financials.totalInvoiced) * 100).toFixed(1) : 0}%</span>
                                    <TrendingUp size={16} className="text-emerald-500" />
                                </div>
                            </div>
                            <div className="p-4 bg-white rounded-2xl border border-slate-200/40">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">System Load</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-xl font-black text-slate-800">Normal</span>
                                    <Layers size={16} className="text-blue-500" />
                                </div>
                            </div>
                            <div className="lg:col-span-2 p-4 bg-indigo-600 rounded-3xl text-white flex items-center justify-between shadow-lg shadow-indigo-100">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <Shield size={18} className="text-indigo-200" />
                                        <span className="text-sm font-black uppercase tracking-widest leading-none">Compliance Status</span>
                                    </div>
                                    <p className="text-xs font-bold text-indigo-100/80 leading-relaxed max-w-sm">Current site safety inspections are up to date. Safety index is at 98.4%. Risk index remains Low.</p>
                                </div>
                                <button className="px-5 py-2 bg-white text-indigo-600 hover:bg-indigo-50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Review Hub</button>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <DetailedReportView />
            )}
        </div>
    );
};

export default Reports;
