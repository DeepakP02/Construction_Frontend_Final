import { useState, useEffect } from 'react';
import {
  Camera, MapPin, Clock, CheckCircle, AlertTriangle,
  Briefcase, Shield, Timer, TrendingUp, Calendar, ClipboardList
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const StatCard = ({ title, value, subtext, icon: Icon, color }) => (
  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
      </div>
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
    </div>
    <p className="text-slate-400 text-[10px] mt-3 font-medium">{subtext}</p>
  </div>
);

const ProjectTeamHome = () => {
  const { user } = useAuth();

  // Initialize state from local storage to persist data across reloads
  const [clockedIn, setClockedIn] = useState(() => {
    return localStorage.getItem('project_team_clocked_in') === 'true';
  });

  const [sessionData, setSessionData] = useState(() => {
    const saved = localStorage.getItem('project_team_session');
    return saved ? JSON.parse(saved) : { checkIn: null, checkOut: null };
  });

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('project_team_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [workHours, setWorkHours] = useState('0.0h');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });

  const showToast = (message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  // Timer for current clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate work hours (History + Current Session)
  useEffect(() => {
    const calculateHours = () => {
      let totalHours = 0;

      // Sum history duration
      history.forEach(session => {
        if (session.duration) totalHours += parseFloat(session.duration);
      });

      // Add current session duration
      if (clockedIn && sessionData.checkIn) {
        const start = new Date(sessionData.checkIn);
        const end = new Date();
        const diffMs = end - start;
        const currentHours = (diffMs / (1000 * 60 * 60));
        totalHours += currentHours;
      }

      setWorkHours(`${Math.max(0, totalHours).toFixed(1)}h`);
    };

    calculateHours();
    // Update hours every minute if clocked in
    const interval = setInterval(calculateHours, 60000);
    return () => clearInterval(interval);
  }, [sessionData, clockedIn, history]);

  const handleClockAction = async () => {
    setLoading(true);
    // Simulate API delay for better UX feel
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const now = new Date();

    if (!clockedIn) {
      // Clock In Logic
      const newData = { checkIn: now.toISOString(), checkOut: null };
      setSessionData(newData);
      setClockedIn(true);

      // Save to local storage
      localStorage.setItem('project_team_clocked_in', 'true');
      localStorage.setItem('project_team_session', JSON.stringify(newData));
      showToast('Clocked in successfully!');
    } else {
      // Clock Out Logic
      const checkInTime = new Date(sessionData.checkIn);
      const duration = ((now - checkInTime) / (1000 * 60 * 60)).toFixed(1);

      const completedSession = {
        checkIn: sessionData.checkIn,
        checkOut: now.toISOString(),
        duration: duration
      };

      const newHistory = [completedSession, ...history];
      setHistory(newHistory);

      const newData = { ...sessionData, checkOut: now.toISOString() };
      setSessionData(newData);
      setClockedIn(false);

      // Save to local storage
      localStorage.setItem('project_team_clocked_in', 'false');
      localStorage.setItem('project_team_session', JSON.stringify(newData));
      localStorage.setItem('project_team_history', JSON.stringify(newHistory));
      showToast('Shift completed. Clocked out!');
    }
    setLoading(false);
  };

  const tasks = [
    { title: 'Inspect Reinforcement', time: '08:00 AM', status: 'Completed', priority: 'High', location: 'Section B-12' },
    { title: 'Pour Concrete Lvl 3', time: '10:30 AM', status: 'Pending', priority: 'High', location: 'North Wing' },
    { title: 'Site Cleanup', time: '04:00 PM', status: 'Pending', priority: 'Medium', location: 'Ground Floor' },
  ];

  return (
    <div className="space-y-6 relative">
      {/* Custom Toast Notification */}
      {toast.visible && (
          <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[1000] px-6 py-4 rounded-3xl shadow-2xl animate-in slide-in-from-top-10 duration-500 flex items-center gap-4 border backdrop-blur-md ${
              toast.type === 'success' ? 'bg-emerald-500/95 text-white border-emerald-400' : 'bg-red-500/95 text-white border-red-400'
          }`}>
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
              </div>
              <span className="font-black text-sm uppercase tracking-widest leading-none mt-0.5">{toast.message}</span>
          </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hello, {user?.name || 'Team Member'}!</h1>
          <p className="text-slate-500 text-sm">You're assigned to <span className="font-semibold text-slate-700">Skyline Tower</span> today.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 flex items-center gap-3 shadow-sm self-start md:self-auto">
          <Calendar size={18} className="text-blue-600" />
          <span className="text-sm font-medium text-slate-700">
            {currentTime.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Clocking & Stats */}
        <div className="lg:col-span-1 space-y-6">
          {/* Clock In/Out Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center relative overflow-hidden">
            {/* Decorative background element */}
            <div className={`absolute top-0 left-0 w-full h-1.5 ${clockedIn ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>

            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Shift Status: {clockedIn ? 'Active' : 'Not Started'}</p>
            <h2 className="text-4xl font-black text-slate-800 mb-6 font-mono tracking-tighter">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </h2>

            <button
              onClick={handleClockAction}
              disabled={loading}
              className={`w-40 h-40 rounded-full border-8 flex flex-col items-center justify-center transition-all transform active:scale-95 shadow-2xl mx-auto
                ${clockedIn
                  ? 'border-red-100 bg-red-600 text-white shadow-red-200 hover:bg-red-700'
                  : 'border-emerald-100 bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700'
                } ${loading ? 'opacity-80 scale-95' : ''}`}
            >
              {loading ? (
                <Clock size={36} className="animate-spin" />
              ) : (
                <>
                  <Timer size={36} className="mb-2" />
                  <span className="text-xl font-black uppercase tracking-tight">
                    {clockedIn ? 'Clock Out' : 'Clock In'}
                  </span>
                </>
              )}
            </button>

            <div className="mt-6 flex flex-col items-center gap-2">
              <p className="text-sm text-slate-600 font-medium flex items-center justify-center gap-1.5">
                <MapPin size={16} className="text-blue-500" /> Skyline Tower (Site A)
              </p>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full uppercase">Verified via GPS</span>
            </div>

            {/* Session Times Display */}
            {(sessionData.checkIn || sessionData.checkOut) && (
              <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-left">
                <div className="bg-slate-50 p-2 rounded-lg">
                  <p className="text-[10px] uppercase text-slate-400 font-bold">Clock In</p>
                  <p className="text-sm font-bold text-slate-700">
                    {sessionData.checkIn ? new Date(sessionData.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </p>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <p className="text-[10px] uppercase text-slate-400 font-bold">Clock Out</p>
                  <p className="text-sm font-bold text-slate-700">
                    {sessionData.checkOut ? new Date(sessionData.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </p>
                </div>
              </div>
            )}

            {/* Recent History Log */}
            {history.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 text-left">
                <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Recent Activity</p>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                  {history.map((session, index) => (
                    <div key={index} className="flex justify-between items-center text-xs bg-slate-50 p-2 rounded border border-slate-100">
                      <div>
                        <span className="block font-semibold text-slate-700">
                          {new Date(session.checkIn).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-slate-500">
                          {new Date(session.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                          {session.checkOut ? new Date(session.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        {session.duration}h
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Work Hours"
              value={workHours}
              subtext="Goal: 8.0h"
              icon={Timer}
              color="bg-indigo-500"
            />
            <StatCard
              title="Safety Incidents"
              value="0"
              subtext="Clear week!"
              icon={Shield}
              color="bg-emerald-500"
            />
          </div>
        </div>

        {/* Right Column: Tasks & Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ClipboardList size={20} className="text-blue-600" />
                Assigned Tasks <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full ml-1">3 Total</span>
              </h3>
              <button className="text-xs font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider">View Full Schedule</button>
            </div>

            <div className="divide-y divide-slate-100">
              {tasks.map((task, i) => (
                <div key={i} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                  <div className="flex gap-4 items-center">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 
                      ${task.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                      {task.status === 'Completed' ? <CheckCircle size={20} /> : <Clock size={20} />}
                    </div>
                    <div>
                      <h4 className={`font-bold transition-colors ${task.status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-800 group-hover:text-blue-700'}`}>
                        {task.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                          <Timer size={12} /> {task.time}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                          <MapPin size={12} /> {task.location}
                        </span>
                        {task.priority === 'High' && (
                          <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Priority</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {task.status !== 'Completed' && (
                      <button className="hidden sm:block text-xs font-bold text-slate-400 border border-slate-200 px-3 py-1.5 rounded-lg hover:border-emerald-500 hover:text-emerald-600 transition-all uppercase tracking-wider">
                        Mark Done
                      </button>
                    )}
                    <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition">
                      <TrendingUp size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Site Announcement / News */}
          <div className="bg-gradient-to-br from-blue-700 to-indigo-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="max-w-md">
                <span className="bg-white/20 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full mb-3 inline-block">Site Update</span>
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <Shield size={22} className="text-blue-200" /> Safety Briefing: High Winds
                </h3>
                <p className="text-blue-100 text-sm leading-relaxed">
                  Expected high winds this afternoon. Please secure all loose materials on upper levels and double-check scaffolding attachments.
                </p>
              </div>
              <button className="bg-white text-blue-800 px-6 py-2.5 rounded-xl font-bold text-sm shadow-xl hover:bg-blue-50 transition-colors shrink-0">
                Acknowledge Alert
              </button>
            </div>
            {/* Shapes */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-24 -mb-24 blur-2xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectTeamHome;
