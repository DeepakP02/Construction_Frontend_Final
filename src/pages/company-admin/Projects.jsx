import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Plus, Search, Calendar, MapPin, Edit, Trash2, Eye,
  CheckCircle, Upload, ChevronRight, LayoutGrid, List, Globe, Filter,
  DollarSign, TrendingUp, Users, X, HardHat, Briefcase, ArrowRight, RefreshCw, FileText, ChevronDown
} from 'lucide-react';
import Modal from '../../components/Modal';
import Toast from '../../components/Toast';
import { playSound } from '../../utils/notificationSound';
import api from '../../utils/api';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableProject = ({ id, children, as: Component = 'div', className }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative',
  };

  return (
    <Component ref={setNodeRef} style={style} {...attributes} {...listeners} className={className}>
      {children}
    </Component>
  );
};


const ProjectCardImage = ({ projectImage, projectName }) => {
    const fallback = 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800';

    return (
        <div className="relative w-full h-full overflow-hidden bg-slate-100 flex items-center justify-center">
            <img
                src={projectImage || fallback}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                alt={projectName}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
        </div>
    );
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getLocationStr = (loc) => {
    if (!loc) return '';
    if (typeof loc === 'object') {
        const addr = loc.address || loc.formatted_address;
        if (typeof addr === 'string') return addr;
        if (typeof addr === 'object' && addr !== null) return addr.address || addr.formatted_address || '';
        return '';
    }
    return String(loc);
};

const canSeeBudget = (role) =>
  ['COMPANY_OWNER', 'OWNER', 'PM', 'SUPER_ADMIN'].includes(role);

const formatDate = (dateStr) => {
  if (!dateStr) return 'TBD';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'TBD';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ─── Project Form (Create/Edit) ───────────────────────────────────────────────
const ProjectForm = ({ data, setData, onSubmit, submitLabel, clients, allUsers, saving }) => {
  const [selectedRole, setSelectedRole] = useState('PM');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const userDropdownRef = useRef(null);

  const filteredUsers = allUsers.filter(u => {
    const matchSearch = u.fullName?.toLowerCase().includes(userSearch.toLowerCase());
    return matchSearch;
  });

  // Click outside to close user dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Store the file object for upload
      setData({ ...data, imageFile: file });
      // Create a local preview URL
      const previewUrl = URL.createObjectURL(file);
      setData(prev => ({ ...prev, imagePreview: previewUrl }));
    }
  };

  const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all";

  return (
    <div className="space-y-5">
      {/* Image Upload */}
      <div className="space-y-2">
        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Upload size={13} className="text-blue-600" /> Project Image (optional)
        </label>
        <div className="border-2 border-dashed border-slate-200 rounded-[24px] p-6 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-all relative group overflow-hidden cursor-pointer">
          <input type="file" accept="image/*" onChange={handleImageUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
          {data.imagePreview || (data.image && !data.image.includes('unsplash')) ? (
            <div className="relative w-full h-36">
              <img src={data.imagePreview || data.image} alt="Preview" className="h-full w-full object-cover rounded-xl shadow-md" />
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                <span className="text-white font-black text-xs uppercase tracking-widest">Change</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-slate-400 gap-2">
              <div className="w-12 h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center text-blue-500 shadow-sm">
                <Upload size={20} />
              </div>
              <span className="text-sm font-black text-slate-500">Drop project image here</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">JPG, PNG up to 25MB</span>
            </div>
          )}
        </div>
      </div>

      {/* Name + Client */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Project Name</label>
          <input type="text" value={data.name} onChange={e => setData({ ...data, name: e.target.value })}
            className={inputCls} placeholder="e.g. Skyline Tower Phase II" required />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Client</label>
          <select value={data.clientId} onChange={e => setData({ ...data, clientId: e.target.value })}
            className={inputCls + ' appearance-none'}>
            <option value="">Select a Client</option>
            {clients.map(c => <option key={c._id} value={c._id}>{c.fullName}</option>)}
          </select>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Calendar size={12} className="text-blue-600" /> Start Date
          </label>
          <input type="date" value={data.startDate} onChange={e => setData({ ...data, startDate: e.target.value })} className={inputCls} />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Calendar size={12} className="text-orange-500" /> End Date
          </label>
          <input type="date" value={data.endDate} onChange={e => setData({ ...data, endDate: e.target.value })} className={inputCls} />
        </div>
      </div>

      {/* Budget + Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <DollarSign size={12} className="text-emerald-600" /> Budget
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">$</span>
            <input type="number" value={data.budget} onChange={e => setData({ ...data, budget: e.target.value })}
              className={inputCls + ' pl-8'} placeholder="0.00" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Status</label>
          <select value={data.status} onChange={e => setData({ ...data, status: e.target.value })}
            className={inputCls + ' appearance-none'}>
            <option value="planning">Pre-Construction</option>
            <option value="active">Active Site</option>
            <option value="on-hold">On Hold</option>
            <option value="completed">Handed Over</option>
          </select>
        </div>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <MapPin size={12} className="text-blue-600" /> Location / Address
        </label>
        <input type="text" value={data.location} onChange={e => setData({ ...data, location: e.target.value })}
          className={inputCls} placeholder="e.g. 123 Construction Way, New York, NY" />
      </div>

      {/* Project Lead Assignment */}
      <div className="bg-blue-50/50 p-6 rounded-[32px] border border-blue-100/50 space-y-4">
        <label className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
          <Users size={14} /> Project Manager(s) Assignment
        </label>

        <div className="space-y-4">
          <div className="relative" ref={userDropdownRef}>
            <div
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className={inputCls + ' cursor-pointer flex items-center justify-between min-h-[56px]'}
            >
              <div className="flex flex-wrap gap-2 items-center">
                {data.pmIds && data.pmIds.length > 0 ? (
                  data.pmIds.map(id => {
                    const u = allUsers.find(user => (user._id === id || user._id === id?._id));
                    return u ? (
                      <span key={u._id} className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-2 shadow-sm">
                        {u.fullName}
                        <X size={12} className="cursor-pointer hover:text-blue-200" onClick={(e) => {
                          e.stopPropagation();
                          setData({ ...data, pmIds: data.pmIds.filter(pid => (pid?._id || pid) !== u._id) });
                        }} />
                      </span>
                    ) : null;
                  })
                ) : (
                  <span className="text-slate-400 font-bold text-xs">Select Project Managers...</span>
                )}
              </div>
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''} shrink-0`} />
            </div>

            {isUserDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-200 rounded-[28px] shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search Project Managers..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold uppercase outline-none focus:border-blue-500 transition-all"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-[280px] overflow-y-auto p-2 space-y-1">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map(u => {
                      const isSelected = data.pmIds?.some(id => (id?._id || id) === u._id);
                      return (
                        <div
                          key={u._id}
                          onClick={() => {
                            const currentIds = data.pmIds || [];
                            if (isSelected) {
                              setData({ ...data, pmIds: currentIds.filter(id => (id?._id || id) !== u._id) });
                            } else {
                              setData({ ...data, pmIds: [...currentIds, u._id] });
                            }
                          }}
                          className={`px-4 py-3.5 rounded-2xl text-[11px] font-bold uppercase cursor-pointer transition-all flex items-center justify-between
                            ${isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] ${isSelected ? 'bg-white/20' : 'bg-blue-100 text-blue-600'}`}>
                              {u.fullName?.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span>{u.fullName}</span>
                              <span className={`text-[8px] font-medium ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>{u.email}</span>
                            </div>
                          </div>
                          {isSelected && <CheckCircle size={16} />}
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-12 text-center">
                      <Users size={32} className="mx-auto text-slate-200 mb-2" />
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">No Project Managers Found</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider bg-blue-100/30 p-3 rounded-xl border border-blue-200/20">
          Only users with the <span className="font-black text-blue-600">Project Manager</span> role can be assigned to oversee project units.
        </p>
      </div>

      {/* Manual Progress Control */}
      <div className="space-y-4 bg-slate-50 p-6 rounded-[24px] border border-slate-200/60">
        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <TrendingUp size={14} className="text-blue-600" /> Select Project Progress
        </label>
        <div className="relative">
          <select
            value={data.progress || 0}
            onChange={e => setData({ ...data, progress: parseInt(e.target.value) })}
            className={inputCls + ' appearance-none pl-4 pr-10 hover:border-blue-500/50 cursor-pointer'}
          >
            {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(val => (
              <option key={val} value={val}>{val}% Completion</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <ChevronDown size={16} />
          </div>
        </div>
      </div>



      <button onClick={onSubmit} disabled={!data.name || saving}
        className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all mt-2 flex items-center justify-center gap-2 shadow-xl
          ${(data.name && !saving) ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}>
        {saving ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            Processing...
          </div>
        ) : (
          <>
            <CheckCircle size={18} /> {submitLabel}
          </>
        )}
      </button>
    </div>
  );
};

// ─── Insight Card ─────────────────────────────────────────────────────────────
const InsightCard = ({ title, value, subtext, icon: Icon, color }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  };
  return (
    <div className="bg-white p-4 md:p-6 rounded-[24px] md:rounded-[32px] shadow-sm border border-slate-200/60 flex items-center gap-3 md:gap-5 hover:shadow-xl hover:shadow-slate-100 transition-all duration-300">
      <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl border ${colors[color]}`}><Icon size={28} /></div>
      <div>
        <p className="text-[9px] md:text-[10px] text-slate-400 uppercase font-black tracking-widest">{title}</p>
        <p className="text-lg md:text-2xl font-black text-slate-900 leading-tight tracking-tighter">{value}</p>
        <p className="text-[9px] md:text-[10px] font-bold text-slate-500 italic mt-0.5">{subtext}</p>
      </div>
    </div>
  );
};
// ─── Main Component ───────────────────────────────────────────────────────────
const Projects = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [view, setView] = useState('grid');
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState(null); // { message, type }
  const [saving, setSaving] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewProject, setViewProject] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = projects.findIndex((p) => p._id === active.id);
    const newIndex = projects.findIndex((p) => p._id === over.id);

    const reorderedProjects = arrayMove(projects, oldIndex, newIndex);
    setProjects(reorderedProjects);

    try {
      await api.post('/projects/reorder', { 
        projectIds: reorderedProjects.map(p => p._id) 
      });
    } catch (err) {
      console.error('Failed to reorder projects:', err);
      setToast({ message: 'Failed to save new order', type: 'error' });
      fetchAll();
    }
  };


  const showBudget = canSeeBudget(user?.role);

  const EMPTY = {
    name: '', clientId: '', startDate: '', endDate: '', budget: '', pmIds: [],
    status: 'active', progress: 0, location: '', image: '', companyId: user?.companyId,
    siteLatitude: '', siteLongitude: '', allowedRadiusMeters: 100, strictGeofence: false
  };
  const [formData, setFormData] = useState(EMPTY);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    try {
      setLoading(true);
      const isJobView = ['WORKER', 'FOREMAN', 'SUBCONTRACTOR'].includes(user?.role);

      // Focus only on essential data for the list view
      const projectReq = api.get('/projects');
      const jobReq = isJobView ? api.get('/jobs').catch(() => ({ data: [] })) : Promise.resolve({ data: [] });

      const [projRes, jobsRes] = await Promise.all([projectReq, jobReq]);

      setProjects(projRes.data || []);
      if (isJobView) setJobs(jobsRes.data || []);

    } catch (err) {
      console.error('Projects fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const ensureAdminDataLoaded = async (force = false) => {
    if (!force && clients.length > 0 && allUsers.length > 0) return;
    try {
      const [clientRes, pmRes] = await Promise.all([
        api.get('/auth/users?role=CLIENT').catch(() => ({ data: [] })),
        api.get('/auth/users?role=PM').catch(() => ({ data: [] }))
      ]);
      setClients(clientRes.data || []);
      setAllUsers(pmRes.data || []);
    } catch (err) {
      console.error('Error loading admin data:', err);
    }
  };

  useEffect(() => { 
    if (user) fetchAll(); 
  }, [user?._id, user?.role]);

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    try {
      setSaving(true);
      const data = new FormData();
        Object.keys(formData).forEach(key => {
          if (key === 'imageFile' && formData[key]) {
            data.append('image', formData[key]);
          } else if (key === 'pmIds') {
            data.append('pmIds', JSON.stringify(formData[key]));
          } else if (key !== 'imagePreview' && key !== 'image') {
            data.append(key, formData[key]);
          }
        });
      data.append('companyId', user?.companyId);

      await api.post('/projects', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setIsCreateOpen(false);
      setFormData(EMPTY);
      setToast({ message: 'Project created successfully!', type: 'success' });
      fetchAll();
    } catch (err) {
      console.error('Project creation error:', err);
      if (err.response?.status === 403) {
        setToast({
          message: err.response?.data?.message || 'Project limit reached for your plan (5 projects). Please upgrade your plan to create more projects.',
          type: 'error'
        });
      } else {
        setToast({
          message: err.response?.data?.message || 'Failed to create project. Please try again.',
          type: 'error'
        });
      }
    } finally {
      setSaving(false);
    }
  };


  const handleUpdate = async () => {
    try {
      setSaving(true);
      const data = new FormData();
      Object.keys(editingProject).forEach(key => {
        if (key === 'imageFile' && editingProject[key]) {
          data.append('image', editingProject[key]);
        } else if (key !== 'imagePreview' && key !== 'image') {
          // If value is null, skip or send as empty string to avoid "null" string
          if (editingProject[key] === null) {
              data.append(key, '');
          } else if (key === 'pmIds') {
              data.append('pmIds', JSON.stringify(editingProject[key]));
          } else {
              // If value is object (like location), stringify it
              const value = typeof editingProject[key] === 'object' ? JSON.stringify(editingProject[key]) : editingProject[key];
              data.append(key, value);
          }
        }
      });

      await api.patch(`/projects/${editingProject._id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setIsEditOpen(false);
      fetchAll();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickProgressUpdate = async (projectId, newProgress, e) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(`/projects/${projectId}`, { progress: newProgress });
      setProjects(prev => prev.map(p => p._id === projectId ? { ...p, progress: newProgress } : p));
    } catch (err) {
      console.error('Progress update error:', err);
    }
  };

  const requestDelete = (project, e) => {
    if (e) e.stopPropagation();
    setDeleteTarget(project);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      await api.delete(`/projects/${deleteTarget._id}`);
      setToast({ message: 'Project archived successfully!', type: 'success' });
      setDeleteTarget(null);
      fetchAll();
    } catch (err) {
      console.error('Project delete error:', err);
      setToast({ message: err.response?.data?.message || 'Failed to delete project. Please try again.', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    if (isDeleting) return;
    setDeleteTarget(null);
  };

  const openEdit = async (project, e) => {
    e.stopPropagation();
    await ensureAdminDataLoaded(true);
    setEditingProject({
      ...project,
      location: getLocationStr(project.location),
      clientId: typeof project.clientId === 'object' ? (project.clientId?._id || '') : (project.clientId || ''),
      pmIds: project.pmIds ? project.pmIds.map(p => typeof p === 'object' ? p._id : p) : (project.pmId ? [typeof project.pmId === 'object' ? project.pmId._id : project.pmId] : []),
      startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
      endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
      siteLatitude: project.siteLatitude || '',
      siteLongitude: project.siteLongitude || '',
      allowedRadiusMeters: project.allowedRadiusMeters || 100,
      strictGeofence: project.strictGeofence || false,
    });
    setIsEditOpen(true);
  };

  const handleUpdateJobStatus = async (jobId, newStatus) => {
    try {
      await api.patch(`/jobs/${jobId}`, { status: newStatus });
      setJobs(prev => prev.map(j => j._id === jobId ? { ...j, status: newStatus } : j));
    } catch (err) {
      console.error('Update job status error:', err);
    }
  };

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = projects.filter(p => {
    const loc = getLocationStr(p.location);
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loc.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const isWorker = ['WORKER', 'SUBCONTRACTOR'].includes(user?.role);
  const isForeman = user?.role === 'FOREMAN';
  const isJobView = isWorker || isForeman;
  const filteredJobs = jobs.filter(j => {
    const matchSearch = j.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.projectId?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = filterStatus === 'all' || (j.status || '').toLowerCase() === filterStatus.toLowerCase();
    return matchSearch && matchStatus;
  });

  const stats = {
    active: projects.filter(p => p.status === 'active').length,
    planning: projects.filter(p => p.status === 'planning').length,
    totalBudget: projects.reduce((s, p) => s + (Number(p.budget) || 0), 0),
  };

  const statusLabel = s =>
    s === 'active' ? 'Live Site' : s === 'planning' ? 'Planning' : s === 'on-hold' ? 'On Hold' : 'Finished';
  const statusColor = s =>
    s === 'active' ? 'bg-emerald-500/90 text-white border-emerald-400' :
      s === 'planning' ? 'bg-orange-500/90  text-white border-orange-400' :
        s === 'on-hold' ? 'bg-yellow-500/90  text-white border-yellow-400' :
          'bg-slate-500/90   text-white border-slate-400';

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in w-full pb-8">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-6">
        <div className="w-full md:w-auto">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">
            {isJobView ? 'My Job Assignments' : 'Projects'}
          </h1>
          <p className="text-slate-500 font-bold text-[10px] md:text-sm mt-1 uppercase tracking-widest flex items-center gap-2">
            <Globe size={14} className="text-blue-600" />
            {isJobView ? 'View your assigned jobs and their tasks' : 'Click a project card to manage jobs'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {!isJobView && (
            <>
              <div className="bg-white border border-slate-200 rounded-xl p-1 flex">
                <button onClick={() => setView('grid')}
                  className={`p-2 rounded-lg transition-all ${view === 'grid' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
                  <LayoutGrid size={18} />
                </button>
                <button onClick={() => setView('table')}
                  className={`p-2 rounded-lg transition-all ${view === 'table' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
                  <List size={18} />
                </button>
              </div>
              {user?.role === 'COMPANY_OWNER' && (
                <button onClick={async () => { 
                  await ensureAdminDataLoaded(true);
                  setFormData(EMPTY); 
                  setIsCreateOpen(true); 
                }}
                  className="bg-blue-600 text-white px-3 md:px-6 py-2.5 md:py-3 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200 font-black text-[11px] md:text-sm uppercase tracking-tight ml-auto md:ml-0">
                  <Plus size={16} /> <span className="hidden sm:inline">Create Project</span><span className="sm:hidden">Create</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      {!isWorker && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <InsightCard title="Active Sites" value={stats.active} subtext="currently operational" icon={TrendingUp} color="blue" />
          <InsightCard title="Pre-Construction" value={stats.planning} subtext="in planning phase" icon={Calendar} color="orange" />
          {showBudget && (
            <InsightCard title="Total Portfolio" value={`$${(stats.totalBudget / 1000000).toFixed(1)}M`} subtext="contracted value" icon={DollarSign} color="emerald" />
          )}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="bg-white p-3 md:p-4 rounded-[24px] md:rounded-3xl shadow-sm border border-slate-200/60 flex flex-col md:flex-row gap-3 md:gap-4 items-center shrink-0">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder={isWorker ? "Search objectives..." : "Search projects..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 text-sm font-bold text-slate-700 placeholder:text-slate-400 transition-all"
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="w-full md:w-auto px-4 md:px-6 py-2.5 bg-white border border-slate-200 rounded-xl md:rounded-2xl font-bold text-sm text-slate-600 outline-none hover:bg-slate-50 transition-all appearance-none cursor-pointer">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="planning">Pre-Con</option>
          <option value="on-hold">On Hold</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin" />
          <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Loading {isJobView ? 'Job Assignments' : 'Projects'}...</p>
        </div>
      ) : isJobView ? (
        /* ── Worker / Foreman Job Assignments View ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.length === 0 ? (
            <div className="col-span-full py-24 text-center flex flex-col items-center gap-4 text-slate-300">
              <Briefcase size={48} className="opacity-30" />
              <p className="font-bold uppercase tracking-widest text-[11px]">No assigned jobs found</p>
            </div>
          ) : filteredJobs.map(job => (
            <div key={job._id} className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm p-6 hover:shadow-xl hover:shadow-slate-100 transition-all duration-500 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100 flex items-center justify-center">
                  <Briefcase size={20} className="text-blue-600" />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Manage Status</span>
                  <select
                    value={job.status}
                    onChange={(e) => handleUpdateJobStatus(job._id, e.target.value)}
                    className="text-[10px] font-black uppercase tracking-tight bg-slate-900 text-white px-3 py-1.5 rounded-xl border-none outline-none cursor-pointer hover:bg-blue-600 transition-all shadow-md appearance-none text-center min-w-[100px]"
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="on-hold">On Hold</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">{job.name}</h3>
              <p className="text-slate-500 text-xs font-bold flex items-center gap-2 mb-2">
                <MapPin size={12} /> {job.location || 'Main Site'}
              </p>

              {/* Job progress bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Progress</span>
                  <span className="text-[9px] font-black text-slate-600">{job.progress || 0}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all duration-700" style={{ width: `${job.progress || 0}%` }} />
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-50">
                <button
                  onClick={() => navigate(`/company-admin/projects/${job.projectId?._id || job.projectId}/jobs/${job._id}`)}
                  className="w-full bg-blue-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                >
                  <CheckCircle size={14} /> View Tasks
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {view === 'grid' ? (
            <SortableContext
              items={filtered.map(p => p._id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filtered.length === 0 ? (
                  <div className="col-span-full py-24 text-center flex flex-col items-center gap-4 text-slate-300">
                    <Briefcase size={48} className="opacity-30" />
                    <p className="font-bold uppercase tracking-widest text-[11px]">No projects found</p>
                    {user?.role === 'COMPANY_OWNER' && (
                      <button onClick={() => { setFormData(EMPTY); setIsCreateOpen(true); }}
                        className="mt-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-tight hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center gap-2">
                        <Plus size={16} /> Create First Project
                      </button>
                    )}
                  </div>
                ) : filtered.map(project => (
                  <SortableProject key={project._id} id={project._id}>
                    <div
                      onClick={() => {
                        const path = user?.role === 'CLIENT'
                          ? `/client-portal/progress/${project._id}`
                          : `/company-admin/projects/${project._id}`;
                        navigate(path);
                      }}
                      className="group bg-white h-full rounded-[28px] md:rounded-[36px] border border-slate-200/60 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 overflow-hidden flex flex-col cursor-pointer">

                      {/* Image */}
                      <div className="relative h-44 md:h-56">
                        <ProjectCardImage
                          projectImage={project.image}
                          projectName={project.name}
                        />
                        <div className="absolute top-4 left-4">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-lg backdrop-blur-md ${statusColor(project.status)}`}>
                            {statusLabel(project.status)}
                          </span>
                        </div>
                        {/* "View Jobs" hint on hover */}
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 hidden md:block">
                          <div className="bg-white/20 backdrop-blur-md border border-white/30 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                            <ArrowRight size={12} className="text-white" />
                            <span className="text-white text-[10px] font-black uppercase tracking-widest">View Jobs</span>
                          </div>
                        </div>
                        <div className="absolute bottom-4 left-4 right-4">
                          <div className="flex items-center gap-2 text-white/80 mb-0.5">
                            <MapPin size={11} className="text-blue-400" />
                            <span className="text-[9px] font-black uppercase tracking-widest truncate">
                              {getLocationStr(project.location) || 'Location TBD'}
                            </span>
                          </div>
                          <h3 className="text-lg md:text-xl font-black text-white tracking-tight drop-shadow-md truncate">{project.name}</h3>
                          <div className="flex items-center gap-2 text-white/60 mt-0.5">
                            <Users size={11} className="text-blue-400" />
                            <span className="text-[9px] font-black uppercase tracking-widest truncate">
                              PM: {project.pmIds && project.pmIds.length > 0
                                ? project.pmIds.map(p => p.fullName || allUsers?.find(u => u._id === (p?._id || p))?.fullName).join(', ')
                                : (project.pmId?.fullName || (allUsers?.find(u => u._id === (project.pmId?._id || project.pmId))?.fullName || 'Unassigned'))}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-4 md:p-5 space-y-3 flex-1 flex flex-col justify-between">
                        {/* Progress Section - Integrated and Slim */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5 text-[8.5px] md:text-[9.5px] font-black text-slate-400 uppercase tracking-widest leading-none">
                              <TrendingUp size={11} className="text-blue-500" />
                              <span>Progress</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {['COMPANY_OWNER', 'PM'].includes(user?.role) && (
                                <select
                                  value={project.progress || 0}
                                  onClick={e => e.stopPropagation()}
                                  onChange={(e) => handleQuickProgressUpdate(project._id, parseInt(e.target.value), e)}
                                  className="bg-slate-50 border border-slate-200 rounded text-[8.5px] font-bold text-blue-600 px-1 py-0.5 outline-none hover:border-blue-500 transition-all cursor-pointer appearance-none"
                                >
                                  {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(val => (
                                    <option key={val} value={val}>{val}%</option>
                                  ))}
                                </select>
                              )}
                              <span className="text-[10px] md:text-xs font-black text-slate-900">{project.progress || 0}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/30">
                            <div className="h-full bg-blue-600 rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(37,99,235,0.3)]"
                              style={{ width: `${project.progress || 0}%` }} />
                          </div>
                        </div>

                        {/* Client + Budget - Compact Row */}
                        <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-100/50">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-slate-50 rounded-lg shrink-0"><Users size={11} className="text-slate-400" /></div>
                            <div className="min-w-0">
                              <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-tight leading-none mb-1">Client</p>
                              <p className="text-[10px] md:text-[11px] font-bold text-slate-700 truncate leading-none">
                                {project.clientId?.fullName || '—'}
                              </p>
                            </div>
                          </div>
                          {showBudget && (
                            <div className="flex items-center gap-2 justify-end text-right">
                              <div className="min-w-0">
                                <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-tight leading-none mb-1">Budget</p>
                                <p className="text-[10px] md:text-[11px] font-black text-slate-900 leading-none">${(Number(project.budget) || 0).toLocaleString()}</p>
                              </div>
                              <div className="p-1.5 bg-emerald-50 rounded-lg shrink-0"><DollarSign size={11} className="text-emerald-500" /></div>
                            </div>
                          )}
                        </div>

                        {/* Action buttons - Refined and Slim */}
                        <div className="flex items-center gap-1.5 pt-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewProject(project);
                              setIsViewOpen(true);
                            }}
                            className="p-2 md:p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-emerald-600 rounded-lg md:rounded-xl transition-all border border-slate-200/50 flex items-center justify-center shrink-0 shadow-sm"
                            title="View Details"
                          >
                            <Eye size={13} />
                          </button>
                          {user?.role !== 'CLIENT' && (
                            <button onClick={(e) => openEdit(project, e)}
                              className="p-2 md:p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded-lg md:rounded-xl transition-all border border-slate-200/50 flex items-center justify-center shrink-0 shadow-sm"
                              title="Edit Project"
                            >
                              <Edit size={13} />
                            </button>
                          )}

                          <button
                            onClick={() => navigate(`${user?.role === 'CLIENT' ? '/client-portal' : '/company-admin'}/drawings?projectId=${project._id}`)}
                            className="flex-1 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[8.5px] md:text-[9.5px] uppercase tracking-wide py-1.5 md:py-2 rounded-lg md:rounded-xl transition-all border border-slate-200 flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm"
                          >
                            <FileText size={13} className="text-blue-600" /> <span className="hidden sm:inline">Drawings</span><span className="sm:hidden">Docs</span>
                          </button>

                          {user?.role === 'CLIENT' && (
                            <button
                              onClick={() => navigate(`/client-portal/progress/${project._id}`)}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[8.5px] md:text-[9.5px] uppercase tracking-wide py-1.5 md:py-2 rounded-lg md:rounded-xl transition-all shadow-[0_4px_12px_rgba(37,99,235,0.2)] flex items-center justify-center gap-1.5 whitespace-nowrap"
                            >
                              <TrendingUp size={13} /> <span className="hidden sm:inline">Progress</span><span className="sm:hidden">View</span>
                            </button>
                          )}

                          {user?.role !== 'CLIENT' && (
                            <button
                              onClick={() => navigate(`/company-admin/projects/${project._id}`)}
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[8.5px] md:text-[9.5px] uppercase tracking-wide py-1.5 md:py-2 rounded-lg md:rounded-xl transition-all shadow-[0_4px_12px_rgba(37,99,235,0.2)] flex items-center justify-center gap-1.5 whitespace-nowrap"
                            >
                              <Briefcase size={13} /> <span className="hidden sm:inline">View Jobs</span><span className="sm:hidden">Jobs</span>
                            </button>
                          )}

                          {['SUPER_ADMIN', 'COMPANY_OWNER'].includes(user?.role) && (
                            <button onClick={(e) => requestDelete(project, e)}
                              className="p-2 md:p-2.5 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-300 hover:text-red-500 rounded-lg md:rounded-xl transition-all border border-red-100/50 shrink-0 shadow-sm"
                              title="Delete Project"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </SortableProject>
                ))}
              </div>
            </SortableContext>
          ) : (
            /* ── Table View ── */
            <SortableContext
              items={filtered.map(p => p._id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="bg-white rounded-[40px] shadow-sm border border-slate-200/60 overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="px-8 py-5">Project Name</th>
                      <th className="px-8 py-5">Location</th>
                      <th className="px-8 py-5">Status</th>
                      <th className="px-8 py-5">Progress</th>
                      {showBudget && <th className="px-8 py-5">Budget</th>}
                      <th className="px-8 py-5">End Date</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.length === 0 ? (
                      <tr><td colSpan={showBudget ? 7 : 6} className="px-8 py-24 text-center">
                        <div className="flex flex-col items-center gap-4 text-slate-300">
                          <Briefcase size={48} className="opacity-30" />
                          <p className="font-bold uppercase tracking-widest text-[11px]">No projects found</p>
                        </div>
                      </td></tr>
                    ) : filtered.map(project => (
                      <SortableProject
                        key={project._id}
                        id={project._id}
                        as="tr"
                        className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                        onClick={() => {
                          const path = user?.role === 'CLIENT'
                            ? `/client-portal/progress/${project._id}`
                            : `/company-admin/projects/${project._id}`;
                          navigate(path);
                        }}
                      >
                        <td className="px-8 py-5 font-black text-slate-900">{project.name}</td>
                        <td className="px-8 py-5 text-slate-500 font-bold text-xs max-w-[160px] truncate">
                          {getLocationStr(project.location) || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border
                      ${project.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                              project.status === 'planning' ? 'bg-orange-50  text-orange-700  border-orange-100' :
                                project.status === 'on-hold' ? 'bg-yellow-50  text-yellow-700  border-yellow-100' :
                                  'bg-slate-50   text-slate-600   border-slate-200'}`}>
                            {statusLabel(project.status)}
                          </span>
                        </td>
                        <td className="px-8 py-5" onClick={e => e.stopPropagation()}>
                          <div className="flex flex-col gap-1.5 group/progress-td">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${project.progress || 0}%` }} />
                              </div>
                              <span className="text-xs font-bold text-slate-600">{project.progress || 0}%</span>
                            </div>
                            {['COMPANY_OWNER', 'PM'].includes(user?.role) && (
                              <select
                                value={project.progress || 0}
                                onClick={e => e.stopPropagation()}
                                onChange={(e) => handleQuickProgressUpdate(project._id, parseInt(e.target.value), e)}
                                className="bg-white border border-slate-200 rounded text-[9px] font-black text-slate-500 px-1 py-0.5 outline-none hover:border-blue-500 transition-all cursor-pointer appearance-none"
                              >
                                {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(val => (
                                  <option key={val} value={val}>{val}%</option>
                                ))}
                              </select>
                            )}
                          </div>
                        </td>
                        {showBudget && (
                          <td className="px-8 py-5 font-bold text-slate-900">${(Number(project.budget) || 0).toLocaleString()}</td>
                        )}
                        <td className="px-8 py-5 text-slate-400 font-bold text-xs">
                          {project.endDate ? new Date(project.endDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-8 py-5 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end gap-2 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewProject(project);
                                setIsViewOpen(true);
                              }}
                              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-white hover:shadow-md rounded-xl transition-all"
                              title="View Details"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`${user?.role === 'CLIENT' ? '/client-portal' : '/company-admin'}/drawings?projectId=${project._id}`);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white hover:shadow-md rounded-xl transition-all"
                              title="View Drawings"
                            >
                              <FileText size={18} />
                            </button>
                            <button onClick={(e) => openEdit(project, e)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white hover:shadow-md rounded-xl transition-all"
                              title="Edit Project"
                            >
                              <Edit size={18} />
                            </button>
                            {['SUPER_ADMIN', 'COMPANY_OWNER'].includes(user?.role) && (
                              <button onClick={(e) => requestDelete(project, e)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-white hover:shadow-md rounded-xl transition-all"
                                title="Delete Project"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </SortableProject>
                    ))}

                  </tbody>
                </table>
              </div>
            </SortableContext>
          )}
        </DndContext>
      )}

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Project" maxWidth="max-w-2xl">
        <ProjectForm data={formData} setData={setFormData} onSubmit={handleCreate}
          submitLabel="Create Project" clients={clients} allUsers={allUsers} saving={saving} />
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Project" maxWidth="max-w-2xl">
        {editingProject && (
          <ProjectForm data={editingProject} setData={setEditingProject} onSubmit={handleUpdate}
            submitLabel="Save Changes" clients={clients} allUsers={allUsers} saving={saving} />
        )}
      </Modal>


      {/* ── Archive Modal ── */}
      <Modal isOpen={Boolean(deleteTarget)} onClose={cancelDelete} title="Archive Project" maxWidth="max-w-md">
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            Are you sure you want to archive the project <span className="font-black text-slate-900">{deleteTarget?.name}</span>? This action will remove it from the project list.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button
              onClick={confirmDelete}
              disabled={isDeleting}
              className={`w-full inline-flex items-center justify-center rounded-2xl px-4 py-3 font-black uppercase tracking-wider text-sm transition ${isDeleting ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Archiving...
                </>
              ) : 'Yes, Archive'}
            </button>
            <button
              onClick={cancelDelete}
              disabled={isDeleting}
              className="w-full rounded-2xl px-4 py-3 font-black uppercase tracking-wider text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
      
      {/* ── View Details Modal ── */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Project Details" maxWidth="max-w-2xl">
        {viewProject && (
          <div className="space-y-6">
            <div className="flex items-start gap-6 pb-6 border-b border-slate-100">
                <div className="w-24 h-24 rounded-3xl overflow-hidden shrink-0 border-4 border-white shadow-xl">
                    <img src={viewProject.image || 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800'} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 pt-2">
                    <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusColor(viewProject.status)}`}>
                            {statusLabel(viewProject.status)}
                        </span>
                        <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{viewProject.progress || 0}% Complete</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{viewProject.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-slate-400 font-bold text-xs uppercase tracking-widest">
                        <MapPin size={12} className="text-blue-500" />
                        {getLocationStr(viewProject.location) || 'No location provided'}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned PM(s)</p>
                        <div className="flex items-center gap-2">
                            <Users size={14} className="text-blue-500" />
                            <span className="text-sm font-black text-slate-800">
                                {viewProject.pmIds && viewProject.pmIds.length > 0 
                                    ? viewProject.pmIds.map(p => p.fullName || allUsers?.find(u => u._id === (p?._id || p))?.fullName).filter(Boolean).join(', ')
                                    : (viewProject.pmId?.fullName || allUsers?.find(u => u._id === (viewProject.pmId?._id || viewProject.pmId))?.fullName || 'Unassigned')}
                            </span>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Client Contact</p>
                        <div className="flex items-center gap-2">
                            <Briefcase size={14} className="text-blue-500" />
                            <span className="text-sm font-black text-slate-800">{viewProject.clientId?.fullName || 'No Client Assigned'}</span>
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Project Timeline</p>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-blue-500" />
                                <span className="text-xs font-bold text-slate-600">Start: {formatDate(viewProject.startDate)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-orange-500" />
                                <span className="text-xs font-bold text-slate-600">End: {formatDate(viewProject.endDate)}</span>
                            </div>
                        </div>
                    </div>
                    {showBudget && (
                        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                            <p className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">Contract Budget</p>
                            <div className="flex items-center gap-2">
                                <DollarSign size={14} className="text-emerald-600" />
                                <span className="text-sm font-black text-emerald-700">${(Number(viewProject.budget) || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button 
                    onClick={() => setIsViewOpen(false)}
                    className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl"
                >
                    Close View
                </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Projects;
