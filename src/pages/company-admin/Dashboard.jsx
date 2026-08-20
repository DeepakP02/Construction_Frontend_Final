import {
  TrendingUp, Users, AlertTriangle, CheckCircle, Calendar, Plus,
  MessageSquare, X, Check, ArrowRight, Activity, FileText,
  DollarSign, MapPin, Camera, AlertCircle, RefreshCw, Search, Filter,
  ChevronDown, Bell, Wrench, ClipboardList, Clock, Briefcase,
  MoreHorizontal, Smartphone, ExternalLink, Trash2
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, LineChart, Line
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import api, { BASE_URL } from '../../utils/api';
import CancellationModal from '../../components/jobs/CancellationModal';
import Modal from '../../components/Modal';

const SummaryCard = ({ title, value, subtext, icon: Icon, color, loading, showFinancials = true, extraValue }) => (
  <div className="bg-white p-3 md:p-3.5 rounded-xl md:rounded-2xl shadow-sm border border-slate-200/60 flex items-center justify-between group hover:shadow-md transition-all duration-300">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`p-1.5 rounded-lg md:rounded-xl ${color} shadow-sm group-hover:scale-105 transition-transform duration-300 shrink-0`}>
          <Icon size={16} className="text-white" />
        </div>
        <h3 className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest truncate">{title}</h3>
      </div>
      <div className="flex items-baseline gap-1.5 min-w-0">
        {loading ? (
          <div className="h-7 w-12 bg-slate-100 animate-pulse rounded-lg"></div>
        ) : (
          <span className="text-xl md:text-2xl font-black text-slate-900 leading-none truncate">{value}</span>
        )}
        {subtext && <span className="text-[9px] md:text-[10px] font-bold text-slate-400 truncate tracking-tight">{subtext}</span>}
      </div>
    </div>
    {title === "Open POs" && showFinancials && (
      <div className="text-right pl-3 border-l border-slate-100 ml-3">
        <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-0.5 leading-none">Total Value</p>
        <p className="text-[11px] md:text-xs font-black text-slate-900 leading-none">${(extraValue || 0).toLocaleString()}</p>
      </div>
    )}
  </div>
);

const QuickActionButton = ({ label, icon: Icon, color, bg, onClick }) => (
  <button
    onClick={onClick}
    className={`${bg} ${color} flex items-center gap-2 px-3.5 md:px-4 py-2.5 md:py-3 rounded-lg md:rounded-xl font-black text-[11px] md:text-xs uppercase tracking-tight shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all w-full md:w-auto border border-white/10`}
  >
    <div className={`p-1.5 rounded-lg bg-white/20 shrink-0`}>
      <Icon size={16} />
    </div>
    <span className="truncate">{label}</span>
  </button>
);

const AlertItem = ({ count, label, color, onClick }) => (
  <div
    onClick={onClick}
    className={`flex items-center justify-between p-3.5 rounded-xl ${color} cursor-pointer group hover:scale-[1.02] hover:shadow-md transition-all border border-transparent hover:border-white/50 active:scale-[0.98]`}
  >
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 rounded flex items-center justify-center bg-white/20 text-white text-[10px] font-black">
        {count}
      </div>
      <span className="text-xs font-bold uppercase tracking-tight">{label}</span>
    </div>
    <ArrowRight size={14} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
  </div>
);

const UpcomingTaskCard = ({ title, project, dueDate, priority, onClick }) => (
  <div
    onClick={onClick}
    className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group"
  >
    <div className="flex items-center gap-3 min-w-0">
      <div className={`w-1.5 h-8 rounded-full shrink-0 ${priority === 'High' ? 'bg-red-500' :
        priority === 'Medium' ? 'bg-orange-500' : 'bg-blue-500'
        }`} />
      <div className="min-w-0">
        <h4 className="text-[12px] font-black text-slate-900 truncate uppercase tracking-tight leading-none">{title}</h4>
        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase truncate">{project}</p>
      </div>
    </div>
    <div className="text-right shrink-0">
      <p className="text-[10px] font-black text-slate-900 leading-none">
        {new Date(dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </p>
      <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Due Date</p>
    </div>
  </div>
);

const QuickTodoWidget = ({ users, onTaskCreated, currentUser, showToast }) => {
  const [todo, setTodo] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-set assignedTo for workers/subcontractors
  useEffect(() => {
    if (['WORKER', 'SUBCONTRACTOR'].includes(currentUser?.role)) {
      setAssignedTo(currentUser?._id);
    }
  }, [currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!todo.trim()) return;
    try {
      setSubmitting(true);

      const isForcedAssignmentRole = ['ADMIN', 'SUPER_ADMIN', 'COMPANY_OWNER', 'PM'].includes(currentUser?.role);

      if (isForcedAssignmentRole && !assignedTo) {
        showToast('Please select a user to assign this task.', 'error');
        setSubmitting(false);
        return;
      }

      // Default to self for others, or use assignedTo
      const reqAssignedTo = assignedTo || currentUser?._id;

      await api.post('/todos', {
        title: todo,
        assignedTo: reqAssignedTo,
        priority: 'Medium'
      });
      setTodo('');
      setAssignedTo('');
      setSearchTerm('');
      setShowDropdown(false);
      await onTaskCreated(true);
      showToast('Task created successfully!');
    } catch (err) {
      console.error('Failed to create todo:', err);
      showToast(err.response?.data?.message || 'Failed to create To-Do', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const showAssignTo = ['ADMIN', 'SUPER_ADMIN', 'COMPANY_OWNER', 'PM', 'FOREMAN', 'SUBCONTRACTOR'].includes(currentUser?.role);

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-5 rounded-[1.5rem] md:rounded-[2rem] shadow-xl shadow-indigo-900/10 text-white mb-6">
      <div className="flex items-center gap-2.5 mb-3.5">
        <div className="p-1.5 bg-white/20 rounded-lg">
          <ClipboardList size={18} />
        </div>
        <h3 className="text-base font-black tracking-tight">Daily Quick To-Do</h3>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row items-end gap-3">
          <div className="flex-1 w-full">
            <label className="text-[9px] font-black uppercase tracking-widest text-indigo-100 mb-1 block px-1">Task Description</label>
            <input
              type="text"
              placeholder="e.g. Pick up supplies, call site manager..."
              value={todo}
              onChange={(e) => setTodo(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm font-bold placeholder:text-indigo-100 outline-none focus:bg-white/20 transition-all font-sans"
            />
          </div>

          {showAssignTo && (
            <div ref={dropdownRef} className="w-full md:w-64 relative group">
              <label className="text-[9px] font-black uppercase tracking-widest text-indigo-100 mb-1 block px-1">Assign To User</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search user..."
                  autoComplete="off"
                  value={searchTerm}
                  onClick={() => setShowDropdown(!showDropdown)}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowDropdown(true);
                  }}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:bg-white/20 transition-all placeholder:text-indigo-200"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-200">
                  <Search size={14} />
                </div>
              </div>

              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="max-h-60 overflow-y-auto p-1.5 scrollbar-thin scrollbar-thumb-indigo-100">
                    <button
                      type="button"
                      onClick={() => {
                        setAssignedTo(currentUser?._id);
                        setSearchTerm(currentUser?.fullName || 'Myself');
                        setShowDropdown(false);
                      }}
                      className="w-full px-4 py-2.5 text-left rounded-xl hover:bg-slate-50 transition-colors flex flex-col gap-0.5 group"
                    >
                      <span className="text-xs font-black text-slate-900">
                        {['ADMIN', 'SUPER_ADMIN', 'COMPANY_OWNER', 'PM'].includes(currentUser?.role) ? 'Assign to Myself' : 'Assign to Myself'}
                      </span>
                    </button>
                    {users
                      .filter(u => {
                        const isHighManagement = ['ADMIN', 'SUPER_ADMIN', 'COMPANY_OWNER'].includes(currentUser?.role);
                        const isPM = currentUser?.role === 'PM';

                        if (isHighManagement) {
                          return !['CLIENT', 'ADMIN', 'COMPANY_OWNER', 'SUPER_ADMIN'].includes(u.role);
                        }
                        if (isPM) {
                          return ['WORKER', 'FOREMAN', 'SUBCONTRACTOR', 'PM'].includes(u.role);
                        }
                        return u.role === 'WORKER';
                      })
                      .filter(u => {
                        const nameMatches = u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || u.role.toLowerCase().includes(searchTerm.toLowerCase());
                        const isPM = currentUser?.role === 'PM';
                        return nameMatches && (isPM ? true : u._id !== currentUser?._id);
                      })
                      .map(u => (
                        <button
                          key={u._id}
                          type="button"
                          onClick={() => {
                            setAssignedTo(u._id);
                            setSearchTerm(u.fullName);
                            setShowDropdown(false);
                          }}
                          className="w-full px-4 py-2.5 text-left rounded-xl hover:bg-indigo-50 transition-colors flex flex-col gap-0.5 group"
                        >
                          <span className="text-xs font-black text-slate-900 group-hover:text-indigo-600 truncate">{u.fullName}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{u.role}</span>
                        </button>
                      ))}
                    {users.filter(u => {
                      const isManagement = ['ADMIN', 'SUPER_ADMIN', 'COMPANY_OWNER', 'PM'].includes(currentUser?.role);
                      const roleMatches = isManagement ? !['CLIENT', 'ADMIN', 'COMPANY_OWNER', 'SUPER_ADMIN'].includes(u.role) : u.role === 'WORKER';
                      const isPM = currentUser?.role === 'PM';
                      return roleMatches && u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) && (isPM ? true : u._id !== currentUser?._id);
                    }).length === 0 && (
                        <div className="p-4 text-center text-slate-400 text-[10px] font-bold italic">No matching users found</div>
                      )}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !todo.trim()}
            className="w-full md:w-auto bg-white text-indigo-600 px-8 py-2.5 rounded-xl font-black text-sm uppercase tracking-tight hover:bg-slate-50 transition-all disabled:opacity-50 h-[42px] shadow-lg active:scale-95 whitespace-nowrap"
          >
            {submitting ? 'Adding...' : showAssignTo ? 'Assign Item' : 'Add My Todo'}
          </button>
        </div>
      </form>
    </div>
  );
};

const TodoList = ({ todos, onUpdate, onDelete, currentUser, title = "My Tasks", users = [], showTeamFilter = true }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [workerFilter, setWorkerFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const filteredTodos = todos.filter(todo => {
    const matchesWorker = !workerFilter || todo.assignedTo?._id === workerFilter || todo.assignedTo === workerFilter;
    const matchesSearch = !searchFilter || todo.title.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesWorker && matchesSearch;
  });

  const totalPages = Math.ceil(filteredTodos.length / itemsPerPage);
  const paginatedTodos = filteredTodos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [workerFilter, searchFilter]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 overflow-hidden shadow-sm flex flex-col min-h-[400px]">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">{title}</h3>
          <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-[10px] font-black">{filteredTodos.length}</span>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-1.5 rounded-lg transition-all ${showFilters ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}
        >
          <Filter size={14} />
        </button>
      </div>

      {showFilters && (
        <div className="p-4 bg-slate-50/80 border-b border-slate-100 grid grid-cols-2 gap-3 animate-in slide-in-from-top duration-200">
          {showTeamFilter && (
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 px-1">Team Member</label>
              <select
                value={workerFilter}
                onChange={(e) => setWorkerFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-bold outline-none focus:border-indigo-500"
              >
                <option value="">All Team</option>
                {users.filter(u => {
                  const isFieldManager = ['FOREMAN', 'SUBCONTRACTOR'].includes(currentUser?.role);
                  const isPM = currentUser?.role === 'PM';
                  if (isFieldManager) return u.role === 'WORKER';
                  if (isPM) return ['WORKER', 'FOREMAN', 'SUBCONTRACTOR', 'PM'].includes(u.role);
                  return !['CLIENT', 'ADMIN', 'COMPANY_OWNER', 'SUPER_ADMIN'].includes(u.role);
                }).map(u => (
                  <option key={u._id} value={u._id}>{u.fullName} ({u.role})</option>
                ))}
              </select>
            </div>
          )}
          <div className={`space-y-1 ${!showTeamFilter ? 'col-span-2' : ''}`}>
            <label className="text-[9px] font-black uppercase text-slate-400 px-1">Search Task</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 pl-8 text-[11px] font-bold outline-none focus:border-indigo-500"
              />
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>
      )}

      <div className="p-2 space-y-1 flex-1 overflow-y-auto no-scrollbar">
        {paginatedTodos.length === 0 ? (
          <div className="py-8 text-center text-slate-400 font-bold text-xs">
            {todos.length > 0 ? "No results match filters" : "No pending todos"}
          </div>
        ) : (
          paginatedTodos.map(todo => (
            <div key={todo._id} className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-slate-50 transition-all group border border-transparent hover:border-slate-100">
              <div className="flex items-center gap-4 min-w-0">
                <button
                  onClick={() => onUpdate(todo._id, { status: todo.status === 'completed' ? 'pending' : 'completed' })}
                  className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${todo.status === 'completed' ? 'bg-green-500 border-green-500 text-white' : 'border-slate-200 text-transparent hover:border-indigo-400'
                    }`}
                >
                  <Check size={16} />
                </button>
                <div className="min-w-0">
                  <p className={`text-sm font-black truncate ${todo.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                    {todo.title}
                  </p>
                  {todo.assignedBy && typeof todo.assignedBy === 'object' && (
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-1">
                      Assigned by: {todo.assignedBy.fullName}
                    </p>
                  )}
                  {todo.assignedTo && typeof todo.assignedTo === 'object' && todo.assignedTo._id !== currentUser?._id && (
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter mt-1">
                      Assigned to: {todo.assignedTo.fullName}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => onDelete(todo._id)}
                className="p-2 text-slate-400 hover:text-red-500 transition-all rounded-lg hover:bg-red-50 shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-all"
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const CompanyAdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    activeJobs: 0,
    crewOnSiteCount: 0,
    totalCrew: 0,
    hoursToday: 0,
    equipmentRunning: 0,
    openPos: 0,
    openPosValue: 0,
    pendingApprovals: 0,
    equipmentAlerts: 0
  });

  const [trendData, setTrendData] = useState([]);
  const [crewActivity, setCrewActivity] = useState([]);
  const [recentDailyLogs, setRecentDailyLogs] = useState([]);
  const [topProject, setTopProject] = useState(null);

  // Worker Specific State
  const [workerMetrics, setWorkerMetrics] = useState({
    myHoursToday: '0.0h',
    currentJob: '---',
    weeklyTarget: '40h',
    weeklyDone: '0h done'
  });
  const [myRecentActivity, setMyRecentActivity] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [myTodos, setMyTodos] = useState([]);
  const [assignedByMeTodos, setAssignedByMeTodos] = useState([]);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false);
  const [taskToCancel, setTaskToCancel] = useState(null);
  const [timer, setTimer] = useState(0);
  const [overdueTasksList, setOverdueTasksList] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });
  const socketRef = useRef();

  const showToast = (message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [clockInReason, setClockInReason] = useState('');
  const [siteSearchTerm, setSiteSearchTerm] = useState('');
  const [isSiteDropdownOpen, setIsSiteDropdownOpen] = useState(false);
  const siteDropdownRef = useRef(null);

  // Click outside to close site dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (siteDropdownRef.current && !siteDropdownRef.current.contains(event.target)) {
        setIsSiteDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      // Define independent data fetching blocks
      const fetchBasicStats = async () => {
        try {
          const res = await api.get('/reports/stats');
          const data = res.data;
          if (data.metrics) setMetrics(prev => ({ ...data.metrics, myJobs: data.myJobs || prev.myJobs || [] }));
          if (data.trendData) setTrendData(data.trendData);
          if (data.crewActivity) setCrewActivity(data.crewActivity);
          if (data.recentDailyLogs) setRecentDailyLogs(data.recentDailyLogs);
          if (data.topProject) setTopProject(data.topProject);

          if (data.workerMetrics) {
            const processedMetrics = { ...data.workerMetrics };
            if (processedMetrics.isClockedIn && processedMetrics.currentJob) {
              const pMatch = processedMetrics.assignedProjects?.find(p => p.name === processedMetrics.currentJob);
              if (pMatch) {
                processedMetrics.currentJob = `Project: ${pMatch.name} (${pMatch.jobName})`;
              } else {
                const tMatch = processedMetrics.assignedTasks?.find(t => t.title === processedMetrics.currentJob);
                if (tMatch) {
                  processedMetrics.currentJob = `Task: ${tMatch.title} (${tMatch.jobName})`;
                }
              }
              if (processedMetrics.currentJob === 'random') {
                processedMetrics.currentJob = 'Random Site / Emergency Attendance';
              }
            }
            setWorkerMetrics(processedMetrics);
            setIsClockedIn(processedMetrics.isClockedIn);
            setTimer(processedMetrics.timer || 0);

            if (processedMetrics.assignedProjects?.length === 1 && !selectedProjectId) {
              setSelectedProjectId(processedMetrics.assignedProjects[0]._id);
            }
          }
          if (data.myRecentActivity) setMyRecentActivity(data.myRecentActivity);
        } catch (err) {
          console.error('Error fetching basic stats:', err);
        }
      };

      const fetchTasks = async () => {
        if (['WORKER', 'SUBCONTRACTOR', 'FOREMAN'].includes(user?.role)) {
          try {
            const [jobTasksRes, globalTasksRes] = await Promise.all([
              api.get('/job-tasks/worker?excludeCompleted=true'),
              api.get('/tasks/my-tasks?excludeCompleted=true')
            ]);
            const normalizedGlobal = (globalTasksRes.data || []).map(t => ({
              ...t,
              isGlobal: true,
              jobId: t.projectId
            }));
            const combined = [...(jobTasksRes.data || []), ...normalizedGlobal]
              .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            setMyTasks(combined);
          } catch (err) {
            console.error('Error fetching worker tasks:', err);
          }
        }
      };

      const fetchTodosData = async () => {
        try {
          const [todosRes, assignedRes] = await Promise.all([
            api.get('/todos'),
            api.get('/todos/assigned-by')
          ]);
          setMyTodos(Array.isArray(todosRes.data) ? todosRes.data : []);
          setAssignedByMeTodos(Array.isArray(assignedRes.data) ? assignedRes.data : []);
        } catch (err) {
          console.error('Error fetching todos:', err);
        }
      };

      const fetchTeamData = async () => {
        if (['ADMIN', 'SUPER_ADMIN', 'COMPANY_OWNER', 'PM', 'FOREMAN', 'SUBCONTRACTOR'].includes(user?.role)) {
          try {
            const teamRes = await api.get('/auth/users');
            setTeamMembers(Array.isArray(teamRes.data) ? teamRes.data : []);
          } catch (err) {
            console.error('Error fetching team:', err);
          }
        }
      };

      const fetchOverdueData = async () => {
        if (['ADMIN', 'SUPER_ADMIN', 'COMPANY_OWNER', 'PM'].includes(user?.role)) {
          try {
            const tasksRes = await api.get('/tasks');
            const allTasks = Array.isArray(tasksRes.data) ? tasksRes.data : [];
            const overdue = allTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed');
            setOverdueTasksList(overdue);
            const now = new Date();
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            const upcoming = allTasks
              .filter(t => {
                const taskDateStr = (t.dueDate && t.dueDate !== 'ASAP') ? t.dueDate : t.startDate;
                if (!taskDateStr || t.status === 'completed') return false;
                const d = new Date(taskDateStr);
                return d >= now && d <= endOfMonth;
              })
              .sort((a, b) => {
                const dateA = (a.dueDate && a.dueDate !== 'ASAP') ? a.dueDate : a.startDate;
                const dateB = (b.dueDate && b.dueDate !== 'ASAP') ? b.dueDate : b.startDate;
                return new Date(dateA || 0) - new Date(dateB || 0);
              })
              .slice(0, 10);
            setUpcomingTasks(upcoming);
          } catch (err) {
            console.error('Error fetching overdue tasks:', err);
          }
        }
      };

      const fetchEquipmentData = async () => {
        try {
          const equipRes = await api.get('/equipment');
          const alertsCount = equipRes.data?.filter(e => e.assignedJob?.status === 'completed').length || 0;
          setMetrics(prev => ({ ...prev, equipmentAlerts: alertsCount }));
        } catch (err) {
          console.error('Error fetching equipment:', err);
        }
      };

      // Prioritize basic stats to show metrics quickly
      await fetchBasicStats();
      if (!silent) setLoading(false);

      // Fetch the rest in parallel without blocking the main UI loading state
      Promise.all([
        fetchTasks(),
        fetchTodosData(),
        fetchTeamData(),
        fetchOverdueData(),
        fetchEquipmentData()
      ]).catch(err => console.error('Error in background dashboard fetches:', err));

    } catch (error) {
      console.error('Error in fetchDashboardData:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleTodoUpdate = async (id, data) => {
    try {
      await api.patch(`/todos/${id}`, data);
      fetchDashboardData(true);
    } catch (err) {
      console.error('Failed to update todo:', err);
    }
  };

  const handleTodoDelete = async (id) => {
    try {
      if (window.confirm('Delete this todo?')) {
        await api.delete(`/todos/${id}`);
        fetchDashboardData(true);
      }
    } catch (err) {
      console.error('Failed to delete todo:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Connect socket
    const socketUrl = BASE_URL;
    socketRef.current = io(socketUrl);
    socketRef.current.emit('register_user', user);

    socketRef.current.on('attendance_update', (data) => {
      console.log('Dashboard attendance update:', data);
      fetchDashboardData();
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // Handle anchor scrolling for #overdue
  useEffect(() => {
    if (window.location.hash === '#overdue') {
      const element = document.getElementById('overdue-tasks-section');
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
          element.classList.add('ring-2', 'ring-red-500', 'ring-offset-4', 'rounded-3xl');
          setTimeout(() => element.classList.remove('ring-2', 'ring-red-500', 'ring-offset-4'), 3000);
        }, 500);
      }
    }
  }, [window.location.hash, loading]);

  useEffect(() => {
    let interval;
    if (isClockedIn) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isClockedIn]);

  const [lastKnownCoords, setLastKnownCoords] = useState(null);

  // Live Location Warm-up
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setLastKnownCoords(pos.coords),
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
        let pId = null;
        let tId = null;
        let jId = null;
        let taskType = null;

        if (selectedAssignment.startsWith('task_')) {
          tId = selectedAssignment.replace('task_', '');
          const tMatch = workerMetrics.assignedTasks?.find(t => t._id === tId);
          if (tMatch) {
            pId = tMatch.projectId?._id || tMatch.projectId;
            jId = tMatch.jobId?._id || tMatch.jobId;
            taskType = tMatch.type || 'JobTask';
          }
        } else if (selectedAssignment.startsWith('project_')) {
          pId = selectedAssignment.replace('project_', '');
          const pMatch = workerMetrics.assignedProjects?.find(p => p._id === pId);
          if (pMatch) {
            jId = pMatch.jobId?._id || pMatch.jobId;
          }
        }

        const coords = await getPosition();
        await api.post('/timelogs/clock-in', {
          projectId: pId,
          jobId: jId,
          taskId: tId,
          taskType: taskType,
          reason: selectedAssignment === 'random' ? clockInReason : undefined,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
          deviceInfo: navigator.userAgent
        });

        // Auto-resume job if it was on hold
        if (jId) {
          try {
            await api.patch(`/jobs/${jId}`, { status: 'active' });
          } catch (err) {
            console.error('Error resuming job status:', err);
          }
        }

        setIsClockedIn(true);
        fetchDashboardData();
        setShowReasonModal(false);
        setClockInReason('');
        showToast('Clocked in successfully!');
      } else {
        // Clock Out
        const coords = await getPosition();
        await api.post('/timelogs/clock-out', {
          latitude: coords?.latitude,
          longitude: coords?.longitude
        });
        setIsClockedIn(false);
        setTimer(0);
        fetchDashboardData();
        showToast('Clocked out successfully!');
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

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleToggleTaskStatus = async (task, currentStatus) => {
    try {
      const isGlobal = !!task.isGlobal;
      const apiPath = isGlobal ? `/tasks/${task._id}` : `/job-tasks/${task._id}`;

      let nextStatus;
      if (isGlobal) {
        nextStatus = currentStatus === 'completed' ? 'todo' : 'completed';
      } else {
        nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      }

      await api.patch(apiPath, { status: nextStatus });
      fetchDashboardData();
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Failed to update task status');
    }
  };

  const handleCancelTask = async (reason) => {
    try {
      setSubmitting(true);
      // Currently cancellation is only for JobTasks in this UI
      await api.patch(`/job-tasks/${taskToCancel}`, {
        status: 'cancelled',
        cancellationReason: reason
      });
      setIsCancellationModalOpen(false);
      setTaskToCancel(null);
      fetchDashboardData();
    } catch (error) {
      console.error('Error cancelling task:', error);
      alert('Failed to cancel task.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId, isGlobal) => {
    if (!window.confirm('Are you sure you want to remove this task?')) return;
    try {
      setLoading(true);
      const apiPath = isGlobal ? `/tasks/${taskId}` : `/job-tasks/${taskId}`;
      await api.delete(apiPath);
      fetchDashboardData();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task.');
    } finally {
      setLoading(false);
    }
  };

  const isOwner = user?.role === 'COMPANY_OWNER';
  const isPM = user?.role === 'PM';
  const isForeman = user?.role === 'FOREMAN';
  const isWorker = user?.role === 'WORKER';
  const isSubcontractor = user?.role === 'SUBCONTRACTOR';
  const isOwnerOrPM = isOwner || isPM;

  return (
    <div className="space-y-6 pb-8 animate-fade-in w-full">
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

      {/* Header Content Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">Dashboard</h1>
          <p className="text-slate-500 font-bold text-[11px] md:text-xs mt-0.5 uppercase tracking-widest flex items-center gap-2">
            <Smartphone size={13} className="text-blue-600" />
            Own Your Time. Control Your Site.
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
      </div>

      {/* Worker / Subcontractor Clock Widget */}
      {(isWorker || isSubcontractor) && (
        <div className="bg-white rounded-[2rem] shadow-xl shadow-blue-900/5 border border-slate-200 relative group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Clock size={120} />
          </div>
          <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 text-blue-600 font-black text-xs uppercase tracking-widest bg-blue-50 w-fit px-3 py-1 rounded-full mx-auto md:mx-0">
                <div className={`w-2 h-2 rounded-full ${isClockedIn ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                {isClockedIn ? 'Currently On Clock' : 'Ready to Start'}
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">
                {isClockedIn ? formatTime(timer) : '00:00:00'}
              </h2>
              {!isClockedIn && workerMetrics.assignedProjects?.length > 0 && (
                <div className="mt-4 max-w-sm mx-auto md:mx-0 relative" ref={siteDropdownRef}>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Select Site for Clock In</label>

                  {/* Searchable Site Selector */}
                  <div className="relative">
                    <button
                      onClick={() => setIsSiteDropdownOpen(!isSiteDropdownOpen)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold text-slate-700 flex items-center justify-between hover:border-blue-400 transition-all focus:outline-none focus:ring-4 focus:ring-blue-100/50 group"
                    >
                      <span className="truncate pr-4">
                        {selectedAssignment ? (
                          selectedAssignment === 'random' ? 'Random Site / Emergency Attendance' :
                            selectedAssignment.startsWith('task_') ?
                              workerMetrics.assignedTasks?.find(t => t._id === selectedAssignment.replace('task_', ''))?.title :
                              workerMetrics.assignedProjects?.find(p => p._id === selectedAssignment.replace('project_', ''))?.name
                        ) : (
                          <span className="text-slate-400">-- Choose Task / Project --</span>
                        )}
                      </span>
                      <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 group-hover:text-blue-500 ${isSiteDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isSiteDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-3xl border border-slate-100 shadow-2xl z-[1000] overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-left">
                        {/* Search Input */}
                        <div className="p-3 border-b border-slate-50">
                          <div className="relative">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Search sites or tasks..."
                              value={siteSearchTerm}
                              onChange={(e) => setSiteSearchTerm(e.target.value)}
                              className="w-full bg-slate-50 border-none rounded-xl pl-11 pr-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 placeholder:text-slate-400"
                              autoFocus
                            />
                          </div>
                        </div>

                        {/* Results List */}
                        <div className="max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                          {/* Random Site Option */}
                          {(!siteSearchTerm || 'random'.includes(siteSearchTerm.toLowerCase())) && (
                            <div className="px-3 py-2 border-b border-slate-50">
                              <button
                                onClick={() => {
                                  setSelectedAssignment('random');
                                  setIsSiteDropdownOpen(false);
                                  setSiteSearchTerm('');
                                }}
                                className={`w-full text-left p-3 rounded-xl transition-colors flex items-center gap-3 ${selectedAssignment === 'random' ? 'bg-orange-50 border border-orange-100' : 'hover:bg-slate-50'}`}
                              >
                                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center">
                                  <AlertCircle size={16} />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-slate-800">Random Site / Emergency</span>
                                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">Manual entry required</span>
                                </div>
                              </button>
                            </div>
                          )}

                          {/* Tasks Section */}
                          {workerMetrics.assignedTasks?.filter(t => t.title.toLowerCase().includes(siteSearchTerm.toLowerCase()) || (t.jobName && t.jobName.toLowerCase().includes(siteSearchTerm.toLowerCase()))).length > 0 && (
                            <div className="px-3 py-2">
                              <div className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-50/50 rounded-lg mb-2">My Tasks</div>
                              {workerMetrics.assignedTasks
                                .filter(t => t.title.toLowerCase().includes(siteSearchTerm.toLowerCase()) || (t.jobName && t.jobName.toLowerCase().includes(siteSearchTerm.toLowerCase())))
                                .map(t => (
                                  <button
                                    key={`task_${t._id}`}
                                    onClick={() => {
                                      setSelectedAssignment(`task_${t._id}`);
                                      setIsSiteDropdownOpen(false);
                                      setSiteSearchTerm('');
                                    }}
                                    className={`w-full text-left p-3 rounded-xl transition-colors mb-1 flex flex-col gap-0.5 ${selectedAssignment === `task_${t._id}` ? 'bg-blue-50 border border-blue-100' : 'hover:bg-slate-50'}`}
                                  >
                                    <span className="text-sm font-bold text-slate-800">{t.title}</span>
                                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tight truncate">
                                      {t.jobName} / {t.projectName}
                                    </span>
                                  </button>
                                ))}
                            </div>
                          )}

                          {/* Projects Section */}
                          {workerMetrics.assignedProjects?.filter(p => p.name.toLowerCase().includes(siteSearchTerm.toLowerCase()) || (p.jobName && p.jobName.toLowerCase().includes(siteSearchTerm.toLowerCase()))).length > 0 && (
                            <div className="px-3 py-2">
                              <div className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50/50 rounded-lg mb-2">General Site Attendance</div>
                              {workerMetrics.assignedProjects
                                .filter(p => p.name.toLowerCase().includes(siteSearchTerm.toLowerCase()) || (p.jobName && p.jobName.toLowerCase().includes(siteSearchTerm.toLowerCase())))
                                .map(p => (
                                  <button
                                    key={`project_${p._id}`}
                                    onClick={() => {
                                      setSelectedAssignment(`project_${p._id}`);
                                      setIsSiteDropdownOpen(false);
                                      setSiteSearchTerm('');
                                    }}
                                    className={`w-full text-left p-3 rounded-xl transition-colors mb-1 flex flex-col gap-0.5 ${selectedAssignment === `project_${p._id}` ? 'bg-emerald-50 border border-emerald-100' : 'hover:bg-slate-50'}`}
                                  >
                                    <span className="text-sm font-bold text-slate-800">{p.name}</span>
                                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tight truncate">
                                      {p.jobName || p.jobId?.name || 'Assigned Job'}
                                    </span>
                                  </button>
                                ))}
                            </div>
                          )}

                          {/* No Results */}
                          {workerMetrics.assignedTasks?.filter(t => t.title.toLowerCase().includes(siteSearchTerm.toLowerCase())).length === 0 &&
                            workerMetrics.assignedProjects?.filter(p => p.name.toLowerCase().includes(siteSearchTerm.toLowerCase())).length === 0 &&
                            siteSearchTerm && !'random'.includes(siteSearchTerm.toLowerCase()) && (
                              <div className="p-8 text-center space-y-2">
                                <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                  <Search size={20} />
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No matching sites</p>
                              </div>
                            )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <p className="text-slate-500 font-bold flex items-center gap-2 justify-center md:justify-start">
                <MapPin size={16} className="text-slate-400" /> {isClockedIn ? workerMetrics.currentJob : 'Not Active'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <button
                onClick={handleToggle}
                disabled={loading}
                className={`flex-1 md:flex-none px-12 py-5 rounded-2xl font-black text-lg uppercase tracking-tight shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-3 ${isClockedIn
                  ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-200'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                  } ${loading ? 'opacity-80 scale-95' : ''}`}
              >
                {loading ? <RefreshCw className="animate-spin" size={24} /> : (isClockedIn ? 'Stop Clock Out' : 'Start Clock In')}
              </button>
            </div>
          </div>

          {isClockedIn && (
            <div className="bg-emerald-50 px-8 py-3 border-t border-emerald-100 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <p className="text-emerald-700 text-xs font-black uppercase tracking-wider">GPS Verification Active • Site: {workerMetrics.currentJob}</p>
            </div>
          )}
        </div>
      )}

      {/* Summary Cards Row */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${(isWorker || isSubcontractor) ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3 md:gap-4`}>
        {(isOwner || isPM) && (
          <>
            <SummaryCard title="Active Jobs" value={metrics.activeJobs} icon={Briefcase} color="bg-orange-400" loading={loading} />
            <SummaryCard title="Crew On Site" value={metrics.crewOnSiteCount} subtext={`of ${metrics.totalCrew}`} icon={Users} color="bg-emerald-400" loading={loading} />
            <SummaryCard title="Hours Today" value={`${metrics.hoursToday}h`} subtext="crew total" icon={Clock} color="bg-blue-500" loading={loading} />
            <SummaryCard title="Equipment Running" value={metrics.equipmentRunning} icon={Wrench} color="bg-indigo-500" loading={loading} />
            <SummaryCard title="Open POs" value={metrics.openPos} icon={ClipboardList} color="bg-blue-600" loading={loading} showFinancials={isOwner} extraValue={metrics.openPosValue} />
            <SummaryCard title="Pending Approvals" value={metrics.pendingApprovals} icon={AlertCircle} color="bg-slate-400" loading={loading} />
          </>
        )}

        {isForeman && (
          <>
            <SummaryCard title="Crew On Site" value={metrics.crewOnSiteCount} subtext={`of ${metrics.totalCrew}`} icon={Users} color="bg-emerald-400" loading={loading} />
            <SummaryCard title="Hours Today" value={`${metrics.hoursToday}h`} icon={Clock} color="bg-blue-500" loading={loading} />
            <SummaryCard title="Equipment Running" value={metrics.equipmentRunning} icon={Wrench} color="bg-indigo-500" loading={loading} />
          </>
        )}

        {isWorker && (
          <>
            <SummaryCard title="My Hours Today" value={workerMetrics.myHoursToday} icon={Clock} color="bg-blue-600" loading={loading} />
            <SummaryCard title="Current Job" value={workerMetrics.currentJob} icon={Briefcase} color="bg-orange-400" loading={loading} />
            <SummaryCard title="Assigned Jobs" value={workerMetrics.assignedProjects?.length || 0} icon={Briefcase} color="bg-indigo-500" loading={loading} />
            <SummaryCard title="Pending Tasks" value={myTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length} icon={CheckCircle} color="bg-emerald-500" loading={loading} />
          </>
        )}

        {isSubcontractor && (
          <>
            <SummaryCard title="My Hours Today" value={workerMetrics.myHoursToday} icon={Clock} color="bg-orange-500" loading={loading} />
            <SummaryCard title="Current Job" value={workerMetrics.currentJob} icon={Briefcase} color="bg-blue-500" loading={loading} />
            <SummaryCard title="Assigned Jobs" value={workerMetrics.assignedProjects?.length || 0} icon={Briefcase} color="bg-indigo-500" loading={loading} />
            <SummaryCard title="Pending Tasks" value={myTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length} icon={CheckCircle} color="bg-emerald-500" loading={loading} />
          </>
        )}
      </div>

      {/* Quick Actions & Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Quick Actions */}
        <div className={(isWorker || isSubcontractor) ? "lg:col-span-4 space-y-6" : "lg:col-span-3 space-y-6"}>
          {!(isWorker || isSubcontractor) && (
            <div className="bg-transparent">
              <h3 className="text-base font-black text-slate-800 mb-4 tracking-tight">Quick Actions</h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {isOwnerOrPM && (
                  <>
                    <QuickActionButton label="Clock In crew" icon={CheckCircle} bg="bg-blue-600" color="text-white" onClick={() => navigate('/company-admin/timesheets')} />
                    <QuickActionButton label="Daily Log" icon={FileText} bg="bg-white" color="text-slate-700" onClick={() => navigate('/company-admin/daily-logs')} />
                    <QuickActionButton label="Upload Photo" icon={Camera} bg="bg-white" color="text-slate-700" onClick={() => navigate('/company-admin/photos')} />
                    {/* <QuickActionButton label="Equipment Hours" icon={Wrench} bg="bg-white" color="text-slate-700" onClick={() => navigate('/company-admin/equipment')} /> */}
                    <QuickActionButton label="Create PO" icon={ClipboardList} bg="bg-white" color="text-slate-700" onClick={() => navigate('/company-admin/purchase-orders')} />
                  </>
                )}

                {isForeman && (
                  <>
                    <QuickActionButton label="Clock In Crew" icon={Users} bg="bg-blue-600" color="text-white" onClick={() => navigate('/company-admin/crew-clock')} />
                    <QuickActionButton label="Add Daily Log" icon={FileText} bg="bg-white" color="text-slate-700" onClick={() => navigate('/company-admin/daily-logs')} />
                    <QuickActionButton label="Upload Site Photo" icon={Camera} bg="bg-white" color="text-slate-700" onClick={() => navigate('/company-admin/photos')} />
                    {/* <QuickActionButton label="Equipment Tracking" icon={Wrench} bg="bg-white" color="text-slate-700" onClick={() => navigate('/company-admin/equipment')} /> */}
                    <QuickActionButton label="Create PO" icon={ClipboardList} bg="bg-white" color="text-slate-700" onClick={() => navigate('/company-admin/purchase-orders')} />
                  </>
                )}
              </div>
            </div>
          )}

          {/* Quick To-Do Section - Independent of Projects */}
          <QuickTodoWidget
            users={teamMembers}
            currentUser={user}
            onTaskCreated={fetchDashboardData}
            showToast={showToast}
          />

          {/* Dynamic To-Do Lists Layout */}
          <div className={`grid grid-cols-1 ${(['FOREMAN', 'PM', 'SUBCONTRACTOR'].includes(user?.role)) ? 'md:grid-cols-3' : ''} gap-6 mb-6`}>
            {!['ADMIN', 'SUPER_ADMIN', 'COMPANY_OWNER'].includes(user?.role) && (
              <div className="md:col-span-1">
                <TodoList
                  title="My Daily Todos"
                  todos={myTodos.filter(t => t.status === 'pending')}
                  onUpdate={handleTodoUpdate}
                  onDelete={handleTodoDelete}
                  currentUser={user}
                  showTeamFilter={false}
                />
              </div>
            )}

            {['ADMIN', 'SUPER_ADMIN', 'COMPANY_OWNER', 'PM', 'FOREMAN', 'SUBCONTRACTOR'].includes(user?.role) && (
              <div className={['FOREMAN', 'PM', 'SUBCONTRACTOR'].includes(user?.role) ? "md:col-span-2" : "md:col-span-1"}>
                <TodoList
                  title="Assigned By Me"
                  todos={assignedByMeTodos.filter(t => t.status === 'pending')}
                  onUpdate={handleTodoUpdate}
                  onDelete={handleTodoDelete}
                  currentUser={user}
                  users={teamMembers}
                  showTeamFilter={true}
                />
              </div>
            )}
          </div>

          {/* Assigned Jobs - For Subcontractors & Foremen */}
          {(isForeman || isSubcontractor) && metrics.myJobs?.length > 0 && (
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Active Assignments</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {metrics.myJobs.map(job => (
                  <div key={job.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black">
                        <Briefcase size={20} />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-sm tracking-tight">{job.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Site Assignment</p>
                      </div>
                    </div>
                    <ArrowRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* My Tasks Section - For Workers & Subcontractors */}
          {(isWorker || isSubcontractor || isForeman) && (
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">Assigned Tasks</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{myTasks.filter(t => t.status !== 'completed').length} Pending Tasks</p>
                  </div>
                </div>
                {myTasks.length > 0 && (
                  <button
                    onClick={() => navigate('/company-admin/projects')}
                    className="text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest"
                  >
                    View Jobs
                  </button>
                )}
              </div>
              <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto no-scrollbar">
                {myTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').map((task) => (
                  <div key={task._id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4 min-w-0">
                      <button
                        onClick={() => handleToggleTaskStatus(task, task.status)}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0
                            ${task.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' :
                            task.status === 'cancelled' ? 'bg-red-50 border-red-200 text-transparent' :
                              'border-slate-200 text-transparent hover:border-emerald-500'}`}
                      >
                        {task.status === 'completed' ? <Check size={12} strokeWidth={4} /> :
                          task.status === 'cancelled' ? <X size={12} className="text-red-500" /> : null}
                      </button>
                      <div className="min-w-0">
                        <p className={`font-black text-slate-900 text-sm tracking-tight truncate 
                          ${task.status === 'completed' ? 'text-slate-400 line-through' :
                            task.status === 'cancelled' ? 'text-red-500' : ''}`}>
                          {task.title}
                          {task.category === 'TODO' && <span className="ml-2 text-[8px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full border border-amber-100 uppercase">Todo</span>}
                          {task.isGlobal && <span className="ml-2 text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full border border-blue-100">Global</span>}
                        </p>
                        {task.status === 'cancelled' && task.cancellationReason && (
                          <p className="text-[10px] text-red-400 font-bold italic mt-0.5 max-w-[200px] truncate">
                            Cancelled: {task.cancellationReason}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                            <Briefcase size={10} /> {task.jobId?.name || task.projectId?.name || 'Project Assignment'}
                          </span>
                          {task.dueDate && (
                            <span className={`text-[10px] font-bold flex items-center gap-1 ${new Date(task.dueDate) < new Date() ? 'text-red-500 bg-red-50 px-1.5 py-0.5 rounded-md' : 'text-slate-400'}`}>
                              <Calendar size={10} /> {new Date(task.dueDate).toLocaleDateString()}
                              {new Date(task.dueDate) < new Date() && <span className="ml-1 font-black underline uppercase">Overdue</span>}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border
                        ${task.priority?.toLowerCase() === 'high' ? 'bg-red-50 text-red-600 border-red-100' :
                          task.priority?.toLowerCase() === 'medium' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                            'bg-slate-50 text-slate-500 border-slate-100'}`}>
                        {task.priority || 'Medium'}
                      </span>
                      {!task.isGlobal && task.status !== 'completed' && task.status !== 'cancelled' ? (
                        <button
                          onClick={() => {
                            setTaskToCancel(task._id);
                            setIsCancellationModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Cancel Task"
                        >
                          <X size={14} />
                        </button>
                      ) : (task.status === 'cancelled' || task.isGlobal) ? (
                        <button
                          onClick={() => handleDeleteTask(task._id, task.isGlobal)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Remove Task"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : null}
                      <button
                        onClick={() => {
                          if (task.isGlobal) {
                            navigate('/company-admin/tasks');
                          } else {
                            navigate(`/company-admin/projects/${task.jobId?.projectId?._id || 'all'}/jobs/${task.jobId?._id || task.jobId}`);
                          }
                        }}
                        className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <ExternalLink size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {myTasks.length === 0 && (
                  <div className="p-12 text-center flex flex-col items-center gap-3">
                    <CheckCircle size={32} className="text-slate-200" />
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest italic">All caught up! No tasks assigned.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* My Recent Activity - For Workers & Subcontractors */}
          {(isWorker || isSubcontractor) && (
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">My Recent Activity</h3>
                <button
                  onClick={() => navigate('/company-admin/timesheets')}
                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 group"
                >
                  View Full History
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
              <div className="divide-y divide-slate-50">
                {myRecentActivity.map((item) => (
                  <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl ${item.action === 'Clocked In' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                        <Clock size={20} />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-sm tracking-tight">{item.action}</p>
                        <p className="text-xs text-slate-500 font-bold">{item.job}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900 text-sm tracking-tight">{item.time}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{item.date}</p>
                    </div>
                  </div>
                ))}
                {myRecentActivity.length === 0 && (
                  <div className="p-10 text-center text-slate-400 text-sm font-bold">No recent activity found.</div>
                )}
              </div>
            </div>
          )}

          {/* Live Crew Activity Table */}



        </div>

        {/* Right Column: Alerts & Recent Logs */}
        {!(isWorker || isSubcontractor) && (
          <div className="space-y-8">
            {/* Attention & Alerts */}
            {!isWorker && (
              <div id="overdue-tasks-section" className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 transition-all duration-500">
                <h3 className="text-lg font-black text-slate-800 mb-5 tracking-tight">Attention & Alerts</h3>
                <div className="space-y-3">
                  {metrics.overdueTasks > 0 && (
                    <div className="space-y-2">
                      <AlertItem
                        label="Overdue Tasks"
                        count={metrics.overdueTasks}
                        color="bg-red-500/90 text-white"
                        onClick={() => navigate('/company-admin/tasks')}
                      />
                      {overdueTasksList.length > 0 && (
                        <div className="bg-red-50/50 rounded-2xl p-3 border border-red-100 flex flex-col gap-2">
                          <p className="text-[9px] font-black text-red-600 uppercase tracking-widest px-1">Overdue Details:</p>
                          {overdueTasksList.slice(0, 5).map(task => (
                            <div key={task._id} className="flex items-center justify-between gap-2 p-2 bg-white rounded-xl border border-red-100/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/company-admin/tasks?taskId=' + task._id)}>
                              <div className="min-w-0">
                                <p className="text-xs font-black text-slate-800 truncate">{task.title}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase truncate">{task.projectId?.name || 'Project'}</p>
                              </div>
                              <span className="text-[9px] font-black text-red-600 shrink-0 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 whitespace-nowrap">
                                DUE: {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          ))}
                          {overdueTasksList.length > 5 && (
                            <button
                              onClick={() => navigate('/company-admin/tasks')}
                              className="text-[10px] font-black text-red-600 hover:text-red-700 uppercase tracking-widest pt-1 text-center"
                            >
                              + {overdueTasksList.length - 5} more in Tasks
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {metrics.equipmentAlerts > 0 && (
                    <AlertItem
                      label="Equipment Pending Return"
                      count={metrics.equipmentAlerts}
                      color="bg-orange-500 text-white"
                      onClick={() => navigate('/company-admin/equipment')}
                    />
                  )}
                  {metrics.overdueRFIs > 0 && (
                    <AlertItem
                      label="Overdue RFIs"
                      count={metrics.overdueRFIs}
                      color="bg-red-600 animate-pulse text-white shadow-lg"
                      onClick={() => navigate('/company-admin/rfi')}
                    />
                  )}
                  {(isOwner || isPM) && metrics.pendingApprovals > 0 && (
                    <AlertItem
                      label="Approval Requests"
                      count={metrics.pendingApprovals}
                      color="bg-blue-600 text-white"
                      onClick={() => navigate('/company-admin/timesheets')}
                    />
                  )}
                  {metrics.offlineSyncs > 0 && (
                    <AlertItem
                      label="Offline Syncs Pending"
                      count={metrics.offlineSyncs}
                      color="bg-slate-500 text-white"
                      onClick={() => navigate('/company-admin/timesheets')}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Recent Daily Logs - Removed as per request */}
            {(isOwner || isPM || isForeman) && (
              <div className="space-y-6">
                {/* Upcoming Tasks Section */}
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="flex justify-between items-center mb-5">
                    <div>
                      <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none">Upcoming Tasks</h3>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                        This Month's Priorities
                      </div>
                    </div>
                    <button onClick={() => navigate('/company-admin/tasks')} className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest p-1">View All</button>
                  </div>
                  <div className="space-y-3">
                    {upcomingTasks.map((task) => {
                      const displayDate = (task.dueDate && task.dueDate !== 'ASAP') ? task.dueDate : task.startDate;
                      return (
                        <UpcomingTaskCard
                          key={task._id}
                          title={task.title}
                          project={task.projectId?.name || 'Unassigned Project'}
                          dueDate={displayDate}
                          priority={task.priority}
                          onClick={() => navigate('/company-admin/tasks?taskId=' + task._id)}
                        />
                      );
                    })}
                    {upcomingTasks.length === 0 && (
                      <div className="p-10 text-center border-2 border-dashed border-slate-50 rounded-2xl">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest italic">All tasks cleared!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {isCancellationModalOpen && (
        <CancellationModal
          isOpen={isCancellationModalOpen}
          onClose={() => {
            setIsCancellationModalOpen(false);
            setTaskToCancel(null);
          }}
          onConfirm={handleCancelTask}
          loading={submitting}
        />
      )}
    </div >
  );
};

export default CompanyAdminDashboard;
