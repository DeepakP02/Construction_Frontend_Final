import { useState, useEffect } from 'react';
import {
    Users, Briefcase, Calendar, Clock, Download,
    FileText, Filter, ChevronRight, TrendingUp, Search
} from 'lucide-react';
import api from '../../utils/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const Activity = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
);

const HardHat = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z" />
        <path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5" />
        <path d="M4 15v-3a8 8 0 0 1 16 0v3" />
    </svg>
);

const AttendanceReports = () => {
    const [activeTab, setActiveTab] = useState('workers');
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState([]);
    const [projects, setProjects] = useState([]);
    const [filters, setFilters] = useState({
        projectId: '',
        startDate: '',
        endDate: ''
    });

    const tabs = [
        { id: 'workers', label: 'Worker Hours', icon: Users },
        { id: 'foremen', label: 'Foreman Hours', icon: HardHat },
        { id: 'projects', label: 'Project Summary', icon: Briefcase }
    ];

    const fetchData = async () => {
        try {
            setLoading(true);
            const endpoint = `/reports/attendance/${activeTab}`;
            const res = await api.get(endpoint, { params: filters });
            setReportData(res.data);

            if (projects.length === 0) {
                const projRes = await api.get('/projects');
                setProjects(projRes.data);
            }
        } catch (error) {
            console.error('Error fetching report:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab, filters]);

    const handleExportExcel = () => {
        // Simple CSV export
        let headers = [];
        let rows = [];

        if (activeTab === 'workers' || activeTab === 'foremen') {
            headers = ['Name', 'Role', 'Total Hours', 'Days Worked', 'Avg Hours/Day'];
            rows = reportData.map(r => [
                r.fullName,
                r.role || 'N/A',
                r.totalHours,
                r.totalDaysWorked,
                r.averageHoursPerDay
            ]);
        } else {
            headers = ['Project Name', 'Worker Hours', 'Foreman Hours', 'Grand Total', 'Entries'];
            rows = reportData.map(r => [
                r.projectName,
                r.workerHours,
                r.foremanHours,
                r.totalHours,
                r.totalAttendanceEntries
            ]);
        }

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `Attendance_Report_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const title = `Attendance Report - ${activeTab === 'projects' ? 'Project Summary' : activeTab === 'workers' ? 'Worker Hours' : 'Foreman Hours'}`;

        doc.setFontSize(20);
        doc.text(title, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
        if (filters.startDate) doc.text(`Date Range: ${filters.startDate} to ${filters.endDate || 'Present'}`, 14, 38);

        let head = [];
        let body = [];

        if (activeTab === 'workers' || activeTab === 'foremen') {
            head = [['Name', 'Role', 'Total Hours', 'Days Worked', 'Avg Hours/Day']];
            body = reportData.map(r => [r.fullName, r.role || 'N/A', r.totalHours, r.totalDaysWorked, r.averageHoursPerDay]);
        } else {
            head = [['Project Name', 'Worker Hours', 'Foreman Hours', 'Grand Total', 'Entries']];
            body = reportData.map(r => [r.projectName, r.workerHours, r.foremanHours, r.totalHours, r.totalAttendanceEntries]);
        }

        autoTable(doc, {
            startY: 45,
            head: head,
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59] }
        });

        doc.save(`Attendance_Report_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const totalHours = reportData.reduce((acc, curr) => acc + (curr.totalHours || 0), 0);
    const totalCount = reportData.length;

    return (
        <div className="p-8 space-y-8 animate-fade-in">
            {/* Header section with Stats */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Attendance Intelligence</h1>
                    <p className="text-slate-500 font-bold mt-1">Comprehensive labor hours and resource tracking</p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={handleExportExcel}
                        className="px-6 py-3 bg-white border-2 border-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-600 hover:border-emerald-200 hover:text-emerald-600 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <FileText size={16} /> Excel (CSV)
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="px-6 py-3 bg-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest text-white hover:bg-slate-800 transition-all flex items-center gap-2 shadow-xl shadow-slate-200"
                    >
                        <Download size={16} /> Export PDF
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                <div className="bg-white p-3.5 md:p-4 rounded-xl md:rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 md:p-5 opacity-5 group-hover:scale-110 transition-transform">
                        <Clock size={64} />
                    </div>
                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Hours Logged</p>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter leading-none">{totalHours.toFixed(1)}h</h3>
                    <div className="mt-3 flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 uppercase tracking-tight">
                        <TrendingUp size={11} /> System Total
                    </div>
                </div>
                <div className="bg-white p-3.5 md:p-4 rounded-xl md:rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 md:p-5 opacity-5 group-hover:scale-110 transition-transform">
                        <Users size={64} />
                    </div>
                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Resources</p>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter leading-none">{totalCount}</h3>
                    <div className="mt-3 flex items-center gap-1.5 text-[9px] font-bold text-blue-600 uppercase tracking-tight">
                        <Activity size={11} /> Active Entries
                    </div>
                </div>
            </div>

            {/* Filters and Tabs */}
            <div className="bg-white rounded-[40px] border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-50/30">
                    <div className="flex p-1 bg-white border border-slate-200 rounded-2xl shadow-inner">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab.id
                                    ? 'bg-slate-900 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                <tab.icon size={14} /> {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                <Search size={14} />
                            </span>
                            <select
                                value={filters.projectId}
                                onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
                                className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-600 focus:outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer min-w-[200px]"
                            >
                                <option value="">All Projects</option>
                                {projects.map(p => (
                                    <option key={p._id} value={p._id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <input
                            type="date"
                            className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-600 focus:outline-none focus:border-blue-500"
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        />
                        <span className="text-slate-300 font-bold">to</span>
                        <input
                            type="date"
                            className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-600 focus:outline-none focus:border-blue-500"
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50">
                                {activeTab !== 'projects' ? (
                                    <>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Resource</th>
                                        {activeTab === 'workers' && (
                                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                                        )}
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Hours</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Days Worked</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Average (H/D)</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Project</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Worker Hours</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Foreman Hours</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Grand Total</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Entries</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-10 h-10 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin"></div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Computing Aggregates...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : reportData.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                                                <Calendar size={32} />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No data for selected period</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                reportData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                        {activeTab !== 'projects' ? (
                                            <>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 text-sm group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                                                            {row.fullName?.split(' ').map(n => n[0]).join('') || '??'}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-slate-900 text-sm tracking-tight">{row.fullName}</p>
                                                            <p className="text-[10px] font-bold text-slate-400">{row.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                {activeTab === 'workers' && (
                                                    <td className="px-8 py-5">
                                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${row.role === 'FOREMAN'
                                                            ? 'bg-amber-50 text-amber-600 border-amber-100'
                                                            : 'bg-blue-50 text-blue-600 border-blue-100'
                                                            }`}>
                                                            {row.role}
                                                        </span>
                                                    </td>
                                                )}
                                                <td className="px-8 py-5 font-black text-slate-900 text-sm">{row.totalHours}h</td>
                                                <td className="px-8 py-5 font-black text-slate-900 text-sm">{row.totalDaysWorked}</td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-slate-900 text-sm">{row.averageHoursPerDay}h</span>
                                                        <div className="flex-1 max-w-[60px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${row.averageHoursPerDay > 8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                                style={{ width: `${Math.min(row.averageHoursPerDay * 10, 100)}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                                                            <Briefcase size={18} />
                                                        </div>
                                                        <p className="font-black text-slate-900 text-sm tracking-tight">{row.projectName}</p>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 font-bold text-slate-600 text-sm">{row.workerHours}h</td>
                                                <td className="px-8 py-5 font-bold text-slate-600 text-sm">{row.foremanHours}h</td>
                                                <td className="px-8 py-5 font-black text-slate-900 text-sm">{row.totalHours}h</td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-slate-600 text-sm">{row.totalAttendanceEntries}</span>
                                                        <ChevronRight size={14} className="text-slate-200 group-hover:text-slate-400 transition-all" />
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};



export default AttendanceReports;
