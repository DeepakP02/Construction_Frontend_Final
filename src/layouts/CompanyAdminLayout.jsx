import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useClock } from '../context/ClockContext';
import { useState, useEffect, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';
import {
  LayoutDashboard, Briefcase, Clock, FileText,
  Wrench, ClipboardList, BarChart2, DollarSign,
  Users, Settings, LogOut, Menu, X, Bell, MessageSquare,
  Search, ChevronDown, RefreshCw, MapPin, Building2, PenTool, Camera, FileQuestion, AlertCircle, Activity
} from 'lucide-react';
import api, { BASE_URL } from '../utils/api';
import Logo from '../assets/images/Logo.png';
import { playSound } from '../utils/notificationSound';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';

const CompanyAdminLayout = () => {
  const { user, logout, updateUserData, socket } = useAuth();
  const { isClockedIn, formattedElapsed } = useClock();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isJobSelectorOpen, setIsJobSelectorOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const jobSelectorRef = useRef(null);
  const notificationRef = useRef(null);

  const [projectsList, setProjectsList] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);
  const [issueCount, setIssueCount] = useState(0);
  const [poCount, setPoCount] = useState(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  // socketRef removed: using global shared socket
  const pathnameRef = useRef(location.pathname);
  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  // Determine current project/job for dynamic header label
  const activeProject = useMemo(() => {
    const projectIdInUrl = location.pathname.split('/projects/')[1]?.split('/')[0];
    const jobIdInUrl = location.pathname.split('/jobs/')[1]?.split('/')[0];
    
    const searchParams = new URLSearchParams(location.search);
    const projectIdInQuery = searchParams.get('projectId');

    return projectsList.find(p => {
      // 1. Exact Job ID match (from URL path or Query Param for Tasks filter)
      if (p.isJob && (p._id === jobIdInUrl || p._id === projectIdInQuery)) return true;
      
      // 2. Exact Project ID match (from URL path or Query Param for Admins/PMs)
      if (!p.isJob && p._id === (projectIdInUrl || projectIdInQuery)) return true;
      
      // 3. Fallback: If they filter by Project in Tasks (older sync logic), find their Job for that project
      const pId = p.projectId?._id || p.projectId;
      if (p.isJob && projectIdInQuery && pId?.toString() === projectIdInQuery && !jobIdInUrl) return true;

      return false;
    });
  }, [location.pathname, location.search, projectsList]);

  const fetchSidebarMetrics = async () => {
    try {
      const res = await api.get('/reports/sidebar-metrics');
      const { 
        taskCount, 
        issueCount, 
        chatUnreadCount, 
        notificationCount, 
        projects,
        poCount
      } = res.data;
      
      setTaskCount(taskCount);
      setIssueCount(issueCount);
      setChatUnreadCount(chatUnreadCount);
      setProjectsList(projects || []);
      setPoCount(poCount || 0);
      // Pre-fetch notifications but only if needed or keep separate as they are specific
      // For now let's just use the count for the badge
    } catch (error) {
      console.error('Error fetching sidebar metrics:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    if (user && socket) {
      fetchSidebarMetrics();
      fetchNotifications();

      const handleConnect = () => {
        socket.emit('register_user', user);
      };

      const handleUnreadCount = () => {
        fetchSidebarMetrics();
      };

      const handleNewNotification = (payload) => {
        if (payload.type === 'chat') {
          fetchSidebarMetrics();
          if (!pathnameRef.current.includes('/chat')) {
            playSound('MESSAGE_RECEIVED');
          }
        } else {
          playSound('NOTIFICATION');
          fetchNotifications();
          fetchSidebarMetrics();
        }
      };

      const handleNewMessage = (payload) => {
        const senderId = payload.sender?._id || payload.sender;
        const currentUserId = user?._id || user?.id;
        if (!senderId || String(senderId) === String(currentUserId)) return;

        fetchSidebarMetrics();
        
        if (!pathnameRef.current.includes('/chat')) {
          playSound('MESSAGE_RECEIVED');
          toast.success(`New message from ${payload.sender?.fullName || 'someone'}`);
        }
      };

      socket.on('connect', handleConnect);
      socket.on('unread_count_updated', handleUnreadCount);
      socket.on('new_notification', handleNewNotification);
      socket.on('new_message', handleNewMessage);

      if (socket.connected) {
        handleConnect();
      }

      const interval = setInterval(() => {
        fetchSidebarMetrics();
        fetchNotifications();
      }, 120000);

      return () => {
        clearInterval(interval);
        socket.off('connect', handleConnect);
        socket.off('unread_count_updated', handleUnreadCount);
        socket.off('new_notification', handleNewNotification);
        socket.off('new_message', handleNewMessage);
      };
    }
  }, [user?._id, socket]);

  // Handle clicks outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
      if (jobSelectorRef.current && !jobSelectorRef.current.contains(event.target)) {
        setIsJobSelectorOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuGroups = [
    {
      title: 'Core Management',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/company-admin', permission: 'VIEW_DASHBOARD' },
        { icon: Briefcase, label: 'Projects/Jobs', path: '/company-admin/projects', permission: 'VIEW_PROJECTS' },
        { icon: ClipboardList, label: 'Tasks', path: '/company-admin/tasks', permission: 'VIEW_TASKS', badge: taskCount },
        { icon: MessageSquare, label: 'Chat', path: '/company-admin/chat', permission: 'VIEW_CHAT', badge: chatUnreadCount },
      ]
    },
    {
      title: 'Field Operations',
      items: [
        { icon: Clock, label: 'My Clock', path: '/company-admin/clock', permission: 'CLOCK_IN_OUT' },
        { icon: Users, label: 'Clock In Crew', path: '/company-admin/crew-clock', permission: 'CLOCK_IN_CREW' },
        { icon: Clock, label: 'Timesheets', path: '/company-admin/timesheets', permission: 'VIEW_TIMESHEETS' },
        { icon: FileText, label: 'Daily Logs', path: '/company-admin/daily-logs', permission: 'VIEW_DAILY_LOGS' },
        { icon: Users, label: 'Trade Management', path: '/company-admin/trades', permission: 'VIEW_DAILY_LOGS' },
        { icon: AlertCircle, label: 'Issues', path: '/company-admin/issues', permission: 'VIEW_ISSUES', badge: issueCount > 0 ? issueCount : null },
        { icon: MapPin, label: 'GPS Tracking', path: '/company-admin/gps', permission: 'VIEW_GPS' },
      ]
    },
    {
      title: 'Documentation',
      items: [
        { icon: PenTool, label: 'Drawings', path: '/company-admin/drawings', permission: 'VIEW_DRAWINGS' },
        { icon: Camera, label: 'Photos', path: '/company-admin/photos', permission: 'VIEW_PHOTOS' },
        { icon: Wrench, label: 'Equipment', path: '/company-admin/equipment', permission: 'VIEW_EQUIPMENT' },
        { icon: FileQuestion, label: 'RFIs', path: '/company-admin/rfi', permission: 'VIEW_RFI' },
      ]
    },
    {
      title: 'Finance & Admin',
      items: [
        { icon: DollarSign, label: 'Payroll', path: '/company-admin/payroll', permission: 'VIEW_PAYROLL' },
        { icon: ClipboardList, label: 'Purchase Orders', path: '/company-admin/purchase-orders', permission: 'VIEW_PO', badge: poCount > 0 ? poCount : null },
        { icon: FileText, label: 'Invoices', path: '/company-admin/invoices', permission: 'VIEW_INVOICES' },
        { icon: BarChart2, label: 'Reports', path: '/company-admin/project-intel', permission: 'VIEW_REPORTS' },
        // { icon: Activity
        // , label: 'Reports', path: '/company-admin/reports', permission: 'VIEW_REPORTS' },
        { icon: Users, label: 'Team', path: '/company-admin/team', permission: 'VIEW_TEAM' },
        { icon: Settings, label: 'Settings', path: '/company-admin/settings', permission: 'ACCESS_SETTINGS' },
      ]
    }
  ];

  const getFilteredGroups = () => {
    return menuGroups.map(group => ({
      ...group,
      items: group.items.filter(item => {
        // Self clock-in ("My Clock") is available to EVERY role — the backend allows
        // self clock-in for all authenticated users regardless of CLOCK_IN_* permissions.
        if (item.label === 'My Clock') return true;
        if (user?.role === 'COMPANY_OWNER') {
          return true;
        }
        return user?.permissions?.includes(item.permission);
      })
    })).filter(group => group.items.length > 0);
  };

  const filteredGroups = getFilteredGroups();

  return (
    <div className="flex h-screen bg-[#f3f4f7] text-slate-900 font-sans overflow-hidden">
      <style>{`
        .sidebar-nav-hide-scroll::-webkit-scrollbar { display: none; }
        .sidebar-nav-hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50 w-60 h-screen bg-[#0f172a] text-white flex flex-col transition-transform duration-300 ease-in-out border-r border-[#1e293b]
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* grid overlay */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(21,93,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(21,93,255,0.03) 1px,transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="px-6 py-6 flex flex-col items-center justify-center relative z-10">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#155dff] to-[#4e8cff] rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative w-12 h-12 bg-[#0f172a] border border-[#1e293b] rounded-full flex items-center justify-center overflow-hidden">
              <img
                src={Logo}
                alt="KAAL Logo"
                className="h-8 w-auto"
              />
            </div>
          </div>
          <div className="mt-4 text-center">
             <div className="h-[2px] w-8 bg-[#155dff] mx-auto mb-2 rounded-full"></div>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">{user?.role?.replace(/_/g, ' ') || 'Admin'}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-6 sidebar-nav-hide-scroll relative z-10">
          {filteredGroups.map((group) => (
            <div key={group.title} className="space-y-1.5">
              <h3 className="px-3 text-[10px] font-bold text-[#64748b] uppercase tracking-widest">{group.title}</h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path || (item.path !== '/company-admin' && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.label}
                      to={item.path}
                      className={`group flex items-center gap-3 px-3 py-1.5 rounded-xl transition-all duration-200 relative
                        ${isActive
                          ? 'bg-[#155dff] text-white shadow-lg shadow-[#155dff]/25'
                          : 'text-[#94a3b8] hover:bg-white/[0.04] hover:text-white'
                        }
                      `}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors
                        ${isActive ? 'bg-white/20' : 'bg-white/[0.04] border border-white/[0.05] group-hover:border-white/10 group-hover:bg-white/[0.08]'}
                      `}>
                        <item.icon size={15} />
                      </div>
                      <span className="text-xs font-semibold tracking-tight flex-1">{item.label}</span>
                      
                      {item.badge && (
                        <div className={`px-2 py-0.5 rounded-full text-[9px] font-bold
                          ${isActive ? 'bg-white text-[#155dff]' : 'bg-[#155dff]/10 text-[#155dff] border border-[#155dff]/20'}
                        `}>
                          {item.badge}
                        </div>
                      )}

                      {isActive && (
                        <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Bottom */}
        <div className="p-5 border-t border-[#1e293b] space-y-4 relative z-10 bg-[#0f172a]/80 backdrop-blur-md">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black overflow-hidden
              ${user?.role === 'COMPANY_OWNER' ? 'bg-[#155dff]/10 text-[#155dff] border border-[#155dff]/20' : 'bg-white/[0.05] text-[#94a3b8] border border-white/[0.1]'}
            `}>
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                (user?.fullName || 'A').charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate text-white leading-none">{user?.fullName || 'Admin'}</p>
              <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500 mt-1">{user?.role?.replace(/_/g, ' ') || 'Platform Root'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2.5 text-[#94a3b8] hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all duration-200 text-xs font-bold uppercase tracking-wider"
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 z-30 shrink-0">
          <div className="flex items-center gap-6 flex-1">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-slate-600 hover:text-slate-900"
            >
              <Menu size={24} />
            </button>

            {/* Job Selector */}
            <div className="relative max-w-sm hidden sm:block" ref={jobSelectorRef}>
              <button
                onClick={() => setIsJobSelectorOpen(!isJobSelectorOpen)}
                className="flex items-center gap-2.5 bg-[#f8fafc] border border-slate-200 px-3.5 py-1.5 rounded-lg text-sm font-semibold text-slate-700 hover:border-slate-300 transition-all w-60"
              >
                <Search size={14} className="text-slate-400" />
                <div className="flex-1 text-left truncate flex flex-col leading-none">
                  <span className="truncate">{activeProject ? activeProject.name : 'Quick Select Job'}</span>
                  {activeProject?.isJob && activeProject?.projectName && (
                    <span className="text-[9px] text-slate-400 truncate mt-0.5 font-medium">Project: {activeProject.projectName}</span>
                  )}
                </div>
                <ChevronDown size={12} className={`text-slate-400 transition-transform ${isJobSelectorOpen ? 'rotate-180' : ''}`} />
              </button>
              {isJobSelectorOpen && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-fade-in max-h-64 overflow-y-auto custom-scrollbar">
                  <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">
                    {['FOREMAN', 'WORKER', 'SUBCONTRACTOR'].includes(user?.role) ? 'Active Jobs' : 'Active Projects'}
                  </div>
                    {projectsList.filter(p => ['active', 'planning', 'on-hold'].includes(p.status)).length > 0 ? (
                      projectsList.filter(p => ['active', 'planning', 'on-hold'].includes(p.status)).map((project) => {
                        const statusCfg = {
                          active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-500' },
                          planning: { label: 'Planning', cls: 'bg-orange-50 text-orange-600 border-orange-100', dot: 'bg-orange-500' },
                          'on-hold': { label: 'On Hold', cls: 'bg-yellow-50 text-yellow-600 border-yellow-100', dot: 'bg-yellow-500' },
                          completed: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-500' },
                        }[project.status] || { label: project.status, cls: 'bg-slate-50 text-slate-600 border-slate-100', dot: 'bg-slate-500' };

                        return (
                          <button
                            key={project._id}
                            onClick={() => {
                              if (project.isJob) {
                                navigate(`/company-admin/projects/${project.projectId}/jobs/${project._id}`);
                              } else {
                                navigate(`/company-admin/projects/${project._id}`);
                              }
                              setIsJobSelectorOpen(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm font-semibold flex items-center gap-3 transition-colors border-b border-slate-50 last:border-none"
                          >
                            <div className={`w-2 h-2 rounded-full shadow-sm shrink-0 ${statusCfg.dot}`}></div>
                            <div className="flex flex-col min-w-0 flex-1 leading-tight">
                              <span className="truncate">{project.name}</span>
                              {project.isJob && project.projectName && (
                                <span className="truncate text-[10px] text-slate-400 font-medium">Project: {project.projectName}</span>
                              )}
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${statusCfg.cls}`}>
                              {statusCfg.label}
                            </span>
                          </button>
                        );
                      })
                    ) : (
                    <div className="px-4 py-3 text-xs text-slate-400 font-bold italic">
                      No {['FOREMAN', 'WORKER', 'SUBCONTRACTOR'].includes(user?.role) ? 'jobs' : 'projects'} found
                    </div>
                  )}
                  {!['FOREMAN', 'WORKER', 'SUBCONTRACTOR'].includes(user?.role) && (
                    <div className="p-2 mt-1">
                      <button
                        onClick={() => { navigate('/company-admin/projects'); setIsJobSelectorOpen(false); }}
                        className="w-full py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-500 tracking-wider transition-all"
                      >
                        View All Projects
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-6">
            {/* Company Branding (Static) */}
            <div className="text-right hidden md:block">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Organization</span>
              <div className="text-sm font-black text-slate-900 leading-none">
                {user?.company?.name || ''}
              </div>
            </div>

            {/* Live self clock-in timer — persists across pages while clocked in */}
            {isClockedIn && (
              <button
                onClick={() => navigate('/company-admin/clock')}
                title="You are clocked in — view time clock"
                className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-all"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-sm font-bold tabular-nums leading-none">{formattedElapsed}</span>
              </button>
            )}

            <div className="h-8 w-[1px] bg-slate-200 hidden md:block"></div>

            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="p-2 hover:bg-slate-50 rounded-lg transition relative group"
              >
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <MessageSquare size={20} className={chatUnreadCount > 0 ? 'text-blue-600' : 'text-slate-400'} />
                    {chatUnreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full border-2 border-white text-[10px] text-white flex items-center justify-center font-bold">
                        {chatUnreadCount}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Bell size={20} className={notifications.some(n => !n.isRead) ? 'text-orange-600' : 'text-slate-400'} />
                    {notifications.some(n => !n.isRead) && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white text-[10px] text-white flex items-center justify-center font-bold">
                        {notifications.filter(n => !n.isRead).length}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              {isNotificationOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-fade-in max-h-[400px] flex flex-col">
                  <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alert Center</span>
                    <div className="flex gap-2">
                      {chatUnreadCount > 0 && <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase">Messages</span>}
                      {notifications.some(n => !n.isRead) && <span className="text-[9px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-bold uppercase">System</span>}
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1 custom-scrollbar">
                    {/* Chat Notification Entry */}
                    {chatUnreadCount > 0 && (
                      <button
                        onClick={() => { navigate('/company-admin/chat'); setIsNotificationOpen(false); }}
                        className="w-full text-left px-4 py-3 bg-blue-50/50 hover:bg-blue-50 transition-colors border-b border-slate-50 flex gap-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white shrink-0 flex items-center justify-center">
                          <MessageSquare size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-800">New Messages</p>
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5 leading-relaxed">You have {chatUnreadCount} unread transmissions.</p>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 shrink-0 animate-pulse"></div>
                      </button>
                    )}

                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <button
                          key={notif._id}
                          onClick={async () => {
                            if (!notif.isRead) await api.patch(`/notifications/${notif._id}/read`);
                            if (notif.link) navigate(notif.link);
                            setIsNotificationOpen(false);
                            fetchNotifications();
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-none flex gap-3 ${!notif.isRead ? 'bg-orange-50/10' : ''}`}
                        >
                          <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center 
                            ${notif.type === 'financial' ? 'bg-emerald-50 text-emerald-600' :
                              notif.type === 'task' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'}`}>
                            {notif.type === 'financial' ? <DollarSign size={16} /> : <Bell size={16} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-800 truncate">{notif.title}</p>
                            <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">{notif.message}</p>
                            <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-tight">
                              {new Date(notif.createdAt).toLocaleDateString()} · {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          {!notif.isRead && <div className="w-2 h-2 rounded-full bg-orange-600 mt-2 shrink-0"></div>}
                        </button>
                      ))
                    ) : chatUnreadCount === 0 && (
                      <div className="p-10 flex flex-col items-center justify-center text-center">
                        <Bell className="text-slate-200 mb-3" size={40} />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-tight">No active alerts</p>
                      </div>
                    )}
                  </div>
                  <div className="p-2 border-t border-slate-50 flex items-center justify-between gap-2">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await api.patch('/notifications/mark-all-read');
                          fetchNotifications();
                        } catch (err) {
                          console.error('Failed to mark all as read:', err);
                        }
                      }}
                      className="flex-1 py-2 text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors text-center"
                    >
                      Mark All as Read
                    </button>
                    <div className="w-[1px] h-3 bg-slate-200"></div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        setShowClearConfirm(true);
                      }}
                      className="flex-1 py-2 text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors text-center"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="h-8 w-[1px] bg-slate-200 hidden sm:block"></div>

            {/* User Profile */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-3 hover:bg-slate-50 p-1 pr-3 rounded-full border border-transparent hover:border-slate-200 transition"
              >
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-sm bg-slate-200">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600 font-bold">
                      {(user?.fullName || 'U').charAt(0)}
                    </div>
                  )}
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-sm font-bold text-slate-900 leading-tight">
                    {user?.fullName || ''}
                  </p>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${user?.role === 'SUBCONTRACTOR' ? 'text-orange-500' :
                    user?.role === 'WORKER' ? 'text-emerald-500' :
                      user?.role === 'FOREMAN' ? 'text-blue-500' :
                        user?.role === 'PM' ? 'text-violet-500' :
                          'text-slate-400'
                    }`}>
                    {user?.role?.replace(/_/g, ' ') || ''}
                  </p>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {isProfileMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-fade-in">
                  <button
                    onClick={() => { navigate('/company-admin/settings'); setIsProfileMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                  >
                    <Users size={16} /> My Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium border-t border-slate-100 mt-1 pt-3"
                  >
                    <LogOut size={16} /> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-auto bg-[#f3f4f7] scroll-smooth p-3 md:p-4 px-1 md:px-2">
          <div className="w-full">
            <Outlet />
          </div>
        </main>
      </div>
      {/* Clear Notifications Confirmation Modal */}
      <Modal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title="Clear Notifications"
        maxWidth="max-w-sm"
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h4 className="text-lg font-bold text-slate-800 mb-2">Are you sure?</h4>
          <p className="text-sm text-slate-500 mb-6">
            This will permanently remove all your notifications. This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowClearConfirm(false)}
              className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                try {
                  await api.delete('/notifications/clear-all');
                  fetchNotifications();
                  setShowClearConfirm(false);
                  setIsNotificationOpen(false);
                } catch (err) {
                  console.error('Failed to clear notifications:', err);
                }
              }}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-200"
            >
              Yes, Clear All
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CompanyAdminLayout;
