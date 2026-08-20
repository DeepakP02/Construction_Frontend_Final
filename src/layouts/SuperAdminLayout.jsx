import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import {
  Shield, LayoutDashboard, Building, Users,
  CreditCard, Settings, Ticket, LogOut, Menu, X,
  Bell, Search, TrendingUp, Bookmark, FileText, ChevronDown, MessageSquare, AlertCircle
} from 'lucide-react';
import api, { BASE_URL, getServerUrl } from '../utils/api';
import Logo from '../assets/images/Logo.png';
import sidebarlogo from '../assets/images/sidebarlogo.png';
import { playSound } from '../utils/notificationSound';
import Modal from '../components/Modal';

const SuperAdminLayout = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const notificationRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const socketRef = useRef();

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };


  useEffect(() => {
    if (user) {
      fetchNotifications();

      const token = localStorage.getItem('token');
      const socketUrl = BASE_URL;

      socketRef.current = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true
      });

      socketRef.current.on('connect', () => {
        if (user) {
          socketRef.current.emit('register_user', user);
        }
      });

      socketRef.current.on('new_notification', (payload) => {
        if (payload.type !== 'chat') {
          playSound('NOTIFICATION');
          fetchNotifications();
        }
      });


      const interval = setInterval(() => {
        fetchNotifications();
      }, 60000);

      return () => {
        clearInterval(interval);
        if (socketRef.current) socketRef.current.disconnect();
      };
    }
  }, [user]);

  // Close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
    setIsProfileMenuOpen(false);
    setIsNotificationOpen(false);
  }, [location.pathname]);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
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
      title: 'Management',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/super-admin' },
        { icon: Building, label: 'Companies', path: '/super-admin/companies' },
        { icon: CreditCard, label: 'Subscriptions', path: '/super-admin/subscriptions', badge: 3 },
        { icon: Bookmark, label: 'Plans & Pricing', path: '/super-admin/plans' },
      ]
    },
    {
      title: 'Analytics',
      items: [
        { icon: TrendingUp, label: 'Revenue Tracking', path: '/super-admin/revenue' },
        // { icon: Ticket, label: 'Support Tickets', path: '/super-admin/tickets'},
      ]
    },
    {
      title: 'System',
      items: [
        { icon: Users, label: 'Global Users', path: '/super-admin/users' },
        { icon: FileText, label: 'System Logs', path: '/super-admin/logs' },
        { icon: Settings, label: 'Settings', path: '/super-admin/settings' },
      ]
    }
  ];

  const getHeaderTitle = () => {
    const allItems = menuGroups.flatMap(g => g.items);
    const currentItem = allItems.find(item => item.path === location.pathname);
    return currentItem ? currentItem.label : 'Super Admin Center';
  };

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
          fixed md:static inset-y-0 left-0 z-50 w-56 h-screen bg-[#0f172a] text-white flex flex-col transition-transform duration-300 ease-in-out border-r border-[#1e293b]
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* grid overlay */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(21,93,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(21,93,255,0.03) 1px,transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="px-6 py-8 flex flex-col items-center justify-center relative z-10">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#155dff] to-[#4e8cff] rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative w-14 h-14 bg-[#0f172a] border border-[#1e293b] rounded-full flex items-center justify-center overflow-hidden">
              <img
                src={Logo}
                alt="KAAL Logo"
                className="h-10 w-auto"
              />
            </div>
          </div>
          <div className="mt-4 text-center">
             <div className="h-[2px] w-8 bg-[#155dff] mx-auto mb-2 rounded-full"></div>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Super Admin</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-6 sidebar-nav-hide-scroll relative z-10">
          {menuGroups.map((group) => (
            <div key={group.title} className="space-y-1.5">
              <h3 className="px-3 text-[10px] font-bold text-[#64748b] uppercase tracking-widest">{group.title}</h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.label}
                      to={item.path}
                      className={`group flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 relative
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

        <div className="p-5 border-t border-[#1e293b] space-y-4 relative z-10 bg-[#0f172a]/80 backdrop-blur-md">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#155dff]/10 border border-[#155dff]/20 flex items-center justify-center text-[#155dff] font-black text-sm overflow-hidden">
              {user?.avatar ? (
                <img src={getServerUrl(user.avatar)} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.fullName?.charAt(0) || user?.name?.charAt(0) || 'S'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate text-white leading-none">{user?.fullName || user?.name || 'Super Admin'}</p>
              <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500 mt-1">Platform Root</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2.5 text-[#94a3b8] hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all duration-200 text-xs font-bold uppercase tracking-wider"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-4 z-30 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-slate-600 hover:text-slate-900"
            >
              <Menu size={22} />
            </button>
            <h2 className="text-base font-black text-slate-800 tracking-tight">{getHeaderTitle()}</h2>
          </div>

          <div className="flex items-center gap-4 relative" ref={profileMenuRef}>
            <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg hidden sm:block transition-colors">
              <Search size={20} />
            </button>

            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg relative transition-colors"
              >
                 <div className="flex items-center gap-2">
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
                  <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center text-left">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alert Center</span>
                  </div>
                  <div className="overflow-y-auto flex-1 custom-scrollbar">
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
                          className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 flex gap-3 ${!notif.isRead ? 'bg-orange-50/10' : ''}`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center shrink-0">
                            <Bell size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{notif.title}</p>
                            <p className="text-xs text-slate-500 line-clamp-1 truncate">{notif.message}</p>
                          </div>
                          {!notif.isRead && <div className="w-2 h-2 rounded-full bg-orange-600 mt-2 shrink-0"></div>}
                        </button>
                      ))
                    ) : (
                      <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No alerts</div>
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

            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-3 hover:bg-slate-50 p-1 pr-3 rounded-full border border-transparent hover:border-slate-200 transition"
            >
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border-2 border-white shadow-sm overflow-hidden">
                {user?.avatar ? (
                  <img src={getServerUrl(user.avatar)} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user?.fullName?.charAt(0) || user?.name?.charAt(0) || 'S'
                )}
              </div>
              <div className="text-left hidden lg:block">
                <p className="text-sm font-bold text-slate-900 leading-tight truncate max-w-[120px]">{user?.fullName || user?.name || 'System Root'}</p>
              </div>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {isProfileMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-fade-in">
                <button
                  onClick={() => { navigate('/super-admin/settings'); setIsProfileMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                >
                  <Settings size={16} /> Admin Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium border-t border-slate-100 mt-1 pt-3"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-auto bg-[#f3f4f7] p-3 md:p-4 px-1 md:px-2 scroll-smooth relative custom-scrollbar">
          <Outlet />
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

export default SuperAdminLayout;

