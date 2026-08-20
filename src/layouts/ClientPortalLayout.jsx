import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import {
  PieChart, Clock, Image, FileCheck, DollarSign,
  MessageCircle, LogOut, Menu, X, Bell, User,
  Building2, LayoutDashboard, FileText, ClipboardList, Briefcase, MessageSquare, AlertCircle
} from 'lucide-react';
import api from '../utils/api';
import Logo from '../assets/images/Logo.png';
import { playSound } from '../utils/notificationSound';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';

const ClientPortalLayout = () => {
  const { logout, user, socket } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const notificationRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  // socketRef removed: using global shared socket from AuthContext
  const pathnameRef = useRef(location.pathname);
  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/chat/unread-count');
      setChatUnreadCount(res.data.count);
    } catch (error) {
      console.error('Error fetching unread chat count:', error);
    }
  };

  useEffect(() => {
    if (user && socket) {
      fetchNotifications();
      fetchUnreadCount();

      const handleConnect = () => {
        socket.emit('register_user', user);
      };

      const handleUnreadCount = () => {
        fetchUnreadCount();
      };

      const handleNewNotification = (payload) => {
        if (payload.type === 'chat') {
          fetchUnreadCount();
          if (!pathnameRef.current.includes('/messages')) {
            playSound('MESSAGE_RECEIVED');
          }
        } else {
          playSound('NOTIFICATION');
          fetchNotifications();
        }
      };

      const handleNewMessage = (payload) => {
        const senderId = payload.sender?._id || payload.sender;
        const currentUserId = user?._id || user?.id;

        if (senderId && String(senderId) !== String(currentUserId)) {
          fetchUnreadCount();
          if (!pathnameRef.current.includes('/messages')) {
            playSound('MESSAGE_RECEIVED');
            toast.success(`New message from ${payload.sender?.fullName || 'someone'}`);
          }
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
        fetchNotifications();
        fetchUnreadCount();
      }, 60000);

      return () => {
        clearInterval(interval);
        socket.off('connect', handleConnect);
        socket.off('unread_count_updated', handleUnreadCount);
        socket.off('new_notification', handleNewNotification);
        socket.off('new_message', handleNewMessage);
      };
    }
  }, [user?._id, socket]);

  // Click outside to close profile menu
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
      title: 'Project Overview',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/client-portal', permission: 'VIEW_DASHBOARD' },
        { icon: Briefcase, label: 'Jobs/Projects', path: '/client-portal/projects', permission: 'VIEW_PROJECTS' },
      ]
    },
    {
      title: 'Project Details',
      items: [
        { icon: FileCheck, label: 'RFIs', path: '/client-portal/rfi', permission: 'VIEW_RFI' },
        { icon: Image, label: 'Project Photos', path: '/client-portal/photos', permission: 'VIEW_PHOTOS' },
        { icon: FileText, label: 'Drawings/Docs', path: '/client-portal/drawings', permission: 'VIEW_DRAWINGS' },
        { icon: ClipboardList, label: 'Daily Reports', path: '/client-portal/daily-logs', permission: 'VIEW_DAILY_LOGS' },
      ]
    },
    {
      title: 'Financial & Account',
      items: [
        { icon: DollarSign, label: 'Invoices', path: '/client-portal/invoices', permission: 'VIEW_INVOICES' },
        { icon: MessageSquare, label: 'Chat', path: '/client-portal/messages', permission: 'VIEW_CHAT', badge: chatUnreadCount },
        { icon: User, label: 'My Profile', path: '/client-portal/profile', permission: 'VIEW_PROFILE' },
      ]
    }
  ];

  const getFilteredGroups = () => {
    return menuGroups.map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (user?.role === 'COMPANY_OWNER') return true;
        if (item.permission === 'VIEW_PROFILE') return true;
        return user?.permissions?.includes(item.permission);
      })
    })).filter(group => group.items.length > 0);
  };

  const filteredGroups = getFilteredGroups();

  const getHeaderTitle = () => {
    const allItems = menuGroups.flatMap(g => g.items);
    const currentItem = allItems.find(item => item.path === location.pathname);
    return currentItem ? currentItem.label : 'Client Portal';
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <style>{`
        .sidebar-nav-hide-scroll::-webkit-scrollbar { display: none; }
        .sidebar-nav-hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
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
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Client Portal</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-6 sidebar-nav-hide-scroll relative z-10">
          {filteredGroups.map((group) => (
            <div key={group.title} className="space-y-1.5">
              <h3 className="px-3 text-[10px] font-bold text-[#64748b] uppercase tracking-widest">{group.title}</h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path;
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

        <div className="p-5 border-t border-[#1e293b] space-y-4 relative z-10 bg-[#0f172a]/80 backdrop-blur-md">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#155dff]/10 border border-[#155dff]/20 flex items-center justify-center text-[#155dff] font-black text-sm overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                (user?.fullName || 'C').charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate text-white leading-none">{user?.fullName || 'Client User'}</p>
              <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500 mt-1">Project Stakeholder</p>
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
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-4 shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-slate-600 hover:text-slate-900"
            >
              <Menu size={22} />
            </button>
            <h2 className="text-base font-semibold text-slate-800">{getHeaderTitle()}</h2>
          </div>

          <div className="flex items-center gap-3 md:gap-4 relative" ref={profileMenuRef}>
            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg relative hidden sm:block"
              >
                <Bell size={20} className={notifications.some(n => !n.isRead) ? 'text-orange-600' : ''} />
                {(chatUnreadCount > 0 || notifications.some(n => !n.isRead)) && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white rounded-full border-2 border-white flex items-center justify-center text-[8px] font-black">
                    {chatUnreadCount + notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>

              {isNotificationOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-fade-in max-h-[400px] flex flex-col">
                  <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alert Center</span>
                    <div className="flex gap-2">
                      {chatUnreadCount > 0 && <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase">Messages</span>}
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1 custom-scrollbar">
                    {chatUnreadCount > 0 && (
                      <button
                        onClick={() => { navigate('/client-portal/messages'); setIsNotificationOpen(false); }}
                        className="w-full text-left px-4 py-3 bg-blue-50/50 hover:bg-blue-50 transition-colors border-b border-slate-50 flex gap-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white shrink-0 flex items-center justify-center">
                          <MessageSquare size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-800">New Messages</p>
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5 leading-relaxed">You have {chatUnreadCount} unread transmissions.</p>
                        </div>
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
                          <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center bg-slate-50 text-slate-600 text-slate-600`}>
                            <Bell size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-800 truncate">{notif.title}</p>
                            <p className="text-xs text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">{notif.message}</p>
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

            {/* Profile */}
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-3 hover:bg-slate-50 p-2 rounded-lg transition"
            >
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-slate-900">{user?.fullName || 'Client User'}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 leading-none">{user?.role === 'CLIENT' ? 'Project Stakeholder' : user?.role || 'Guest'}</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border-2 border-white shadow-sm overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  (user?.fullName || 'C U').split(' ').map(n => n[0]).join('')
                )}
              </div>
            </button>

            {/* Profile Dropdown */}
            {isProfileMenuOpen && (
              <div className="absolute top-16 right-0 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-fade-in">
                <div className="px-4 py-3 border-b border-slate-100 sm:hidden">
                  <p className="text-sm font-medium text-slate-900">{user?.fullName || 'Client User'}</p>
                </div>
                <button
                  onClick={() => { navigate('/client-portal/profile'); setIsProfileMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <User size={16} /> My Account
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-auto p-4 px-2 md:px-4 bg-slate-50 scroll-smooth">
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

export default ClientPortalLayout;

