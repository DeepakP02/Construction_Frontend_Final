import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
    HardHat, Briefcase, ClipboardList, Clock, Camera,
    FileText, MessageSquare, ChevronRight, CheckCircle2,
    AlertTriangle, Calendar, Wrench, Bell, LogOut,
    User, TrendingUp, Star, ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const SubcontractorDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [greeting, setGreeting] = useState('');
    const [stats, setStats] = useState({
        activeProjects: 0,
        pendingTasks: 0,
        hoursThisWeek: 0,
        completedTasks: 0
    });
    const [recentTasks, setRecentTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 17) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch projects
                const [projectsRes, tasksRes] = await Promise.allSettled([
                    api.get('/projects'),
                    api.get('/tasks')
                ]);

                const projects = projectsRes.status === 'fulfilled' ? projectsRes.value.data : [];
                const tasks = tasksRes.status === 'fulfilled' ? tasksRes.value.data : [];

                const completedTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === 'completed').length : 0;
                const pendingTasks = Array.isArray(tasks) ? tasks.filter(t => t.status !== 'completed').length : 0;

                setStats({
                    activeProjects: Array.isArray(projects) ? projects.length : 0,
                    pendingTasks,
                    hoursThisWeek: 38,
                    completedTasks
                });

                setRecentTasks(Array.isArray(tasks) ? tasks.slice(0, 5) : []);
            } catch (err) {
                console.error('Dashboard fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const quickLinks = [
        { label: 'My Projects', icon: Briefcase, color: 'from-blue-500 to-blue-600', path: '/company-admin/projects', perm: 'VIEW_PROJECTS' },
        { label: 'My Tasks', icon: ClipboardList, color: 'from-violet-500 to-violet-600', path: '/company-admin/tasks', perm: 'VIEW_MY_TASKS' },
        { label: 'Clock In/Out', icon: Clock, color: 'from-emerald-500 to-emerald-600', path: '/company-admin/clock', perm: 'CLOCK_IN_OUT' },
        { label: 'Photos', icon: Camera, color: 'from-pink-500 to-pink-600', path: '/company-admin/photos', perm: 'VIEW_PHOTOS' },
        { label: 'Schedule', icon: Calendar, color: 'from-amber-500 to-amber-600', path: '/company-admin/schedule', perm: 'VIEW_SCHEDULE' },
        { label: 'Drawings', icon: FileText, color: 'from-cyan-500 to-cyan-600', path: '/company-admin/drawings', perm: 'VIEW_DRAWINGS' },
        { label: 'Daily Logs', icon: ClipboardList, color: 'from-orange-500 to-orange-600', path: '/company-admin/daily-logs', perm: 'VIEW_DAILY_LOGS' },
        { label: 'Chat', icon: MessageSquare, color: 'from-teal-500 to-teal-600', path: '/company-admin/chat', perm: 'VIEW_CHAT' },
        { label: 'Equipment', icon: Wrench, color: 'from-red-500 to-red-600', path: '/company-admin/equipment', perm: 'VIEW_EQUIPMENT' },
    ];

    const allowedLinks = quickLinks.filter(link =>
        !user?.permissions || user.permissions.includes(link.perm)
    );

    const statCards = [
        { label: 'Active Projects', value: stats.activeProjects, icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
        { label: 'Pending Tasks', value: stats.pendingTasks, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
        { label: 'Hours This Week', value: stats.hoursThisWeek, icon: Clock, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
        { label: 'Completed Tasks', value: stats.completedTasks, icon: CheckCircle2, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
    ];

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-white font-sans">
            {/* Top Navigation */}
            <header className="sticky top-0 z-40 bg-[#0d1426]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                        <HardHat size={18} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-white leading-none">Subcontractor Portal</h1>
                        <p className="text-xs text-slate-400 mt-0.5">KAAL Construction</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="relative p-2 rounded-lg hover:bg-white/5 transition">
                        <Bell size={18} className="text-slate-300" />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full"></span>
                    </button>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-xs">
                            {user?.fullName?.charAt(0) || 'S'}
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-xs font-semibold text-white leading-none">{user?.fullName || 'Subcontractor'}</p>
                            <p className="text-[10px] text-orange-400 mt-0.5">Subcontractor</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition group"
                        title="Logout"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            <div className="p-6 w-full space-y-8">
                {/* Welcome Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-500 p-6 shadow-2xl shadow-orange-500/20">
                    <div className="absolute top-0 right-0 w-64 h-64 opacity-10 translate-x-16 -translate-y-16">
                        <HardHat size={256} className="text-white" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <Star size={14} className="text-yellow-200 fill-yellow-200" />
                            <span className="text-xs font-semibold uppercase tracking-widest text-yellow-100">Subcontractor Portal</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                            {greeting}, {user?.fullName?.split(' ')[0] || 'Subcontractor'}! 👷
                        </h2>
                        <p className="text-orange-100 text-sm mt-1">Here's your work overview for today.</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {statCards.map((stat, i) => (
                        <div key={i} className={`p-5 rounded-2xl border ${stat.bg} backdrop-blur-md`}>
                            <div className="flex items-center justify-between mb-3">
                                <stat.icon size={20} className={stat.color} />
                                <ArrowUpRight size={14} className="text-slate-500" />
                            </div>
                            <p className="text-2xl font-black text-white">{loading ? '...' : stat.value}</p>
                            <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Quick Access */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white">Quick Access</h3>
                        <span className="text-xs text-slate-500">{allowedLinks.length} modules available</span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                        {allowedLinks.map((link, i) => (
                            <button
                                key={i}
                                onClick={() => navigate(link.path)}
                                className="group flex flex-col items-center gap-2 p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 rounded-2xl transition-all duration-200 hover:scale-105"
                            >
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${link.color} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all`}>
                                    <link.icon size={22} className="text-white" />
                                </div>
                                <span className="text-[11px] font-medium text-slate-300 text-center leading-tight">{link.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Recent Tasks */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white">Recent Tasks</h3>
                        <button onClick={() => navigate('/company-admin/tasks')} className="text-xs text-orange-400 hover:underline flex items-center gap-1">
                            View All <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                        {loading ? (
                            <div className="p-8 text-center text-slate-500">Loading tasks...</div>
                        ) : recentTasks.length === 0 ? (
                            <div className="p-8 text-center">
                                <ClipboardList size={32} className="text-slate-600 mx-auto mb-2" />
                                <p className="text-slate-500 text-sm">No tasks assigned yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {recentTasks.map((task, i) => (
                                    <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${task.status === 'completed' ? 'bg-emerald-400' : task.status === 'in-progress' ? 'bg-amber-400' : 'bg-slate-500'}`} />
                                            <div>
                                                <p className="text-sm font-medium text-slate-200">{task.title || task.name}</p>
                                                <p className="text-xs text-slate-500">{task.status || 'pending'}</p>
                                            </div>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${task.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                                                task.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                                                    'bg-slate-500/20 text-slate-400'
                                            }`}>
                                            {task.priority || 'normal'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Profile Info */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center text-white font-black text-2xl shadow-lg">
                            {user?.fullName?.charAt(0) || 'S'}
                        </div>
                        <div>
                            <h4 className="font-bold text-white text-lg">{user?.fullName || 'Subcontractor User'}</h4>
                            <p className="text-sm text-slate-400">{user?.email}</p>
                            <div className="mt-1 flex items-center gap-2">
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-semibold border border-orange-500/30">
                                    SUBCONTRACTOR
                                </span>
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                                    Active
                                </span>
                            </div>
                        </div>
                        <div className="ml-auto">
                            <button
                                onClick={() => navigate('/company-admin/settings')}
                                className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/10 transition"
                            >
                                <User size={14} /> Edit Profile
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubcontractorDashboard;
