import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import {
  Building2, Home, ClipboardList, Camera,
  MessageSquare, User, Settings, LogOut, Menu, X,
  LayoutDashboard, Bell
} from 'lucide-react';
import api, { BASE_URL } from '../utils/api';
import Logo from '../assets/images/Logo.png';
import { playSound } from '../utils/notificationSound';
import toast from 'react-hot-toast';

const ProjectTeamLayout = () => {
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
  // socketRef removed: using global shared socket
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
          if (!pathnameRef.current.includes('/chat')) {
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
        if (!senderId || String(senderId) === String(currentUserId)) return;

        fetchUnreadCount();
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

  // Close sidebar on route change for mobile
  useEffect(() => {
    setIsSidebarOpen(false);
    setIsProfileMenuOpen(false);
    setIsNotificationOpen(false);
  }, [location.pathname]);

  // keydown esc to close
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setIsProfileMenuOpen(false);
        setIsSidebarOpen(false);
        setIsNotificationOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuGroups = [
    {
      title: 'My Workspace',
      items: [
        { icon: LayoutDashboard, label: 'Home Feed', path: '/project-team', roles: ['project_manager', 'foreman', 'worker'], permission: 'VIEW_DASHBOARD' },
        { icon: ClipboardList, label: 'My Tasks', path: '/project-team/tasks', roles: ['project_manager', 'foreman', 'worker'], permission: 'VIEW_TASKS', badge: 'Active' },
        { icon: MessageSquare, label: 'Team Chat', path: '/project-team/chat', roles: ['project_manager', 'foreman', 'worker'], permission: 'VIEW_CHAT', badge: chatUnreadCount },
      ]
    },
    {
      title: 'Reporting',
      items: [
        { icon: Camera, label: 'Photo Upload', path: '/project-team/upload', roles: ['project_manager', 'foreman'], permission: 'VIEW_PHOTOS' },
      ]
    },
    {
      title: 'Account',
      items: [
        { icon: User, label: 'My Profile', path: '/project-team/profile', roles: ['project_manager', 'foreman', 'worker'] },
        { icon: Settings, label: 'Settings', path: '/project-team/settings', roles: ['project_manager', 'foreman', 'worker'] },
      ]
    }
  ];

  const getFilteredGroups = () => {
    return menuGroups.map(group => ({
      ...group,
      items: group.items.filter(item => {
        const roleAllowed = !item.roles || item.roles.includes(user?.role?.toLowerCase() || 'worker');
        const permissionAllowed = !item.permission || user?.permissions?.includes(item.permission);
        return roleAllowed && permissionAllowed;
      })
    })).filter(group => group.items.length > 0);
  };

  const filteredGroups = getFilteredGroups();

  const getHeaderTitle = () => {
    const allItems = menuGroups.flatMap(g => g.items);
    const currentItem = allItems.find(item => item.path === location.pathname);
    return currentItem ? currentItem.label : 'Project View';
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
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">{user?.role?.replace(/_/g, ' ') || 'Field Team'}</p>
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
                (user?.name || 'T').charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate text-white leading-none">{user?.name || 'Team Member'}</p>
              <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500 mt-1">{user?.role?.replace(/_/g, ' ') || 'Worker'}</p>
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

          <div className="flex items-center gap-2 md:gap-4 relative">
            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg relative hidden sm:block"
              >
                <div className="flex items-center gap-3">
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
                  </div>
                  <div className="overflow-y-auto flex-1 custom-scrollbar">
                    {chatUnreadCount > 0 && (
                      <button
                        onClick={() => { navigate('/project-team/chat'); setIsNotificationOpen(false); }}
                        className="w-full text-left px-4 py-3 bg-blue-50/50 hover:bg-blue-50 transition-colors border-b border-slate-50 flex gap-3"
                      >
                         <div className="w-8 h-8 rounded-lg bg-blue-600 text-white shrink-0 flex items-center justify-center">
                          <MessageSquare size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-800">New Messages</p>
                          <p className="text-xs text-slate-400 mt-1">You have {chatUnreadCount} unread transmissions.</p>
                        </div>
                      </button>
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
                        if (window.confirm('Clear all notifications?')) {
                          try {
                            await api.delete('/notifications/clear-all');
                            fetchNotifications();
                          } catch (err) {
                            console.error('Failed to clear notifications:', err);
                          }
                        }
                      }}
                      className="flex-1 py-2 text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors text-center"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-3 hover:bg-slate-50 p-2 rounded-lg transition"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-slate-900">{user?.name || 'Team Member'}</div>
                  <div className="text-xs text-slate-500 capitalize">{user?.role?.replace('_', ' ') || 'Worker'}</div>
                </div>
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border-2 border-white shadow-sm">
                  {(user?.name || 'T M').split(' ').map(n => n[0]).join('')}
                </div>
              </button>

            {/* Profile Dropdown */}
            {isProfileMenuOpen && (
              <div className="absolute top-16 right-0 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-fade-in">
                <div className="px-4 py-3 border-b border-slate-100 sm:hidden">
                  <p className="text-sm font-medium text-slate-900">{user?.name || 'Team Member'}</p>
                  <p className="text-xs text-slate-500 capitalize">{user?.role?.replace('_', ' ') || 'Worker'}</p>
                </div>
                <button
                  onClick={() => { navigate('/project-team/profile'); setIsProfileMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <User size={16} /> My Profile
                </button>
                <button
                  onClick={() => { navigate('/project-team/tasks'); setIsProfileMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <ClipboardList size={16} /> My Tasks
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
        </div>
      </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-auto p-4 bg-slate-50 scroll-smooth">
          <Outlet />
        </main>

      </div>
    </div>
  );
};

export default ProjectTeamLayout;

