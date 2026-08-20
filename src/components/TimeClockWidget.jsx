import { useState, useEffect } from 'react';
import { Clock, MapPin, Play, Square, Loader } from 'lucide-react';
import api from '../utils/api';

const TimeClockWidget = () => {
    const [status, setStatus] = useState('idle'); // idle, loading, active
    const [activeLog, setActiveLog] = useState(null);
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [elapsedTime, setElapsedTime] = useState('00:00:00');

    const fetchActiveStatus = async () => {
        try {
            const [logsRes, projectsRes] = await Promise.all([
                api.get('/timelogs'),
                api.get('/projects')
            ]);

            setProjects(projectsRes.data);

            const ongoing = logsRes.data.find(log => !log.clockOut);
            if (ongoing) {
                setActiveLog(ongoing);
                setStatus('active');
                setSelectedProject(ongoing.projectId?._id || ongoing.projectId);
            }
        } catch (error) {
            console.error('Error fetching time clock status:', error);
        }
    };

    useEffect(() => {
        fetchActiveStatus();
    }, []);

    useEffect(() => {
        let interval;
        if (status === 'active' && activeLog) {
            interval = setInterval(() => {
                const start = new Date(activeLog.clockIn).getTime();
                const now = new Date().getTime();
                const diff = now - start;

                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);

                setElapsedTime(
                    `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
                );
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [status, activeLog]);

    const handleClockIn = async () => {
        if (!selectedProject) {
            alert('Please select a project');
            return;
        }

        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser. Location access is mandatory for clock-in.');
            return;
        }

        try {
            setStatus('loading');

            // Get geolocation
            const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                });
            });

            const res = await api.post('/timelogs/clock-in', {
                projectId: selectedProject,
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                deviceInfo: navigator.userAgent
            });

            setActiveLog(res.data);
            setStatus('active');
        } catch (error) {
            console.error('Clock in failed:', error);
            let message = 'Clock in failed';

            if (error.code === 1) { // PERMISSION_DENIED
                message = 'Location permission denied. You MUST allow location access to clock in. Please check your browser settings.';
            } else if (error.code === 2) { // POSITION_UNAVAILABLE
                message = 'Location unavailable. Please ensure GPS is turned on and you have a clear view of the sky.';
            } else if (error.code === 3) { // TIMEOUT
                message = 'Location request timed out. Please try again in an area with better signal.';
            } else {
                message = error.response?.data?.message || error.message || message;
            }

            alert(message);
            setStatus('idle');
        }
    };

    const handleClockOut = async () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser. Location access is mandatory for clock-out.');
            return;
        }

        try {
            setStatus('loading');

            const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                });
            });

            await api.post('/timelogs/clock-out', {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy
            });

            setActiveLog(null);
            setStatus('idle');
            setElapsedTime('00:00:00');
        } catch (error) {
            console.error('Clock out failed:', error);
            let message = 'Clock out failed';

            if (error.code === 1) {
                message = 'Location permission denied. You MUST allow location access to clock out. Please check your browser settings.';
            } else if (error.code === 2) {
                message = 'Location unavailable. Please ensure GPS is turned on.';
            } else if (error.code === 3) {
                message = 'Location request timed out. Please try again.';
            } else {
                message = error.response?.data?.message || error.message || message;
            }

            alert(message);
            setStatus('active');
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                        <Clock size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Time Clock</h3>
                        <p className="text-xs text-slate-500">{status === 'active' ? 'Recording session...' : 'Ready to start'}</p>
                    </div>
                </div>
                {status === 'active' && activeLog && (
                    <div className="flex flex-col items-end gap-1">
                        <div className="text-xl font-mono font-bold text-slate-800 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                            {elapsedTime}
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                            <div className={`w-1.5 h-1.5 rounded-full ${activeLog.isOutsideGeofence ? 'bg-red-500' : 'bg-emerald-500'}`} />
                            {activeLog.isOutsideGeofence ? 'Outside Geofence' : 'Location Verified'}
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                {status !== 'active' && (
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                            <MapPin size={12} /> Select Project
                        </label>
                        <select
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                            disabled={status === 'loading'}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 transition disabled:opacity-50"
                        >
                            <option value="">Choose a site...</option>
                            {projects.map(p => (
                                <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {status === 'active' && activeLog && (
                    <div className={`p-3 rounded-lg border ${activeLog.isOutsideGeofence ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                        <p className={`text-xs font-medium ${activeLog.isOutsideGeofence ? 'text-red-600' : 'text-blue-600'}`}>
                            {activeLog.isOutsideGeofence ? '⚠️ Warning: Outside Site Area' : 'Currently working at:'}
                        </p>
                        <p className={`text-sm font-bold ${activeLog.isOutsideGeofence ? 'text-red-900' : 'text-blue-900'}`}>{projects.find(p => p._id === (activeLog.projectId?._id || activeLog.projectId))?.name || 'Project Site'}</p>
                        <p className="text-[10px] mt-1 text-slate-400">Clocked in at: {new Date(activeLog.clockIn).toLocaleTimeString()}</p>
                    </div>
                )}

                <div className="pt-2">
                    {status === 'active' ? (
                        <button
                            onClick={handleClockOut}
                            disabled={status === 'loading'}
                            className="w-full bg-red-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition shadow-lg shadow-red-200 disabled:opacity-70"
                        >
                            {status === 'loading' ? <Loader className="animate-spin" size={20} /> : <><Square size={18} fill="currentColor" /> Clock Out Now</>}
                        </button>
                    ) : (
                        <button
                            onClick={handleClockIn}
                            disabled={status === 'loading'}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-70"
                        >
                            {status === 'loading' ? <Loader className="animate-spin" size={20} /> : <><Play size={18} fill="currentColor" /> Clock In to Shift</>}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TimeClockWidget;
