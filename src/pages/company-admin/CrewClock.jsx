import { useState, useEffect, useRef } from 'react';
import {
    Users, Clock, Search, Filter, CheckCircle, X,
    MoreHorizontal, MapPin, AlertCircle, Play, Square,
    ChevronRight, ArrowRight, ShieldCheck, UserCheck,
    RefreshCw, Calendar, Check
} from 'lucide-react';
import { io } from 'socket.io-client';
import api, { BASE_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';

const CrewClock = () => {
    const { user } = useAuth();
    const [workers, setWorkers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [activeJobId, setActiveJobId] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedWorkers, setSelectedWorkers] = useState([]);
    const [stats, setStats] = useState({
        onSite: 0,
        offClock: 0,
        totalCrew: 0
    });
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [selectedWorkerForManual, setSelectedWorkerForManual] = useState(null);
    const [manualEntryData, setManualEntryData] = useState({
        date: new Date().toISOString().split('T')[0],
        clockIn: '',
        clockOut: '',
        reason: '',
        projectId: ''
    });
    const [isClockInDropdownOpen, setIsClockInDropdownOpen] = useState(false);
    const [isClockOutDropdownOpen, setIsClockOutDropdownOpen] = useState(false);
    const [isManualClockOut, setIsManualClockOut] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [toast, setToast] = useState({ message: '', type: 'success', visible: false });
    const socketRef = useRef();

    const showToast = (message, type = 'success') => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch all workers and their current clock status
            const [usersRes, logsRes, projectsRes] = await Promise.all([
                api.get('/auth/users'),
                api.get('/timelogs'),
                api.get('/projects')
            ]);

            setProjects(projectsRes.data);
            if (projectsRes.data.length > 0 && !activeJobId) {
                setActiveJobId(projectsRes.data[0]._id);
            }

            // Filter for workers, PMs, and Admins
            const allowedRoles = ['WORKER', 'PM', 'COMPANY_OWNER', 'SUPER_ADMIN'];
            const workerList = usersRes.data.filter(u => allowedRoles.includes(u.role));

            // Map status based on if they have a log without a clockOut
            const enrichedWorkers = workerList.map(worker => {
                const activeLog = logsRes.data.find(log => log.userId?._id === worker._id && !log.clockOut);
                return {
                    ...worker,
                    isClockedIn: !!activeLog,
                    isManual: activeLog?.isManual || false,
                    activeLogId: activeLog?._id,
                    lastClockIn: activeLog?.clockIn,
                    site: activeLog?.projectId?.name || 'Assigned Site'
                };
            });

            setWorkers(enrichedWorkers);
            setStats({
                onSite: enrichedWorkers.filter(w => w.isClockedIn).length,
                offClock: enrichedWorkers.filter(w => !w.isClockedIn).length,
                totalCrew: enrichedWorkers.length
            });
        } catch (error) {
            console.error('Error fetching crew data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Connect socket
        const socketUrl = BASE_URL;
        const token = localStorage.getItem('token');
        socketRef.current = io(socketUrl, {
            auth: { token },
            transports: ['websocket', 'polling']
        });
        socketRef.current.emit('register_user', user);

        socketRef.current.on('attendance_update', (data) => {
            console.log('Attendance update received:', data);
            // Re-fetch data or update state locally
            fetchData();
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);

    const toggleSelection = (id) => {
        setSelectedWorkers(prev =>
            prev.includes(id) ? prev.filter(wid => wid !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        if (selectedWorkers.length === workers.length) {
            setSelectedWorkers([]);
        } else {
            setSelectedWorkers(workers.map(w => w._id));
        }
    };

    const closeManualModal = () => {
        setIsManualModalOpen(false);
        setSelectedWorkerForManual(null);
        setIsManualClockOut(false);
        setManualEntryData({
            date: new Date().toISOString().split('T')[0],
            clockIn: '',
            clockOut: '',
            reason: '',
            projectId: ''
        });
    };

    const handleManualEntrySubmit = async (e) => {
        if (e) e.preventDefault();
        if (!selectedWorkerForManual || (!isManualClockOut && !manualEntryData.clockIn) || !manualEntryData.date) {
            showToast('Please fill in all required fields.', 'error');
            return;
        }

        const projectId = manualEntryData.projectId || activeJobId;
        if (!projectId) {
            showToast('Please select a project first.', 'error');
            return;
        }

        try {
            setIsProcessing(true);
            const baseDate = manualEntryData.date;
            // Convert local time string to a proper ISO string with timezone info to avoid offset issues on live servers
            const clockIn = manualEntryData.clockIn ? new Date(`${baseDate}T${manualEntryData.clockIn}`).toISOString() : null;
            const clockOut = manualEntryData.clockOut ? new Date(`${baseDate}T${manualEntryData.clockOut}`).toISOString() : null;

            // Simple validation: No future time
            if (clockIn && new Date(clockIn) > new Date()) {
                showToast('Cannot enter future clock-in time.', 'error');
                return;
            }
            if (clockOut && new Date(clockOut) > new Date()) {
                showToast('Cannot enter future clock-out time.', 'error');
                return;
            }
            if (clockIn && clockOut && new Date(clockOut) < new Date(clockIn)) {
                showToast('Clock-out must be after clock-in.', 'error');
                return;
            }

            if (isManualClockOut) {
                await api.post('/timelogs/clock-out', {
                    userId: selectedWorkerForManual._id,
                    isManual: true,
                    clockOut: clockOut || new Date().toISOString(),
                    reason: manualEntryData.reason,
                    latitude: 0,
                    longitude: 0,
                    accuracy: 0
                });
            } else {
                await api.post('/timelogs/clock-in', {
                    userId: selectedWorkerForManual._id,
                    projectId,
                    isManual: true,
                    clockIn,
                    clockOut,
                    reason: manualEntryData.reason,
                    latitude: 0,
                    longitude: 0,
                    accuracy: 0
                });
            }

            await fetchData();
            closeManualModal();
            showToast('Manual entry recorded successfully.');
        } catch (error) {
            console.error('Error in manual entry:', error);
            showToast(error.response?.data?.message || 'Failed to record manual entry.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const getAdminLocation = async () => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                console.warn('Geolocation not supported');
                return resolve(null);
            }

            navigator.geolocation.getCurrentPosition(
                (pos) => resolve(pos.coords),
                (err) => {
                    console.warn('High accuracy location failed, trying low accuracy...', err.message);
                    navigator.geolocation.getCurrentPosition(
                        (pos) => resolve(pos.coords),
                        (err2) => {
                            console.warn('Geolocation failed completely:', err2.message);
                            resolve(null);
                        },
                        { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
                    );
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        });
    };

    const handleBulkClockIn = async () => {
        if (selectedWorkers.length === 0) return;
        if (!activeJobId) {
            showToast('Please select a project first.', 'error');
            return;
        }

        try {
            setIsProcessing(true);

            // Get Admin's current position once for the batch
            const coords = await getAdminLocation();

            await Promise.all(selectedWorkers.map(wid => {
                const worker = workers.find(w => w._id === wid);
                if (!worker.isClockedIn) {
                    return api.post('/timelogs/clock-in', {
                        userId: wid,
                        projectId: activeJobId,
                        latitude: coords?.latitude || 0,
                        longitude: coords?.longitude || 0,
                        accuracy: coords?.accuracy || 0,
                        deviceInfo: `Admin Force Clock-in: ${navigator.userAgent}`
                    });
                }
                return Promise.resolve();
            }));
            await fetchData();
            setSelectedWorkers([]);
            showToast('Selected crew members clocked in successfully.');
        } catch (error) {
            console.error('Error in bulk clock in:', error);
            showToast('Failed to clock in some crew members.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBulkClockOut = async () => {
        if (selectedWorkers.length === 0) return;
        try {
            setIsProcessing(true);

            // Get Admin's current position once for the batch
            const coords = await getAdminLocation();

            await Promise.all(selectedWorkers.map(async wid => {
                const worker = workers.find(w => w._id === wid);
                if (worker.isClockedIn) {
                    return api.post('/timelogs/clock-out', {
                        userId: wid,
                        latitude: coords?.latitude || 0,
                        longitude: coords?.longitude || 0,
                        accuracy: coords?.accuracy || 0
                    });
                }
                return Promise.resolve();
            }));
            await fetchData();
            setSelectedWorkers([]);
            showToast('Selected crew members clocked out successfully.');
        } catch (error) {
            console.error('Error in bulk clock out:', error);
            showToast('Failed to clock out some crew members.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredWorkers = workers.filter(w =>
        w.fullName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Crew Control</h1>
                    <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-widest flex items-center gap-2">
                        <Users size={14} className="text-blue-600" />
                        Manage on-site workforce attendance
                    </p>
                </div>

                {/* Custom Toast Notification */}
                {toast.visible && (
                    <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[1000] px-6 py-4 rounded-3xl shadow-2xl animate-in slide-in-from-top-10 duration-500 flex items-center gap-4 border backdrop-blur-md ${toast.type === 'success' ? 'bg-emerald-500/95 text-white border-emerald-400' : 'bg-red-500/95 text-white border-red-400'
                        }`}>
                        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                            {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        </div>
                        <span className="font-black text-sm uppercase tracking-widest leading-none mt-0.5">{toast.message}</span>
                    </div>
                )}
                <div className="flex gap-3">
                    <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Live: {stats.onSite} Workers Active</span>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200/60 flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Users size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Fleet</p>
                        <p className="text-2xl font-black text-slate-900 leading-none">{stats.totalCrew}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200/60 flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <UserCheck size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current on Site</p>
                        <p className="text-2xl font-black text-slate-900 leading-none">{stats.onSite}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200/60 flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center">
                        <Calendar size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scheduled Today</p>
                        <p className="text-2xl font-black text-slate-900 leading-none">{stats.totalCrew}</p>
                    </div>
                </div>
            </div>

            {/* Main Action Bar */}
            <div className="bg-white p-5 rounded-[2.5rem] shadow-xl shadow-blue-900/5 border border-slate-100 flex flex-col md:flex-row gap-6 items-center">
                <div className="relative flex-1 w-full flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search crew members by name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white focus:border-blue-500/50 transition-all font-bold text-slate-800"
                        />
                    </div>
                    <div className="relative w-full md:w-64 shrink-0">
                        <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <select
                            value={activeJobId}
                            onChange={(e) => setActiveJobId(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white focus:border-blue-500/50 transition-all font-bold text-slate-800 appearance-none cursor-pointer"
                        >
                            <option value="">Select Target Site...</option>
                            {projects.map(p => (
                                <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto relative">
                    <div className="relative flex-1 md:flex-none">
                        <button
                            onClick={() => {
                                if (user?.role === 'COMPANY_OWNER' || user?.role === 'PM' || user?.role === 'SUPER_ADMIN') {
                                    setIsClockInDropdownOpen(!isClockInDropdownOpen);
                                } else {
                                    handleBulkClockIn();
                                }
                            }}
                            disabled={selectedWorkers.length === 0 || isProcessing}
                            className={`w-full md:w-auto px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg
                                ${selectedWorkers.length > 0 && !isProcessing ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
                            `}
                        >
                            {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} fill="currentColor" />}
                            Clock In ({selectedWorkers.length})
                            {(user?.role === 'COMPANY_OWNER' || user?.role === 'PM' || user?.role === 'SUPER_ADMIN') && (
                                <ChevronRight size={16} className={`transition-transform ${isClockInDropdownOpen ? 'rotate-90' : ''}`} />
                            )}
                        </button>

                        {isClockInDropdownOpen && (
                            <div className="absolute top-full left-0 mt-2 w-full md:w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <button
                                    onClick={() => {
                                        handleBulkClockIn();
                                        setIsClockInDropdownOpen(false);
                                    }}
                                    className="w-full px-5 py-3 text-left hover:bg-blue-50 text-slate-700 hover:text-blue-600 font-bold text-xs uppercase tracking-widest transition-colors flex items-center gap-3"
                                >
                                    <RefreshCw size={14} /> Auto Clock In
                                </button>
                                <button
                                    onClick={() => {
                                        if (selectedWorkers.length > 0) {
                                            const worker = workers.find(w => w._id === selectedWorkers[0]);
                                            setSelectedWorkerForManual(worker);
                                            setIsManualClockOut(false); // Ensure it's Clock In mode
                                            setIsClockInDropdownOpen(false);
                                            setIsManualModalOpen(true);
                                        }
                                    }}
                                    className="w-full px-5 py-3 text-left hover:bg-amber-50 text-slate-700 hover:text-amber-600 font-bold text-xs uppercase tracking-widest transition-colors flex items-center gap-3 border-t border-slate-50"
                                >
                                    <Calendar size={14} /> Manual Entry
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="relative flex-1 md:flex-none">
                        <button
                            onClick={() => {
                                if (user?.role === 'COMPANY_OWNER' || user?.role === 'PM' || user?.role === 'SUPER_ADMIN') {
                                    setIsClockOutDropdownOpen(!isClockOutDropdownOpen);
                                } else {
                                    handleBulkClockOut();
                                }
                            }}
                            disabled={selectedWorkers.length === 0 || isProcessing}
                            className={`w-full md:w-auto px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg
                                ${selectedWorkers.length > 0 && !isProcessing ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-200 active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
                            `}
                        >
                            {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <Square size={16} fill="currentColor" />}
                            Clock Out ({selectedWorkers.length})
                            {(user?.role === 'COMPANY_OWNER' || user?.role === 'PM' || user?.role === 'SUPER_ADMIN') && (
                                <ChevronRight size={16} className={`transition-transform ${isClockOutDropdownOpen ? 'rotate-90' : ''}`} />
                            )}
                        </button>

                        {isClockOutDropdownOpen && (
                            <div className="absolute top-full left-0 mt-2 w-full md:w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <button
                                    onClick={() => {
                                        handleBulkClockOut();
                                        setIsClockOutDropdownOpen(false);
                                    }}
                                    className="w-full px-5 py-3 text-left hover:bg-red-50 text-slate-700 hover:text-red-600 font-bold text-xs uppercase tracking-widest transition-colors flex items-center gap-3"
                                >
                                    <RefreshCw size={14} /> Auto Clock Out
                                </button>
                                <button
                                    onClick={() => {
                                        if (selectedWorkers.length > 0) {
                                            const worker = workers.find(w => w._id === selectedWorkers[0]);
                                            setSelectedWorkerForManual(worker);
                                            setIsClockOutDropdownOpen(false);
                                            setIsManualClockOut(true);
                                            setIsManualModalOpen(true);
                                        }
                                    }}
                                    className="w-full px-5 py-3 text-left hover:bg-amber-50 text-slate-700 hover:text-amber-600 font-bold text-xs uppercase tracking-widest transition-colors flex items-center gap-3 border-t border-slate-50"
                                >
                                    <Calendar size={14} /> Manual Entry
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Manual Entry Modal */}
            <Modal
                isOpen={isManualModalOpen}
                onClose={closeManualModal}
                title={isManualClockOut ? "Manual Clock Out Trace" : "Manual Time Entry"}
                maxWidth="max-w-lg"
            >
                <div className="space-y-6">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 text-slate-100 group-hover:text-blue-500/10 transition-colors">
                            <Users size={64} strokeWidth={4} />
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 relative z-10">
                            <UserCheck size={14} className="text-blue-500" /> Recording Attendance For
                        </p>
                        <p className="text-slate-900 text-xl font-black mt-1 relative z-10 tracking-tight">
                            {selectedWorkerForManual?.fullName}
                        </p>
                    </div>

                    <form onSubmit={handleManualEntrySubmit} className="space-y-5">
                        <div className="grid grid-cols-1 gap-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Target Project Site</label>
                                <div className="relative group">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                    <select
                                        required
                                        value={manualEntryData.projectId || activeJobId}
                                        onChange={(e) => setManualEntryData({ ...manualEntryData, projectId: e.target.value })}
                                        className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-800 appearance-none cursor-pointer"
                                    >
                                        <option value="">Select Project Site...</option>
                                        {projects.map(p => (
                                            <option key={p._id} value={p._id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-5">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Work Date</label>
                                    <div className="relative group">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                        <input
                                            type="date"
                                            required
                                            value={manualEntryData.date}
                                            onChange={(e) => setManualEntryData({ ...manualEntryData, date: e.target.value })}
                                            max={new Date().toISOString().split('T')[0]}
                                            className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-800"
                                        />
                                    </div>
                                </div>
                                <div className={`grid ${isManualClockOut ? 'grid-cols-1' : 'grid-cols-2'} gap-5`}>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">
                                            {isManualClockOut ? 'Clock Out Time' : 'Clock In Time'}
                                        </label>
                                        <div className="relative group">
                                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                                            <input
                                                type="time"
                                                required={!isManualClockOut}
                                                value={isManualClockOut ? manualEntryData.clockOut : manualEntryData.clockIn}
                                                onChange={(e) => setManualEntryData({ 
                                                    ...manualEntryData, 
                                                    [isManualClockOut ? 'clockOut' : 'clockIn']: e.target.value 
                                                })}
                                                className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-800"
                                            />
                                        </div>
                                    </div>
                                    {!isManualClockOut && (
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Clock Out (Opt)</label>
                                            <input
                                                type="time"
                                                value={manualEntryData.clockOut}
                                                onChange={(e) => setManualEntryData({ ...manualEntryData, clockOut: e.target.value })}
                                                className="w-full px-6 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-800"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Reason / Note</label>
                                <textarea
                                    value={manualEntryData.reason}
                                    onChange={(e) => setManualEntryData({ ...manualEntryData, reason: e.target.value })}
                                    placeholder="Explain why this entry is manual..."
                                    rows="2"
                                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white focus:border-blue-500 transition-all font-bold text-slate-800 placeholder:text-slate-300 resize-none"
                                ></textarea>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={closeManualModal}
                                className="flex-1 px-6 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isProcessing}
                                className="flex-[2] px-6 py-3.5 bg-blue-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                                {isManualClockOut ? 'Confirm Manual Clock Out' : 'Record Manual Entry'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Crew List View */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-5 w-20">
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            selectAll();
                                        }}
                                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all
                                            ${selectedWorkers.length === workers.length ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'border-slate-300 bg-white hover:border-blue-400'}
                                        `}
                                    >
                                        {selectedWorkers.length === workers.length && <Check size={14} strokeWidth={4} />}
                                    </div>
                                </th>
                                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Worker Identity</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned Jobsite</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Current Status</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Shift Metrics</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredWorkers.map(worker => (
                                <tr
                                    key={worker._id}
                                    onClick={() => toggleSelection(worker._id)}
                                    className={`group hover:bg-slate-50/50 transition-all cursor-pointer ${selectedWorkers.includes(worker._id) ? 'bg-blue-50/30' : ''}`}
                                >
                                    <td className="px-8 py-5">
                                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all
                                            ${selectedWorkers.includes(worker._id) ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'border-slate-200 bg-white group-hover:border-blue-300'}
                                        `}>
                                            {selectedWorkers.includes(worker._id) && <Check size={14} strokeWidth={4} />}
                                        </div>
                                    </td>
                                    <td className="px-4 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-lg font-black text-slate-400 border border-slate-200 shadow-sm overflow-hidden uppercase group-hover:scale-105 transition-transform duration-300">
                                                {worker.fullName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 leading-tight tracking-tight">{worker.fullName}</p>
                                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter mt-1">
                                                    {worker.role || 'On-Site Specialist'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-slate-100 rounded-lg">
                                                <MapPin size={12} className="text-slate-400" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 truncate max-w-[180px]">{worker.site || 'Assigning...'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm transition-all
                                                ${worker.isClockedIn ? 'bg-emerald-50 text-emerald-700 border-emerald-100 ring-2 ring-emerald-500/10' : 'bg-slate-50 text-slate-400 border-slate-100'}
                                            `}>
                                                {worker.isClockedIn ? 'Live on Site' : 'OFF DUTY'}
                                            </span>
                                            {worker.isManual && (
                                                <div className="flex items-center gap-1.5 mt-2 px-2 py-0.5 bg-amber-50 rounded-lg border border-amber-100">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                    <span className="text-[9px] text-amber-700 font-black uppercase tracking-tighter">Manual Trace</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex flex-col items-end">
                                            <div className={`flex items-center gap-2 ${worker.isClockedIn ? 'text-emerald-500 bg-emerald-50 shadow-sm px-3 py-1.5 rounded-xl border border-emerald-100' : 'text-slate-300'}`}>
                                                <Clock size={14} strokeWidth={3} />
                                                <span className="text-xs font-black">{worker.isClockedIn ? 'LOGGED ACTIVE' : '--:--'}</span>
                                            </div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 underline decoration-slate-100 underline-offset-4">Today's Shift Log</p>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {filteredWorkers.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="py-24 text-center bg-slate-50/10">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-200 border border-slate-100 shadow-sm">
                                                <Search size={32} />
                                            </div>
                                            <p className="font-black uppercase tracking-widest text-[11px] text-slate-300">Synchronizing Local Crew Data...</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CrewClock;