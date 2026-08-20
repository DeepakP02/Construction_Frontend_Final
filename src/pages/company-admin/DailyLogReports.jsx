import React, { useState, useEffect, useRef } from 'react';
import {
    FileText, Calendar, Download, Briefcase, Users,
    Sun, CloudRain, CloudSun, Wind, TrendingUp, Activity,
    RefreshCw
} from 'lucide-react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend, AreaChart, Area
} from 'recharts';
import api from '../../utils/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const DailyLogReports = () => {
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [reportData, setReportData] = useState({
        summary: { totalLogs: 0, distinctDays: 0, totalManpower: 0, avgWorkers: 0 },
        charts: { manpowerTrend: [], weatherChart: [], activityChart: [] },
        logs: []
    });
    const [filters, setFilters] = useState({ projectId: '', from: '', to: '' });

    const fetchData = async () => {
        try {
            setLoading(true);
            const [repRes, projRes] = await Promise.all([
                api.get('/dailylogs/reports', { params: filters }),
                api.get('/projects')
            ]);
            setReportData(repRes.data);
            setProjects(projRes.data);
        } catch (error) {
            console.error('Error fetching daily log reports:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [filters]);

    const handleExportExcel = () => {
        try {
            const wsData = reportData.logs.map(log => ({
                Date: new Date(log.date).toLocaleDateString(),
                // Weather: log.weather?.status || 'N/A',
                // Temperature: log.weather?.temperature || 'N/A',
                'Work Performed': log.workPerformed || '',
                'Total Workers': log.manpower?.reduce((sum, m) => sum + m.count, 0) || 0,
                'Total Hours': log.manpower?.reduce((sum, m) => sum + (m.count * m.hours), 0) || 0
            }));
            const ws = XLSX.utils.json_to_sheet(wsData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Daily Logs');
            XLSX.writeFile(wb, `Daily_Log_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            console.error('Excel Export Error:', error);
            alert('Failed to generate Excel. Please try again.');
        }
    };

    const handleExportPDF = () => {
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();

            // ── Title ──────────────────────────────────────────────
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            doc.text('Daily Log Analytical Report', 14, 20);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            doc.text(
                `Generated: ${new Date().toLocaleDateString()}  |  Period: ${filters.from || 'All Time'} - ${filters.to || 'Present'}`,
                14, 27
            );

            // ── Summary Cards ──────────────────────────────────────
            doc.setFillColor(240, 245, 255);
            doc.roundedRect(14, 33, pageWidth - 28, 30, 4, 4, 'F');

            const summaryItems = [
                { label: 'Total Logs', value: reportData.summary.totalLogs || 0 },
                { label: 'Logged Days', value: reportData.summary.distinctDays || 0 },
                { label: 'Total Manpower', value: reportData.summary.totalManpower || 0 },
                { label: 'Avg Workers/Day', value: reportData.summary.avgWorkers || 0 },
            ];

            const colW = (pageWidth - 28) / summaryItems.length;
            summaryItems.forEach((item, i) => {
                const x = 14 + i * colW + colW / 2;

                // Divider line between cards (except before first)
                if (i > 0) {
                    doc.setDrawColor(200, 210, 230);
                    doc.setLineWidth(0.3);
                    doc.line(14 + i * colW, 36, 14 + i * colW, 61);
                }

                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(120);
                doc.text(item.label, x, 41, { align: 'center' });

                doc.setFontSize(18);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(30, 41, 59);
                doc.text(item.value.toString(), x, 55, { align: 'center' });
            });

            // ── Section Title ──────────────────────────────────────
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            doc.text('Detailed Activity Logs', 14, 74);

            // ── Detailed Logs Table ────────────────────────────────
            const tableBody = reportData.logs.map(log => [
                new Date(log.date).toLocaleDateString('en-GB', {
                    day: '2-digit', month: 'short', year: 'numeric'
                }),
                // `${log.weather?.status || 'N/A'} (${log.weather?.temperature || '--'}F)`,
                log.workPerformed || 'No description provided',
                log.manpower?.reduce((acc, m) => acc + (m.count || 0), 0) || 0
            ]);

            autoTable(doc, {
                startY: 78,
                head: [['Date', /* 'Weather / Temp', */ 'Work Performed', 'Workers']],
                body: tableBody,
                theme: 'striped',
                headStyles: {
                    fillColor: [30, 41, 59],
                    textColor: 255,
                    fontSize: 8,
                    fontStyle: 'bold',
                    halign: 'left'
                },
                bodyStyles: { fontSize: 8, textColor: [50, 50, 70] },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    0: { cellWidth: 28 },
                    1: { cellWidth: 35 },
                    2: { cellWidth: 'auto' },
                    3: { cellWidth: 16, halign: 'center' }
                },
                margin: { left: 14, right: 14 },
                didDrawPage: (data) => {
                    // Footer on every page
                    const pageCount = doc.internal.getNumberOfPages();
                    doc.setFontSize(7);
                    doc.setTextColor(160);
                    doc.text(
                        `Page ${data.pageNumber} of ${pageCount}  |  Daily Log Report`,
                        pageWidth / 2,
                        doc.internal.pageSize.getHeight() - 8,
                        { align: 'center' }
                    );
                }
            });

            doc.save(`Daily_Log_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('PDF Export Error:', error);
            alert(`PDF Error: ${error.message}`);
        }
    };

    return (
        <div className="p-8 space-y-8 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Daily Log Reports</h1>
                    <p className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-xs flex items-center gap-2">
                        <Activity size={14} className="text-blue-600" /> Operational Analytics &amp; Site Performance
                    </p>
                </div>
                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={handleExportExcel}
                        className="px-6 py-3 bg-white border-2 border-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 hover:border-emerald-200 hover:text-emerald-600 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <FileText size={16} /> Excel Export
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="px-6 py-3 bg-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white hover:bg-slate-800 transition-all flex items-center gap-2 shadow-xl shadow-slate-200"
                    >
                        <Download size={16} /> Download PDF
                    </button>
                </div>
            </div>

            {/* Filter Section */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-200/60 shadow-sm flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-1 w-full space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Project</label>
                    <div className="relative">
                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            value={filters.projectId}
                            onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/50 text-sm font-bold text-slate-700 appearance-none cursor-pointer"
                        >
                            <option value="">All Active Projects</option>
                            {projects.map(p => (
                                <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="w-full md:w-auto grid grid-cols-2 gap-4 flex-1">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">From Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="date" value={filters.from}
                                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                                className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500/50 text-[11px] font-bold text-slate-600 cursor-pointer"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">To Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input type="date" value={filters.to}
                                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                                className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500/50 text-[11px] font-bold text-slate-600 cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-end self-end pb-1">
                    <button
                        onClick={() => setFilters({ projectId: '', from: '', to: '' })}
                        className="px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2"
                    >
                        <RefreshCw size={14} /> Reset
                    </button>
                </div>
            </div>

            {/* Summary Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <WidgetCard label="Total Logged Days" value={reportData.summary.distinctDays} icon={<Calendar size={24} />} color="blue" trend="Project Span" />
                <WidgetCard label="Total Logs Filed" value={reportData.summary.totalLogs} icon={<FileText size={24} />} color="violet" trend="Documentation" />
                <WidgetCard label="Total Manpower" value={reportData.summary.totalManpower} icon={<Users size={24} />} color="emerald" trend="Workers" />
                <WidgetCard label="Avg Workers/Day" value={reportData.summary.avgWorkers} icon={<Activity size={24} />} color="orange" trend="Daily Average" />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Manpower Trend */}
                <div className="bg-white p-8 rounded-[40px] border border-slate-200/60 shadow-sm space-y-6 overflow-hidden">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Workforce Trend</h3>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Daily Manpower Count</p>
                        </div>
                        <TrendingUp className="text-blue-500" size={24} />
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={reportData.charts.manpowerTrend}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" fontSize={10} tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
                                <YAxis fontSize={10} />
                                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Weather Distribution - Commented out as per client request */}
                {/* <div className="bg-white p-8 rounded-[40px] border border-slate-200/60 shadow-sm space-y-6 overflow-hidden">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Weather Distribution</h3>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Site Conditions Percentage</p>
                        </div>
                        <Sun className="text-orange-500" size={24} />
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={reportData.charts.weatherChart} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {reportData.charts.weatherChart.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" align="center" iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div> */}

                {/* Activity Frequency */}
                <div className="bg-white p-8 rounded-[40px] border border-slate-200/60 shadow-sm space-y-6 overflow-hidden lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Work Activity Frequency</h3>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Top keywords from site work performed logs</p>
                        </div>
                        <Activity className="text-emerald-500" size={24} />
                    </div>

                    {reportData.charts.activityChart.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-3 text-slate-300">
                            <Activity size={40} strokeWidth={1.5} />
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">No activity data yet — add daily log entries</p>
                        </div>
                    ) : (
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={reportData.charts.activityChart}
                                    margin={{ top: 24, right: 16, left: 0, bottom: 8 }}
                                    barCategoryGap="30%"
                                >
                                    <defs>
                                        {reportData.charts.activityChart.map((_, i) => (
                                            <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={COLORS[i % COLORS.length]} stopOpacity={1} />
                                                <stop offset="100%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.5} />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        fontSize={11}
                                        fontWeight="700"
                                        tick={{ fill: '#64748b' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis hide />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(59,130,246,0.05)', radius: 8 }}
                                        contentStyle={{
                                            borderRadius: '16px',
                                            border: 'none',
                                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12)',
                                            fontWeight: 'bold',
                                            fontSize: '12px'
                                        }}
                                        formatter={(value) => [`${value} occurrences`, 'Frequency']}
                                    />
                                    <Bar
                                        dataKey="count"
                                        radius={[10, 10, 4, 4]}
                                        barSize={36}
                                        label={{
                                            position: 'top',
                                            fontSize: 11,
                                            fontWeight: 'bold',
                                            fill: '#334155'
                                        }}
                                    >
                                        {reportData.charts.activityChart.map((_, i) => (
                                            <Cell key={i} fill={`url(#barGrad${i})`} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>

            {/* Detailed Preview Table */}
            <div className="bg-white rounded-[40px] border border-slate-200/60 shadow-sm overflow-hidden overflow-x-auto">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Report Log Preview</h3>
                    <div className="px-4 py-1.5 bg-slate-50 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-100">
                        {reportData.logs.length} Entries
                    </div>
                </div>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                            {/* <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Weather</th> */}
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Work Performed</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Workers</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr>
                                <td colSpan="4" className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-10 h-10 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin"></div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Loading Data...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : reportData.logs.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-8 py-32 text-center">
                                    <div className="flex flex-col items-center gap-6 max-w-sm mx-auto">
                                        <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center border-2 border-dashed border-slate-100">
                                            <FileText size={32} />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-black text-slate-900 tracking-tight">No Operational Logs Found</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                                To generate reports, record site activities through the Site Log module.
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => window.location.href='/company-admin/daily-logs'}
                                            className="px-6 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all border border-blue-100"
                                        >
                                            Submit Your First Log
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            reportData.logs.map((log, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5">
                                        <p className="text-sm font-black text-slate-900 leading-none">
                                            {new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                                            {new Date(log.date).toLocaleDateString(undefined, { weekday: 'short' })}
                                        </p>
                                    </td>
                                    {/* <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            <WeatherStatus status={log.weather?.status} />
                                            <span className="text-xs font-bold text-slate-600">{log.weather?.temperature}°F</span>
                                        </div>
                                    </td> */}
                                    <td className="px-8 py-5">
                                        <p className="text-xs font-bold text-slate-600 line-clamp-2 leading-relaxed">
                                            {log.workPerformed}
                                        </p>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-xs font-black">
                                            {log.manpower?.reduce((acc, m) => acc + m.count, 0) || 0}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const WidgetCard = ({ label, value, icon, color, trend }) => {
    const colorText = {
        blue: 'text-blue-600', emerald: 'text-emerald-600',
        violet: 'text-violet-600', orange: 'text-orange-600'
    };
    return (
        <div className="bg-white p-3.5 md:p-4 rounded-xl md:rounded-2xl border border-slate-200/60 shadow-sm relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-4 md:p-5 opacity-5 group-hover:scale-110 transition-transform ${colorText[color]}`}>
                {React.cloneElement(icon, { size: 40 })}
            </div>
            <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter leading-none">{value}</h3>
            <div className={`mt-3 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tight ${colorText[color]}`}>
                <Activity size={11} /> {trend}
            </div>
        </div>
    );
};

const WeatherStatus = ({ status }) => {
    switch (status) {
        case 'Sunny': return <Sun size={14} className="text-orange-500" />;
        case 'Rainy': return <CloudRain size={14} className="text-blue-500" />;
        case 'Cloudy': return <CloudSun size={14} className="text-slate-500" />;
        case 'Windy': return <Wind size={14} className="text-sky-500" />;
        default: return <Sun size={14} className="text-orange-500" />;
    }
};

export default DailyLogReports;
