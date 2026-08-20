import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
    Clock, MapPin, CheckCircle, XCircle, Search, Filter,
    Download, FileText, User, Calendar, Loader, MoreHorizontal,
    ChevronRight, ExternalLink, Hash, Check, Trash2, ShieldCheck, AlertCircle, TrendingUp, RefreshCw, Edit2
} from 'lucide-react';
import { io } from 'socket.io-client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Modal from '../../components/Modal';
import api, { BASE_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const Timesheets = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showStatusFilter, setShowStatusFilter] = useState(false);
    const socketRef = useRef();
    const { user } = useAuth();
    const isRestrictedRole = user?.role === 'WORKER' || user?.role === 'SUBCONTRACTOR' || user?.role === 'FOREMAN';
    const isAdminOrPM = user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_OWNER' || user?.role === 'PM';

    const [activeTab, setActiveTab] = useState('logs');
    const [corrections, setCorrections] = useState([]);
    const [isCorrectionLoading, setIsCorrectionLoading] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isApproveAllModalOpen, setIsApproveAllModalOpen] = useState(false);
    const [isApprovingAll, setIsApprovingAll] = useState(false);
    
    // Dropdown filters state
    const [selectedEmployee, setSelectedEmployee] = useState('all');
    const [selectedProject, setSelectedProject] = useState('all');

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/timelogs');
            const data = !isAdminOrPM ? response.data.filter(e => e.userId?._id === user._id) : response.data;
            setEntries(data);

            // If admin/pm, also fetch correction requests
            if (isAdminOrPM) {
                fetchCorrections();
            }
        } catch (error) {
            console.error('Error fetching time logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCorrections = async () => {
        try {
            setIsCorrectionLoading(true);
            const res = await api.get('/corrections');
            setCorrections(res.data);
        } catch (error) {
            console.error('Error fetching corrections:', error);
        } finally {
            setIsCorrectionLoading(false);
        }
    };

    const handleApproveCorrection = async (id) => {
        try {
            await api.patch(`/corrections/${id}`, { status: 'approved' });
            fetchCorrections();
            fetchData(); // Refresh logs to show updated times
            toast.success('Correction request approved');
        } catch (error) {
            console.error('Error approving correction:', error);
            toast.error('Failed to approve correction');
        }
    };

    const handleRejectCorrection = async (id) => {
        const reason = window.prompt('Enter rejection reason:');
        if (reason === null) return;
        try {
            await api.patch(`/corrections/${id}`, { status: 'rejected', reviewNotes: reason });
            fetchCorrections();
            toast.success('Correction request rejected');
        } catch (error) {
            console.error('Error rejecting correction:', error);
            toast.error('Failed to reject correction');
        }
    };

    const handleDeleteCorrection = async () => {
        if (!itemToDelete) return;
        try {
            if (itemToDelete === 'all') {
                const pendingIds = corrections.filter(c => c.status === 'pending').map(c => c._id);
                if (pendingIds.length === 0) {
                    toast.error('No pending corrections to delete');
                    setIsDeleteModalOpen(false);
                    return;
                }
                await api.post('/corrections/bulk-delete', { ids: pendingIds });
                toast.success('All pending corrections deleted');
            } else {
                await api.delete(`/corrections/${itemToDelete}`);
                toast.success('Correction request deleted');
            }
            fetchCorrections();
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
        } catch (error) {
            console.error('Error deleting correction:', error);
            toast.error('Failed to delete correction');
        }
    };

    const lastFetchTime = useRef(0);

    useEffect(() => {
        fetchData();

        // Connect socket
        const socketUrl = BASE_URL;
        socketRef.current = io(socketUrl);
        socketRef.current.emit('register_user', user);

        socketRef.current.on('attendance_update', (data) => {
            console.log('Timesheet attendance update:', data);
            fetchData();
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    // Extract unique employees and projects/jobs from fetched entries for dropdowns
    const uniqueEmployees = Array.from(new Map(
        entries
            .filter(e => e.userId)
            .map(e => [e.userId._id, e.userId])
    ).values()).sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));

    const uniqueProjects = Array.from(new Map(
        entries
            .filter(e => e.projectId || e.jobId)
            .map(e => {
                const proj = e.projectId || e.jobId;
                return [proj._id, proj];
            })
    ).values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    const filteredEntries = entries.filter(entry => {
        const lowerSearch = searchTerm.toLowerCase();
        const nameMatch = entry.userId?.fullName?.toLowerCase().includes(lowerSearch);
        const projectMatch = entry.projectId?.name?.toLowerCase().includes(lowerSearch);
        const jobMatch = entry.jobId?.name?.toLowerCase().includes(lowerSearch);
        const taskMatch = entry.taskId?.title?.toLowerCase().includes(lowerSearch);
        
        const searchMatch = !searchTerm || nameMatch || projectMatch || jobMatch || taskMatch;

        let dateMatch = true;
        if (dateFrom) dateMatch = dateMatch && new Date(entry.clockIn) >= new Date(dateFrom);
        if (dateTo) {
            const toEnd = new Date(dateTo);
            toEnd.setHours(23, 59, 59, 999);
            dateMatch = dateMatch && new Date(entry.clockIn) <= toEnd;
        }

        const statusMatch = statusFilter === 'all' || entry.status === statusFilter;

        // Apply selected Employee and Project/Job filters
        const employeeMatch = selectedEmployee === 'all' || entry.userId?._id === selectedEmployee;
        const projectMatchFilter = selectedProject === 'all' || entry.projectId?._id === selectedProject || entry.jobId?._id === selectedProject;

        return searchMatch && dateMatch && statusMatch && employeeMatch && projectMatchFilter;
    });

    const handleApprove = async (id) => {
        try {
            await api.patch(`/timelogs/${id}`, { status: 'approved' });
            fetchData();
            if (selectedEntry && selectedEntry._id === id) setIsModalOpen(false);
        } catch (error) {
            console.error('Error approving entry:', error);
        }
    };

    const handleReject = async (id) => {
        try {
            await api.patch(`/timelogs/${id}`, { status: 'rejected' });
            fetchData();
            if (selectedEntry && selectedEntry._id === id) setIsModalOpen(false);
        } catch (error) {
            console.error('Error rejecting entry:', error);
        }
    };

    const handleApproveAll = async () => {
        try {
            setIsApprovingAll(true);
            const pendingIds = entries.filter(e => e.status === 'pending' && e.clockOut).map(e => e._id);
            await Promise.all(pendingIds.map(id => api.patch(`/timelogs/${id}`, { status: 'approved' })));
            fetchData();
            setIsApproveAllModalOpen(false);
            toast.success('All pending timesheets approved');
        } catch (error) {
            console.error('Error approving all:', error);
            toast.error('Failed to approve all timesheets');
        } finally {
            setIsApprovingAll(false);
        }
    };

    const handleExport = () => {
        const wrap = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
        const csv = [
            ['Employee', 'Task / Project', 'Date', 'Time In', 'Time Out', 'Duration (h)', 'Status', 'Geofence Status', 'Location Verified', 'GPS In', 'GPS Out'].map(wrap).join(','),
            ...filteredEntries.map(e => {
                const clockIn = new Date(e.clockIn);
                const clockOut = e.clockOut ? new Date(e.clockOut) : null;
                const duration = clockOut ? ((clockOut - clockIn) / (1000 * 60 * 60)).toFixed(2) : 'In Progress';
                const geofence = e.isOutsideGeofence ? 'OUTSIDE' : (e.geofenceStatus === 'inside' ? 'INSIDE' : 'UNKNOWN');
                return [
                    e.userId?.fullName || '',
                    e.taskId?.title ? `${e.taskId.title} (${e.jobId?.name || ''})` : (e.projectId?.name || 'Manual Entry'),
                    clockIn.toLocaleDateString('en-GB'),
                    clockIn.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                    clockOut ? clockOut.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '---',
                    duration,
                    e.status,
                    geofence,
                    e.isOutsideGeofence ? 'Flagged' : 'Verified',
                    e.clockInLatitude ? `${e.clockInLatitude}, ${e.clockInLongitude}` : '',
                    e.clockOutLatitude ? `${e.clockOutLatitude}, ${e.clockOutLongitude}` : ''
                ].map(wrap).join(',');
            })
        ].join('\n');
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timesheets_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const tableData = filteredEntries.map(e => {
            const clockIn = new Date(e.clockIn);
            const clockOut = e.clockOut ? new Date(e.clockOut) : null;
            const duration = clockOut ? ((clockOut - clockIn) / (1000 * 60 * 60)).toFixed(2) : 'In Progress';
            return [
                e.userId?.fullName || '',
                e.projectId?.name || 'Manual Log',
                clockIn.toLocaleDateString(),
                clockIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                clockOut ? clockOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---',
                duration,
                e.status.toUpperCase()
            ];
        });

        doc.setFontSize(18);
        doc.text('Timesheet Report', 14, 22);
        doc.setFontSize(11);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

        autoTable(doc, {
            head: [['Employee', 'Project', 'Date', 'Clock In', 'Clock Out', 'Hours', 'Status']],
            body: tableData,
            startY: 40,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [37, 99, 235] }
        });

        doc.save(`timesheets_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const openDetails = (entry) => {
        setSelectedEntry(entry);
        setIsModalOpen(true);
    };

    const stats = {
        totalHours: filteredEntries.reduce((sum, e) => {
            if (e.clockOut) {
                const hours = (new Date(e.clockOut) - new Date(e.clockIn)) / (1000 * 60 * 60);
                return sum + hours;
            }
            return sum;
        }, 0).toFixed(1),
        pending: filteredEntries.filter(e => e.status === 'pending').length,
        approved: filteredEntries.filter(e => e.status === 'approved').length,
        gpsTracked: filteredEntries.filter(e => e.gpsIn?.latitude && e.gpsIn?.longitude).length
    };

    const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
    const [correctionData, setCorrectionData] = useState({ timeLogId: '', reason: '', clockIn: '', clockOut: '' });
    const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

    const handleCorrectionSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSubmittingCorrection(true);
            await api.post('/corrections', {
                timeLogId: correctionData.timeLogId,
                requestedChanges: {
                    clockIn: correctionData.clockIn || undefined,
                    clockOut: correctionData.clockOut || undefined,
                    reason: correctionData.reason
                }
            });
            toast.success('Correction request submitted');
            setIsCorrectionModalOpen(false);
            setCorrectionData({ timeLogId: '', reason: '', clockIn: '', clockOut: '' });
        } catch (error) {
            console.error('Error submitting correction:', error);
            toast.error('Failed to submit correction request');
        } finally {
            setIsSubmittingCorrection(false);
        }
    };

    const [correctionSearch, setCorrectionSearch] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const [isLogDeleteModalOpen, setIsLogDeleteModalOpen] = useState(false);
    const [logToDelete, setLogToDelete] = useState(null);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [editData, setEditData] = useState({ clockIn: '', clockOut: '' });

    const openEditModal = (entry) => {
        setEditingEntry(entry);
        
        const toLocalISO = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            const offset = date.getTimezoneOffset();
            const localDate = new Date(date.getTime() - (offset * 60 * 1000));
            return localDate.toISOString().slice(0, 16);
        };

        setEditData({
            clockIn: toLocalISO(entry.clockIn),
            clockOut: toLocalISO(entry.clockOut)
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.patch(`/timelogs/${editingEntry._id}`, {
                clockIn: editData.clockIn,
                clockOut: editData.clockOut
            });
            toast.success('Timesheet updated successfully');
            setIsEditModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Error updating timesheet:', error);
            toast.error('Failed to update timesheet');
        }
    };

    const handleDeleteEntry = (id) => {
        setLogToDelete(id);
        setIsLogDeleteModalOpen(true);
    };

    const confirmDeleteEntry = async () => {
        if (!logToDelete) return;
        try {
            await api.delete(`/timelogs/${logToDelete}`);
            toast.success('Time log deleted successfully');
            setIsLogDeleteModalOpen(false);
            setLogToDelete(null);
            fetchData();
        } catch (error) {
            console.error('Error deleting time log:', error);
            toast.error('Failed to delete time log');
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter">{!isAdminOrPM ? 'My Hours' : 'Timesheets'}</h1>
                    <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-widest flex items-center gap-2">
                        <Clock size={14} className="text-blue-600" />
                        {!isAdminOrPM ? 'Track your site hours and attendance history' : 'Verify and approve site manpower hours'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleExport}
                        className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 hover:shadow-sm transition-all"
                        title="Export CSV"
                    >
                        <Download size={20} />
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="p-2.5 bg-white rounded-xl border border-slate-200 text-red-400 hover:text-red-500 hover:shadow-sm transition-all"
                        title="Download PDF Report"
                    >
                        <FileText size={20} />
                    </button>
                    {isAdminOrPM ? (
                        <button
                            onClick={() => setIsApproveAllModalOpen(true)}
                            className="bg-blue-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200 font-black text-sm uppercase tracking-tight"
                        >
                            <CheckCircle size={18} /> Approve All Pending
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsCorrectionModalOpen(true)}
                            className="bg-orange-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-orange-600 transition shadow-lg shadow-orange-200 font-black text-sm uppercase tracking-tight"
                        >
                            <RefreshCw size={18} /> Request Correction
                        </button>
                    )}
                </div>
            </div>

            {/* Premium Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard title={!isAdminOrPM ? "My Total Hours" : "Total Hours"} value={`${stats.totalHours}h`} subtext="this period" icon={TrendingUp} color="blue" />
                <StatCard title={!isAdminOrPM ? "Pending Approval" : "Pending Review"} value={stats.pending} subtext="requires action" icon={FileText} color="orange" />
                <StatCard title="Approved" value={stats.approved} subtext="finalized logs" icon={CheckCircle} color="emerald" />
                <StatCard
                    title={!isAdminOrPM ? "On-Clock Status" : "GPS Tracked"}
                    value={!isAdminOrPM ? (entries.some(e => !e.clockOut) ? 'Active' : 'Offline') : stats.gpsTracked}
                    subtext={!isAdminOrPM ? "Current shift" : `of ${entries.length} entries`}
                    icon={!isAdminOrPM ? Clock : MapPin}
                    color={!isAdminOrPM ? "emerald" : "blue"}
                />
            </div>

            {/* Dashboard Sub-Header / Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                {isAdminOrPM && (
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full md:w-auto">
                        <button
                            onClick={() => setActiveTab('logs')}
                            className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'logs' ? 'bg-white text-blue-600 shadow-md border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Time Logs
                        </button>
                        <button
                            onClick={() => setActiveTab('corrections')}
                            className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all relative ${activeTab === 'corrections' ? 'bg-white text-orange-600 shadow-md border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Corrections
                            {corrections.filter(c => c.status === 'pending').length > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500 text-[8px] text-white items-center justify-center font-black">
                                        {corrections.filter(c => c.status === 'pending').length}
                                    </span>
                                </span>
                            )}
                        </button>
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col md:flex-row gap-4 items-center flex-1 w-full">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by employee name or project..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 text-sm font-bold text-slate-700 placeholder:text-slate-400"
                            />
                        </div>

                        {/* New Dropdown Filters */}
                        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                            {uniqueEmployees.length > 1 && (
                                <select
                                    value={selectedEmployee}
                                    onChange={(e) => setSelectedEmployee(e.target.value)}
                                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 text-sm font-bold text-slate-600 cursor-pointer min-w-[160px]"
                                >
                                    <option value="all">👥 All Employees</option>
                                    {uniqueEmployees.map(emp => (
                                        <option key={emp._id} value={emp._id}>{emp.fullName}</option>
                                    ))}
                                </select>
                            )}

                            {uniqueProjects.length > 0 && (
                                <select
                                    value={selectedProject}
                                    onChange={(e) => setSelectedProject(e.target.value)}
                                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 text-sm font-bold text-slate-600 cursor-pointer min-w-[160px]"
                                >
                                    <option value="all">🏗️ All Projects/Jobs</option>
                                    {uniqueProjects.map(proj => (
                                        <option key={proj._id} value={proj._id}>{proj.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="flex gap-2 w-full md:w-auto relative">
                            {/* Date Range */}
                            <div className="relative">
                                <button
                                    onClick={() => { setShowDatePicker(p => !p); setShowStatusFilter(false); }}
                                    className={`flex-1 md:flex-none px-5 py-3 border rounded-2xl font-bold text-sm flex items-center gap-2 transition-all ${dateFrom || dateTo ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                                        }`}
                                >
                                    <Calendar size={18} /> Date Range
                                    {(dateFrom || dateTo) && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                                </button>
                                {showDatePicker && (
                                    <div className="absolute top-full mt-2 right-0 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 w-64 space-y-3">
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">From</label>
                                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-400" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">To</label>
                                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-400" />
                                        </div>
                                        <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                                            className="w-full text-xs font-bold text-slate-400 hover:text-red-500 transition-colors text-center">
                                            Clear Dates
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Filter Status */}
                            <div className="relative">
                                <button
                                    onClick={() => { setShowStatusFilter(p => !p); setShowDatePicker(false); }}
                                    className={`flex-1 md:flex-none px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all ${statusFilter !== 'all' ? 'bg-slate-700 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'
                                        }`}
                                >
                                    <Filter size={18} /> Filter Status
                                    {statusFilter !== 'all' && <span className="px-1.5 py-0.5 bg-white/20 rounded text-[10px] font-black uppercase">{statusFilter}</span>}
                                </button>
                                {showStatusFilter && (
                                    <div className="absolute top-full mt-2 right-0 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden w-44">
                                        {['all', 'pending', 'approved', 'rejected'].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => { setStatusFilter(s); setShowStatusFilter(false); }}
                                                className={`w-full text-left px-4 py-3 text-sm font-bold capitalize transition-colors ${statusFilter === s ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-700'
                                                    }`}
                                            >
                                                {s === 'all' ? '✦ All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            {activeTab === 'logs' ? (
                <div className="bg-white rounded-[40px] shadow-sm border border-slate-200/60 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Employee</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Project / Site</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Shift Details</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Duration</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Location Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                    <th className="px-8 py-5 text-[10px) font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-10 h-10 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
                                                <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Synchronizing Timelogs...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredEntries.length > 0 ? (
                                    filteredEntries.map((entry) => {
                                        const clockInDate = new Date(entry.clockIn);
                                        const clockOutDate = entry.clockOut ? new Date(entry.clockOut) : null;
                                        const duration = clockOutDate
                                            ? ((clockOutDate - clockInDate) / (1000 * 60 * 60)).toFixed(1) + 'h'
                                            : 'In Progress';

                                        return (
                                            <tr key={entry._id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-500 border border-slate-200/50 shadow-sm group-hover:scale-110 transition-transform">
                                                            {entry.userId?.fullName?.charAt(0) || '?'}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-slate-900 leading-tight">{entry.userId?.fullName || 'Deleted User'}</p>
                                                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                                                                {entry.userId?.role?.replace('COMPANY_', '') || 'Unknown'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-700">
                                                            {entry.taskId?.title ? `Task: ${entry.taskId.title}` : 
                                                             (entry.projectId?.name || entry.jobId?.name || 
                                                              (entry.reason ? 'Site Visit' : 'Manual Entry'))}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-tight">
                                                            <Hash size={10} /> 
                                                            {entry.taskId?.jobId?.name || entry.jobId?.name || entry.projectId?.name || (entry.reason ? 'Emergency Visit' : 'N/A')}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-black text-slate-900">
                                                            {clockInDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </span>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[10px] font-bold text-emerald-500">{clockInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            <span className="text-slate-300">→</span>
                                                            <span className={`text-[10px] font-bold ${clockOutDate ? 'text-slate-400' : 'text-blue-600 italic animate-pulse font-black'}`}>
                                                                {clockOutDate ? clockOutDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'ACTIVE'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className={`px-3 py-1.5 rounded-xl font-black text-xs border shadow-sm ${clockOutDate ? 'bg-white text-slate-900 border-slate-200' : 'bg-blue-50 text-blue-700 border-blue-100 animate-pulse'}`}>
                                                        {duration}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <div className="flex gap-1.5">
                                                            <button
                                                                onClick={() => {
                                                                    const lat = entry.clockInLatitude || entry.gpsIn?.latitude;
                                                                    const lng = entry.clockInLongitude || entry.gpsIn?.longitude;
                                                                    if (lat && lng) window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
                                                                }}
                                                                disabled={!(entry.clockInLatitude || entry.gpsIn?.latitude)}
                                                                title="View Clock-In Location"
                                                                className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${entry.clockInLatitude || entry.gpsIn?.latitude ? 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100' : 'bg-slate-50 text-slate-300 border-slate-100'}`}
                                                            >
                                                                <MapPin size={14} />
                                                            </button>
                                                            {entry.clockOut && (
                                                                <button
                                                                    onClick={() => {
                                                                        const lat = entry.clockOutLatitude || entry.gpsOut?.latitude;
                                                                        const lng = entry.clockOutLongitude || entry.gpsOut?.longitude;
                                                                        if (lat && lng) window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
                                                                    }}
                                                                    disabled={!(entry.clockOutLatitude || entry.gpsOut?.latitude)}
                                                                    title="View Clock-Out Location"
                                                                    className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${entry.clockOutLatitude || entry.gpsOut?.latitude ? 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100' : 'bg-slate-50 text-slate-300 border-slate-100'}`}
                                                                >
                                                                    <MapPin size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${entry.isOutsideGeofence ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                            {entry.isOutsideGeofence ? 'Outside' : 'Inside'}
                                                        </span>
                                                        {entry.clockInAddress && (
                                                            <span className="text-[8px] font-bold text-slate-400 mt-1 max-w-[120px] truncate" title={entry.clockInAddress}>
                                                                {entry.clockInAddress}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm border
                                                        ${entry.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                            entry.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                                                                'bg-orange-50 text-orange-700 border-orange-100'}`}>
                                                        {entry.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {isAdminOrPM && (
                                                            <>
                                                                <button
                                                                    onClick={() => openEditModal(entry)}
                                                                    className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-white hover:shadow-md rounded-xl transition-all border border-transparent hover:border-slate-100"
                                                                    title="Edit Log"
                                                                >
                                                                    <Edit2 size={18} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteEntry(entry._id)}
                                                                    className="p-2 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-white hover:shadow-md rounded-xl transition-all border border-transparent hover:border-slate-100"
                                                                    title="Delete Log"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => openDetails(entry)}
                                                            className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-white hover:shadow-md rounded-xl transition-all border border-transparent hover:border-slate-100"
                                                        >
                                                            <ChevronRight size={20} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-8 py-32 text-center text-slate-300">
                                            <div className="flex flex-col items-center gap-4">
                                                <Clock size={48} className="opacity-20" />
                                                <p className="font-bold uppercase tracking-widest text-[11px]">No matching timelogs available</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-[40px] shadow-sm border border-slate-200/60 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Worker</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Current Log</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Requested Changes</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Reason</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {isCorrectionLoading ? (
                                    <tr>
                                        <td colSpan="6" className="px-8 py-20 text-center text-slate-400">Loading requests...</td>
                                    </tr>
                                ) : corrections.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-8 py-20 text-center text-slate-400">No correction requests found.</td>
                                    </tr>
                                ) : (
                                    corrections.map(req => (
                                        <tr key={req._id}>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center font-black text-orange-600">
                                                        {req.userId?.fullName?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-800 tracking-tight">{req.userId?.fullName}</p>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{req.userId?.role}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="text-[10px] space-y-1">
                                                    <p className="font-bold text-slate-400 uppercase tracking-widest">Original Log</p>
                                                    <p className="text-slate-600 font-bold">
                                                        {new Date(req.timeLogId?.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {req.timeLogId?.clockOut ? new Date(req.timeLogId.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'ACTIVE'}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="bg-orange-50/50 p-2.5 rounded-xl border border-orange-100 flex items-center gap-4">
                                                    {req.requestedChanges?.clockIn && (
                                                        <div>
                                                            <p className="text-[8px] font-black text-orange-400 uppercase tracking-widest mb-0.5">Start</p>
                                                            <p className="text-xs font-black text-orange-600">{new Date(req.requestedChanges.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                        </div>
                                                    )}
                                                    {req.requestedChanges?.clockIn && req.requestedChanges?.clockOut && (
                                                        <div className="h-6 w-px bg-orange-200"></div>
                                                    )}
                                                    {req.requestedChanges?.clockOut && (
                                                        <div>
                                                            <p className="text-[8px] font-black text-orange-400 uppercase tracking-widest mb-0.5">End</p>
                                                            <p className="text-xs font-black text-orange-600">{new Date(req.requestedChanges.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <p className="text-xs text-slate-600 max-w-[200px] leading-relaxed italic">"{req.requestedChanges?.reason}"</p>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${req.status === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                    req.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        'bg-red-50 text-red-600 border-red-100'
                                                    }`}>
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                {req.status === 'pending' ? (
                                                    <div className="flex gap-2 justify-end">
                                                        <button
                                                            onClick={() => handleRejectCorrection(req._id)}
                                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Reject Correction"
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleApproveCorrection(req._id)}
                                                            className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                                                            title="Approve & Update Log"
                                                        >
                                                            <CheckCircle size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => { setItemToDelete(req._id); setIsDeleteModalOpen(true); }}
                                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete Correction"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-end">
                                                        <button
                                                            onClick={() => { setItemToDelete(req._id); setIsDeleteModalOpen(true); }}
                                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete Correction"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Review Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Review Timesheet Record">
                {selectedEntry && (
                    <div className="space-y-8">
                        <div className="flex items-center gap-5 p-6 bg-slate-50/50 rounded-[32px] border border-slate-100 shadow-inner">
                            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-2xl font-black text-blue-600 shadow-sm overflow-hidden uppercase">
                                {selectedEntry.userId?.fullName?.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1">
                                    {selectedEntry.userId?.fullName}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-black uppercase tracking-tighter shadow-sm">
                                        {selectedEntry.userId?.role?.replace('COMPANY_', '')}
                                    </span>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-sm font-bold text-slate-500">
                                        {selectedEntry.projectId?.name || (selectedEntry.reason ? 'Random Site Attendance' : 'Manual Log')}
                                    </span>
                                </div>
                            </div>
                            {selectedEntry.geofenceStatus === 'inside' ? (
                                <div className="hidden sm:flex flex-col items-end">
                                    <div className="flex items-center gap-1.5 text-emerald-600 font-black text-xs uppercase bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                                        <ShieldCheck size={14} /> GPS Verified
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 mt-1 mr-1">Jobsite Radius Match</span>
                                </div>
                            ) : (
                                <div className="hidden sm:flex flex-col items-end">
                                    <div className="flex items-center gap-1.5 text-red-600 font-black text-xs uppercase bg-red-50 px-3 py-1.5 rounded-xl border border-red-100 animate-pulse">
                                        <AlertCircle size={14} /> GPS Flagged
                                    </div>
                                    <span className="text-[10px] font-bold text-red-400 mt-1 mr-1">Outside Site Area</span>
                                </div>
                            )}
                        </div>

                        {selectedEntry.clockInAddress && (
                            <div className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <MapPin size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Verified Clock-In Address</p>
                                    <p className="text-[11px] font-bold text-slate-600 truncate">{selectedEntry.clockInAddress}</p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="bg-white border border-slate-100 rounded-2xl p-4 relative overflow-hidden group hover:border-blue-500/10 transition-colors">
                                <div className="absolute -top-4 -right-4 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all"></div>
                                <div className="relative">
                                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-2 flex items-center gap-1.5">
                                        <Clock size={11} className="text-emerald-500" /> Start of Shift
                                    </p>
                                    <p className="text-2xl font-black text-slate-900 tracking-tighter">
                                        {new Date(selectedEntry.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                                        {new Date(selectedEntry.clockIn).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
                                    </p>
                                </div>
                            </div>
                            <div className="bg-white border border-slate-100 rounded-2xl p-4 relative overflow-hidden group hover:border-blue-500/10 transition-colors">
                                <div className="absolute -top-4 -right-4 w-16 h-16 bg-red-500/5 rounded-full blur-xl group-hover:bg-red-500/10 transition-all"></div>
                                <div className="relative">
                                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-2 flex items-center gap-1.5">
                                        <Clock size={11} className="text-red-500" /> End of Shift
                                    </p>
                                    <p className={`text-2xl font-black tracking-tighter ${selectedEntry.clockOut ? 'text-slate-900' : 'text-blue-600 animate-pulse'}`}>
                                        {selectedEntry.clockOut ? new Date(selectedEntry.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'ACTIVE'}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                                        {selectedEntry.clockOut
                                            ? new Date(selectedEntry.clockOut).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })
                                            : 'On-site session'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className={`p-4 ${selectedEntry.isManual ? 'bg-amber-50/50 border-amber-100' : 'bg-slate-50 border-slate-100'} rounded-2xl border space-y-3`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedEntry.isManual ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'}`}>
                                        <User size={14} />
                                    </div>
                                    <div>
                                        <p className={`text-[8px] font-black uppercase tracking-widest leading-none mb-0.5 ${selectedEntry.isManual ? 'text-amber-500' : 'text-slate-400'}`}>
                                            {selectedEntry.isManual ? 'Manual Entry By' : 'Auto-Capture By'}
                                        </p>
                                        <p className="text-xs font-black text-slate-700 uppercase tracking-tight">
                                            {selectedEntry.createdBy?.fullName || (selectedEntry.isManual ? 'System Admin' : selectedEntry.userId?.fullName)}
                                        </p>
                                    </div>
                                </div>
                                <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${selectedEntry.isManual ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                    {selectedEntry.isManual ? 'Manual Override' : 'System Capture'}
                                </div>
                            </div>
                            {selectedEntry.reason && (
                                <div className={`${selectedEntry.isManual ? 'bg-white/80 border-amber-100/50' : 'bg-blue-50/50 border-blue-100/50'} p-3 rounded-xl border`}>
                                    <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${selectedEntry.isManual ? 'text-amber-500' : 'text-blue-500'}`}>
                                        {selectedEntry.isManual ? 'Entry Reason' : 'Random login justification'}
                                    </p>
                                    <p className="text-[11px] font-bold text-slate-600 italic">"{selectedEntry.reason}"</p>
                                </div>
                            )}
                        </div>

                        {selectedEntry.clockOut && (
                            <div className={`${selectedEntry.isManual ? 'bg-slate-900 shadow-slate-100' : 'bg-blue-600 shadow-blue-100'} rounded-2xl p-4 text-white shadow-lg flex items-center justify-between transition-all duration-300`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl ${selectedEntry.isManual ? 'bg-white/10' : 'bg-white/20'} backdrop-blur-md flex items-center justify-center border border-white/20`}>
                                        <TrendingUp size={18} />
                                    </div>
                                    <div>
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${selectedEntry.isManual ? 'text-slate-400' : 'text-blue-100'}`}>Calculated Hours</p>
                                        <p className="text-xl font-black leading-none mt-0.5">
                                            {((new Date(selectedEntry.clockOut) - new Date(selectedEntry.clockIn)) / (1000 * 60 * 60)).toFixed(2)}h
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-[8px] font-black uppercase flex items-center gap-1 justify-end ${selectedEntry.isManual ? 'text-amber-400' : 'text-blue-100'}`}>
                                        {selectedEntry.isManual ? <FileText size={10} /> : <ShieldCheck size={10} />}
                                        {selectedEntry.isManual ? 'Manual Override' : 'System Verified'}
                                    </p>
                                    <span className={`text-[8px] italic font-medium opacity-60`}>
                                        {selectedEntry.isManual ? 'Authorised Entry' : 'GPS Secured'}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-4 border-t border-slate-50 mt-auto">
                            <button onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
                                Skip for now
                            </button>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                {selectedEntry.status === 'pending' && selectedEntry.clockOut && (
                                    <>
                                        {isAdminOrPM ? (
                                            <>
                                                <button
                                                    onClick={() => handleReject(selectedEntry._id)}
                                                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-red-600 bg-red-50 hover:bg-red-100 transition-all border border-red-50 flex items-center justify-center gap-2"
                                                >
                                                    <XCircle size={14} /> Reject
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(selectedEntry._id)}
                                                    className="flex-1 sm:flex-none px-8 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md shadow-blue-100 flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle size={14} /> Approve Log
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setCorrectionData({
                                                        ...correctionData,
                                                        timeLogId: selectedEntry._id,
                                                        clockIn: new Date(selectedEntry.clockIn).toISOString().slice(0, 16),
                                                        clockOut: selectedEntry.clockOut ? new Date(selectedEntry.clockOut).toISOString().slice(0, 16) : ''
                                                    });
                                                    setIsModalOpen(false);
                                                    setIsCorrectionModalOpen(true);
                                                }}
                                                className="flex-1 sm:flex-none px-8 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-white bg-orange-500 hover:bg-orange-600 transition-all shadow-md shadow-orange-100 flex items-center justify-center gap-2"
                                            >
                                                <RefreshCw size={14} /> Request Correction
                                            </button>
                                        )}
                                    </>
                                )}
                                {(selectedEntry.status !== 'pending' || !selectedEntry.clockOut) && (
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="w-full sm:w-auto px-8 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-white bg-slate-900 hover:bg-slate-800 transition-all shadow-md flex items-center justify-center gap-2"
                                    >
                                        Close Details
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Correction Request Modal */}
            <Modal
                isOpen={isCorrectionModalOpen}
                onClose={() => setIsCorrectionModalOpen(false)}
                title="Submit Correction Request"
            >
                <form onSubmit={handleCorrectionSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="relative">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block px-1">Select Timesheet Record</label>
                            <div 
                                className="relative group"
                                onMouseLeave={() => setIsDropdownOpen(false)}
                            >
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                        <Search size={16} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search by date or project..."
                                        value={correctionSearch || (correctionData.timeLogId ? `${new Date(entries.find(e => e._id === correctionData.timeLogId)?.clockIn).toLocaleDateString()} - ${entries.find(e => e._id === correctionData.timeLogId)?.projectId?.name || 'Manual Log'}` : '')}
                                        onChange={(e) => {
                                            setCorrectionSearch(e.target.value);
                                            setIsDropdownOpen(true);
                                        }}
                                        onFocus={() => setIsDropdownOpen(true)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all"
                                    />
                                </div>

                                {isDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl shadow-slate-200/50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                                        {entries
                                            .filter(e => {
                                                const dateStr = new Date(e.clockIn).toLocaleDateString();
                                                const projectStr = e.projectId?.name || 'Manual Log';
                                                const searchStr = `${dateStr} ${projectStr}`.toLowerCase();
                                                return searchStr.includes(correctionSearch.toLowerCase());
                                            })
                                            .length > 0 ? (
                                                entries
                                                    .filter(e => {
                                                        const dateStr = new Date(e.clockIn).toLocaleDateString();
                                                        const projectStr = e.projectId?.name || 'Manual Log';
                                                        const searchStr = `${dateStr} ${projectStr}`.toLowerCase();
                                                        return searchStr.includes(correctionSearch.toLowerCase());
                                                    })
                                                    .map(log => (
                                                        <button
                                                            key={log._id}
                                                            type="button"
                                                            onClick={() => {
                                                                setCorrectionData({
                                                                    ...correctionData,
                                                                    timeLogId: log._id,
                                                                    clockIn: log?.clockIn ? new Date(log.clockIn).toISOString().slice(0, 16) : '',
                                                                    clockOut: log?.clockOut ? new Date(log.clockOut).toISOString().slice(0, 16) : ''
                                                                });
                                                                setCorrectionSearch('');
                                                                setIsDropdownOpen(false);
                                                            }}
                                                            className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-center justify-between border-b border-slate-50 last:border-0"
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-black text-slate-900">{new Date(log.clockIn).toLocaleDateString()}</span>
                                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{log.projectId?.name || 'Manual Log'}</span>
                                                            </div>
                                                            <div className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter ${
                                                                log.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                                                                log.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                                                            }`}>
                                                                {log.status}
                                                            </div>
                                                        </button>
                                                    ))
                                            ) : (
                                                <div className="px-4 py-8 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
                                                    No matching records found
                                                </div>
                                            )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Correct Clock In</label>
                                <input
                                    type="datetime-local"
                                    value={correctionData.clockIn}
                                    onChange={(e) => setCorrectionData({ ...correctionData, clockIn: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Correct Clock Out</label>
                                <input
                                    type="datetime-local"
                                    value={correctionData.clockOut}
                                    onChange={(e) => setCorrectionData({ ...correctionData, clockOut: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Reason for Correction</label>
                            <textarea
                                required
                                rows="3"
                                placeholder="Why does this record need correction? (e.g. Forgot to clock out, GPS error)"
                                value={correctionData.reason}
                                onChange={(e) => setCorrectionData({ ...correctionData, reason: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500 resize-none"
                            ></textarea>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsCorrectionModalOpen(false)}
                            className="flex-1 px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all border border-slate-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmittingCorrection || !correctionData.timeLogId}
                            className="flex-[2] bg-blue-600 text-white px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmittingCorrection ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <RefreshCw size={16} /> Submit Request
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirm Deletion"
            >
                <div className="p-6 text-center space-y-6">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-100 shadow-sm">
                        <Trash2 size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Delete Correction Request?</h3>
                        <p className="text-slate-500 font-bold text-sm mt-2">
                            This action cannot be undone. This will permanently remove the correction request from the system.
                        </p>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="flex-1 px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all border border-slate-200"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDeleteCorrection}
                            className="flex-1 bg-red-600 text-white px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition shadow-lg shadow-red-200"
                        >
                            Confirm Delete
                        </button>
                    </div>
                </div>
            </Modal>
            {/* Edit Timesheet Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Timesheet Entry"
                maxWidth="max-w-md"
            >
                <form onSubmit={handleEditSubmit} className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Employee</p>
                        <p className="text-sm font-black text-slate-900">{editingEntry?.userId?.fullName}</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Clock In Time</label>
                            <input
                                type="datetime-local"
                                required
                                value={editData.clockIn}
                                onChange={(e) => setEditData({ ...editData, clockIn: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-800"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Clock Out Time (Optional)</label>
                            <input
                                type="datetime-local"
                                value={editData.clockOut}
                                onChange={(e) => setEditData({ ...editData, clockOut: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-800"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsEditModalOpen(false)}
                            className="flex-1 px-6 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-6 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </Modal>
            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isLogDeleteModalOpen}
                onClose={() => setIsLogDeleteModalOpen(false)}
                title="Confirm Deletion"
                maxWidth="max-w-md"
            >
                <div className="space-y-6">
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                            <AlertCircle size={32} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Delete Time Log?</h3>
                            <p className="text-slate-500 font-bold text-sm mt-1">
                                Are you sure you want to permanently remove this record? This action cannot be undone.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsLogDeleteModalOpen(false)}
                            className="flex-1 px-6 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
                        >
                            No, Keep Log
                        </button>
                        <button
                            onClick={confirmDeleteEntry}
                            className="flex-1 px-6 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest text-white bg-red-600 hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                        >
                            Yes, Delete Permanently
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Approve All Confirmation Modal */}
            <Modal
                isOpen={isApproveAllModalOpen}
                onClose={() => setIsApproveAllModalOpen(false)}
                title="Bulk Approval"
                maxWidth="max-w-md"
            >
                <div className="space-y-6">
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100 shadow-sm">
                            <CheckCircle size={32} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Approve All Pending?</h3>
                            <p className="text-slate-500 font-bold text-sm mt-1">
                                This will approve <span className="text-blue-600 font-black">{entries.filter(e => e.status === 'pending' && e.clockOut).length}</span> pending timesheet records that have clock-out times.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsApproveAllModalOpen(false)}
                            className="flex-1 px-6 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleApproveAll}
                            disabled={isApprovingAll}
                            className="flex-1 px-6 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isApprovingAll ? (
                                <Loader size={16} className="animate-spin" />
                            ) : (
                                <CheckCircle size={16} />
                            )}
                            Approve All
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const StatCard = ({ title, value, subtext, icon: Icon, color }) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-600 shadow-blue-100 border-blue-100',
        orange: 'bg-orange-50 text-orange-600 shadow-orange-100 border-orange-100',
        emerald: 'bg-emerald-50 text-emerald-600 shadow-emerald-100 border-emerald-100',
        red: 'bg-red-50 text-red-600 shadow-red-100 border-red-100'
    };

    return (
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200/60 flex items-center gap-5 hover:shadow-xl hover:shadow-slate-100 transition-all duration-300">
            <div className={`p-4 rounded-2xl border ${colors[color]}`}>
                <Icon size={28} />
            </div>
            <div>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{title}</p>
                <p className="text-2xl font-black text-slate-900 leading-tight tracking-tighter">{value}</p>
                <p className="text-[10px] font-bold text-slate-500 italic mt-0.5">{subtext}</p>
            </div>
        </div>
    );
};

export default Timesheets;
