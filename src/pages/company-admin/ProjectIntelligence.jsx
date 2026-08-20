import React, { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import {
    LayoutDashboard,
    FileText,
    Package,
    HardHat,
    Truck,
    Users,
    ChevronDown,
    ChevronRight,
    DollarSign,
    Clock,
    CheckCircle,
    AlertCircle,
    Plus,
    Minus,
    ArrowUpRight,
    Search,
    Filter,
    Download,
    BarChart3,
    Layers,
    Calendar,
    Paperclip,
    ClipboardList,
    Sun,
    ChevronLeft,
    CornerDownRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../../assets/images/Logo.png';

const ProjectIntelligence = () => {
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [selectedJobId, setSelectedJobId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [expandedTasks, setExpandedTasks] = useState({});
    const [activeTab, setActiveTab] = useState('jobs'); // 'jobs' or 'site'
    const [jobSearch, setJobSearch] = useState('');
    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
    const [projectSearch, setProjectSearch] = useState('');
    const dropdownRef = useRef(null);

    // Click outside to close project dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsProjectDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch list of projects for the dropdown
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const res = await api.get('/projects');
                const projectsData = Array.isArray(res.data) ? res.data : (res.data?.projects || []);
                setProjects(projectsData);
                if (projectsData.length > 0) {
                    setSelectedProjectId(projectsData[0]._id);
                }
            } catch (err) {
                console.error("Error fetching projects", err);
                setProjects([]);
            }
        };
        fetchProjects();
    }, []);

    // Fetch the detailed intelligence report
    useEffect(() => {
        if (!selectedProjectId) return;

        const fetchReport = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/reports/detailed/${selectedProjectId}`);
                setReportData(res.data);
                setSelectedJobId(null); // Reset when project changes
            } catch (err) {
                console.error("Error fetching report", err);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [selectedProjectId]);

    const toggleTask = (taskId) => {
        setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
    };

    // Auto-expand all tasks when data loads or job changes
    useEffect(() => {
        if (!selectedJob?.tasks) return;
        
        const allIds = {};
        const collectIds = (tasks) => {
            tasks.forEach(t => {
                if (t._id) {
                    allIds[t._id] = true;
                    if (t.subtasks && t.subtasks.length > 0) {
                        collectIds(t.subtasks);
                    }
                }
            });
        };
        
        collectIds(selectedJob.tasks);
        setExpandedTasks(allIds);
    }, [selectedJobId, reportData]);

    const handleDownloadJobPDF = (job) => {
        if (!reportData) return;
        const { project } = reportData;
        const doc = new jsPDF('p', 'mm', 'a4');
        const now = new Date().toLocaleDateString();
        const pageWidth = doc.internal.pageSize.width;

        // Custom Blue Header
        doc.setFillColor(30, 58, 138);
        doc.rect(0, 0, pageWidth, 45, 'F');

        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('JOB INTELLIGENCE AUDIT', 15, 20);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`KAAL Construction Management Systems | Chronological Audit Log`, 15, 28);
        doc.text(`Generated: ${now} | Project: ${project.name || 'N/A'}`, 15, 33);
        doc.text(`Job Unit: ${job.jobName || 'N/A'}`, 15, 38);

        // --- Summary Stats ---
        doc.setFontSize(14);
        doc.setTextColor(30, 58, 138);
        doc.setFont('helvetica', 'bold');
        doc.text('EXECUTIVE SUMMARY', 15, 55);
        doc.line(15, 57, 195, 57);

        autoTable(doc, {
            startY: 62,
            head: [['Operational Metric', 'Audit Value']],
            body: [
                ['Current Phase Status', (job.status || 'Active').toUpperCase()],
                ['Cumulative Job Cost', `$ ${parseFloat(job.totalCost || 0).toLocaleString()}`],
                ['Completion Percentage', `${job.progress || 0}%`],
                ['Labor Exposure', `$ ${parseFloat(job.financials?.workerCost || 0).toLocaleString()}`],
                ['Material Exposure', `$ ${parseFloat(job.financials?.materialCost || 0).toLocaleString()}`]
            ],
            theme: 'striped',
            headStyles: { fillStyle: [30, 58, 138], textColor: 255 }
        });

        // --- Execution Hierarchy (Tasks) ---
        let currentY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.text('EXECUTION HIERARCHY', 15, currentY);
        doc.line(15, currentY + 2, 195, currentY + 2);

        const flattenTasks = (tasks, level = 0) => {
            let result = [];
            tasks.forEach(t => {
                const prefix = level > 0 ? '   '.repeat(level) + '└─ ' : '';
                result.push([
                    prefix + t.title,
                    (t.status || 'Active').toUpperCase(),
                    t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'
                ]);
                if (t.subtasks && t.subtasks.length > 0) {
                    result = result.concat(flattenTasks(t.subtasks, level + 1));
                }
            });
            return result;
        };

        autoTable(doc, {
            startY: currentY + 7,
            head: [['Architecture & Implementation', 'Status', 'Timeline']],
            body: flattenTasks(job.tasks || []),
            theme: 'grid',
            headStyles: { fillColor: [51, 65, 85] }
        });

        // --- Labor Logs ---
        if (job.workers && job.workers.length > 0) {
            currentY = doc.lastAutoTable.finalY + 15;
            if (currentY > 250) { doc.addPage(); currentY = 20; }
            doc.setFontSize(14);
            doc.text('PERSONNEL LOGISTICS', 15, currentY);
            autoTable(doc, {
                startY: currentY + 5,
                head: [['Name', 'Role', 'Hours', 'Cost']],
                body: job.workers.map(w => [w.name, w.role, w.totalHours, `$${w.cost}`]),
                theme: 'striped'
            });
        }

        // --- Materials ---
        if (job.materials && job.materials.length > 0) {
            currentY = doc.lastAutoTable.finalY + 15;
            if (currentY > 250) { doc.addPage(); currentY = 20; }
            doc.setFontSize(14);
            doc.text('MATERIAL CONSUMPTION', 15, currentY);
            autoTable(doc, {
                startY: currentY + 5,
                head: [['Material', 'PO#', 'Qty', 'Cost']],
                body: job.materials.map(m => [m.itemName, m.poNumber, m.quantity, `$${m.cost}`]),
                theme: 'striped'
            });
        }

        // --- Notes/Intelligence ---
        if (job.notes && job.notes.length > 0) {
            currentY = doc.lastAutoTable.finalY + 15;
            if (currentY > 250) { doc.addPage(); currentY = 20; }
            doc.setFontSize(14);
            doc.text('FIELD INTELLIGENCE NOTES', 15, currentY);
            autoTable(doc, {
                startY: currentY + 5,
                head: [['Date', 'Personnel', 'Observation']],
                body: job.notes.map(n => [new Date(n.date).toLocaleDateString(), n.author, n.content]),
                theme: 'grid',
                columnStyles: { 2: { cellWidth: 100 } }
            });
        }

        doc.save(`${(job.jobName || 'Job').replace(/\s+/g, '_')}_Full_Audit.pdf`);
    };

    if (!reportData && loading) return <Loader />;

    const project = reportData?.project || {};
    const jobs = reportData?.jobs || [];
    const filteredJobs = jobs.filter(j => j.jobName?.toLowerCase().includes(jobSearch.toLowerCase()));
    const selectedJob = jobs.find(j => j._id === selectedJobId);

    return (
        <div className="min-h-screen bg-slate-50/50 p-3 md:p-10">
            {/* ─── HEADER AREA ─── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
                            <BarChart3 className="text-white" size={24} />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight uppercase">Intelligence Command Center</h1>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
                    <div className="relative group w-full sm:w-auto" ref={dropdownRef}>
                        <div 
                            onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                            className="pl-12 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl text-[12px] font-bold uppercase text-slate-700 shadow-sm hover:border-slate-300 cursor-pointer transition-all w-full sm:min-w-[320px] flex items-center justify-between"
                        >
                             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                             <span className="truncate mr-2">{projects.find(p => p._id === selectedProjectId)?.name || 'Select Project Intelligence'}</span>
                             <ChevronDown className={`text-slate-400 flex-shrink-0 transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`} size={18} />
                        </div>

                        <AnimatePresence>
                            {isProjectDropdownOpen && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden"
                                >
                                    <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                                        <input
                                            type="text"
                                            placeholder="Search project database..."
                                            value={projectSearch}
                                            onChange={(e) => setProjectSearch(e.target.value)}
                                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase outline-none focus:border-blue-500 transition-all"
                                            onClick={(e) => e.stopPropagation()}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="max-h-[300px] overflow-y-auto">
                                        {projects
                                            .filter(p => p.name?.toLowerCase().includes(projectSearch.toLowerCase()))
                                            .map(p => (
                                                <div
                                                    key={p._id}
                                                    onClick={() => {
                                                        setSelectedProjectId(p._id);
                                                        setIsProjectDropdownOpen(false);
                                                        setProjectSearch('');
                                                    }}
                                                    className={`px-5 py-3.5 text-[11px] font-bold uppercase cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-all border-l-2 ${selectedProjectId === p._id ? 'bg-blue-50 text-blue-600 border-blue-600' : 'text-slate-600 border-transparent'}`}
                                                >
                                                    {p.name}
                                                </div>
                                            ))}
                                        {projects.filter(p => p.name?.toLowerCase().includes(projectSearch.toLowerCase())).length === 0 && (
                                            <div className="px-5 py-8 text-center text-slate-400 text-[10px] font-bold uppercase italic">
                                                No projects matched your query
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-full sm:w-auto overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => { setActiveTab('jobs'); setSelectedJobId(null); }}
                            className={`flex-1 sm:flex-none px-4 md:px-8 py-2.5 rounded-xl text-[10px] md:text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'jobs' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Operations
                        </button>
                        <button
                            onClick={() => setActiveTab('site')}
                            className={`flex-1 sm:flex-none px-4 md:px-8 py-2.5 rounded-xl text-[10px] md:text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'site' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Site Metrics
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <Loader />
            ) : reportData ? (
                <div className="w-full mx-auto">
                    <AnimatePresence mode="wait">
                        {activeTab === 'jobs' ? (
                            !selectedJobId ? (
                                <motion.div
                                    key="jobs-list"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    className="bg-white rounded-2xl md:rounded-[40px] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden"
                                >
                                    <div className="p-6 md:p-10 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div>
                                            <h2 className="text-lg md:text-xl font-bold text-slate-900 uppercase tracking-tight">Active Work Units</h2>
                                            <p className="text-[10px] md:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Select a phase to view forensic site intelligence</p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                                            <div className="relative group w-full sm:w-auto">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={14} />
                                                <input
                                                    type="text"
                                                    placeholder="Search Job unit..."
                                                    value={jobSearch}
                                                    onChange={(e) => setJobSearch(e.target.value)}
                                                    className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all w-full sm:w-[240px]"
                                                />
                                            </div>
                                            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full border border-blue-100 text-center">{filteredJobs.length} Phases Active</span>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="text-[10px] md:text-xs font-bold uppercase text-slate-500 border-b border-slate-100">
                                                    <th className="px-6 md:px-10 py-6">Job Description</th>
                                                    <th className="px-6 md:px-10 py-6 text-center">Progress Status</th>
                                                    <th className="px-6 md:px-10 py-6 text-right">Labor Invoiced</th>
                                                    <th className="px-6 md:px-10 py-6 text-right whitespace-nowrap">Material Invoiced</th>
                                                    <th className="px-6 md:px-10 py-6 text-right">Job Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {filteredJobs.map(job => (
                                                    <tr
                                                        key={job._id}
                                                        onClick={() => setSelectedJobId(job._id?.toString() || job._id)}
                                                        className="group cursor-pointer hover:bg-slate-50/80 transition-all active:bg-slate-100"
                                                    >
                                                        <td className="px-6 md:px-10 py-6 md:py-8">
                                                            <div className="flex items-center gap-3 md:gap-4">
                                                                <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                                                    <Package size={16} />
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-slate-900 text-xs md:text-sm whitespace-nowrap">{job.jobName}</p>
                                                                    <p className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Tactical Phase</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 md:px-10 py-6 md:py-8">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <div className="w-24 md:w-40 h-1 md:h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${job.progress || 0}%` }} />
                                                                </div>
                                                                <span className="text-[9px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{job.progress || 0}% Complete</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 md:px-10 py-6 md:py-8 text-right font-bold text-slate-800 text-xs md:text-sm whitespace-nowrap">
                                                            ${parseFloat(job.financials?.workerCost || 0).toLocaleString()}
                                                        </td>
                                                        <td className="px-6 md:px-10 py-6 md:py-8 text-right font-bold text-slate-800 text-xs md:text-sm whitespace-nowrap">
                                                            ${parseFloat(job.financials?.materialCost || 0).toLocaleString()}
                                                        </td>
                                                        <td className="px-6 md:px-10 py-6 md:py-8 text-right">
                                                            <div className="inline-flex items-center gap-2">
                                                                <span className="font-bold text-blue-600 text-xs md:text-sm whitespace-nowrap">${parseFloat(job.totalCost || 0).toLocaleString()}</span>
                                                                <div className="p-1 md:p-1.5 bg-blue-50 text-blue-600 rounded-lg group-hover:translate-x-1 transition-transform">
                                                                    <ChevronRight size={12} />
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {jobs.length === 0 && (
                                                    <EmptyTableRow colSpan={5} text="No work units found for this selection" />
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="job-detail"
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    className="bg-white rounded-2xl md:rounded-[40px] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden"
                                >
                                    <div className="p-4 md:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                        <div className="flex items-center gap-4 md:gap-6">
                                            <button
                                                onClick={() => setSelectedJobId(null)}
                                                className="p-2.5 md:p-3 bg-white border border-slate-200 rounded-xl md:rounded-2xl text-slate-500 hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-95 flex-shrink-0"
                                            >
                                                <ChevronLeft size={18} />
                                            </button>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1">
                                                    <h2 className="text-lg md:text-2xl font-black text-slate-900 uppercase tracking-tight truncate">{selectedJob?.jobName}</h2>
                                                    <span className="px-2 py-0.5 md:px-2.5 md:py-1 bg-emerald-50 text-emerald-600 text-[7px] md:text-[8px] font-black uppercase rounded-lg border border-emerald-100 shadow-sm whitespace-nowrap">Audit Active</span>
                                                </div>
                                                <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest pl-0.5 truncate">Tactical Operations & Financial Summary</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => handleDownloadJobPDF(selectedJob)}
                                                className="w-full lg:w-auto px-4 md:px-8 py-3 md:py-3.5 bg-slate-900 text-white rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] hover:bg-black transition-all shadow-lg shadow-slate-900/10 active:scale-95 flex items-center justify-center"
                                            >
                                                <Download size={14} className="mr-2" /> Download Full Intelligence
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-6 md:p-8 lg:p-12 space-y-12 md:space-y-20">
                                        {/* Financial Bento - simplified */}


                                        <div className="space-y-20">
                                            {/* Sections Rendered as Flat Tables */}
                                            <SectionTable
                                                title="Worker Time Tracking"
                                                icon={Users}
                                                color="emerald"
                                                headers={['Personnel Signature', 'Role Identity', 'Hours', 'Net Cost']}
                                                data={selectedJob?.workers}
                                                renderRow={(w, i) => (
                                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-4 py-5 font-bold text-slate-800 text-sm uppercase">{w?.name || 'FIELD STAFF'}</td>
                                                        <td className="px-4 py-5 font-semibold text-slate-500 text-xs uppercase italic">{w?.role || 'PERSONNEL'}</td>
                                                        <td className="px-4 py-5 font-bold text-slate-700 text-sm">{w?.totalHours || 0}h</td>
                                                        <td className="px-4 py-5 text-right font-bold text-emerald-600 text-sm">${parseFloat(w?.cost || 0).toLocaleString()}</td>
                                                    </tr>
                                                )}
                                            />

                                            <SectionTable
                                                title="Subcontractor Logistics"
                                                icon={HardHat}
                                                color="indigo"
                                                headers={['Prime/Vendor Identity', 'Trade Classification', 'Hours Recorded', 'Invoice Cost']}
                                                data={selectedJob?.subcontractors}
                                                renderRow={(s, i) => (
                                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-4 py-5 font-bold text-slate-800 text-sm uppercase">{s?.name || 'VENDOR'}</td>
                                                        <td className="px-4 py-5 font-semibold text-slate-500 text-xs uppercase italic">{s?.role || 'TRADE'}</td>
                                                        <td className="px-4 py-5 font-bold text-slate-700 text-sm">{s?.totalHours || 0}h</td>
                                                        <td className="px-4 py-5 text-right font-bold text-indigo-600 text-sm">${parseFloat(s?.cost || 0).toLocaleString()}</td>
                                                    </tr>
                                                )}
                                            />

                                            <SectionTable
                                                title="Material Consumption"
                                                icon={Package}
                                                color="amber"
                                                headers={['Material Type', 'PO Reference', 'Qty Distributed', 'Audit Cost']}
                                                data={selectedJob?.materials}
                                                renderRow={(m, i) => (
                                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-4 py-5 font-bold text-slate-800 text-sm uppercase">{m?.itemName || 'CONSUMABLE'}</td>
                                                        <td className="px-4 py-5 font-semibold text-slate-500 text-xs uppercase">#{m?.poNumber || 'N/A'}</td>
                                                        <td className="px-4 py-5 font-bold text-slate-700 text-sm">{m?.quantity || 0} units</td>
                                                        <td className="px-4 py-5 text-right font-bold text-amber-600 text-sm">${parseFloat(m?.cost || 0).toLocaleString()}</td>
                                                    </tr>
                                                )}
                                            />

                                            <SectionTable
                                                title="Equipment Usage"
                                                icon={Truck}
                                                color="violet"
                                                headers={['Asset Identity', 'Engagement Hours', 'Logistics Cost']}
                                                data={selectedJob?.equipment}
                                                renderRow={(e, i) => (
                                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-4 py-5 font-bold text-slate-800 text-sm uppercase">{e?.name || 'ASSET'}</td>
                                                        <td className="px-4 py-5 font-bold text-slate-700 text-sm">{e?.hoursUsed || 0}h</td>
                                                        <td className="px-4 py-5 text-right font-bold text-violet-600 text-sm">${parseFloat(e?.cost || 0).toLocaleString()}</td>
                                                    </tr>
                                                )}
                                            />

                                            <SectionTable
                                                title="Operational Deficiencies"
                                                icon={ClipboardList}
                                                color="rose"
                                                headers={['Deficiency Title', 'Source / Assigned', 'Priority', 'Audit Status']}
                                                data={selectedJob?.deficiencies}
                                                renderRow={(d, i) => (
                                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-4 py-5">
                                                            <p className="font-bold text-slate-800 text-sm uppercase">{d?.title || 'SITE ISSUE'}</p>
                                                            <p className="text-[10px] font-semibold text-slate-500 uppercase italic">From: {d?.reportedBy || 'SYSTEM'}</p>
                                                        </td>
                                                        <td className="px-4 py-5 font-bold text-slate-600 text-xs uppercase">{d?.assignedTo || 'PENDING'}</td>
                                                        <td className="px-4 py-5">
                                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest ${d?.priority === 'critical' || d?.priority === 'high' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>{d?.priority || 'NORMAL'}</span>
                                                        </td>
                                                        <td className="px-4 py-5 text-right font-bold text-blue-600 text-[11px] uppercase tracking-widest">{d?.status || 'PENDING'}</td>
                                                    </tr>
                                                )}
                                            />

                                            <SectionTable
                                                title="Execution Hierarchy"
                                                icon={Layers}
                                                color="blue"
                                                headers={['Task Architecture', 'Status', 'Timeline']}
                                                data={selectedJob.tasks}
                                                renderRow={(task) => (
                                                    <TaskRow
                                                        key={task._id}
                                                        task={task}
                                                        isExpanded={expandedTasks[task._id]}
                                                        onToggle={toggleTask}
                                                        expandedTasks={expandedTasks}
                                                    />
                                                )}
                                            />

                                            {/* Job Intelligence Notes */}
                                            <div className="space-y-8 mt-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-sky-100/50 text-sky-600 border border-sky-200 rounded-xl flex items-center justify-center shadow-sm">
                                                        <ClipboardList size={16} strokeWidth={2.5} />
                                                    </div>
                                                    <h3 className="text-[12px] font-black text-slate-950 uppercase tracking-[0.3em] drop-shadow-sm">Intelligence Notes & Logistics</h3>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {selectedJob.notes && selectedJob.notes.length > 0 ? (
                                                        selectedJob.notes.map((note, idx) => (
                                                            <div key={idx} className="p-8 bg-slate-50/50 rounded-[32px] border border-slate-100 flex flex-col gap-4">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shadow-sm">
                                                                            {note.author?.[0] || 'S'}
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="text-sm font-bold text-slate-900">{note.author}</h4>
                                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(note.date).toLocaleDateString()}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                                                                    {note.content}
                                                                </p>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="col-span-full py-12 bg-slate-50/30 rounded-[32px] border border-dashed border-slate-200 flex flex-col items-center justify-center gap-3">
                                                            <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                                                                <ClipboardList className="text-slate-300" size={24} />
                                                            </div>
                                                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">No intelligence notes recorded</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        ) : (
                            <motion.div
                                key="site"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="bg-white rounded-2xl md:rounded-[40px] border border-slate-200 p-6 md:p-10 shadow-xl shadow-slate-200/50 space-y-12 md:space-y-20"
                            >
                                <div className="overflow-x-auto">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 md:mb-10 pb-8 md:pb-10 border-b border-slate-50 gap-4">
                                        <div>
                                            <h2 className="text-lg md:text-xl font-bold text-slate-900 uppercase tracking-tight flex items-center gap-3">
                                                <Sun className="text-amber-500" size={20} md:size={24} /> chronological site logs
                                            </h2>
                                            <p className="text-[10px] md:text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-1">Daily Operations & Condition Forensics</p>
                                        </div>
                                    </div>
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-[10px] md:text-xs font-bold uppercase text-slate-500 border-b border-slate-100">
                                                <th className="pb-6 pr-6 whitespace-nowrap">Date Signature</th>
                                                <th className="pb-6 px-6 whitespace-nowrap"> Foreman ID</th>
                                                {/* <th className="pb-6 px-6">Condition</th> */}
                                                <th className="pb-6 px-6 text-center whitespace-nowrap">Staff Count</th>
                                                <th className="pb-6 pl-6 text-right whitespace-nowrap">Site Observation</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {project.recentDailyLogs?.map((log, i) => (
                                                <tr key={i} className="group hover:bg-slate-50/50 transition-all">
                                                    <td className="py-8 pr-6">
                                                        <p className="font-bold text-slate-900 text-sm mb-1">{new Date(log.date).toLocaleDateString()}</p>
                                                        <p className="text-[10px] font-semibold text-slate-500 uppercase leading-none">Record Entry</p>
                                                    </td>
                                                    <td className="py-8 px-6">
                                                        <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">{log.foreman}</p>
                                                        <p className="text-[10px] font-semibold text-slate-500 uppercase leading-none mt-1">Verified Signature</p>
                                                    </td>
                                                    {/* <td className="py-8 px-6">
                                                        <div className="flex items-center gap-2.5 text-amber-500 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl w-fit">
                                                            <Sun size={14} />
                                                            <span className="text-[10px] font-black uppercase">{log.weather}</span>
                                                        </div>
                                                    </td> */}
                                                    <td className="py-8 px-6 text-center">
                                                        <span className="px-4 py-1.5 bg-slate-100 rounded-xl text-[11px] font-bold text-slate-600 shadow-sm">{log.crewCount} PERSONNEL</span>
                                                    </td>
                                                    <td className="py-8 pl-6 text-right">
                                                        <p className="text-slate-500 text-[11px] font-medium leading-relaxed italic max-w-[400px] ml-auto">
                                                            "{log.notes || 'Routine site observation recorded'}"
                                                        </p>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!project.recentDailyLogs || project.recentDailyLogs.length === 0) && (
                                                <EmptyTableRow colSpan={5} text="Zero site records detected for this project cycle" />
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="pt-20 border-t border-slate-50">
                                    <SectionTable
                                        title="Project-Wide Deficiency Audit"
                                        icon={AlertCircle}
                                        headers={['Audit Item', 'Source / Assigned', 'Priority', 'Audit Status']}
                                        data={project.deficiencies}
                                        renderRow={(d, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-6">
                                                    <p className="font-black text-slate-800 text-xs uppercase">{d?.title || 'SITE ISSUE'}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase italic">From: {d?.reportedBy || 'SYSTEM'}</p>
                                                </td>
                                                <td className="px-4 py-6 font-black text-slate-500 text-[10px] uppercase">{d?.assignedTo || 'PENDING'}</td>
                                                <td className="px-4 py-6">
                                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${d?.priority === 'critical' || d?.priority === 'high' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>{d?.priority || 'NORMAL'}</span>
                                                </td>
                                                <td className="px-4 py-6 text-right font-black text-blue-600 text-[10px] uppercase tracking-widest">{d?.status || 'PENDING'}</td>
                                            </tr>
                                        )}
                                    />
                                </div>

                                {/* Project Intelligence Notes */}
                                <div className="pt-20 border-t border-slate-50">
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-sky-100/50 text-sky-600 border border-sky-200 rounded-xl flex items-center justify-center shadow-sm">
                                                <ClipboardList size={16} strokeWidth={2.5} />
                                            </div>
                                            <h3 className="text-[12px] font-black text-slate-950 uppercase tracking-[0.3em] drop-shadow-sm">Project intelligence observations</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {project.projectNotes && project.projectNotes.length > 0 ? (
                                                project.projectNotes.map((note, idx) => (
                                                    <div key={idx} className="p-8 bg-slate-50/50 rounded-[32px] border border-slate-100 flex flex-col gap-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shadow-sm">
                                                                    {note.author?.[0] || 'S'}
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight">{note.author}</h4>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(note.date).toLocaleDateString()}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-slate-600 font-medium leading-relaxed italic">
                                                            "{note.content}"
                                                        </p>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="col-span-full py-12 bg-slate-50/30 rounded-[32px] border border-dashed border-slate-200 flex flex-col items-center justify-center gap-3">
                                                    <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                                                        <ClipboardList className="text-slate-300" size={24} />
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">No project intelligence observations recorded</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="h-[400px] md:h-[500px] flex flex-col items-center justify-center bg-white rounded-2xl md:rounded-[48px] border-2 border-dashed border-slate-200 w-full mx-auto opacity-60 p-6">
                    <div className="p-6 bg-slate-50 rounded-full mb-6">
                        <BarChart3 size={48} className="text-slate-300" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.3em] mb-2">Systems Hibernating</h3>
                    <p className="text-xs text-slate-400 font-bold max-w-[300px] text-center px-10">Select a project signature from the primary selector to initialize intelligence streaming.</p>
                </div>
            )}
        </div>
    );
};

// ─── NEW FLAT TABLE COMPONENTS ───

const SectionTable = ({ title, icon: Icon, headers, data, renderRow, color = "blue" }) => {
    const colorClasses = {
        blue: "bg-blue-100/50 text-blue-600 border-blue-200",
        indigo: "bg-indigo-100/50 text-indigo-600 border-indigo-200",
        amber: "bg-amber-100/50 text-amber-600 border-amber-200",
        emerald: "bg-emerald-100/50 text-emerald-600 border-emerald-200",
        rose: "bg-rose-100/50 text-rose-600 border-rose-200",
        violet: "bg-violet-100/50 text-violet-600 border-violet-200",
        sky: "bg-sky-100/50 text-sky-600 border-sky-200",
        slate: "bg-slate-100 text-slate-600 border-slate-200"
    };

    const activeColor = colorClasses[color] || colorClasses.blue;

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-3">
                <div className={`p-2 ${activeColor} rounded-xl border flex items-center justify-center shadow-sm`}>
                    <Icon size={16} strokeWidth={2.5} />
                </div>
                <h3 className="text-[12px] font-black text-slate-950 uppercase tracking-[0.3em] drop-shadow-sm">{title}</h3>
            </div>
            <div className="border border-slate-100 rounded-2xl md:rounded-[32px] overflow-hidden bg-slate-50/30">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                        <thead>
                            <tr className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 bg-white">
                                {headers.map((h, i) => (
                                    <th key={i} className={`px-4 md:px-8 py-4 md:py-5 ${i > 0 ? (i === headers.length - 1 ? 'text-right' : 'text-center') : ''} whitespace-nowrap`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data?.length > 0 ? (
                                data.map((item, index) => renderRow(item, index))
                            ) : (
                                <EmptyTableRow colSpan={headers.length} text={`No ${title.toLowerCase()} recorded`} />
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const EmptyTableRow = ({ colSpan, text }) => (
    <tr>
        <td colSpan={colSpan} className="py-20 text-center">
            <div className="inline-flex items-center gap-2 px-6 py-2 bg-slate-50 rounded-full border border-slate-100">
                <AlertCircle size={14} className="text-slate-300" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{text}</p>
            </div>
        </td>
    </tr>
);

const TaskRow = ({ task, isExpanded, onToggle, expandedTasks, level = 0 }) => {
    const hasSubtasks = (task?.subtasks?.length > 0);

    return (
        <React.Fragment>
            <tr className={`group transition-all ${isExpanded ? 'bg-slate-50/50' : 'hover:bg-slate-50/30'}`}>
                <td className="px-4 md:px-8 py-4 md:py-5">
                    <div className="flex items-center gap-2 md:gap-3" style={{ marginLeft: `${level * (window.innerWidth < 768 ? 16 : 32)}px` }}>
                        {level > 0 && (
                            <CornerDownRight size={14} className="text-slate-300 flex-shrink-0" strokeWidth={3} />
                        )}
                        {hasSubtasks ? (
                            <button
                                onClick={() => onToggle(task?._id)}
                                className={`p-2 rounded-xl transition-all shadow-sm flex-shrink-0 ${isExpanded ? 'bg-blue-600 text-white shadow-blue-500/20' : 'bg-white text-slate-400 border border-slate-200'}`}
                            >
                                {isExpanded ? <Minus size={12} strokeWidth={4} /> : <Plus size={12} strokeWidth={4} />}
                            </button>
                        ) : (
                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300 border border-slate-200/50 flex-shrink-0">
                                <Layers size={14} />
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-[12px] md:text-sm font-bold text-slate-800 tracking-tight leading-none mb-1 md:mb-1.5 uppercase truncate">{task?.title || 'UNTITLED'}</p>
                            <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate max-w-[200px] md:max-w-[400px]">{task?.description || 'Operational Milestone'}</p>
                        </div>
                    </div>
                </td>
                <td className="px-4 md:px-8 py-4 md:py-5 text-center">
                    <span className={`px-2 py-0.5 md:px-2.5 md:py-1 text-[8px] md:text-[9px] font-bold rounded-lg border uppercase tracking-widest ${task?.status === 'completed' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                        'bg-amber-50 border-amber-100 text-amber-600'
                        }`}>
                        {task?.status || 'Active'}
                    </span>
                </td>
                <td className="px-4 md:px-8 py-4 md:py-5 text-right font-bold text-slate-900 text-[10px] md:text-xs tracking-wider whitespace-nowrap">
                    {task?.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'NO DEADLINE'}
                </td>
            </tr>

            {isExpanded && task?.subtasks?.map(st => (
                <TaskRow
                    key={st?._id}
                    task={st}
                    isExpanded={expandedTasks && expandedTasks[st?._id]}
                    onToggle={onToggle}
                    expandedTasks={expandedTasks}
                    level={level + 1}
                />
            ))}
        </React.Fragment>
    );
};

const Loader = () => (
    <div className="h-[70vh] flex flex-col items-center justify-center gap-8">
        <div className="relative">
            <div className="w-20 h-20 border-[6px] border-slate-100 rounded-full" />
            <div className="absolute top-0 left-0 w-20 h-20 border-[6px] border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="text-center">
            <p className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-900 mb-2">Syncing Data Store</p>
            <p className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 animate-pulse">Initializing forensic audit modules...</p>
        </div>
    </div>
);

export default ProjectIntelligence;
