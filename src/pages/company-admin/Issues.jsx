import React, { useState, useEffect } from 'react';
import {
  AlertCircle, CheckCircle, Clock, Filter, Plus, X, Save, Search,
  Trash2, Edit, AlertTriangle, Loader, Hash, MapPin, Users,
  ChevronRight, Info, ShieldAlert, Target, Check, Trash, LayoutGrid, List,
  Image as ImageIcon, FileText
} from 'lucide-react';
import api from '../../utils/api';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Modal from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';

const DraggableIssue = ({ issue, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: issue._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-red-500/5 transition-all cursor-grab active:cursor-grabbing group relative overflow-hidden
                ${isDragging ? 'z-50 ring-2 ring-red-500/20' : ''}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-wrap gap-2">
          <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm
                      ${issue.priority === 'critical' ? 'bg-red-600 text-white border-red-500' :
              issue.priority === 'high' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                'bg-blue-50 text-blue-600 border-blue-100'}`}>
            {issue.priority} Priority
          </span>
          <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm
                      ${issue.status === 'open' ? 'bg-red-50 text-red-600 border-red-100' :
              issue.status === 'in_progress' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
            {issue.status === 'open' ? 'Active' : issue.status === 'in_progress' ? 'In Correction' : 'Fixed'}
          </span>
        </div>
        <span className="text-[10px] font-black text-slate-300">#{issue._id.slice(-4).toUpperCase()}</span>
      </div>

      <div className="flex gap-4">
        {issue.images && issue.images.length > 0 && (
          <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-100 flex-shrink-0 bg-slate-50 flex items-center justify-center">
            {issue.images[0].toLowerCase().includes('.pdf') ? (
              <FileText size={20} className="text-red-500" />
            ) : (
              <img src={issue.images[0]} alt="Thumbnail" className="w-full h-full object-cover" />
            )}
          </div>
        )}
        <div className="space-y-1 flex-1 min-w-0">
          <h4 className="font-black text-slate-900 leading-tight tracking-tight group-hover:text-red-600 transition-colors uppercase truncate">{issue.title}</h4>
          <div className="flex items-center gap-1.5">
            <MapPin size={10} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate">
              {issue.projectId?.name || 'Site Unknown'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500 shadow-sm">
            {issue.assignedTo ? issue.assignedTo.fullName.charAt(0) : '?'}
          </div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter truncate max-w-[80px]">
            {issue.assignedTo?.fullName || 'Unassigned'}
          </span>
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-black uppercase
                    ${issue.dueDate && new Date(issue.dueDate) < new Date() ? 'text-red-500' : 'text-slate-400'}`}>
          <Clock size={12} /> {issue.dueDate ? new Date(issue.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'TBD'}
        </div>
      </div>

      {issue.priority === 'critical' && <div className="absolute -right-4 -top-4 w-12 h-12 bg-red-600/5 rounded-full blur-xl animate-pulse"></div>}
    </div>
  );
};

const DroppableColumn = ({ status, statusLabel, colorClass, dotClass, issues, onIssueClick }) => {
  const { setNodeRef } = useDroppable({ id: status });
  const issueIds = issues.filter(i => i.status === status).map(i => i._id);

  return (
    <div ref={setNodeRef} className="flex-1 min-w-[320px] bg-slate-50/50 border border-slate-200/60 rounded-[40px] flex flex-col h-full max-h-full transition-all group/col">
      <div className="p-6 pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${dotClass} shadow-sm group-hover/col:scale-125 transition-transform`}></div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{statusLabel}</h3>
          </div>
          <span className="bg-white border border-slate-200 text-slate-400 px-3 py-1 rounded-xl text-[10px] font-black shadow-sm">
            {issueIds.length}
          </span>
        </div>
      </div>
      <div className="p-4 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
        <SortableContext items={issueIds} strategy={verticalListSortingStrategy}>
          {issues.filter(i => i.status === status).map(issue => (
            <DraggableIssue key={issue._id} issue={issue} onClick={() => onIssueClick(issue)} />
          ))}
        </SortableContext>
        {issueIds.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-slate-300 opacity-50 border-2 border-dashed border-slate-200 rounded-3xl mx-2">
            <CheckCircle size={32} />
            <span className="text-[10px] font-black uppercase mt-2">All Clear</span>
          </div>
        )}
      </div>
    </div>
  );
};

const SearchableSelect = ({ options, value, onChange, placeholder, disabled, mode, error }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const selectedOption = options.find(opt => opt.value === value);
  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative">
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full bg-slate-50 border rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none transition-all text-sm flex justify-between items-center cursor-pointer 
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500'}
          ${error ? 'border-red-500 ring-4 ring-red-500/5 bg-red-50/30' : 'border-slate-200'}
        `}
      >
        <span className={!selectedOption ? 'text-slate-400' : ''}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <Filter size={14} className={error ? 'text-red-400' : 'text-slate-400'} />
      </div>

      {isOpen && (
        <div className="absolute z-[110] w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
          <div className="p-3 border-b border-slate-100 bg-slate-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-all"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-[250px] overflow-y-auto py-2 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`px-4 py-3 text-xs font-bold uppercase tracking-tight cursor-pointer transition-colors flex items-center justify-between
                    ${value === opt.value ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-600'}`}
                >
                  {opt.label}
                  {value === opt.value && <Check size={14} />}
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                No Results Found
              </div>
            )}
          </div>
        </div>
      )}
      {isOpen && <div className="fixed inset-0 z-[105]" onClick={() => setIsOpen(false)} />}
    </div>
  );
};

const IssueForm = ({ data, setData, onSubmit, submitLabel, projects, users, projectMembers, currentUser, isSubmitting, selectedRole, setSelectedRole, showErrors, setShowErrors }) => {
  const availableRoles = [
    { value: 'all', label: 'All Roles' },
    { value: 'PM', label: 'Project Manager' },
    { value: 'FOREMAN', label: 'Foreman' },
    { value: 'WORKER', label: 'Worker' },
    { value: 'SUBCONTRACTOR', label: 'Subcontractor' },
  ];

  const filteredUsers = (() => {
    const isRestrictedRole = ['WORKER', 'FOREMAN', 'SUBCONTRACTOR'].includes(selectedRole);
    const isGlobalPMAccess = selectedRole === 'PM' && ['COMPANY_OWNER', 'SUPER_ADMIN'].includes(currentUser?.role);

    if (selectedRole === 'all') {
        const pMembers = projectMembers.length > 0 ? projectMembers : users;
        const pmGlobal = ['COMPANY_OWNER', 'SUPER_ADMIN'].includes(currentUser?.role) 
            ? users.filter(u => u.role === 'PM') 
            : [];
        const combined = [...pMembers];
        pmGlobal.forEach(pm => {
            if (!combined.find(u => u._id === pm._id)) combined.push(pm);
        });
        return combined;
    }

    if (isGlobalPMAccess) return users.filter(u => u.role === 'PM');
    if (isRestrictedRole) return projectMembers.filter(u => u.role === selectedRole);
    return users.filter(u => u.role === selectedRole);
  })();

  return (
  <div className="space-y-6">
    <div className="space-y-2">
      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
        <AlertTriangle size={14} className="text-red-600" /> Issue / Snag Title
      </label>
      <input
        type="text"
        value={data.title}
        onChange={e => {
          setData({ ...data, title: e.target.value });
          if (showErrors) setShowErrors(false);
        }}
        className={`w-full bg-slate-50 border rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none transition-all text-sm
          ${showErrors && !data.title 
            ? 'border-red-500 ring-4 ring-red-500/5 bg-red-50/30' 
            : 'border-slate-200 focus:border-red-500/50 focus:ring-4 focus:ring-red-500/5'}
        `}
        placeholder="e.g. Water Seepage in Basement Slab"
      />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="space-y-2">
        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">Project Site</label>
        <select
          value={data.projectId}
          onChange={e => {
            setData({ ...data, projectId: e.target.value, assignedTo: '' });
            if (showErrors) setShowErrors(false);
          }}
          className={`w-full bg-slate-50 border rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none transition-all text-sm appearance-none
            ${showErrors && !data.projectId 
              ? 'border-red-500 ring-4 ring-red-500/5 bg-red-50/30' 
              : 'border-slate-200 focus:border-blue-500'}
          `}
        >
          <option value="">Select Site</option>
          {projects.map(p => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">Personnel Role</label>
        <select
          value={selectedRole}
          onChange={e => setSelectedRole(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-500 transition-all text-sm appearance-none"
        >
          {availableRoles.map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>
    </div>
    <div className="space-y-2">
      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">Assign To</label>
      <SearchableSelect
        options={filteredUsers.map(u => ({ value: u._id, label: `${u.fullName} (${u.role})` }))}
        value={data.assignedTo}
        onChange={val => {
          setData({ ...data, assignedTo: val });
          if (showErrors) setShowErrors(false);
        }}
        error={showErrors && !data.assignedTo}
        placeholder={data.projectId ? "Select Assignee" : "Select Project First"}
        disabled={isSubmitting || !data.projectId}
      />
    </div>
    <div className="space-y-2">
      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">Issue Category</label>
      <select
        value={data.category}
        onChange={e => setData({ ...data, category: e.target.value })}
        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-500 transition-all text-sm appearance-none"
      >
        <option value="general">General Issue</option>
        <option value="safety">Safety / Incident</option>
        <option value="quality">Quality / Defect</option>
        <option value="equipment">Equipment Related</option>
        <option value="other">Other</option>
      </select>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="space-y-2">
        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">Severity Level</label>
        <select
          value={data.priority}
          onChange={e => setData({ ...data, priority: e.target.value })}
          className={`w-full bg-slate-50 border rounded-2xl px-4 py-3 font-bold outline-none transition-all text-sm appearance-none
                        ${data.priority === 'critical' ? 'border-red-400 text-red-700 bg-red-50' : 'border-slate-200 text-slate-800'}`}
        >
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
          <option value="critical">Critical Path Impact</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">Resolution Deadline</label>
        <input
          type="date"
          value={data.dueDate}
          onChange={e => setData({ ...data, dueDate: e.target.value })}
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-500 text-sm"
        />
      </div>
    </div>

    <div className="space-y-2">
      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">Technical Description</label>
      <textarea
        value={data.description}
        onChange={e => setData({ ...data, description: e.target.value })}
        className="w-full bg-slate-50 border border-slate-200 rounded-[32px] p-6 font-bold text-slate-800 outline-none focus:border-blue-500 transition-all h-32 resize-none shadow-inner text-sm"
        placeholder="Describe the issue, defect, or safety concern in detail..."
      />
    </div>

    <div className="space-y-4">
      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">Photos & Attachments</label>
      <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
        {(data.images || []).map((img, idx) => (
          <div key={`existing-${idx}`} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 group">
            {img.toLowerCase().includes('.pdf') ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-red-50">
                <FileText size={24} className="text-red-500" />
                <span className="text-[8px] font-black text-red-500 uppercase">PDF</span>
              </div>
            ) : (
              <img src={img} alt="Preview" className="w-full h-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => setData({ ...data, images: data.images.filter((_, i) => i !== idx) })}
              className="absolute top-1 right-1 p-1 bg-white/90 rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-all border border-slate-100"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {(data.newImages || []).map((file, idx) => {
          const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
          return (
            <div key={`new-${idx}`} className="relative aspect-square rounded-2xl overflow-hidden border border-blue-200 bg-blue-50 group">
              {isPdf ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-red-50/50">
                  <FileText size={24} className="text-red-500" />
                  <span className="text-[8px] font-black text-red-500 uppercase">PDF</span>
                </div>
              ) : (
                <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover opacity-60" />
              )}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Clock size={16} className="text-blue-600 animate-pulse" />
              </div>
              <button
                type="button"
                onClick={() => setData({ ...data, newImages: data.newImages.filter((_, i) => i !== idx) })}
                className="absolute top-1 right-1 p-1 bg-white/90 rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}

        <label className="relative aspect-square rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-all flex flex-col items-center justify-center gap-1 group">
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files);
              setData({ ...data, newImages: [...(data.newImages || []), ...files] });
            }}
          />
          <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-blue-100 transition-colors">
            <Plus size={16} className="text-slate-400 group-hover:text-blue-600" />
          </div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Add File</span>
        </label>
      </div>
    </div>

    <button
      onClick={onSubmit}
      disabled={isSubmitting}
      className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition shadow-xl shadow-red-200 flex items-center justify-center gap-3 disabled:opacity-50"
    >
      {isSubmitting ? <Loader size={20} className="animate-spin" /> : <Save size={20} />}
      {submitLabel}
    </button>
  </div>
  );
};

const Issues = () => {
  const [issues, setIssues] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [formData, setFormData] = useState({
    title: '', projectId: '', priority: 'medium', status: 'open', assignedTo: '', dueDate: '', description: '', category: 'general',
    images: [], newImages: []
  });
  const [viewMode, setViewMode] = useState('board'); // 'board' or 'list'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectMembers, setProjectMembers] = useState([]);
  const [selectedRole, setSelectedRole] = useState('all');
  const [showErrors, setShowErrors] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (formData.projectId) {
      api.get(`/projects/${formData.projectId}/members`)
        .then(res => setProjectMembers(res.data || []))
        .catch(console.error);
    } else {
      setProjectMembers([]);
    }
  }, [formData.projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [issueRes, projRes, userRes] = await Promise.all([
        api.get('/issues'),
        api.get('/projects'),
        api.get('/auth/users?role=COMPANY_OWNER&role=PM&role=FOREMAN&role=WORKER&role=SUBCONTRACTOR')
      ]);
      setIssues(issueRes.data);
      setProjects(projRes.data);
      setUsers(userRes.data);
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;
    const issueId = active.id;
    const newStatus = over.id;
    const issue = issues.find(i => i._id === issueId);
    if (!issue || issue.status === newStatus || !['open', 'in_progress', 'fixed'].includes(newStatus)) return;

    setIssues(prev => prev.map(i => i._id === issueId ? { ...i, status: newStatus } : i));
    try {
      await api.patch(`/issues/${issueId}`, { status: newStatus });
    } catch (error) {
      fetchData();
    }
  };

  const handleSaveReport = async () => {
    if (!formData.title || !formData.projectId || !formData.assignedTo) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    try {
      setIsSubmitting(true);
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'newImages') {
          formData.newImages.forEach(file => data.append('images', file));
        } else if (key !== 'images') {
          data.append(key, formData[key]);
        }
      });

      await api.post('/issues', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchData();
      setIsReportOpen(false);
    } catch (error) {
      console.error('Error reporting issue:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!formData.title || !formData.projectId || !formData.assignedTo) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    try {
      setIsSubmitting(true);
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'newImages') {
          formData.newImages.forEach(file => data.append('images', file));
        } else if (key === 'images') {
          data.append('images', JSON.stringify(formData.images));
        } else {
          data.append(key, formData[key]);
        }
      });

      await api.patch(`/issues/${selectedIssue._id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchData();
      setIsEditOpen(false);
    } catch (error) {
      console.error('Error updating issue:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/issues/${selectedIssue._id}`);
      fetchData();
      setIsDeleteOpen(false);
    } catch (error) {
      console.error('Error deleting issue:', error);
    }
  };

  const statusConfig = {
    'open': { label: 'Active Snags', dot: 'bg-red-500 shadow-red-200' },
    'in_progress': { label: 'In Correction', dot: 'bg-orange-500 shadow-orange-200' },
    'fixed': { label: 'Verified Fixed', dot: 'bg-emerald-500 shadow-emerald-200' }
  };

  const updateStatus = async (issueId, newStatus) => {
    try {
      setIssues(prev => prev.map(i => i._id === issueId ? { ...i, status: newStatus } : i));
      await api.patch(`/issues/${issueId}`, { status: newStatus });
    } catch (error) {
      console.error('Error updating status:', error);
      fetchData();
    }
  };

  const filteredIssues = issues.filter(issue => {
    const matchesSearch = issue.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.projectId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.assignedTo?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || issue.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in h-[calc(100vh-90px)] flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 shrink-0">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Site Issues & Snags</h1>
          <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-widest flex items-center gap-2">
            <AlertCircle size={14} className="text-red-600" />
            Defect management and safety oversight
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative group w-full md:w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search snags, sites..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[12px] font-bold uppercase outline-none focus:ring-4 focus:ring-red-500/5 focus:border-red-500/30 transition-all shadow-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[12px] font-black uppercase outline-none focus:ring-4 focus:ring-red-500/5 transition-all shadow-sm cursor-pointer appearance-none min-w-[150px]"
          >
            <option value="all">All Status</option>
            <option value="open">Active</option>
            <option value="in_progress">In Correction</option>
            <option value="fixed">Fixed</option>
          </select>
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
              <button
                onClick={() => setViewMode('board')}
                className={`p-2 rounded-xl transition-all ${viewMode === 'board' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
                title="Board View"
              >
                <LayoutGrid size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
                title="List View"
              >
                <List size={20} />
              </button>
            </div>
            <button
              onClick={() => { setFormData({ title: '', projectId: '', priority: 'medium', status: 'open', assignedTo: '', dueDate: '', description: '', category: 'general', images: [], newImages: [] }); setIsReportOpen(true); }}
              className="bg-red-600 text-white px-8 py-3 rounded-2xl flex items-center gap-2 hover:bg-red-700 transition shadow-xl shadow-red-200 font-black text-sm uppercase tracking-tight"
            >
              <Plus size={18} /> Log Critical Snag
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        {viewMode === 'board' ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="flex gap-8 h-full overflow-x-auto pb-4 custom-scrollbar scroll-smooth">
              {Object.entries(statusConfig).map(([status, config]) => (
                <DroppableColumn
                  key={status}
                  status={status}
                  statusLabel={config.label}
                  dotClass={config.dot}
                  issues={filteredIssues}
                  onIssueClick={(i) => { setSelectedIssue(i); setIsViewOpen(true); }}
                />
              ))}
            </div>
          </DndContext>
        ) : (
          <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col h-full">
            <div className="overflow-x-auto h-full custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b border-slate-100">
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Issue Description</th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Project Site</th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Priority</th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Personnel</th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Deadline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredIssues.map(issue => (
                    <tr key={issue._id} className="group hover:bg-slate-50/80 transition-all active:bg-slate-100 cursor-pointer" onClick={() => { setSelectedIssue(issue); setIsViewOpen(true); }}>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm overflow-hidden border border-slate-200 bg-slate-50
                            ${issue.priority === 'critical' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                            {issue.images && issue.images.length > 0 ? (
                              issue.images[0].toLowerCase().includes('.pdf') ? (
                                <FileText size={18} className="text-red-500" />
                              ) : (
                                <img src={issue.images[0]} alt="Issue" className="w-full h-full object-cover" />
                              )
                            ) : (
                              <AlertTriangle size={18} />
                            )}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-sm uppercase leading-tight tracking-tight">{issue.title}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 line-clamp-1">{issue.category || 'General Issue'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="text-[11px] font-black text-slate-700 uppercase bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100 shadow-xs">
                          {issue.projectId?.name || '---'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm
                          ${issue.priority === 'critical' ? 'bg-red-600 text-white border-red-500' :
                            issue.priority === 'high' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                            'bg-blue-50 text-blue-600 border-blue-100'}`}>
                          {issue.priority}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 border-2 border-white shadow-sm">
                            {issue.assignedTo ? issue.assignedTo.fullName.charAt(0) : '?'}
                          </div>
                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-tighter">
                            {issue.assignedTo?.fullName || 'Unassigned'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={issue.status}
                          onChange={(e) => updateStatus(issue._id, e.target.value)}
                          className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border shadow-sm outline-none cursor-pointer transition-all
                            ${issue.status === 'open' ? 'bg-red-50 text-red-600 border-red-200 focus:ring-4 focus:ring-red-100' :
                              issue.status === 'in_progress' ? 'bg-orange-50 text-orange-600 border-orange-200 focus:ring-4 focus:ring-orange-100' :
                              'bg-emerald-50 text-emerald-600 border-emerald-200 focus:ring-4 focus:ring-emerald-100'}`}
                        >
                          <option value="open">Active</option>
                          <option value="in_progress">In Correction</option>
                          <option value="fixed">Fixed</option>
                        </select>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className={`flex items-center justify-end gap-2 text-[11px] font-black uppercase tracking-tighter
                          ${issue.dueDate && new Date(issue.dueDate) < new Date() ? 'text-red-500' : 'text-slate-500'}`}>
                          <Clock size={12} />
                          {issue.dueDate ? new Date(issue.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredIssues.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-300 gap-3">
                          <CheckCircle size={48} className="opacity-20" />
                          <p className="text-xs font-black uppercase tracking-[0.2em] opacity-40">
                            {searchTerm ? `No results found for "${searchTerm}"` : "Zero active snags recorded"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} title="Report Site Defect">
          <IssueForm
            data={formData}
            setData={setFormData}
            onSubmit={handleSaveReport}
            submitLabel={isSubmitting ? 'Submitting...' : 'Commit to Log'}
            projects={projects}
            users={users}
            projectMembers={projectMembers}
            currentUser={user}
            isSubmitting={isSubmitting}
            selectedRole={selectedRole}
            setSelectedRole={setSelectedRole}
            showErrors={showErrors}
            setShowErrors={setShowErrors}
          />
      </Modal>

      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Modify Snag Parameters">
        <IssueForm 
          data={formData} 
          setData={setFormData} 
          onSubmit={handleSaveEdit} 
          submitLabel="Secure Updates" 
          projects={projects} 
          users={users} 
          projectMembers={projectMembers}
          currentUser={user}
          isSubmitting={isSubmitting}
          selectedRole={selectedRole}
          setSelectedRole={setSelectedRole}
          showErrors={showErrors}
          setShowErrors={setShowErrors}
        />
      </Modal>

      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Incident Snapshot">
        {selectedIssue && (
          <div className="space-y-8">
            <div className={`p-6 rounded-[32px] border shadow-inner flex justify-between items-start
                            ${selectedIssue.priority === 'critical' ? 'bg-red-50 border-red-100 shadow-red-50' : 'bg-slate-50 border-slate-100 shadow-slate-50'}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm
                                        ${selectedIssue.priority === 'critical' ? 'bg-red-600 text-white border-red-500' : 'bg-blue-600 text-white border-blue-500'}`}>
                    {selectedIssue.priority} Gravity
                  </span>
                  <span className="px-3 py-1 bg-white rounded-full text-[9px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 shadow-sm">
                    ID: {selectedIssue._id.slice(-6).toUpperCase()}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight uppercase">{selectedIssue.title}</h3>
                <div className="flex items-center gap-2 text-slate-400 mt-2">
                  <MapPin size={14} />
                  <span className="text-sm font-bold">{selectedIssue.projectId?.name || 'Unassigned Site'}</span>
                </div>
              </div>
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg transform rotate-3
                                ${selectedIssue.priority === 'critical' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
                <AlertTriangle size={28} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="p-4 bg-white border-2 border-slate-50 rounded-3xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <Users size={12} className="text-blue-500" /> Responsibility
                </p>
                <p className="text-sm font-black text-slate-900">{selectedIssue.assignedTo?.fullName || 'Crew Alert Issued'}</p>
              </div>
              <div className="p-4 bg-white border-2 border-slate-50 rounded-3xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <Clock size={12} className="text-orange-500" /> Deadline
                </p>
                <p className="text-sm font-black text-slate-900">
                  {selectedIssue.dueDate ? new Date(selectedIssue.dueDate).toLocaleDateString() : 'ASAP LOGGED'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 flex items-center gap-2">
                <Info size={12} /> Technical Context
              </p>
              <div className="bg-slate-50/50 border-2 border-slate-100 rounded-[32px] p-6 shadow-inner italic font-bold text-slate-700 leading-relaxed text-sm">
                "{selectedIssue.description || "No specific technical instructions or site photos attached to this incident report."}"
              </div>
            </div>

            {selectedIssue.images && selectedIssue.images.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 flex items-center gap-2">
                  <ImageIcon size={12} /> Photos & Attachments
                </p>
                <div className="grid grid-cols-4 gap-4 px-2">
                  {selectedIssue.images.map((img, idx) => (
                    <div 
                      key={idx} 
                      className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 cursor-pointer group"
                      onClick={() => window.open(img, '_blank')}
                    >
                      {img.toLowerCase().includes('.pdf') ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-red-50 hover:bg-red-100 transition-colors">
                          <FileText size={24} className="text-red-500" />
                          <span className="text-[8px] font-black text-red-500 uppercase">PDF</span>
                        </div>
                      ) : (
                        <img src={img} alt="Attachment" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 mt-4 border-t border-slate-100">
              <button onClick={() => setIsViewOpen(false)} className="w-full sm:w-auto px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">
                Return to Boards
              </button>
              <div className="flex gap-3 w-full sm:w-auto">
                <button onClick={() => { 
                  setIsEditOpen(true); 
                  setIsViewOpen(false); 
                  setFormData({ 
                    title: selectedIssue.title || '',
                    description: selectedIssue.description || '',
                    projectId: selectedIssue.projectId?._id || selectedIssue.projectId || '',
                    assignedTo: selectedIssue.assignedTo?._id || selectedIssue.assignedTo || '',
                    priority: selectedIssue.priority || 'medium',
                    status: selectedIssue.status || 'open',
                    category: selectedIssue.category || 'general',
                    dueDate: selectedIssue.dueDate ? new Date(selectedIssue.dueDate).toISOString().split('T')[0] : '',
                    images: selectedIssue.images || [],
                    newImages: []
                  }); 
                }}
                  className="flex-1 sm:flex-none px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2">
                  <Edit size={16} /> Re-Evaluate
                </button>
                <button onClick={() => { setIsDeleteOpen(true); setIsViewOpen(false); }}
                  className="flex-1 sm:flex-none px-6 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg flex items-center justify-center gap-2">
                  <Trash size={16} /> Archive
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Permanently Archive Snag">
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6 border border-red-100 animate-pulse">
            <ShieldAlert size={40} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight uppercase">Archive Snag Report?</h3>
          <p className="text-slate-500 font-bold mb-8 max-w-xs text-sm">
            This action will remove <span className="text-red-600">"{selectedIssue?.title}"</span> from the active remediation board. Historical records will be archived.
          </p>
          <div className="flex gap-4 w-full">
            <button onClick={() => setIsDeleteOpen(false)} className="flex-1 px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition font-black text-xs uppercase tracking-widest">Negate</button>
            <button onClick={confirmDelete} className="flex-1 px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl transition font-black text-xs uppercase tracking-widest shadow-xl shadow-red-200">Confirm Archive</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Issues;
