import { useState, useEffect, useRef } from 'react';
import { Clock, MapPin, CheckCircle, Camera, RefreshCw, AlertCircle, Play, Square, History, Search, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api, { BASE_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useClock } from '../../context/ClockContext';
import Modal from '../../components/Modal';

const WorkerPunch = () => {
    const { user } = useAuth();
    // Clock status + running timer come from the global ClockProvider so they persist
    // across page navigation (no reset / no 00:00:00 flash).
    const { isClockedIn, formattedElapsed, activeLog: currentTimeLog, clockIn, clockOut } = useClock();
    const navigate = useNavigate();
    const [activeJob, setActiveJob] = useState(null);
    const [siteLocation, setSiteLocation] = useState('Not Clocked In');
    const [loading, setLoading] = useState(true);
    const socketRef = useRef();
    const [assignedProjects, setAssignedProjects] = useState([]);
    const [assignedTasks, setAssignedTasks] = useState([]);
    const [selectedAssignment, setSelectedAssignment] = useState('');
    const [history, setHistory] = useState([]);
    const [toast, setToast] = useState({ message: '', type: 'success', visible: false });
    const [showReasonModal, setShowReasonModal] = useState(false);
    const [clockInReason, setClockInReason] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const showToast = (message, type = 'success') => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    };

    // Fetch active log on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch stats (assigned projects/tasks for the selector + current job label)
                const statsRes = await api.get('/reports/stats');
                if (statsRes.data.workerMetrics) {
                    setAssignedProjects(statsRes.data.workerMetrics.assignedProjects || []);
                    setAssignedTasks(statsRes.data.workerMetrics.assignedTasks || []);

                    if (statsRes.data.workerMetrics.currentJob) {
                        // Will be formatted once tasks are fetched
                        setActiveJob(statsRes.data.workerMetrics.currentJob);
                    }
                }

                const res = await api.get('/timelogs');
                // Filter logs for this user
                const userLogs = res.data.filter(log => (log.userId?._id || log.userId)?.toString() === user?._id?.toString());
                setHistory(userLogs.slice(0, 5)); // Show last 5 logs

                // Clock status / running timer are owned by the global ClockProvider so they
                // survive page navigation. Here we only derive the on-screen site label.
                const active = userLogs.find(log => !log.clockOut);
                if (active) {
                    setActiveJob(active.projectId?.name || 'Assigned Site');
                    setSiteLocation(active.projectId?.location?.address || 'Site Recorded');
                } else {
                    setActiveJob(null);
                    setSiteLocation('Not Clocked In');
                }
            } catch (error) {
                console.error('Error fetching punch data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Connect socket for status broadcasting
        const socketUrl = BASE_URL;
        socketRef.current = io(socketUrl);
        socketRef.current.emit('register_user', user);

        return () => {
            socketRef.current?.disconnect();
        };
    }, [user, isClockedIn]);

    useEffect(() => {
        if (activeJob && (assignedProjects.length > 0 || assignedTasks.length > 0)) {
            // Check if already formatted to avoid loop
            if (!activeJob.startsWith('Project: ') && !activeJob.startsWith('Task: ') && activeJob !== 'Random Site / Emergency Attendance') {
                setActiveJob(prev => formatJobName(prev, assignedProjects, assignedTasks));
            }
        }
    }, [activeJob, assignedProjects, assignedTasks]);

    const formatJobName = (rawName, projects, tasks) => {
        if (!rawName) return null;
        if (rawName === 'random') return 'Random Site / Emergency Attendance';
        
        const pMatch = projects?.find(p => p.name === rawName);
        if (pMatch) return `Project: ${pMatch.name} (${pMatch.jobName || pMatch.jobId?.name || 'Assigned Job'})`;
        
        const tMatch = tasks?.find(t => t.title === rawName);
        if (tMatch) return `Task: ${tMatch.title} (${tMatch.jobName || tMatch.jobId?.name || 'Assigned Job'})`;
        
        return rawName;
    };

    const [lastKnownCoords, setLastKnownCoords] = useState(null);

    // Live Location Warm-up
    useEffect(() => {
        if (!navigator.geolocation) return;

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setLastKnownCoords(pos.coords);
            },
            (err) => console.log('Warm-up location error:', err),
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    const handleToggle = async () => {
        try {
            if (!isClockedIn && !selectedAssignment) {
                showToast('Please select a site, task, or "Other" to clock into.', 'error');
                return;
            }

            // Trigger reason modal for random selection
            if (!isClockedIn && selectedAssignment === 'random' && !showReasonModal) {
                setShowReasonModal(true);
                return;
            }

            setLoading(true);

            // Use the warm-up location if available, otherwise fetch fresh one
            const getPosition = () => new Promise((resolve, reject) => {
                if (lastKnownCoords) return resolve(lastKnownCoords);
                if (!navigator.geolocation) return reject(new Error('Geolocation is not supported.'));
                
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve(pos.coords),
                    (err) => {
                        navigator.geolocation.getCurrentPosition(
                            (pos) => resolve(pos.coords),
                            (err2) => reject(err2 || err),
                            { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
                        );
                    },
                    { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
                );
            });

            if (!isClockedIn) {
                // Determine Project/Task/Job ID similar to dashboard
                let pId = null;
                let tId = null;
                let jId = null;
                let taskType = null;

                if (selectedAssignment.startsWith('task_')) {
                    tId = selectedAssignment.replace('task_', '');
                    const tMatch = assignedTasks.find(t => t._id === tId);
                    if (tMatch) {
                        pId = tMatch.projectId?._id || tMatch.projectId;
                        jId = tMatch.jobId?._id || tMatch.jobId;
                        taskType = tMatch.type || 'JobTask';
                    }
                } else if (selectedAssignment.startsWith('project_')) {
                    pId = selectedAssignment.replace('project_', '');
                    const pMatch = assignedProjects.find(p => p._id === pId);
                    if (pMatch) {
                        jId = pMatch.jobId?._id || pMatch.jobId;
                    }
                }

                const coords = await getPosition();
                const created = await clockIn({
                    projectId: pId,
                    taskId: tId,
                    jobId: jId,
                    taskType: taskType,
                    reason: selectedAssignment === 'random' ? clockInReason : undefined,
                    latitude: coords?.latitude,
                    longitude: coords?.longitude,
                    deviceInfo: navigator.userAgent
                });

                // Re-fetch data to sync all status strings
                const statsRes = await api.get('/reports/stats');
                if (statsRes.data.workerMetrics?.currentJob) {
                    setActiveJob(formatJobName(statsRes.data.workerMetrics.currentJob, assignedProjects, assignedTasks));
                }
                setHistory(prev => [created, ...prev].slice(0, 5));
                setShowReasonModal(false);
                setClockInReason('');
                showToast('Clocked in successfully.');
            } else {
                // Clock Out
                const coords = await getPosition();
                await clockOut({
                    latitude: coords?.latitude,
                    longitude: coords?.longitude
                });
                setActiveJob(null);
                setSiteLocation('Not Clocked In');
                setSelectedAssignment('');
                const res = await api.get('/timelogs');
                const userLogs = res.data.filter(log => (log.userId?._id || log.userId)?.toString() === user?._id?.toString());
                setHistory(userLogs.slice(0, 5));
                showToast('Clocked out successfully.');
            }
        } catch (error) {
            console.error('Error toggling clock:', error);
            let message = 'Failed to update attendance status';
            
            if (error.code === 1) { // PERMISSION_DENIED
                message = 'Location permission denied. Please allow location access in your browser settings.';
            } else if (error.code === 2) { // POSITION_UNAVAILABLE
                message = 'Location unavailable. Please make sure GPS is active.';
            } else if (error.code === 3) { // TIMEOUT
                message = 'Location request timed out. Please try again.';
            } else {
                message = error.response?.data?.message || error.message || message;
            }
            
            showToast(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 pb-12 animate-fade-in">
            {/* Reason Modal for Random Clock-In */}
            <Modal
                isOpen={showReasonModal}
                onClose={() => {
                    setShowReasonModal(false);
                    setClockInReason('');
                }}
                title="Random Clock-In"
                maxWidth="max-w-md"
            >
                <div className="space-y-6 text-center">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={32} />
                    </div>
                    <div className="space-y-2">
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Please provide a reason for this login</p>
                    </div>
                    
                    <div className="space-y-4">
                        <textarea
                            placeholder="e.g. Working at unlisted site / Special assignment..."
                            value={clockInReason}
                            onChange={(e) => setClockInReason(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold min-h-[120px] focus:outline-none focus:border-blue-500 transition-colors text-left"
                            autoFocus
                        />
                        
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowReasonModal(false);
                                    setClockInReason('');
                                }}
                                className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleToggle}
                                disabled={!clockInReason.trim() || loading}
                                className="flex-2 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest bg-blue-600 text-white shadow-lg shadow-blue-200 disabled:opacity-50 transition-all hover:-translate-y-1 active:scale-95"
                            >
                                {loading ? 'Processing...' : 'Start Clock In'}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Header */}
            <div className="text-center space-y-2 relative">
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Time Clock</h1>
                <p className="text-slate-500 font-bold text-sm tracking-widest uppercase">Precision Tracking for Your Day</p>
                
                {/* Custom Toast Notification */}
                {toast.visible && (
                    <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[1000] px-6 py-4 rounded-3xl shadow-2xl animate-in slide-in-from-top-10 duration-500 flex items-center gap-4 border backdrop-blur-md ${
                        toast.type === 'success' ? 'bg-emerald-500/95 text-white border-emerald-400' : 'bg-red-500/95 text-white border-red-400'
                    }`}>
                        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                            {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        </div>
                        <span className="font-black text-sm uppercase tracking-widest leading-none mt-0.5">{toast.message}</span>
                    </div>
                )}
            </div>

            {/* Main Punch Card */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/10 border border-slate-100 relative">
                <div className="p-10 flex flex-col items-center text-center space-y-8">
                    {/* Status Badge */}
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${isClockedIn ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${isClockedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                        {isClockedIn ? 'Punch Active' : 'Off Clock'}
                    </div>

                    {/* Large Timer Display */}
                    <div className="space-y-4">
                        <h2 className="text-7xl font-black text-slate-900 tracking-tighter tabular-nums">
                            {isClockedIn ? formattedElapsed : '00:00:00'}
                        </h2>
                        {!isClockedIn && (
                            <div className="mt-6 mb-4 max-w-sm mx-auto relative" ref={dropdownRef}>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block text-left">Select Working Site / Task</label>
                                
                                {/* Custom Searchable Select */}
                                <div className="relative">
                                    <button
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 flex items-center justify-between hover:border-blue-400 transition-all focus:outline-none focus:ring-4 focus:ring-blue-100/50 group"
                                    >
                                        <span className="truncate pr-4">
                                            {selectedAssignment ? (
                                                selectedAssignment === 'random' ? 'Random Site / Emergency Attendance' : 
                                                selectedAssignment.startsWith('task_') ? 
                                                    assignedTasks.find(t => t._id === selectedAssignment.replace('task_', ''))?.title :
                                                    assignedProjects.find(p => p._id === selectedAssignment.replace('project_', ''))?.name
                                            ) : (
                                                <span className="text-slate-400">-- Choose Task / Project --</span>
                                            )}
                                        </span>
                                        <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 group-hover:text-blue-500 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>

                                    {isDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl border border-slate-100 shadow-2xl z-[1000] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                            {/* Search Input */}
                                            <div className="p-3 border-b border-slate-50">
                                                <div className="relative">
                                                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search sites or tasks..."
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="w-full bg-slate-50 border-none rounded-xl pl-11 pr-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>

                                            {/* Results List */}
                                            <div className="max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                                                {/* Other Section (Always visible at top of list if no search or matching) */}
                                                {(!searchTerm || 'random'.includes(searchTerm.toLowerCase())) && (
                                                    <div className="px-3 py-2 border-b border-slate-50">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedAssignment('random');
                                                                setIsDropdownOpen(false);
                                                                setSearchTerm('');
                                                            }}
                                                            className={`w-full text-left p-3 rounded-xl transition-colors flex items-center gap-3 ${selectedAssignment === 'random' ? 'bg-orange-50 border border-orange-100' : 'hover:bg-slate-50'}`}
                                                        >
                                                            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center">
                                                                <AlertCircle size={16} />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-slate-800">Random Site / Emergency</span>
                                                                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">Manual site entry required</span>
                                                            </div>
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Tasks Section */}
                                                {assignedTasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()) || (t.jobName && t.jobName.toLowerCase().includes(searchTerm.toLowerCase()))).length > 0 && (
                                                    <div className="px-3 py-2">
                                                        <div className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-50/50 rounded-lg mb-2">My Tasks</div>
                                                        {assignedTasks
                                                            .filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()) || (t.jobName && t.jobName.toLowerCase().includes(searchTerm.toLowerCase())))
                                                            .map(t => (
                                                                <button
                                                                    key={`task_${t._id}`}
                                                                    onClick={() => {
                                                                        setSelectedAssignment(`task_${t._id}`);
                                                                        setIsDropdownOpen(false);
                                                                        setSearchTerm('');
                                                                    }}
                                                                    className={`w-full text-left p-3 rounded-xl transition-colors mb-1 flex flex-col gap-0.5 ${selectedAssignment === `task_${t._id}` ? 'bg-blue-50 border border-blue-100' : 'hover:bg-slate-50'}`}
                                                                >
                                                                    <span className="text-sm font-bold text-slate-800">{t.title}</span>
                                                                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">
                                                                        {t.jobName} / {t.projectName}
                                                                    </span>
                                                                </button>
                                                            ))}
                                                    </div>
                                                )}

                                                {/* Projects Section */}
                                                {assignedProjects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.jobName && p.jobName.toLowerCase().includes(searchTerm.toLowerCase()))).length > 0 && (
                                                    <div className="px-3 py-2">
                                                        <div className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50/50 rounded-lg mb-2">General Site Attendance</div>
                                                        {assignedProjects
                                                            .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.jobName && p.jobName.toLowerCase().includes(searchTerm.toLowerCase())))
                                                            .map(p => (
                                                                <button
                                                                    key={`project_${p._id}`}
                                                                    onClick={() => {
                                                                        setSelectedAssignment(`project_${p._id}`);
                                                                        setIsDropdownOpen(false);
                                                                        setSearchTerm('');
                                                                    }}
                                                                    className={`w-full text-left p-3 rounded-xl transition-colors mb-1 flex flex-col gap-0.5 ${selectedAssignment === `project_${p._id}` ? 'bg-emerald-50 border border-emerald-100' : 'hover:bg-slate-50'}`}
                                                                >
                                                                    <span className="text-sm font-bold text-slate-800">{p.name}</span>
                                                                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">
                                                                        {p.jobName || p.jobId?.name || 'Assigned Job'}
                                                                    </span>
                                                                </button>
                                                            ))}
                                                    </div>
                                                )}

                                                {/* No Results */}
                                                {assignedTasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 &&
                                                 assignedProjects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 &&
                                                 searchTerm && !'random'.includes(searchTerm.toLowerCase()) && (
                                                    <div className="p-8 text-center space-y-2">
                                                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                                            <Search size={24} />
                                                        </div>
                                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No matching sites found</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="flex items-center justify-center gap-4 text-slate-400 font-bold">
                            <span className="flex items-center gap-1.5"><MapPin size={16} /> {isClockedIn ? activeJob : 'No Active Site'}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                            <span className="flex items-center gap-1.5 text-blue-600"><CheckCircle size={16} /> Verified Site</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="w-full space-y-4">
                        <button
                            onClick={handleToggle}
                            disabled={loading}
                            className={`w-full py-6 rounded-3xl font-black text-xl uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${isClockedIn
                                ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-200 hover:-translate-y-1'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 hover:-translate-y-1'
                                } ${loading ? 'opacity-80 cursor-not-allowed' : ''}`}
                        >
                            {loading ? <RefreshCw className="animate-spin" size={24} /> : (
                                isClockedIn ? (
                                    <>
                                        <Square size={24} fill="currentColor" /> Stop Timer & Clock Out
                                    </>
                                ) : (
                                    <>
                                        <Play size={24} fill="currentColor" /> Start Timer & Clock In
                                    </>
                                )
                            )}
                        </button>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Auto-syncing your GPS location...</p>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="bg-slate-50 p-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                    <div className="text-center border-r border-slate-200">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Started At</p>
                        <p className="font-bold text-slate-900">
                            {currentTimeLog ? new Date(currentTimeLog.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Site Entry</p>
                        <p className="font-bold text-slate-900">{siteLocation}</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions for Worker */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => navigate('/company-admin/photos')}
                    className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col items-center gap-3 hover:bg-slate-50 transition active:scale-95"
                >
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                        <Camera size={24} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-tight text-slate-700">Submit Photo</span>
                </button>
                <button
                    className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col items-center gap-3 hover:bg-slate-50 transition active:scale-95 uppercase tracking-tight font-black"
                    onClick={() => navigate('/company-admin/timesheets')}
                >
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                        <RefreshCw size={24} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-tight text-slate-700 text-center">Request Correction</span>
                </button>
            </div>

            {/* Recent Activity Mini-List */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-black text-slate-800 tracking-tight flex items-center gap-2 uppercase text-xs">
                        <History size={16} className="text-slate-400" /> Recent History
                    </h3>
                    <button className="text-[10px] font-black text-blue-600 uppercase" onClick={() => navigate('/company-admin/timesheets')}>View All</button>
                </div>
                <div className="divide-y divide-slate-50">
                    {history.length > 0 ? history.map((log, i) => {
                        const cIn = new Date(log.clockIn);
                        const cOut = log.clockOut ? new Date(log.clockOut) : null;
                        const diff = cOut ? (cOut - cIn) / 1000 : 0;
                        const duration = cOut ? `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m` : 'Active';

                        return (
                            <div key={log._id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                <div className="space-y-1">
                                    <p className="text-sm font-black text-slate-900">
                                        {cIn.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                        {log.projectId?.name || 'Assigned Site'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-slate-900">
                                        {cIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {cOut ? cOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---'}
                                    </p>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${!cOut ? 'text-blue-600 animate-pulse' : 'text-slate-400'}`}>
                                        {duration}
                                    </p>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                            No history yet
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WorkerPunch;
