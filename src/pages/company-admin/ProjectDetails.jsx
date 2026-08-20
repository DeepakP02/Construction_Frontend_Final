import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Deficiencies.css';
import {
    ArrowLeft, Plus, Briefcase, MapPin, Calendar, HardHat,
    DollarSign, Edit, Trash2, Clock, CheckCircle2, AlertCircle,
    Loader, ChevronRight, LayoutGrid, List, Search, Filter, AlertTriangle, Users, FileText, TrendingUp, ChevronDown, MessageSquare, ShoppingCart,
    CheckCircle, Flag, UserCheck, User, ClipboardList, Image as ImageIcon, X, Phone, Mail, Eye, Check
} from 'lucide-react';
import api from '../../utils/api';

import DeficiencyModal from '../../components/deficiencies/DeficiencyModal';
import Modal from '../../components/Modal';

const canSeeBudget = (role) =>
    ['COMPANY_OWNER', 'OWNER', 'PM', 'SUPER_ADMIN'].includes(role);

const statusConfig = {
    planning: { label: 'Planning', cls: 'bg-orange-50 text-orange-700 border-orange-100', dot: 'bg-orange-400' },
    active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-400' },
    'on-hold': { label: 'On Hold', cls: 'bg-yellow-50 text-yellow-700 border-yellow-100', dot: 'bg-yellow-400' },
    completed: { label: 'Completed', cls: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
};

const StatusBadge = ({ status }) => {
    const cfg = statusConfig[status] || statusConfig.planning;
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${cfg.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
};

const FinancialCard = ({ label, value, icon: Icon, color, subtext }) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        orange: 'bg-orange-50 text-orange-600 border-orange-100',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        red: 'bg-red-50 text-red-700 border-red-100',
    };
    return (
        <div className="bg-white p-3.5 md:p-4 rounded-xl md:rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-3.5">
            <div className={`p-2 rounded-lg md:rounded-xl border transition-transform duration-300 ${colors[color] || colors.blue}`}>
                <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[9px] md:text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1">{label}</p>
                <div className="flex items-baseline gap-1.5 min-w-0">
                    <p className="text-[17px] md:text-xl font-black text-slate-900 tracking-tight truncate leading-none">{value}</p>
                </div>
                {subtext && <p className="text-[9px] font-bold text-slate-400 mt-0.5 truncate uppercase tracking-tighter leading-none">{subtext}</p>}
            </div>
        </div>
    );
};

const ProjectDetails = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // Redirect field roles away from Project Details overview
    useEffect(() => {
        if (user && ['FOREMAN', 'WORKER', 'SUBCONTRACTOR'].includes(user.role)) {
            navigate('/company-admin/projects');
        }
    }, [user, navigate]);

    const [project, setProject] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAssigningPM, setIsAssigningPM] = useState(false);
    const [isAssigningForeman, setIsAssigningForeman] = useState(null); // jobID
    const [isAssigningWorkers, setIsAssigningWorkers] = useState(null); // jobID
    const [view, setView] = useState('grid');
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [deletingId, setDeletingId] = useState(null);
    const [equipment, setEquipment] = useState([]);
    const [returningEquipId, setReturningEquipId] = useState(null);
    const [isPostingUpdate, setIsPostingUpdate] = useState(false);
    const [newUpdate, setNewUpdate] = useState({ title: '', description: '', date: new Date().toISOString().split('T')[0], isVisibleToClient: true, images: [] });
    const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedJobForDetails, setSelectedJobForDetails] = useState(null);
    const [jobToDelete, setJobToDelete] = useState(null);
    
    // Equipment Assignment states
    const [isAssigningEquipment, setIsAssigningEquipment] = useState(null); // jobID
    const [selectedEquipmentIds, setSelectedEquipmentIds] = useState([]);
    const [isAssigningEquipLoading, setIsAssigningEquipLoading] = useState(false);
    const [equipSearch, setEquipSearch] = useState('');
    const [workerSearch, setWorkerSearch] = useState('');
    const [isAssigningLead, setIsAssigningLead] = useState(null); // jobID
    const [leadSearch, setLeadSearch] = useState('');



    const [activeTab, setActiveTab] = useState('overview');
    const [financials, setFinancials] = useState(null);
    const [projectPOs, setProjectPOs] = useState([]);
    const [updates, setUpdates] = useState([]);
    const [poLoading, setPoLoading] = useState(false);
    const [projectTasks, setProjectTasks] = useState([]);
    const [tasksLoading, setTasksLoading] = useState(false);
    const [taskSearch, setTaskSearch] = useState('');
    const [expandedTasks, setExpandedTasks] = useState(new Set());

    // Deficiencies states
    const [projectDeficiencies, setProjectDeficiencies] = useState([]);
    const [deficienciesLoading, setDeficienciesLoading] = useState(false);
    const [isDeficiencyModalOpen, setIsDeficiencyModalOpen] = useState(false);
    const [selectedDeficiency, setSelectedDeficiency] = useState(null);
    const [deficiencyModalMode, setDeficiencyModalMode] = useState('add');
    const [isSubmittingDeficiency, setIsSubmittingDeficiency] = useState(false);
    const [deficiencySearch, setDeficiencySearch] = useState('');
    const [deficiencyFilterStatus, setDeficiencyFilterStatus] = useState('all');
    const [deficiencyToDelete, setDeficiencyToDelete] = useState(null);
    const [projectMembers, setProjectMembers] = useState([]);
    
    // Selection states
    const [activeDropdown, setActiveDropdown] = useState(null); // 'pm' or 'phase'
    
    // Global click handler to close dropdowns
    useEffect(() => {
        const handleClick = () => setActiveDropdown(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    // Contacts states
    const [isAddingContact, setIsAddingContact] = useState(false);
    const [editingContactIndex, setEditingContactIndex] = useState(null);
    const [newContact, setNewContact] = useState({ name: '', email: '', phone: '', role: '' });
    const [contactToDelete, setContactToDelete] = useState(null);
    const [isSubmittingContact, setIsSubmittingContact] = useState(false);

    // Store Doc states
    const [projectDocuments, setProjectDocuments] = useState([]);
    const [docsLoading, setDocsLoading] = useState(false);
    const [isAddingDoc, setIsAddingDoc] = useState(false);
    const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);
    const [newDoc, setNewDoc] = useState({ title: '', description: '', category: '', uploadDate: new Date().toISOString().split('T')[0], file: null });
    const [docSearch, setDocSearch] = useState('');
    const [docFilterCategory, setDocFilterCategory] = useState('all');
    const [docFilterDate, setDocFilterDate] = useState('');
    const [showUploadSuccess, setShowUploadSuccess] = useState(false);
    const [docToDelete, setDocToDelete] = useState(null);
    const [showSizeError, setShowSizeError] = useState(false);
    const [showUpdateSuccess, setShowUpdateSuccess] = useState(false);
    const [projectNotes, setProjectNotes] = useState([]);
    const [newProjectNote, setNewProjectNote] = useState('');
    const [notesLoading, setNotesLoading] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState(null);
    const [isSubmittingNote, setIsSubmittingNote] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState(null);

    const showBudget = canSeeBudget(user?.role);

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchAll = async () => {
        try {
            setLoading(true);
            // 1. Fetch High Priority Project data first
            const projRes = await api.get(`/projects/${projectId}`);
            setProject(projRes.data);
            setLoading(false); // Reveal page structure immediately

            // 2. Fetch critical sub-data non-blocking (sequentially but setting state immediately)
            api.get(`/jobs?projectId=${projectId}`).then(res => setJobs(res.data || [])).catch(console.error);
            api.get(`/projects/${projectId}/financial-summary`).then(res => setFinancials(res.data)).catch(console.error);
            api.get(`/projects/${projectId}/client-updates`).then(res => setUpdates(res.data || [])).catch(console.error);
            api.get(`/purchase-orders?projectId=${projectId}`).then(res => setProjectPOs(res.data || [])).catch(console.error);
            api.get(`/projects/${projectId}/members`).then(res => setProjectMembers(res.data || [])).catch(console.error);
            api.get('/equipment').then(res => setEquipment(res.data || [])).catch(console.error);
            
            // Note: Users will be fetched on demand when specific actions are taken
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    // Helper for lazy loading users/personnel
    const ensureUsersLoaded = async () => {
        if (users.length > 0) return;
        try {
            const res = await api.get('/auth/users?role=COMPANY_OWNER&role=PM&role=FOREMAN&role=WORKER&role=SUBCONTRACTOR');
            setUsers(res.data || []);
        } catch (err) {
            console.error('Failed to load users:', err);
        }
    };

    // Helper for lazy loading equipment
    const ensureEquipmentLoaded = async () => {
        if (equipment.length > 0) return;
        try {
            const res = await api.get('/equipment');
            setEquipment(res.data || []);
        } catch (err) {
            console.error('Failed to load equipment:', err);
        }
    };

    const fetchDocuments = async () => {
        try {
            setDocsLoading(true);
            const res = await api.get(`/project-documents/${projectId}`);
            setProjectDocuments(res.data || []);
        } catch (err) {
            console.error('Failed to fetch documents:', err);
        } finally {
            setDocsLoading(false);
        }
    };

    useEffect(() => { 
        if (user && projectId) fetchAll(); 
    }, [projectId, user?._id]);

    const handleAssignPM = async (pmId) => {
        try {
            const currentPmIds = project.pmIds ? project.pmIds.map(p => typeof p === 'object' ? p._id : p) : [];
            let newPmIds;
            if (currentPmIds.includes(pmId)) {
                newPmIds = currentPmIds.filter(id => id !== pmId);
            } else {
                newPmIds = [...currentPmIds, pmId];
            }
            
            const res = await api.patch(`/projects/${projectId}`, { pmIds: newPmIds });
            setProject(res.data);
            // Don't close dropdown yet to allow selecting multiple
        } catch (err) {
            console.error(err);
        }
    };

    const handleAssignForeman = async (jobId, foremanId) => {
        try {
            await api.post(`/jobs/${jobId}/assign-foreman`, { foremanId });
            setJobs(prev => prev.map(j => j._id === jobId ? { ...j, foremanId } : j));
            setIsAssigningForeman(null);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAssignEquipment = async () => {
        if (!isAssigningEquipment || selectedEquipmentIds.length === 0) return;
        try {
            setIsAssigningEquipLoading(true);
            await Promise.all(selectedEquipmentIds.map(id => api.post(`/equipment/${id}/assign`, { jobId: isAssigningEquipment })));
            
            // Re-fetch equipment to update UI
            const equipRes = await api.get('/equipment');
            setEquipment(equipRes.data);
            
            setIsAssigningEquipment(null);
            setSelectedEquipmentIds([]);
            setEquipSearch('');
        } catch (err) {
            console.error(err);
            alert('Failed to assign equipment');
        } finally {
            setIsAssigningEquipLoading(false);
        }
    };


    const handleAssignWorkers = async (jobId, workerIds) => {
        try {
            await api.post(`/jobs/${jobId}/assign-workers`, { assignedWorkers: workerIds });
            setJobs(prev => prev.map(j => j._id === jobId ? { ...j, assignedWorkers: workerIds } : j));
        } catch (err) {
            console.error(err);
        }
    };

    // ── Delete Job ─────────────────────────────────────────────────────────────
    const handleDeleteJob = (job) => {
        const jobEquipment = equipment.filter(e => e.assignedJob?._id === job._id || e.assignedJob === job._id);
        if (jobEquipment.length > 0) {
            alert(`Cannot delete job. There are ${jobEquipment.length} items of equipment still assigned to it. Please return all equipment first.`);
            return;
        }
        setJobToDelete(job);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteJob = async () => {
        if (!jobToDelete) return;
        try {
            setDeletingId(jobToDelete._id);
            await api.delete(`/jobs/${jobToDelete._id}`);
            setJobs(prev => prev.filter(j => j._id !== jobToDelete._id));
            setIsDeleteModalOpen(false);
            setJobToDelete(null);
        } catch (err) {
            console.error(err);
            alert('Failed to delete job');
        } finally {
            setDeletingId(null);
        }
    };

    // ── Deficiency Handlers ──────────────────────────────────────────────────
    const fetchDeficiencies = async () => {
        try {
            setDeficienciesLoading(true);
            const r = await api.get(`/issues?projectId=${projectId}`);
            setProjectDeficiencies(Array.isArray(r.data) ? r.data : []);
        } catch (e) {
            console.error('Error fetching deficiency data:', e);
        } finally {
            setDeficienciesLoading(false);
        }
    };

    const handleSaveDeficiency = async (formData) => {
        try {
            setIsSubmittingDeficiency(true);
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
            data.append('projectId', projectId);
            
            // Auto-assign to first job if no job is set (DeficiencyModal doesn't have job selector currently)
            if (jobs.length > 0) {
                data.append('jobId', jobs[0]._id);
            }

            if (selectedDeficiency) {
                await api.patch(`/issues/${selectedDeficiency._id}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await api.post('/issues', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            await fetchDeficiencies();
            setIsDeficiencyModalOpen(false);
            setSelectedDeficiency(null);
        } catch (err) {
            console.error('Error saving deficiency:', err);
            alert('Failed to save deficiency.');
        } finally {
            setIsSubmittingDeficiency(false);
        }
    };

    const handleDeleteDeficiency = (id) => {
        setDeficiencyToDelete(id);
    };

    const confirmDeleteDeficiency = async () => {
        if (!deficiencyToDelete) return;
        try {
            await api.delete(`/issues/${deficiencyToDelete}`);
            setProjectDeficiencies(prev => prev.filter(d => d._id !== deficiencyToDelete));
            setDeficiencyToDelete(null);
        } catch (err) {
            console.error('Error deleting issue:', err);
            alert('Failed to delete issue');
        }
    };

    const handleStatusUpdateDeficiency = async (id, status) => {
        try {
            await api.patch(`/issues/${id}`, { status });
            setProjectDeficiencies(prev => prev.map(d => d._id === id ? { ...d, status } : d));
        } catch (err) {
            console.error('Error updating status:', err);
        }
    };

    const handleReturnEquipment = async (equipId) => {
        try {
            setReturningEquipId(equipId);
            await api.post(`/equipment/${equipId}/return`);
            setEquipment(prev => prev.map(e => e._id === equipId ? { ...e, assignedJob: null } : e));
        } catch (err) {
            console.error(err);
        } finally {
            setReturningEquipId(null);
        }
    };

    const handleUpdateJobStatus = async (jobId, newStatus) => {
        try {
            await api.patch(`/jobs/${jobId}`, { status: newStatus });
            setJobs(prev => prev.map(j => j._id === jobId ? { ...j, status: newStatus } : j));
        } catch (err) {
            console.error(err);
        }
    };

    const handleProjectProgressUpdate = async (newProgress) => {
        try {
            const res = await api.patch(`/projects/${projectId}`, { progress: newProgress });
            setProject(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdatePhase = async (newPhase) => {
        try {
            const res = await api.patch(`/projects/${projectId}`, { currentPhase: newPhase });
            setProject(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handlePostUpdate = async (e) => {
        e.preventDefault();
        try {
            setIsSubmittingUpdate(true);
            const formData = new FormData();
            formData.append('title', newUpdate.title);
            formData.append('description', newUpdate.description);
            formData.append('date', newUpdate.date);
            formData.append('isVisibleToClient', newUpdate.isVisibleToClient);

            newUpdate.images.forEach(img => {
                formData.append('images', img);
            });

            await api.post(`/projects/${projectId}/client-updates`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setIsPostingUpdate(false);
            setNewUpdate({ title: '', description: '', date: new Date().toISOString().split('T')[0], isVisibleToClient: true, images: [] });
            setShowUpdateSuccess(true);

            // Refresh updates
            const uRes = await api.get(`/projects/${projectId}/client-updates`);
            setUpdates(uRes.data);
        } catch (err) {
            console.error(err);
            alert('Failed to post update');
        } finally {
            setIsSubmittingUpdate(false);
        }
    };

    const handleSaveContact = async (e) => {
        e.preventDefault();
        try {
            setIsSubmittingContact(true);
            let updatedContacts;
            if (editingContactIndex !== null) {
                updatedContacts = project.contacts.map((c, idx) => idx === editingContactIndex ? newContact : c);
            } else {
                updatedContacts = [...(project?.contacts || []), newContact];
            }
            const res = await api.patch(`/projects/${projectId}`, { contacts: updatedContacts });
            setProject(res.data);
            setIsAddingContact(false);
            setEditingContactIndex(null);
            setNewContact({ name: '', email: '', phone: '', role: '' });
        } catch (err) {
            console.error(err);
            alert('Failed to save contact');
        } finally {
            setIsSubmittingContact(false);
        }
    };

    const handleDeleteContact = (indexToRemove) => {
        setContactToDelete(indexToRemove);
    };

    const confirmDeleteContact = async () => {
        if (contactToDelete === null) return;
        try {
            setIsSubmittingContact(true);
            const updatedContacts = project.contacts.filter((_, idx) => idx !== contactToDelete);
            const res = await api.patch(`/projects/${projectId}`, { contacts: updatedContacts });
            setProject(res.data);
            setContactToDelete(null);
        } catch (err) {
            console.error(err);
            alert('Failed to remove contact');
        } finally {
            setIsSubmittingContact(false);
        }
    };

    const handleUploadDocument = async (e) => {
        e.preventDefault();
        if (!newDoc.file) return alert('Please select a file');
        try {
            setIsSubmittingDoc(true);
            const formData = new FormData();
            formData.append('projectId', projectId);
            formData.append('title', newDoc.title);
            formData.append('description', newDoc.description);
            formData.append('category', newDoc.category);
            formData.append('uploadDate', newDoc.uploadDate);
            formData.append('file', newDoc.file);

            await api.post('/project-documents', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setIsAddingDoc(false);
            setNewDoc({ title: '', description: '', category: '', uploadDate: new Date().toISOString().split('T')[0], file: null });
            fetchDocuments();
            setShowUploadSuccess(true);
        } catch (err) {
            console.error(err);
            alert('Failed to upload document');
        } finally {
            setIsSubmittingDoc(false);
        }
    };

    const handleDeleteDocument = async (docId) => {
        setDocToDelete(docId);
    };

    const confirmDeleteDocument = async () => {
        if (!docToDelete) return;
        try {
            await api.delete(`/project-documents/${docToDelete}`);
            setProjectDocuments(prev => prev.filter(d => d._id !== docToDelete));
            setDocToDelete(null);
        } catch (err) {
            console.error(err);
            alert('Failed to delete document');
        }
    };

    const fetchProjectNotes = async () => {
        try {
            setNotesLoading(true);
            const res = await api.get(`/projects/${projectId}/notes`);
            setProjectNotes(res.data || []);
        } catch (err) {
            console.error('Failed to fetch project notes:', err);
        } finally {
            setNotesLoading(false);
        }
    };

    const handleStartEditNote = (note) => {
        setEditingNoteId(note._id);
        setNewProjectNote(note.content);
    };

    const handleAddProjectNote = async (e) => {
        e.preventDefault();
        if (!newProjectNote.trim()) return;
        try {
            setIsSubmittingNote(true);
            if (editingNoteId) {
                const res = await api.patch(`/projects/${projectId}/notes/${editingNoteId}`, { content: newProjectNote });
                setProjectNotes(prev => prev.map(n => n._id === editingNoteId ? res.data : n));
                setEditingNoteId(null);
            } else {
                const res = await api.post(`/projects/${projectId}/notes`, { content: newProjectNote });
                setProjectNotes(prev => [res.data, ...prev]);
            }
            setNewProjectNote('');
        } catch (err) {
            console.error('Error saving project note:', err);
            alert('Failed to save note');
        } finally {
            setIsSubmittingNote(false);
        }
    };

    const handleDeleteProjectNote = async () => {
        if (!noteToDelete) return;
        try {
            setIsSubmittingNote(true);
            await api.delete(`/projects/${projectId}/notes/${noteToDelete}`);
            setProjectNotes(prev => prev.filter(n => n._id !== noteToDelete));
            setNoteToDelete(null);
        } catch (err) {
            console.error('Error deleting project note:', err);
            alert('Failed to delete note');
        } finally {
            setIsSubmittingNote(false);
        }
    };

    // ── Filter ─────────────────────────────────────────────────────────────────
    const filteredJobs = jobs.filter(j => {
        // Role-based visibility check
        const isForemanOrSub = ['FOREMAN', 'SUBCONTRACTOR'].includes(user?.role);
        const isWorker = user?.role === 'WORKER';

        const isAssignedAsForeman = isForemanOrSub &&
            (typeof j.foremanId === 'object' ? j.foremanId?._id === user?._id : j.foremanId === user?._id);

        const isAssignedAsWorker = isWorker &&
            j.assignedWorkers?.some(w => (typeof w === 'object' ? w._id === user?._id : w === user?._id));

        const hasAccess = ['COMPANY_OWNER', 'SUPER_ADMIN', 'PM', 'ENGINEER'].includes(user?.role) ||
            isAssignedAsForeman || isAssignedAsWorker;

        if (!hasAccess) return false;

        const matchSearch = j.name.toLowerCase().includes(search.toLowerCase()) ||
            (j.location || '').toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'all' || j.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const jobStats = {
        total: filteredJobs.length,
        active: filteredJobs.filter(j => j.status === 'active').length,
        completed: filteredJobs.filter(j => j.status === 'completed').length,
        planning: filteredJobs.filter(j => j.status === 'planning').length,
    };

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

    if (loading) {
        return (
            <div className="flex items-center justify-center py-40">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin" />
                    <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Loading Project...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">

            {/* ── Breadcrumb + Back ── */}
            <div className="flex items-center gap-3 text-sm font-bold text-slate-400">
                <button onClick={() => navigate('/company-admin/projects')}
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all">
                    <ArrowLeft size={18} />
                </button>
                <span className="hover:text-blue-600 cursor-pointer" onClick={() => navigate('/company-admin/projects')}>
                    Projects
                </span>
                <ChevronRight size={14} />
                <span className="text-slate-800 font-black">{project?.name || 'Project'}</span>
            </div>

            {/* ── Project Hero Card ── */}
            <div className="rounded-[40px] relative">
                {/* Background image & blobs (constrained by overflow-hidden) */}
                <div className="absolute inset-0 rounded-[40px] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900">
                    {project?.image && (
                        <div className="absolute inset-0">
                            <img src={project.image} alt="" className="w-full h-full object-cover opacity-20" />
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-blue-900/90" />
                        </div>
                    )}
                    <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-blue-600/20 blur-3xl" />
                    <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-blue-400/10 blur-2xl" />
                </div>

                <div className="relative z-10 p-10">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="flex items-start gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-900/50 shrink-0">
                                <Briefcase size={28} className="text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <StatusBadge status={project?.status} />
                                </div>
                                <h1 className="text-3xl font-black text-white tracking-tight">{project?.name}</h1>
                                {project?.location && (
                                    <div className="flex items-center gap-2 mt-2 text-slate-400">
                                        <MapPin size={14} className="text-blue-400" />
                                        <span className="text-sm font-bold">{getLocationStr(project.location)}</span>
                                    </div>
                                )}
                                <div className="mt-6 flex flex-wrap gap-3">
                                    {/* PM Assignment section */}
                                    <div className="flex items-center gap-2.5 bg-white/10 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-xl group/meta">
                                        <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/20">
                                            <Users size={14} className="text-blue-400" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] leading-none mb-1">Project Manager</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-bold text-white leading-none">
                                                    {project?.pmIds && project?.pmIds.length > 0 
                                                        ? project.pmIds.map(p => p.fullName || users.find(u => u._id === (p?._id || p))?.fullName).join(', ')
                                                        : (project?.pmId?.fullName || users.find(u => u._id === (project?.pmId?._id || project?.pmId))?.fullName || 'Unassigned')}
                                                </span>
                                                {user?.role === 'COMPANY_OWNER' && (
                                                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                                                        <button 
                                                            onClick={async () => {
                                                                await ensureUsersLoaded();
                                                                setActiveDropdown(activeDropdown === 'pm' ? null : 'pm');
                                                            }}
                                                            className="text-[9px] font-black text-blue-400 uppercase tracking-widest cursor-pointer hover:text-blue-300 transition-colors flex items-center gap-1"
                                                        >
                                                            EDIT <ChevronDown size={10} className={`transition-transform duration-200 ${activeDropdown === 'pm' ? 'rotate-180' : ''}`} />
                                                        </button>

                                                        {activeDropdown === 'pm' && (
                                                            <div className="absolute top-full left-0 mt-2 w-48 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                                                                <div className="px-3 py-2 border-b border-white/5 bg-white/5">
                                                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Select Manager</p>
                                                                </div>
                                                                {users.filter(u => u.role === 'PM').map(u => (
                                                                    <button
                                                                        key={u._id}
                                                                        onClick={() => handleAssignPM(u._id)}
                                                                        className={`w-full text-left px-3 py-2.5 text-[11px] font-bold transition-all hover:bg-blue-600 text-white flex items-center justify-between group
                                                                            ${(project?.pmId?._id || project?.pmId) === u._id ? 'bg-blue-600/20' : ''}`}
                                                                    >
                                                                        {u.fullName}
                                                                        {(project?.pmIds?.some(p => (p?._id || p) === u._id) || (project?.pmId?._id || project?.pmId) === u._id) && <CheckCircle size={10} className="text-blue-400" />}
                                                                    </button>
                                                                ))}
                                                                {users.filter(u => u.role === 'PM').length === 0 && (
                                                                    <p className="px-3 py-4 text-center text-[10px] text-slate-500 font-bold italic">No PMs available</p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Project Phase section */}
                                    <div className="flex items-center gap-2.5 bg-white/10 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-xl group/meta">
                                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
                                            <TrendingUp size={14} className="text-emerald-400" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] leading-none mb-1">Project Phase</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-bold text-white leading-none">
                                                    {project?.currentPhase || 'Planning'}
                                                </span>
                                                {['COMPANY_OWNER', 'PM'].includes(user?.role) && (
                                                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                                                        <button 
                                                            onClick={() => setActiveDropdown(activeDropdown === 'phase' ? null : 'phase')}
                                                            className="text-[9px] font-black text-blue-400 uppercase tracking-widest cursor-pointer hover:text-blue-300 transition-colors flex items-center gap-1"
                                                        >
                                                            CHANGE <ChevronDown size={10} className={`transition-transform duration-200 ${activeDropdown === 'phase' ? 'rotate-180' : ''}`} />
                                                        </button>

                                                        {activeDropdown === 'phase' && (
                                                            <div className="absolute top-full left-0 mt-2 w-48 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                                                                <div className="px-3 py-2 border-b border-white/5 bg-white/5">
                                                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Select Phase</p>
                                                                </div>
                                                                {['Planning', 'Foundation', 'Structure', 'Plumbing', 'Electrical', 'Finishing', 'Handover'].map(phase => (
                                                                    <button
                                                                        key={phase}
                                                                        onClick={() => handleUpdatePhase(phase)}
                                                                        className={`w-full text-left px-3 py-2.5 text-[11px] font-bold transition-all hover:bg-emerald-600 text-white flex items-center justify-between
                                                                            ${project?.currentPhase === phase ? 'bg-emerald-600/20' : ''}`}
                                                                    >
                                                                        {phase}
                                                                        {project?.currentPhase === phase && <CheckCircle size={10} className="text-emerald-400" />}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 justify-end shrink-0">
                            <button
                                onClick={() => navigate(`${user?.role === 'CLIENT' ? '/client-portal' : '/company-admin'}/drawings?projectId=${projectId}`)}
                                className="shrink-0 bg-white/10 hover:bg-white/20 text-white px-3 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all backdrop-blur-md flex items-center gap-2 border border-white/20">
                                <FileText size={16} className="text-blue-400" />
                                View Drawings
                            </button>

                            {/* Create Job CTA - Hidden for Foreman/Worker/Client */}
                            {['COMPANY_OWNER', 'PM'].includes(user?.role) && (
                                <>
                                    <button
                                        onClick={() => setIsPostingUpdate(true)}
                                        className="shrink-0 bg-white/10 hover:bg-white/20 text-white px-3 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all backdrop-blur-md flex items-center gap-2 border border-white/20"
                                    >
                                        <MessageSquare size={16} className="text-emerald-400" />
                                        Client Update
                                    </button>
                                    <button
                                        onClick={() => navigate(`/company-admin/projects/${projectId}/jobs/new`)}
                                        className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-xl shadow-blue-900/50 flex items-center gap-2 border border-blue-500/50">
                                        <Plus size={16} />
                                        Create
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Tabs Navigation ── */}
            <div className="flex gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-100 overflow-x-auto no-scrollbar">
                {[
                    { id: 'overview', label: 'Overview', icon: LayoutGrid },
                    user?.role !== 'WORKER' && { id: 'pos', label: 'Purchase Orders', icon: ShoppingCart },
                    { id: 'tasks', label: 'Tasks', icon: ClipboardList },
                    { id: 'deficiencies', label: 'Deficiencies', icon: AlertTriangle },
                    { id: 'contacts', label: 'Contacts', icon: Users },
                    { id: 'documents', label: 'Store Doc', icon: FileText },
                    { id: 'notes', label: 'Notes', icon: MessageSquare },
                    { id: 'updates', label: 'Client Updates', icon: MessageSquare },
                ].filter(Boolean).map((tab) => (
                    <button
                        key={tab.id}
                        onClick={async () => {
                            setActiveTab(tab.id);
                            if (tab.id === 'tasks' && projectTasks.length === 0) {
                                setTasksLoading(true);
                                try {
                                    const r = await api.get(`/tasks/project/${projectId}`);
                                    setProjectTasks(r.data || []);
                                } catch (e) { console.error(e); }
                                finally { setTasksLoading(false); }
                            }
                            if (tab.id === 'deficiencies') {
                                fetchDeficiencies();
                            }
                            if (tab.id === 'documents') {
                                fetchDocuments();
                            }
                            if (tab.id === 'notes') {
                                fetchProjectNotes();
                            }
                        }}
                        className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-white'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        {tab.id === 'pos' && projectPOs.length > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${activeTab === 'pos' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                {projectPOs.length}
                            </span>
                        )}
                        {tab.id === 'tasks' && projectTasks.length > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${activeTab === 'tasks' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                {projectTasks.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-8 animate-fade-in">
                    {/* ── Compact Project & Job Stats Strip ── */}
                    <div className="mt-8 bg-white border border-slate-200/60 rounded-[28px] shadow-sm p-3 md:p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:flex lg:flex-row lg:items-stretch gap-3">
                            {[
                                { label: 'Start Date', value: project?.startDate ? new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—', icon: Calendar, color: 'blue' },
                                { label: 'End Date', value: project?.endDate ? new Date(project.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—', icon: Calendar, color: 'orange' },
                                showBudget ? { label: 'Project Budget', value: `$${(Number(project?.budget) || 0).toLocaleString()}`, icon: DollarSign, color: 'emerald' } : null,
                                { label: 'Total Jobs', value: jobStats.total, color: 'blue', icon: Briefcase },
                                { label: 'In Planning', value: jobStats.planning, color: 'orange', icon: Clock },
                                { label: 'Completed', value: jobStats.completed, color: 'slate', icon: CheckCircle2 },
                            ].filter(Boolean).map((item, i) => (
                                <div key={i} className="flex-1 bg-slate-50/50 hover:bg-slate-100/80 border border-slate-100 rounded-2xl p-4 flex flex-col justify-center items-center transition-all relative group/meta">
                                    <div className={`mb-2 shrink-0
                                        ${item.color === 'blue' ? 'text-blue-500' :
                                            item.color === 'orange' ? 'text-orange-500' :
                                                item.color === 'emerald' ? 'text-emerald-500' : 'text-slate-500'}`}>
                                        <item.icon size={18} />
                                    </div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center leading-tight mb-1">{item.label}</p>
                                    <p className="text-sm font-black text-slate-900 text-center leading-none truncate w-full">{item.value}</p>

                                    {item.isProgress && ['COMPANY_OWNER', 'PM'].includes(user?.role) && (
                                        <div className="absolute inset-x-0 bottom-0 top-0 bg-slate-900/95 backdrop-blur-md opacity-0 group-hover/meta:opacity-100 transition-all duration-300 flex flex-col justify-center items-center rounded-2xl z-20 px-2 shadow-xl shadow-slate-900/20">
                                            <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-2 text-center">Update</span>
                                            <div className="relative w-full text-center">
                                                <select
                                                    value={project.progress || 0}
                                                    onChange={(e) => handleProjectProgressUpdate(parseInt(e.target.value))}
                                                    className="w-full bg-white/10 border border-white/20 rounded-lg py-1.5 pl-2 pr-6 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all cursor-pointer appearance-none text-center"
                                                >
                                                    {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(val => (
                                                        <option key={val} value={val} className="bg-slate-800 text-left">{val}% Complete</option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-blue-400" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Jobs Section ── */}
                    <div className="space-y-5">
                        {/* Section header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Jobs</h2>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">
                                    {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} in this project
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {/* View toggle */}
                                <div className="bg-white border border-slate-200 rounded-xl p-1 flex">
                                    <button onClick={() => setView('grid')}
                                        className={`p-2 rounded-lg transition-all ${view === 'grid' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
                                        <LayoutGrid size={16} />
                                    </button>
                                    <button onClick={() => setView('table')}
                                        className={`p-2 rounded-lg transition-all ${view === 'table' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
                                        <List size={16} />
                                    </button>
                                </div>
                                {['COMPANY_OWNER', 'PM'].includes(user?.role) && (
                                    <button
                                        onClick={() => navigate(`/company-admin/projects/${projectId}/jobs/new`)}
                                        className="bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200 font-black text-xs uppercase tracking-tight">
                                        <Plus size={16} /> Create Job
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Toolbar */}
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200/60 flex gap-3 items-center">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input type="text" placeholder="Search jobs..."
                                    value={search} onChange={e => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 text-sm font-bold text-slate-700 placeholder:text-slate-400" />
                            </div>
                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-600 outline-none hover:bg-slate-50 transition-all appearance-none">
                                <option value="all">All</option>
                                <option value="active">Active</option>
                                <option value="planning">Planning</option>
                                <option value="on-hold">On Hold</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>

                        {/* Jobs Grid */}
                        {
                            view === 'grid' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {/* Create Job card */}
                                    {['COMPANY_OWNER', 'PM'].includes(user?.role) && (
                                        <button
                                            onClick={() => navigate(`/company-admin/projects/${projectId}/jobs/new`)}
                                            className="group border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-[32px] p-8 flex flex-col items-center justify-center gap-4 text-slate-400 hover:text-blue-600 transition-all duration-300 hover:bg-blue-50/30 min-h-[200px]">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-all">
                                                <Plus size={24} className="group-hover:scale-110 transition-transform" />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-black text-sm uppercase tracking-widest">Create New Job</p>
                                                <p className="text-[11px] font-bold mt-1 opacity-60">Add a job to this project</p>
                                            </div>
                                        </button>
                                    )}

                                    {filteredJobs.map(job => (
                                        <div key={job._id}
                                            className="bg-white rounded-[32px] border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all duration-300 p-6 flex flex-col gap-4">
                                            {/* Header */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                                    <div
                                                        className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 cursor-pointer hover:bg-blue-100 transition-colors"
                                                        onClick={() => navigate(`/company-admin/projects/${projectId}/jobs/${job._id}`)}
                                                    >
                                                        <Briefcase size={18} className="text-blue-600" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3
                                                            className="font-black text-slate-900 truncate cursor-pointer hover:text-blue-600 transition-colors"
                                                            onClick={() => navigate(`/company-admin/projects/${projectId}/jobs/${job._id}`)}
                                                        >
                                                            {job.name}
                                                        </h3>
                                                        {job.location && (
                                                            <div className="flex items-center gap-1 mt-0.5 text-slate-400">
                                                                <MapPin size={11} />
                                                                <span className="text-[11px] font-bold truncate">{job.location}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="relative group/status">
                                                    <StatusBadge status={job.status} />
                                                    {['COMPANY_OWNER', 'PM'].includes(user?.role) && (
                                                        <select
                                                            className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                                            value={job.status}
                                                            onChange={(e) => handleUpdateJobStatus(job._id, e.target.value)}
                                                        >
                                                            <option value="planning">Planning</option>
                                                            <option value="active">Active</option>
                                                            <option value="on-hold">On Hold</option>
                                                            <option value="completed">Completed</option>
                                                        </select>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    <span>Progress</span>
                                                    <span className="text-blue-600">{job.progress || 0}%</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-600 transition-all duration-500"
                                                        style={{ width: `${job.progress || 0}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Alert for Completed Job with Equipment */}
                                            {job.status === 'completed' && equipment.some(e => (e.assignedJob?._id === job._id || e.assignedJob === job._id)) && (
                                                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3 animate-pulse">
                                                    <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-[11px] font-black text-red-700 uppercase tracking-widest leading-none mb-1">Attention Required</p>
                                                        <p className="text-xs font-bold text-red-600/80">Job completed but equipment still assigned.</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Details */}
                                            <div className="space-y-3 flex-1">
                                                {/* Project Manager & Site Assignment */}
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2 text-slate-500">
                                                        <Users size={13} className="text-blue-400 shrink-0" />
                                                        <span className="text-xs font-bold truncate">
                                                            PM: {project?.pmId?.fullName || users.find(u => u._id === (project?.pmId?._id || project?.pmId))?.fullName || 'Unassigned'}
                                                        </span>
                                                    </div>

                                                    <div className="group/assign relative">
                                                        <div className="flex items-center gap-2 text-slate-500">
                                                            <HardHat size={13} className="text-slate-400 shrink-0" />
                                                            <span className="text-xs font-bold truncate">
                                                                {(() => {
                                                                    const assignee = job.foremanId?.role || users.find(u => u._id === (job.foremanId?._id || job.foremanId))?.role;
                                                                    if (assignee === 'PM') return 'Project Manager';
                                                                    if (assignee === 'FOREMAN') return 'Site Foreman';
                                                                    if (assignee === 'WORKER') return 'Lead Worker';
                                                                    return 'Lead';
                                                                })()}: {job.foremanId?.fullName || users.find(u => u._id === (job.foremanId?._id || job.foremanId))?.fullName || 'Unassigned'}
                                                            </span>
                                                        </div>
                                                        {(['COMPANY_OWNER', 'SUPER_ADMIN', 'PM'].includes(user?.role)) && (
                                                            <div 
                                                                className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                                                onClick={async () => {
                                                                    await ensureUsersLoaded();
                                                                    setIsAssigningLead(job._id);
                                                                }}
                                                            ></div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Workers Assignment */}
                                                <div className="group/assign-w relative">
                                                    <div className="flex items-center gap-2 text-slate-500">
                                                        <Users size={13} className="text-slate-400 shrink-0" />
                                                        <span className="text-xs font-bold truncate">
                                                            Crew: {job.assignedWorkers?.length || 0} assigned
                                                        </span>
                                                    </div>
                                                    {['COMPANY_OWNER', 'SUPER_ADMIN', 'PM'].includes(user?.role) && (
                                                        <div className="absolute inset-0 opacity-0 cursor-pointer w-full" onClick={async () => {
                                                            await ensureUsersLoaded();
                                                            setIsAssigningWorkers(job._id);
                                                        }}></div>
                                                    )}
                                                    {['FOREMAN', 'SUBCONTRACTOR'].includes(user?.role) && (
                                                        <select
                                                            className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                                            value={typeof job.foremanId === 'object' ? job.foremanId._id : (job.foremanId || '')}
                                                            onMouseDown={ensureUsersLoaded}
                                                            onChange={(e) => handleAssignForeman(job._id, e.target.value)}
                                                        >
                                                            <option value="">Assign Worker</option>
                                                            {users.filter(u => u.role === 'WORKER').map(u => (
                                                                <option key={u._id} value={u._id}>{u.fullName} (WORKER)</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>

                                                {/* Multi-select for workers moved outside the loop */}


                                                {(job.startDate || job.endDate) && (
                                                    <div className="flex items-center gap-2 text-slate-500">
                                                        <Calendar size={13} className="text-slate-400 shrink-0" />
                                                        <span className="text-xs font-bold">
                                                            {job.startDate ? new Date(job.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '?'}
                                                            {' → '}
                                                            {job.endDate ? new Date(job.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '?'}
                                                        </span>
                                                    </div>
                                                )}
                                                {showBudget && job.budget > 0 && (
                                                    <div className="flex items-center gap-2 text-slate-500">
                                                        <DollarSign size={13} className="text-emerald-500 shrink-0" />
                                                        <span className="text-xs font-black text-slate-800">${Number(job.budget).toLocaleString()}</span>
                                                    </div>
                                                )}

                                                {/* Job Equipment List */}
                                                <div className="pt-2">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipment On Site</span>
                                                            {['COMPANY_OWNER', 'PM', 'SUPER_ADMIN'].includes(user?.role) && (
                                                                <button
                                                                    onClick={async () => {
                                                                        await ensureEquipmentLoaded();
                                                                        setIsAssigningEquipment(job._id);
                                                                        setSelectedEquipmentIds([]);
                                                                    }}
                                                                    className="w-5 h-5 flex items-center justify-center rounded-md bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                                    title="Assign Equipment"
                                                                >
                                                                    <Plus size={12} />
                                                                </button>
                                                            )}

                                                        </div>
                                                        <span className="text-[10px] font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">
                                                            {equipment.filter(e => (e.assignedJob?._id === job._id || e.assignedJob === job._id)).length}
                                                        </span>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        {equipment.filter(e => (e.assignedJob?._id === job._id || e.assignedJob === job._id)).map(e => (
                                                            <div key={e._id} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-2 group/equip">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${e.category === 'Small Tools' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                                                        <Briefcase size={12} />
                                                                    </div>
                                                                    <span className="text-[11px] font-bold text-slate-700 truncate">{e.name}</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleReturnEquipment(e._id)}
                                                                    disabled={returningEquipId === e._id}
                                                                    className="opacity-0 group-hover/equip:opacity-100 transition-all text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100"
                                                                >
                                                                    {returningEquipId === e._id ? '...' : 'Return'}
                                                                </button>
                                                            </div>
                                                        ))}
                                                        {equipment.filter(e => (e.assignedJob?._id === job._id || e.assignedJob === job._id)).length === 0 && (
                                                            <p className="text-[11px] text-slate-300 font-bold italic">No equipment assigned</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => navigate(`/company-admin/projects/${projectId}/jobs/${job._id}`)}
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all flex items-center gap-1.5"
                                                        title="View Job Details"
                                                    >
                                                        <LayoutGrid size={16} />
                                                        <span className="text-[10px] font-black uppercase">Dashboard</span>
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`/company-admin/projects/${projectId}/jobs/${job._id}/deficiencies`)}
                                                        className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all flex items-center gap-1.5"
                                                        title="Deficiencies List"
                                                    >
                                                        <AlertTriangle size={16} />
                                                        <span className="text-[10px] font-black uppercase">Punch List</span>
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setSelectedJobForDetails(job)}
                                                        className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                        title="View Details"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    {['COMPANY_OWNER', 'PM', 'SUPER_ADMIN'].includes(user?.role) && (
                                                        <button
                                                            onClick={() => navigate(`/company-admin/projects/${projectId}/jobs/${job._id}/edit`)}
                                                            className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                            title="Edit Job"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteJob(job)}
                                                        disabled={deletingId === job._id}
                                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                        title="Delete Job"
                                                    >
                                                        {deletingId === job._id
                                                            ? <Loader size={16} className="animate-spin" />
                                                            : <Trash2 size={16} />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {filteredJobs.length === 0 && jobs.length > 0 && (
                                        <div className="col-span-full py-16 text-center flex flex-col items-center gap-3 text-slate-300">
                                            <Search size={40} className="opacity-30" />
                                            <p className="font-bold uppercase tracking-widest text-[11px]">No jobs match your search</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Table view */
                                <div className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                <th className="px-6 py-4">Job Name</th>
                                                <th className="px-6 py-4">Location</th>
                                                <th className="px-6 py-4">Project Manager</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4">Dates</th>
                                                {showBudget && <th className="px-6 py-4">Budget</th>}
                                                <th className="px-6 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {filteredJobs.length === 0 ? (
                                                <tr><td colSpan={showBudget ? 7 : 6} className="px-6 py-20 text-center">
                                                    <div className="flex flex-col items-center gap-3 text-slate-300">
                                                        <Briefcase size={40} className="opacity-30" />
                                                        <p className="font-bold uppercase tracking-widest text-[11px]">
                                                            {jobs.length === 0 ? 'No jobs yet — create the first one!' : 'No jobs match your search'}
                                                        </p>
                                                    </div>
                                                </td></tr>
                                            ) : filteredJobs.map(job => (
                                                <tr key={job._id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4 font-black text-slate-900">{job.name}</td>
                                                    <td className="px-6 py-4 text-slate-500 font-bold text-xs">{job.location || '—'}</td>
                                                    <td className="px-6 py-4 text-slate-600 font-bold text-xs">
                                                        {job.foremanId
                                                            ? (typeof job.foremanId === 'object' ? job.foremanId?.fullName : job.foremanId)
                                                            : <span className="text-slate-300 italic">Unassigned</span>}
                                                    </td>
                                                    <td className="px-6 py-4"><StatusBadge status={job.status} /></td>
                                                    <td className="px-6 py-4 text-slate-400 font-bold text-xs">
                                                        {job.startDate ? new Date(job.startDate).toLocaleDateString() : '—'}
                                                        {job.endDate ? ` → ${new Date(job.endDate).toLocaleDateString()}` : ''}
                                                    </td>
                                                    {showBudget && (
                                                        <td className="px-6 py-4 font-bold text-slate-900">
                                                            {job.budget > 0 ? `$${Number(job.budget).toLocaleString()}` : '—'}
                                                        </td>
                                                    )}
                                                    <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => setSelectedJobForDetails(job)}
                                                            className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                            title="View Details"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        {['COMPANY_OWNER', 'PM', 'SUPER_ADMIN'].includes(user?.role) && (
                                                            <button
                                                                onClick={() => navigate(`/company-admin/projects/${projectId}/jobs/${job._id}/edit`)}
                                                                className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                                title="Edit Job"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                        )}
                                                        <button onClick={() => handleDeleteJob(job)}
                                                            disabled={deletingId === job._id}
                                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                            title="Delete Job"
                                                        >
                                                            {deletingId === job._id ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                    <Modal
                        isOpen={!!isAssigningEquipment}
                        onClose={() => setIsAssigningEquipment(null)}
                        title="Assign Equipment"
                        maxWidth="max-w-xl"
                    >
                        <div className="space-y-6">
                            <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest -mt-2">
                                Select available items for <span className="text-blue-600">{jobs.find(j => j._id === isAssigningEquipment)?.name || 'this job'}</span>
                            </p>

                            <div className="relative">
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search inventory..."
                                    value={equipSearch}
                                    onChange={(e) => setEquipSearch(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all"
                                />
                            </div>

                            <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                {equipment
                                    .filter(e => {
                                        const isAssigned = e.assignedJob && (typeof e.assignedJob === 'object' ? e.assignedJob._id : e.assignedJob);
                                        return !isAssigned || e.status === 'idle';
                                    })
                                    .filter(e =>
                                        (e.name || '').toLowerCase().includes(equipSearch.toLowerCase()) ||
                                        (e.type || '').toLowerCase().includes(equipSearch.toLowerCase()) ||
                                        (e.serialNumber || '').toLowerCase().includes(equipSearch.toLowerCase())
                                    )
                                    .map(item => (
                                        <div
                                            key={item._id}
                                            onClick={() => {
                                                if (selectedEquipmentIds.includes(item._id)) {
                                                    setSelectedEquipmentIds(selectedEquipmentIds.filter(id => id !== item._id));
                                                } else {
                                                    setSelectedEquipmentIds([...selectedEquipmentIds, item._id]);
                                                }
                                            }}
                                            className={`flex items-center gap-4 p-4 rounded-3xl cursor-pointer transition-all border-2
                                                ${selectedEquipmentIds.includes(item._id)
                                                    ? 'bg-blue-50/50 border-blue-600/30 shadow-sm'
                                                    : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                        >
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm font-black text-lg
                                                ${item.category === 'Small Tools' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                                <Briefcase size={22} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[15px] font-black text-slate-900 leading-tight">{item.name}</p>
                                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-lg bg-slate-100 text-slate-500 uppercase">
                                                        {item.category === 'Small Tools' ? 'Tool' : 'Heavy'}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                    {item.type} <span className="mx-1 text-slate-200">|</span>
                                                    SN: <span className="text-blue-600/70">#{item.serialNumber || 'NA'}</span>
                                                </p>
                                            </div>
                                            {selectedEquipmentIds.includes(item._id) && (
                                                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                                                    <Check size={14} className="text-white" />
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                {equipment.filter(e => {
                                    const isAssigned = e.assignedJob && (typeof e.assignedJob === 'object' ? e.assignedJob._id : e.assignedJob);
                                    return !isAssigned || e.status === 'idle';
                                }).length === 0 && (
                                    <div className="py-20 text-center bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                                        <Briefcase size={40} className="mx-auto text-slate-200 mb-3" />
                                        <p className="text-sm font-bold text-slate-400">No equipment currently available.</p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 border-t border-slate-100 flex flex-col gap-4 bg-slate-50/50 -mx-6 -mb-6 p-8">
                                <div className="flex justify-between items-center px-2">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Selection</p>
                                        <p className="text-sm font-black text-slate-900">{selectedEquipmentIds.length} item(s) to assign</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status</p>
                                        <p className={`text-sm font-black ${selectedEquipmentIds.length > 0 ? 'text-blue-600' : 'text-slate-300'}`}>Ready to assign</p>
                                    </div>
                                </div>
                                
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setIsAssigningEquipment(null)}
                                        className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-500 text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAssignEquipment}
                                        disabled={selectedEquipmentIds.length === 0 || isAssigningEquipLoading}
                                        className={`flex-[2] py-4 text-white text-sm font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2
                                            ${selectedEquipmentIds.length === 0 || isAssigningEquipLoading
                                                ? 'bg-slate-200 cursor-not-allowed shadow-none'
                                                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
                                    >
                                        {isAssigningEquipLoading ? <Loader size={18} className="animate-spin" /> : <Plus size={18} />}
                                        Assign to Job
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Modal>

                    <Modal
                        isOpen={!!isAssigningWorkers}
                        onClose={() => {
                            setIsAssigningWorkers(null);
                            setWorkerSearch('');
                        }}
                        title="Assign Crew Members"
                        maxWidth="max-w-2xl"
                    >
                        <div className="space-y-6">
                            <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest -mt-2">
                                Select personnel for <span className="text-blue-600">{jobs.find(j => j._id === isAssigningWorkers)?.name || 'this job'}</span>
                            </p>

                            <div className="relative">
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name or role..."
                                    value={workerSearch}
                                    onChange={(e) => setWorkerSearch(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all"
                                    autoFocus
                                />
                            </div>

                            <div className="max-h-[450px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                {users
                                    .filter(u => ['WORKER', 'FOREMAN', 'SUBCONTRACTOR'].includes(u.role))
                                    .filter(u => u.fullName.toLowerCase().includes(workerSearch.toLowerCase()))
                                    .map(u => {
                                        const currentJob = jobs.find(j => j._id === isAssigningWorkers);
                                        const isSelected = currentJob?.assignedWorkers?.some(w => (w && typeof w === 'object' ? w._id === u._id : w === u._id));
                                        
                                        return (
                                            <div
                                                key={u._id}
                                                onClick={() => {
                                                    const currentIds = (currentJob?.assignedWorkers || []).map(w => (w && typeof w === 'object') ? w._id : w);
                                                    const next = !isSelected
                                                        ? [...currentIds, u._id]
                                                        : currentIds.filter(id => id !== u._id);
                                                    handleAssignWorkers(isAssigningWorkers, next);
                                                }}
                                                className={`group flex items-center justify-between p-4 rounded-3xl cursor-pointer transition-all border-2
                                                    ${isSelected
                                                        ? 'bg-blue-50/50 border-blue-600/30 shadow-sm'
                                                        : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-transform group-hover:scale-105 ${
                                                        isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                        {u.fullName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 text-base leading-none mb-1.5">{u.fullName}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider ${
                                                                u.role === 'PM' ? 'bg-purple-100 text-purple-600' :
                                                                u.role === 'FOREMAN' ? 'bg-orange-100 text-orange-600' :
                                                                'bg-slate-100 text-slate-500'
                                                            }`}>
                                                                {u.role}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                                                    isSelected 
                                                        ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-200' 
                                                        : 'border-slate-200 group-hover:border-slate-300'
                                                }`}>
                                                    {isSelected && <Check size={16} className="text-white" />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                
                                {users.filter(u => ['WORKER', 'FOREMAN', 'SUBCONTRACTOR'].includes(u.role)).length === 0 && (
                                    <div className="py-20 text-center bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                                        <Users size={40} className="mx-auto text-slate-200 mb-3" />
                                        <p className="text-sm font-bold text-slate-400">No personnel found.</p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 border-t border-slate-100 flex justify-between items-center bg-slate-50/50 -mx-6 -mb-6 p-8">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Assigned</span>
                                    <span className="text-lg font-black text-slate-900">
                                        {jobs.find(j => j._id === isAssigningWorkers)?.assignedWorkers?.length || 0} Members
                                    </span>
                                </div>
                                <button
                                    onClick={() => { setIsAssigningWorkers(null); setWorkerSearch(''); }}
                                    className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </Modal>

                    {/* Assign Lead Modal */}
                    <Modal
                        isOpen={!!isAssigningLead}
                        onClose={() => {
                            setIsAssigningLead(null);
                            setLeadSearch('');
                        }}
                        title="Assign Job Lead"
                        maxWidth="max-w-2xl"
                    >
                        <div className="space-y-6">
                            <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest -mt-2">
                                Select a lead for <span className="text-blue-600">{jobs.find(j => j._id === isAssigningLead)?.name || 'this job'}</span>
                            </p>

                            <div className="relative">
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name or role..."
                                    value={leadSearch}
                                    onChange={(e) => setLeadSearch(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all"
                                    autoFocus
                                />
                            </div>

                            <div className="max-h-[450px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                {users
                                    .filter(u => {
                                        if (['COMPANY_OWNER', 'SUPER_ADMIN'].includes(user?.role)) return u.role === 'PM';
                                        if (user?.role === 'PM') return ['FOREMAN', 'SUBCONTRACTOR'].includes(u.role);
                                        return false;
                                    })
                                    .filter(u => u.fullName.toLowerCase().includes(leadSearch.toLowerCase()))
                                    .map(u => {
                                        const currentJob = jobs.find(j => j._id === isAssigningLead);
                                        const isSelected = (currentJob?.foremanId?._id || currentJob?.foremanId) === u._id;
                                        
                                        return (
                                            <div
                                                key={u._id}
                                                onClick={async () => {
                                                    await handleAssignForeman(isAssigningLead, u._id);
                                                    setIsAssigningLead(null);
                                                    setLeadSearch('');
                                                }}
                                                className={`group flex items-center justify-between p-4 rounded-3xl cursor-pointer transition-all border-2
                                                    ${isSelected
                                                        ? 'bg-blue-50/50 border-blue-600/30 shadow-sm'
                                                        : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-transform group-hover:scale-105 ${
                                                        isSelected ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                        {u.fullName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 text-base leading-none mb-1.5">{u.fullName}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider ${
                                                                u.role === 'PM' ? 'bg-purple-100 text-purple-600' :
                                                                u.role === 'FOREMAN' ? 'bg-orange-100 text-orange-600' :
                                                                'bg-emerald-100 text-emerald-600'
                                                            }`}>
                                                                {u.role}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                                                        <Check size={16} className="text-white" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                
                                {users.filter(u => {
                                    if (['COMPANY_OWNER', 'SUPER_ADMIN'].includes(user?.role)) return u.role === 'PM';
                                    if (user?.role === 'PM') return ['FOREMAN', 'SUBCONTRACTOR'].includes(u.role);
                                    return false;
                                }).length === 0 && (
                                    <div className="py-20 text-center bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                                        <Users size={40} className="mx-auto text-slate-200 mb-3" />
                                        <p className="text-sm font-bold text-slate-400">No leads available for assignment.</p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 border-t border-slate-100 flex justify-end bg-slate-50/50 -mx-6 -mb-6 p-8">
                                <button
                                    onClick={() => { setIsAssigningLead(null); setLeadSearch(''); }}
                                    className="px-10 py-4 bg-white border-2 border-slate-200 text-slate-500 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </Modal>
                </div>
            </div>
        )}

        {/* Job Details Modal */}
        {selectedJobForDetails && (
            <Modal
                isOpen={!!selectedJobForDetails}
                onClose={() => setSelectedJobForDetails(null)}
                title="Job Details"
                maxWidth="max-w-3xl"
            >
                <div className="space-y-8 pb-4">
                    {/* Header Info */}
                    <div className="flex items-start gap-6 bg-slate-50 p-8 rounded-[32px] border border-slate-100">
                        <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-100 shrink-0">
                            <Briefcase size={32} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{selectedJobForDetails.name}</h3>
                            <div className="flex flex-wrap gap-4 mt-3">
                                <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                                    <MapPin size={16} className="text-blue-500" />
                                    {selectedJobForDetails.location || 'No location specified'}
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={selectedJobForDetails.status} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left Column */}
                        <div className="space-y-8">
                            {/* Schedule */}
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Calendar size={14} className="text-blue-500" /> Schedule Details
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Start Date</p>
                                        <p className="font-bold text-slate-900">{selectedJobForDetails.startDate ? new Date(selectedJobForDetails.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">End Date</p>
                                        <p className="font-bold text-slate-900">{selectedJobForDetails.endDate ? new Date(selectedJobForDetails.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Budget (Admin/PM only) */}
                            {showBudget && (
                                <div className="space-y-4">
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <DollarSign size={14} className="text-emerald-500" /> Financial Info
                                    </h4>
                                    <div className="bg-emerald-50/50 p-6 rounded-[32px] border border-emerald-100/50">
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Allocated Budget</p>
                                        <p className="text-2xl font-black text-slate-900">${(selectedJobForDetails.budget || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <FileText size={14} className="text-blue-500" /> Description / Notes
                                </h4>
                                <div className="bg-white p-6 rounded-[32px] border border-slate-100 text-sm font-medium text-slate-600 leading-relaxed min-h-[120px]">
                                    {selectedJobForDetails.description || 'No description provided for this job unit.'}
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-8">
                            {/* Personnel */}
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Users size={14} className="text-orange-500" /> Personnel Assignment
                                </h4>
                                <div className="space-y-3">
                                    {/* Lead */}
                                    <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                        <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-xs shrink-0">
                                            {selectedJobForDetails.foremanId?.fullName?.[0] || 'L'}
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Job Lead</p>
                                            <p className="font-bold text-slate-900">{selectedJobForDetails.foremanId?.fullName || 'Not Assigned'}</p>
                                        </div>
                                    </div>
                                    {/* Crew Count */}
                                    <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs shrink-0">
                                            {selectedJobForDetails.workers?.length || 0}
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Crew Size</p>
                                            <p className="font-bold text-slate-900">{selectedJobForDetails.workers?.length || 0} Assigned Workers</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Equipment */}
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Briefcase size={14} className="text-blue-500" /> Equipment On Site
                                </h4>
                                <div className="bg-slate-50/50 p-6 rounded-[32px] border border-slate-100 min-h-[150px]">
                                    {equipment.filter(e => (e.assignedJob?._id === selectedJobForDetails._id || e.assignedJob === selectedJobForDetails._id)).length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {equipment.filter(e => (e.assignedJob?._id === selectedJobForDetails._id || e.assignedJob === selectedJobForDetails._id)).map(item => (
                                                <span key={item._id} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-tight shadow-sm">
                                                    {item.name}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <p className="text-xs font-bold text-slate-300 italic">No equipment assigned</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-6 border-t border-slate-100 flex gap-4">
                        <button
                            onClick={() => setSelectedJobForDetails(null)}
                            className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                        >
                            Close
                        </button>
                        <button
                            onClick={() => {
                                const id = selectedJobForDetails._id;
                                setSelectedJobForDetails(null);
                                navigate(`/company-admin/projects/${projectId}/jobs/${id}`);
                            }}
                            className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95 flex items-center justify-center gap-2"
                        >
                            Open Dashboard <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </Modal>
        )}

            {activeTab === 'pos' && (
                <div className="space-y-8 animate-fade-in">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                        <FinancialCard
                            label="Total Budget"
                            value={`$${(financials?.totalBudget || 0).toLocaleString()}`}
                            icon={DollarSign}
                            color="blue"
                        />
                        <FinancialCard
                            label="Total PO Cost"
                            value={`$${(financials?.totalPoCost || 0).toLocaleString()}`}
                            icon={ShoppingCart}
                            color="orange"
                            subtext={`${financials?.poCount || 0} Purchase Orders`}
                        />
                        <FinancialCard
                            label="Remaining"
                            value={`$${(financials?.remainingBudget || 0).toLocaleString()}`}
                            icon={DollarSign}
                            color={financials?.remainingBudget < 0 ? 'red' : 'emerald'}
                        />
                        <FinancialCard
                            label="Utilization"
                            value={`${financials?.utilizationPercentage || 0}%`}
                            icon={TrendingUp}
                            color={financials?.utilizationPercentage > 90 ? 'orange' : 'blue'}
                        />
                    </div>

                    <div className="bg-white rounded-[40px] shadow-sm border border-slate-200/60 overflow-hidden">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">Purchase Orders</h3>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Direct material procurement for this project</p>
                            </div>
                            {['COMPANY_OWNER', 'PM', 'FOREMAN', 'SUPER_ADMIN'].includes(user?.role) && (
                                <button
                                    onClick={() => navigate('/company-admin/purchase-orders/new', { state: { projectId } })}
                                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200"
                                >
                                    <Plus size={16} /> New PO
                                </button>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <th className="px-8 py-4">PO Number</th>
                                        <th className="px-8 py-4">Vendor</th>
                                        <th className="px-8 py-4">Status</th>
                                        <th className="px-8 py-4 text-right">Amount</th>
                                        <th className="px-8 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {projectPOs.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center gap-3 text-slate-300">
                                                    <ShoppingCart size={40} className="opacity-30" />
                                                    <p className="font-bold uppercase tracking-widest text-[11px]">No purchase orders yet</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : projectPOs.map(po => (
                                        <tr key={po._id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-4 font-black text-slate-900 text-sm">{po.poNumber}</td>
                                            <td className="px-8 py-4">
                                                <p className="font-bold text-slate-700 text-sm">{po.vendorName}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{po.vendorEmail}</p>
                                            </td>
                                            <td className="px-8 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${po.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                    po.status === 'Pending Approval' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                        'bg-slate-100 text-slate-600 border-slate-200'
                                                    }`}>
                                                    {po.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-4 text-right font-black text-slate-900 text-sm">
                                                ${po.totalAmount?.toLocaleString()}
                                            </td>
                                            <td className="px-8 py-4 text-right">
                                                <button
                                                    onClick={() => navigate(`/company-admin/purchase-orders/${po._id}`)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                >
                                                    <ChevronRight size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'updates' && (
                <div className="space-y-8 animate-fade-in">
                    {/* Updates Timeline */}
                    <div className="space-y-6">
                        {updates.length > 0 ? (
                            <div className="space-y-6">
                                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200/60 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Communication Logs</h3>
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Direct updates posted for the client</p>
                                    </div>
                                    {['COMPANY_OWNER', 'PM'].includes(user?.role) && (
                                        <button
                                            onClick={() => setIsPostingUpdate(true)}
                                            className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"
                                        >
                                            <Plus size={16} /> New Update
                                        </button>
                                    )}
                                </div>
                                {updates.map((update, idx) => (
                                    <div key={update._id} className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200/60 relative group animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                                        <div className="flex items-start gap-6">
                                            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100 shadow-sm shadow-blue-100">
                                                <MessageSquare size={24} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="text-xl font-black text-slate-900 tracking-tight truncate">{update.title}</h4>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        {!update.isVisibleToClient && (
                                                            <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-[8px] font-black uppercase tracking-widest border border-slate-200">Internal Only</span>
                                                        )}
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                                            <Calendar size={12} className="text-blue-500" />
                                                            {new Date(update.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-slate-600 font-bold leading-relaxed whitespace-pre-wrap text-sm">{update.description}</p>

                                                {update.images && update.images.length > 0 && (
                                                    <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {update.images.map((img, i) => (
                                                            <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-slate-100 shadow-sm relative group/img">
                                                                <img src={img} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-500" alt="Update" />
                                                                <a
                                                                    href={img}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center"
                                                                >
                                                                    <ImageIcon size={20} className="text-white" />
                                                                </a>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="mt-6 pt-5 border-t border-slate-50 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl bg-slate-900 text-[10px] font-black text-white flex items-center justify-center uppercase shadow-lg shadow-slate-200">
                                                            {update.createdBy?.fullName?.charAt(0) || 'S'}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] leading-none mb-1">Posted By</span>
                                                            <span className="text-xs font-bold text-slate-900">{update.createdBy?.fullName || 'Project Manager'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${update.isVisibleToClient ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                            {update.isVisibleToClient ? 'Client Visible' : 'Internal Only'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white p-20 rounded-[40px] border border-slate-200/60 text-center">
                                <div className="flex items-center justify-between mb-8 text-left">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Communication Logs</h3>
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Direct updates posted for the client</p>
                                    </div>
                                    {['COMPANY_OWNER', 'PM'].includes(user?.role) && (
                                        <button
                                            onClick={() => setIsPostingUpdate(true)}
                                            className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"
                                        >
                                            <Plus size={16} /> New Update
                                        </button>
                                    )}
                                </div>
                                <div className="py-20">
                                    <div className="w-20 h-20 bg-slate-50 rounded-[30px] flex items-center justify-center mx-auto mb-6 border border-slate-100">
                                        <MessageSquare size={32} className="text-slate-200" />
                                    </div>
                                    <p className="text-slate-300 font-bold uppercase tracking-widest text-[11px] max-w-[200px] mx-auto leading-relaxed">No updates have been posted for this project yet</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Post Client Update Modal */}
            {isPostingUpdate && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-10">
                            <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Post Project Update</h3>
                            <p className="text-slate-500 font-medium mb-8">This update will be visible to the client on their dashboard.</p>

                            <form onSubmit={handlePostUpdate} className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Update Title</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Foundation Pour Completed"
                                        value={newUpdate.title}
                                        onChange={e => setNewUpdate({ ...newUpdate, title: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Description</label>
                                    <textarea
                                        required
                                        rows={4}
                                        placeholder="Briefly explain what was achieved today..."
                                        value={newUpdate.description}
                                        onChange={e => setNewUpdate({ ...newUpdate, description: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-700 outline-none focus:border-blue-500 transition-all resize-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={newUpdate.date}
                                            onChange={e => setNewUpdate({ ...newUpdate, date: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                    <div className="flex items-end pb-4">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={newUpdate.isVisibleToClient}
                                                onChange={e => setNewUpdate({ ...newUpdate, isVisibleToClient: e.target.checked })}
                                                className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm font-bold text-slate-600">Visible to Client</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Attachments (Max 5)</label>
                                    <div className="grid grid-cols-4 gap-3">
                                        {newUpdate.images.map((img, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 group">
                                                <img src={URL.createObjectURL(img)} alt="Preview" className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => setNewUpdate({
                                                        ...newUpdate,
                                                        images: newUpdate.images.filter((_, i) => i !== idx)
                                                    })}
                                                    className="absolute top-1 right-1 p-1 bg-white/90 rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-all border border-slate-100"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                        {newUpdate.images.length < 5 && (
                                            <label className="relative aspect-square rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-all flex flex-col items-center justify-center gap-1 group">
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        if (e.target.files) {
                                                            const files = Array.from(e.target.files);
                                                            const totalFiles = [...newUpdate.images, ...files].slice(0, 5);
                                                            setNewUpdate({ ...newUpdate, images: totalFiles });
                                                        }
                                                    }}
                                                    className="hidden"
                                                />
                                                <ImageIcon size={20} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                                <span className="text-[8px] font-black text-slate-400 group-hover:text-blue-600 uppercase">Add Photo</span>
                                            </label>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsPostingUpdate(false)}
                                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-500 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingUpdate}
                                        className="flex-3 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-2"
                                    >
                                        {isSubmittingUpdate ? <Loader size={16} className="animate-spin" /> : 'Post Update'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Tasks Tab ── */}
            {activeTab === 'tasks' && (
                <div className="space-y-5 animate-fade-in">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-xl font-black text-slate-900">Project Tasks</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">All tasks linked to this project</p>
                        </div>
                        {['SUPER_ADMIN', 'COMPANY_OWNER', 'PM', 'FOREMAN'].includes(user?.role) && (
                            <Link
                                to="/company-admin/tasks"
                                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition shadow-xl shadow-blue-200"
                            >
                                <Plus size={16} /> New Task
                            </Link>
                        )}
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={taskSearch}
                            onChange={e => setTaskSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
                        />
                    </div>

                    {tasksLoading ? (
                        <div className="flex justify-center py-16">
                            <div className="w-8 h-8 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="bg-white rounded-[28px] border border-slate-200/60 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <th className="px-6 py-4">Task Name</th>
                                        <th className="px-6 py-4">Assigned To</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Priority</th>
                                        <th className="px-6 py-4">Due Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {(() => {
                                        const toggleExpand = (id) => {
                                            setExpandedTasks(prev => {
                                                const next = new Set(prev);
                                                if (next.has(id)) next.delete(id);
                                                else next.add(id);
                                                return next;
                                            });
                                        };

                                        const renderTaskRow = (task, depth = 0, isLast = false, levelLines = []) => {
                                            const isExpanded = expandedTasks.has(task._id);
                                            const roleColors = {
                                                WORKER: 'bg-blue-50 text-blue-600 border-blue-100',
                                                FOREMAN: 'bg-orange-50 text-orange-600 border-orange-100',
                                                SUBCONTRACTOR: 'bg-purple-50 text-purple-600 border-purple-100',
                                                PM: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                                                ENGINEER: 'bg-cyan-50 text-cyan-700 border-cyan-100',
                                            };
                                            const roleLabels = {
                                                WORKER: 'Worker', FOREMAN: 'Foreman', SUBCONTRACTOR: 'Subcontractor', PM: 'PM', ENGINEER: 'Engineer'
                                            };
                                            
                                            const roleType = task.assignedRoleType || task.assignedTo?.[0]?.role;
                                            const now = new Date();
                                            const due = task.dueDate ? new Date(task.dueDate) : null;
                                            const isOverdue = due && due < now && task.status !== 'completed';
                                            const isDueSoon = due && !isOverdue && (due - now) / (1000 * 60 * 60 * 24) <= 3 && task.status !== 'completed';

                                            const directChildren = projectTasks.filter(t => 
                                                t.isSubTask && (
                                                    (task.isSubTask ? t.parentSubTaskId === task._id : t.taskId === task._id && !t.parentSubTaskId)
                                                )
                                            );
                                            const hasChildren = directChildren.length > 0;

                                            // Indentation & Connectors layout
                                            const baseOffset = 26;
                                            const step = 28;
                                            const indentPx = 24 + depth * step;

                                            return (
                                                <React.Fragment key={task._id}>
                                                    <tr className={`hover:bg-slate-50/50 transition-colors ${isOverdue ? 'bg-red-50/30' : isDueSoon ? 'bg-yellow-50/20' : ''}`}>
                                                        <td className="px-6 py-3 relative" style={{ paddingLeft: `${indentPx}px` }}>
                                                            {/* Tree Connectors */}
                                                            {task.isSubTask && (
                                                                <div className="absolute left-0 top-0 bottom-0 pointer-events-none">
                                                                    {/* Ancestor Vertical lines */}
                                                                    {levelLines.map((hasLine, i) => hasLine && (
                                                                        <div key={i} className="absolute top-0 bottom-0 border-l-[1.5px] border-slate-200"
                                                                            style={{ left: `${baseOffset + i * step}px` }}
                                                                        />
                                                                    ))}
                                                                    {/* Vertical line to next sibling */}
                                                                    {!isLast && (
                                                                        <div className="absolute border-l-[1.5px] border-slate-200"
                                                                            style={{ left: `${baseOffset + (depth-1) * step}px`, top: '50%', bottom: '0' }}
                                                                        />
                                                                    )}
                                                                    {/* L-Shape Curve */}
                                                                    <div className="absolute border-slate-200"
                                                                        style={{
                                                                            left: `${baseOffset + (depth-1) * step}px`, top: '0', height: '50%', width: '18px',
                                                                            borderLeftWidth: '1.5px', borderBottomWidth: '1.5px', borderBottomLeftRadius: '8px'
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}

                                                            <div className="flex items-center gap-1.5 relative z-10">
                                                                <button
                                                                    onClick={() => toggleExpand(task._id)}
                                                                    className={`p-1 hover:bg-slate-200 rounded-md text-slate-400 transition-all ${hasChildren ? '' : 'invisible'}`}
                                                                    style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }}
                                                                >
                                                                    <ChevronRight size={10} />
                                                                </button>
                                                                {isOverdue && <div className="w-1 h-6 bg-red-500 rounded-full shrink-0" />}
                                                                {isDueSoon && <div className="w-1 h-6 bg-yellow-400 rounded-full shrink-0" />}
                                                                {task.status === 'completed' && <div className="w-1 h-6 bg-emerald-400 rounded-full shrink-0" />}
                                                                <div className="flex flex-col">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`font-black text-slate-900 text-sm ${task.status === 'completed' ? 'line-through text-slate-400' : ''}`}>{task.title}</span>
                                                                        {hasChildren && <span className="text-[8px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md">{directChildren.length}</span>}
                                                                    </div>
                                                                    {task.isSubTask && <span className="text-[7px] font-black bg-slate-100 text-slate-400 px-1 py-0.5 rounded uppercase tracking-widest w-fit">Sub-Task</span>}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {task.assignedTo?.length > 0 ? (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-[10px] border border-blue-100">
                                                                        {task.assignedTo[0]?.fullName?.charAt(0)}
                                                                    </div>
                                                                    <span className="text-xs font-bold text-slate-700">{task.assignedTo[0]?.fullName}</span>
                                                                </div>
                                                            ) : <span className="text-slate-300 text-xs font-bold">Unassigned</span>}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {roleType ? (
                                                                <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border ${roleColors[roleType] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                                                    {roleLabels[roleType] || roleType}
                                                                </span>
                                                            ) : <span className="text-slate-300 text-[10px]">—</span>}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest
                                                                ${task.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                                    task.status === 'in_progress' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                                        task.status === 'review' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                                            'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                                                {task.status?.replace('_', ' ')}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border
                                                                ${task.priority === 'High' ? 'bg-red-50 text-red-600 border-red-100' :
                                                                    task.priority === 'Medium' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                                        'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                                {task.priority}
                                                            </span>
                                                        </td>
                                                        <td className={`px-6 py-4 text-xs font-black ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-yellow-700' : 'text-slate-700'}`}>
                                                            {due ? due.toLocaleDateString() : '—'}
                                                            {isOverdue && <span className="ml-2 text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-black">OVERDUE</span>}
                                                        </td>
                                                    </tr>
                                                    {isExpanded && directChildren.map((child, idx) => renderTaskRow(child, depth + 1, idx === directChildren.length - 1, [...levelLines, !isLast]))}
                                                </React.Fragment>
                                            );
                                        };

                                        const rootTasks = projectTasks.filter(t => !t.isSubTask && t.title?.toLowerCase().includes(taskSearch.toLowerCase()));
                                        return rootTasks.map((task, idx) => renderTaskRow(task, 0, idx === rootTasks.length - 1));
                                    })()}
                                    {projectTasks.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-16 text-center">
                                                <div className="flex flex-col items-center gap-3 text-slate-300">
                                                    <ClipboardList size={32} />
                                                    <p className="font-black uppercase tracking-widest text-xs">No tasks for this project yet</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Deficiencies Tab ── */}
            {activeTab === 'deficiencies' && (
                <div className="space-y-5 animate-fade-in pb-12">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Project Deficiencies</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5 flex items-center gap-2">
                                <AlertCircle size={14} className="text-red-500" />
                                punch list & issue tracker
                            </p>
                        </div>
                        {['COMPANY_OWNER', 'PM', 'FOREMAN', 'WORKER'].includes(user?.role) && (
                            <button
                                onClick={async () => { 
                                    await ensureUsersLoaded();
                                    setDeficiencyModalMode('add'); 
                                    setSelectedDeficiency(null); 
                                    setIsDeficiencyModalOpen(true); 
                                }}
                                className="bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-slate-800 transition shadow-xl font-black text-xs uppercase tracking-tight"
                            >
                                <Plus size={16} /> Add Deficiency
                            </button>
                        )}
                    </div>

                    {/* Filter Bar */}
                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search by title or worker..."
                                value={deficiencySearch}
                                onChange={(e) => setDeficiencySearch(e.target.value)}
                                className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-xs font-bold"
                            />
                        </div>
                        <div className="flex gap-4 w-full md:w-auto">
                            <select
                                value={deficiencyFilterStatus}
                                onChange={(e) => setDeficiencyFilterStatus(e.target.value)}
                                className="flex-1 md:w-48 px-4 py-2 bg-white border border-slate-200 rounded-2xl font-bold text-xs text-slate-600 outline-none hover:bg-slate-50 transition-all custom-select-appearance"
                            >
                                <option value="all">All Statuses</option>
                                <option value="open">Open</option>
                                <option value="in_progress">In Progress</option>
                                <option value="fixed">Fixed</option>
                                <option value="closed">Closed</option>
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-[40px] shadow-sm border border-slate-200/60 overflow-hidden">
                        <div className="deficiency-table-container overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Issue</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Category</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Priority</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned To</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {deficienciesLoading ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="w-8 h-8 border-4 border-slate-900/10 border-t-slate-900 rounded-full animate-spin" />
                                                    <p className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Loading Issues...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : projectDeficiencies.filter(d => {
                                        const matchSearch = d.title.toLowerCase().includes(deficiencySearch.toLowerCase()) ||
                                            d.assignedTo?.fullName?.toLowerCase().includes(deficiencySearch.toLowerCase());
                                        const matchStatus = deficiencyFilterStatus === 'all' || d.status === deficiencyFilterStatus;
                                        return matchSearch && matchStatus;
                                    }).length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center gap-3 text-slate-300">
                                                    <CheckCircle2 size={40} className="text-emerald-500/30" />
                                                    <p className="font-bold uppercase tracking-widest text-[10px]">No active deficiencies found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        projectDeficiencies.filter(d => {
                                            const matchSearch = d.title.toLowerCase().includes(deficiencySearch.toLowerCase()) ||
                                                d.assignedTo?.fullName?.toLowerCase().includes(deficiencySearch.toLowerCase());
                                            const matchStatus = deficiencyFilterStatus === 'all' || d.status === deficiencyFilterStatus;
                                            return matchSearch && matchStatus;
                                        }).map((d) => {
                                            const status = {
                                                open: { label: 'Open', cls: 'bg-red-50 text-red-600 border-red-100', dot: 'bg-red-500' },
                                                in_progress: { label: 'In Progress', cls: 'bg-orange-50 text-orange-600 border-orange-100', dot: 'bg-orange-500' },
                                                fixed: { label: 'Fixed', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-500' },
                                                closed: { label: 'Closed', cls: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-500' },
                                            }[d.status] || { label: 'Open', cls: 'bg-red-50', dot: 'bg-red-500' };

                                            const priority = {
                                                low: { label: 'Low', cls: 'bg-slate-100 text-slate-600' },
                                                medium: { label: 'Medium', cls: 'bg-blue-50 text-blue-600' },
                                                high: { label: 'High', cls: 'bg-orange-50 text-orange-600' },
                                                critical: { label: 'Critical', cls: 'bg-red-600 text-white' },
                                            }[d.priority] || { label: 'Medium', cls: 'bg-blue-50' };

                                            return (
                                                <tr key={d._id} className="deficiency-row transition-colors group">
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-4">
                                                            {d.images && d.images.length > 0 ? (
                                                                <div className="w-10 h-10 rounded-xl border border-slate-200 overflow-hidden flex-shrink-0 bg-slate-50 flex items-center justify-center">
                                                                    {d.images[0].toLowerCase().includes('.pdf') ? (
                                                                        <FileText size={20} className="text-red-500" />
                                                                    ) : (
                                                                        <img src={d.images[0]} alt="Issue" className="w-full h-full object-cover" />
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-xl border border-slate-200 overflow-hidden flex-shrink-0 bg-slate-50 flex items-center justify-center text-slate-300">
                                                                    <ImageIcon size={16} />
                                                                </div>
                                                            )}
                                                            <div className="flex flex-col">
                                                                <span className="font-black text-slate-900 group-hover:text-slate-700 transition-colors uppercase tracking-tight text-xs">{d.title}</span>
                                                                <span className="text-[9px] font-bold text-slate-400 mt-0.5 line-clamp-1">{d.description || 'No description'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">{d.category}</span>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${priority.cls}`}>
                                                            {priority.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200">
                                                                {d.assignedTo ? d.assignedTo.fullName?.charAt(0) : '?'}
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-600">
                                                                {d.assignedTo?.fullName || 'Unassigned'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${status.cls}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                                            {status.label}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={async () => { 
                                                                    await ensureUsersLoaded();
                                                                    setDeficiencyModalMode('view'); 
                                                                    setSelectedDeficiency(d); 
                                                                    setIsDeficiencyModalOpen(true); 
                                                                }}
                                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                            {['COMPANY_OWNER', 'PM', 'FOREMAN', 'WORKER'].includes(user?.role) && d.status !== 'fixed' && d.status !== 'closed' && (
                                                                <button
                                                                    onClick={() => handleStatusUpdateDeficiency(d._id, 'fixed')}
                                                                    className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                                                                >
                                                                    <Check size={16} />
                                                                </button>
                                                            )}
                                                            {['COMPANY_OWNER', 'PM', 'FOREMAN'].includes(user?.role) && (
                                                                <>
                                                                    <button
                                                                        onClick={async () => { 
                                                                            await ensureUsersLoaded();
                                                                            setDeficiencyModalMode('edit'); 
                                                                            setSelectedDeficiency(d); 
                                                                            setIsDeficiencyModalOpen(true); 
                                                                        }}
                                                                        className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                                                                    >
                                                                        <Edit size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteDeficiency(d._id)}
                                                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Contacts Tab ── */}
            {activeTab === 'contacts' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center bg-white p-6 rounded-[28px] border border-slate-200/60 shadow-sm">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Project Contacts</h2>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Directory of individuals involved</p>
                        </div>
                        {['COMPANY_OWNER', 'PM', 'SUPER_ADMIN'].includes(user?.role) && (
                            <button
                                onClick={() => setIsAddingContact(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
                            >
                                <Plus size={16} /> Add Contact
                            </button>
                        )}
                    </div>

                    <div className="bg-white rounded-[28px] border border-slate-200/60 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <th className="px-6 py-4">Contact Info</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {project?.contacts?.map((contact, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-[14px] bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs border border-blue-100 shrink-0">
                                                        <Users size={16} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-black text-slate-900 text-sm truncate">{contact.name}</p>
                                                        {(contact.phone || contact.email) && (
                                                            <div className="flex items-center gap-2 mt-1 truncate">
                                                                {contact.phone && <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Phone size={10} className="text-slate-400" /> {contact.phone}</span>}
                                                                {contact.phone && contact.email && <span className="text-slate-300">•</span>}
                                                                {contact.email && <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Mail size={10} className="text-slate-400" /> {contact.email}</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {contact.role ? (
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full inline-block">
                                                        {contact.role}
                                                    </span>
                                                ) : <span className="text-slate-300 text-[10px] uppercase font-bold">—</span>}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {['COMPANY_OWNER', 'PM', 'SUPER_ADMIN'].includes(user?.role) ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button 
                                                            onClick={() => {
                                                                setNewContact({ ...contact });
                                                                setEditingContactIndex(idx);
                                                                setIsAddingContact(true);
                                                            }} 
                                                            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-blue-600 border border-transparent hover:border-blue-100 transition-all"
                                                            title="Edit Contact"
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteContact(idx)} 
                                                            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-100 transition-all"
                                                            title="Remove Contact"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ) : <span className="text-slate-300">—</span>}
                                            </td>
                                        </tr>
                                    ))}
                                    {(!project?.contacts || project.contacts.length === 0) && (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-16 text-center">
                                                <div className="flex flex-col items-center gap-3 text-slate-300">
                                                    <Users size={32} />
                                                    <p className="font-black uppercase tracking-widest text-xs">No contacts added yet</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Documents Tab ── */}
            {activeTab === 'documents' && (() => {
                const uniqueCategories = Array.from(new Set(
                    projectDocuments
                        .map(doc => doc.category || 'General')
                        .filter(Boolean)
                ));

                const filteredDocuments = projectDocuments.filter(doc => {
                    const matchesSearch = docSearch.trim() === '' || 
                        doc.title?.toLowerCase().includes(docSearch.toLowerCase()) ||
                        doc.description?.toLowerCase().includes(docSearch.toLowerCase()) ||
                        (doc.category || 'General').toLowerCase().includes(docSearch.toLowerCase()) ||
                        doc.uploadedBy?.fullName?.toLowerCase().includes(docSearch.toLowerCase());

                    const matchesCategory = docFilterCategory === 'all' || 
                        (doc.category || 'General').toLowerCase() === docFilterCategory.toLowerCase();

                    let matchesDate = true;
                    if (docFilterDate) {
                        const docDateString = new Date(doc.uploadDate).toISOString().split('T')[0];
                        matchesDate = docDateString === docFilterDate;
                    }

                    return matchesSearch && matchesCategory && matchesDate;
                });

                return (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center bg-white p-6 rounded-[28px] border border-slate-200/60 shadow-sm">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Project Documents</h2>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Store and manage project-related files</p>
                            </div>
                            {['COMPANY_OWNER', 'PM', 'FOREMAN'].includes(user?.role) && (
                                <button
                                    onClick={() => setIsAddingDoc(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
                                >
                                    <Plus size={16} /> Upload Document
                                </button>
                            )}
                        </div>

                        {/* Filter Bar */}
                        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col md:flex-row gap-4 items-center">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search by title, description, category or uploader..."
                                    value={docSearch}
                                    onChange={(e) => setDocSearch(e.target.value)}
                                    className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-xs font-bold"
                                />
                            </div>
                            <div className="flex gap-4 w-full md:w-auto shrink-0">
                                <select
                                    value={docFilterCategory}
                                    onChange={(e) => setDocFilterCategory(e.target.value)}
                                    className="flex-1 md:w-44 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl font-bold text-xs text-slate-600 outline-none hover:bg-slate-50 transition-all custom-select-appearance"
                                >
                                    <option value="all">All Categories</option>
                                    {uniqueCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>

                                <div className="relative flex-1 md:w-44">
                                    <input
                                        type="date"
                                        value={docFilterDate}
                                        onChange={(e) => setDocFilterDate(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl font-bold text-xs text-slate-600 outline-none hover:bg-slate-50 transition-all cursor-pointer"
                                    />
                                    {docFilterDate && (
                                        <button 
                                            onClick={() => setDocFilterDate('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            title="Clear Date"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[28px] border border-slate-200/60 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            <th className="px-6 py-4">Title</th>
                                            <th className="px-6 py-4">Category</th>
                                            <th className="px-6 py-4">Description</th>
                                            <th className="px-6 py-4">Upload Date</th>
                                            <th className="px-6 py-4">Uploaded By</th>
                                            <th className="px-6 py-4 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {docsLoading ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-16 text-center">
                                                    <Loader size={24} className="animate-spin text-blue-600 mx-auto" />
                                                </td>
                                            </tr>
                                        ) : filteredDocuments.map((doc) => (
                                            <tr key={doc._id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                                                            <FileText size={16} />
                                                        </div>
                                                        <span className="font-black text-slate-900 text-sm">{doc.title}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-100/50">
                                                        {doc.category || 'General'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-500 max-w-xs truncate">
                                                    {doc.description || '—'}
                                                </td>
                                                <td className="px-6 py-4 text-xs font-black text-slate-700">
                                                    {new Date(doc.uploadDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-600">
                                                    {doc.uploadedBy?.fullName || 'Unknown'}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <a 
                                                            href={doc.fileUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-blue-600 border border-transparent hover:border-blue-100 transition-all"
                                                            title="View/Download"
                                                        >
                                                            <Eye size={14} />
                                                        </a>
                                                        {['COMPANY_OWNER', 'PM', 'FOREMAN'].includes(user?.role) && (
                                                            <button 
                                                                onClick={() => handleDeleteDocument(doc._id)}
                                                                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-100 transition-all"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredDocuments.length === 0 && !docsLoading && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-16 text-center">
                                                    <div className="flex flex-col items-center gap-3 text-slate-300">
                                                        <FileText size={32} />
                                                        <p className="font-black uppercase tracking-widest text-xs">No documents stored yet</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {isAddingContact && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-slate-100/50 shrink-0">
                            <button 
                                onClick={() => {
                                    setIsAddingContact(false);
                                    setEditingContactIndex(null);
                                    setNewContact({ name: '', email: '', phone: '', role: '' });
                                }}
                                className="absolute top-8 right-8 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 transition-colors"
                            >
                                <X size={18} />
                            </button>
                            
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                                {editingContactIndex !== null ? <Edit size={20} /> : <UserCheck size={20} />}
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-1">{editingContactIndex !== null ? 'Edit Contact' : 'Add Contact'}</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Project Directory</p>
                        </div>
                        
                        <div className="p-8 overflow-y-auto min-h-0">
                            <form onSubmit={handleSaveContact} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Full Name *</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={newContact.name} 
                                        onChange={e => setNewContact({...newContact, name: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all outline-none placeholder:text-slate-300"
                                        placeholder="Enter contact's name"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Role *</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={newContact.role} 
                                        onChange={e => setNewContact({...newContact, role: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all outline-none placeholder:text-slate-300"
                                        placeholder="e.g. Electrician, Architect..."
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Email Address</label>
                                    <input 
                                        type="email" 
                                        value={newContact.email} 
                                        onChange={e => setNewContact({...newContact, email: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all outline-none placeholder:text-slate-300"
                                        placeholder="email@example.com"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Phone Number</label>
                                    <input 
                                        type="tel" 
                                        value={newContact.phone} 
                                        onChange={e => setNewContact({...newContact, phone: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all outline-none placeholder:text-slate-300"
                                        placeholder="(555) 555-0123"
                                    />
                                </div>
                                
                                <div className="pt-4 pb-2">
                                    <button 
                                        type="submit"
                                        disabled={isSubmittingContact}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all focus:ring-4 focus:ring-blue-50 outline-none flex items-center justify-center gap-2"
                                    >
                                        {isSubmittingContact ? (
                                            <>
                                                <Loader size={16} className="animate-spin" />
                                                <span>Saving...</span>
                                            </>
                                        ) : (
                                            editingContactIndex !== null ? 'Update Contact' : 'Save Contact'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {contactToDelete !== null && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-[32px] w-full max-w-[400px] shadow-2xl relative overflow-hidden flex flex-col items-center text-center p-8">
                        <button 
                            onClick={() => setContactToDelete(null)}
                            className="absolute top-6 right-6 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 transition-colors"
                        >
                            <X size={16} />
                        </button>
                        <div className="w-16 h-16 rounded-[20px] bg-red-50 text-red-500 flex items-center justify-center mb-6 border border-red-100/50">
                            <AlertTriangle size={28} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Remove Contact?</h3>
                        <p className="text-sm font-medium text-slate-500 mb-8 max-w-[280px]">
                            Are you sure you want to remove <strong className="text-slate-900">{project?.contacts?.[contactToDelete]?.name || 'this contact'}</strong> from the directory?
                        </p>
                        <div className="flex gap-4 w-full">
                            <button 
                                onClick={() => setContactToDelete(null)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDeleteContact}
                                disabled={isSubmittingContact}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                {isSubmittingContact ? <Loader size={16} className="animate-spin" /> : <><Trash2 size={16} /> Remove</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isAddingDoc && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-slate-100/50 shrink-0">
                            <button 
                                onClick={() => setIsAddingDoc(false)}
                                className="absolute top-8 right-8 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 transition-colors"
                            >
                                <X size={18} />
                            </button>
                            
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                                <Plus size={20} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Upload Document</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Store Doc File</p>
                        </div>
                        
                        <div className="p-8 overflow-y-auto min-h-0">
                            <form onSubmit={handleUploadDocument} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Title *</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={newDoc.title} 
                                        onChange={e => setNewDoc({...newDoc, title: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all outline-none"
                                        placeholder="Document title"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Category</label>
                                    <input 
                                        type="text" 
                                        value={newDoc.category} 
                                        onChange={e => setNewDoc({...newDoc, category: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all outline-none"
                                        placeholder="e.g. Contract, Invoice, Permit, Layout..."
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Description</label>
                                    <textarea 
                                        value={newDoc.description} 
                                        onChange={e => setNewDoc({...newDoc, description: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all outline-none min-h-[100px]"
                                        placeholder="What is this document about?"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Upload Date *</label>
                                    <input 
                                        type="date" 
                                        required
                                        value={newDoc.uploadDate} 
                                        onChange={e => setNewDoc({...newDoc, uploadDate: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all outline-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">File *</label>
                                    <input 
                                        type="file" 
                                        required
                                        onChange={e => {
                                            const file = e.target.files[0];
                                            if (file && file.size > 50 * 1024 * 1024) {
                                                setShowSizeError(true);
                                                e.target.value = '';
                                                setNewDoc({...newDoc, file: null});
                                            } else {
                                                setNewDoc({...newDoc, file: file});
                                            }
                                        }}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 transition-all outline-none"
                                    />
                                </div>
                                
                                <div className="pt-4 pb-2">
                                    <button 
                                        type="submit"
                                        disabled={isSubmittingDoc}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all focus:ring-4 focus:ring-blue-50 outline-none flex items-center justify-center gap-2"
                                    >
                                        {isSubmittingDoc ? (
                                            <>
                                                <Loader size={16} className="animate-spin" />
                                                <span>Uploading...</span>
                                            </>
                                        ) : (
                                            'Upload Document'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {docToDelete && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-[32px] w-full max-w-[400px] shadow-2xl relative overflow-hidden flex flex-col items-center text-center p-8">
                        <div className="w-16 h-16 rounded-[20px] bg-red-50 text-red-500 flex items-center justify-center mb-6 border border-red-100/50">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Delete Document?</h3>
                        <p className="text-sm font-medium text-slate-500 mb-8 max-w-[280px]">
                            Are you sure you want to delete this document? This action cannot be undone.
                        </p>
                        <div className="flex gap-4 w-full">
                            <button 
                                onClick={() => setDocToDelete(null)}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDeleteDocument}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Trash2 size={16} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showUploadSuccess && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-[32px] w-full max-w-[400px] shadow-2xl relative overflow-hidden flex flex-col items-center text-center p-8">
                        <div className="w-16 h-16 rounded-[20px] bg-emerald-50 text-emerald-500 flex items-center justify-center mb-6 border border-emerald-100/50">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Upload Successful!</h3>
                        <p className="text-sm font-medium text-slate-500 mb-8 max-w-[280px]">
                            Your document has been uploaded and stored successfully in the project vault.
                        </p>
                        <button 
                            onClick={() => setShowUploadSuccess(false)}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-900/20"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            )}

            {showUpdateSuccess && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-[32px] w-full max-w-[400px] shadow-2xl relative overflow-hidden flex flex-col items-center text-center p-8">
                        <div className="w-16 h-16 rounded-[20px] bg-emerald-50 text-emerald-500 flex items-center justify-center mb-6 border border-emerald-100/50">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Update Posted!</h3>
                        <p className="text-sm font-medium text-slate-500 mb-8 max-w-[280px]">
                            The project update has been successfully posted and is now visible to the client.
                        </p>
                        <button 
                            onClick={() => setShowUpdateSuccess(false)}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-900/20"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            )}

            {showSizeError && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-[32px] w-full max-w-[400px] shadow-2xl relative overflow-hidden flex flex-col items-center text-center p-8">
                        <div className="w-16 h-16 rounded-[20px] bg-orange-50 text-orange-500 flex items-center justify-center mb-6 border border-orange-100/50">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">File Too Large</h3>
                        <p className="text-sm font-medium text-slate-500 mb-8 max-w-[280px]">
                            The file you selected exceeds the <strong className="text-slate-900">50MB</strong> limit. Please select a smaller file or split it.
                        </p>
                        <button 
                            onClick={() => setShowSizeError(false)}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-orange-500/20"
                        >
                            Understood
                        </button>
                    </div>
                </div>
            )}
            {/* Deficiency Modal */}
            <DeficiencyModal
                isOpen={isDeficiencyModalOpen}
                onClose={() => setIsDeficiencyModalOpen(false)}
                onSave={handleSaveDeficiency}
                initialData={selectedDeficiency}
                mode={deficiencyModalMode}
                users={users}
                projectMembers={projectMembers}
                currentUser={user}
                isSubmitting={isSubmittingDeficiency}
            />
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    if (deletingId) return;
                    setIsDeleteModalOpen(false);
                    setJobToDelete(null);
                }}
                title="Delete Job"
            >
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-[20px] bg-red-50 text-red-500 flex items-center justify-center mb-6 border border-red-100/50">
                        <AlertTriangle size={28} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Confirm Deletion</h3>
                    <p className="text-sm font-medium text-slate-500 mb-8 max-w-[280px]">
                        Are you sure you want to delete <strong className="text-slate-900">{jobToDelete?.name}</strong>? All associated data will be permanently removed.
                    </p>
                    <div className="flex gap-4 w-full">
                        <button 
                            onClick={() => {
                                setIsDeleteModalOpen(false);
                                setJobToDelete(null);
                            }}
                            disabled={deletingId}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmDeleteJob}
                            disabled={deletingId}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {deletingId ? <Loader size={16} className="animate-spin" /> : <><Trash2 size={16} /> Delete</>}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={deficiencyToDelete !== null}
                onClose={() => setDeficiencyToDelete(null)}
                title="Delete Deficiency"
            >
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 mb-6 border border-red-100">
                        <Trash2 size={32} />
                    </div>

                    <h3 className="text-xl font-black text-slate-900 mb-2">Delete Issue?</h3>
                    <p className="text-slate-500 font-bold text-sm leading-relaxed mb-8 max-w-[280px]">
                        Are you sure you want to remove this deficiency? This action cannot be undone.
                    </p>

                    <div className="flex gap-3 w-full">
                        <button 
                            onClick={() => setDeficiencyToDelete(null)}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-500 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmDeleteDeficiency}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            <Trash2 size={16} /> Delete
                        </button>
                    </div>
                </div>
            </Modal>
            {activeTab === 'notes' && (
                <div className="p-4 md:p-8 animate-fade-in space-y-8 min-h-[600px] bg-slate-50/30 rounded-[32px]">
                    {/* Note Input Form */}
                    <div className="bg-white p-6 rounded-[30px] border border-slate-200 shadow-sm">
                        <form onSubmit={handleAddProjectNote} className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <MessageSquare size={16} className="text-blue-600" />
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                                    {editingNoteId ? 'Edit Project Note' : 'Add Project Note'}
                                </h3>
                            </div>
                            <textarea
                                value={newProjectNote}
                                onChange={(e) => setNewProjectNote(e.target.value)}
                                placeholder="Write a note about this project, specific requirements, or updates..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/50 transition-all min-h-[120px] resize-none"
                            />
                            <div className="flex justify-end gap-3">
                                {editingNoteId && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingNoteId(null);
                                            setNewProjectNote('');
                                        }}
                                        className="bg-slate-100 text-slate-400 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
                                    >
                                        <X size={16} /> Cancel
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={!newProjectNote.trim() || isSubmittingNote}
                                    className="bg-blue-600 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                                >
                                    {isSubmittingNote ? <Loader size={16} className="animate-spin" /> : (editingNoteId ? <Edit size={16} /> : <Plus size={16} />)} 
                                    {editingNoteId ? 'Update Note' : 'Save Note'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Notes List */}
                    <div className="space-y-4">
                        <h3 className="px-1 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Recent Project Notes</h3>
                        {notesLoading && projectNotes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader size={30} className="text-blue-600 animate-spin" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading notes...</p>
                            </div>
                        ) : projectNotes.length === 0 ? (
                            <div className="bg-white border border-dashed border-slate-200 rounded-[30px] p-20 flex flex-col items-center gap-4 text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
                                    <MessageSquare size={32} strokeWidth={1} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No project notes found</p>
                                    <p className="text-xs text-slate-400 font-bold max-w-[200px]">Important project updates and notes will appear here once added.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {projectNotes.map((note) => (
                                    <div key={note._id} className="bg-white border border-slate-100 p-6 rounded-[28px] shadow-sm hover:shadow-md transition-all group flex gap-5">
                                        <div className="shrink-0">
                                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm uppercase border border-blue-100 shadow-inner">
                                                {note.createdBy?.fullName?.charAt(0) || '?'}
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-900 tracking-tight">{note.createdBy?.fullName || 'Anonymous User'}</h4>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                                        {new Date(note.createdAt).toLocaleDateString(undefined, { 
                                                            month: 'short', day: 'numeric', year: 'numeric',
                                                            hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                                {(user?.role === 'COMPANY_OWNER' || user?._id === note.createdBy?._id) && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                handleStartEditNote(note);
                                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                                            }}
                                                            className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                                            title="Edit Note"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setNoteToDelete(note._id)}
                                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                            title="Delete Note"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-sm text-slate-600 font-bold leading-relaxed whitespace-pre-wrap">
                                                {note.content}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Note Deletion Confirmation Modal */}
            {noteToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl border border-white/20 animate-in zoom-in duration-200">
                        <div className="flex flex-col items-center text-center gap-5">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center">
                                <Trash2 size={32} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Delete Project Note?</h3>
                                <p className="text-xs text-slate-400 font-bold leading-relaxed px-4">
                                    Are you sure you want to remove this project note? This action cannot be undone and will be permanently removed.
                                </p>
                            </div>
                            <div className="flex gap-3 w-full mt-2">
                                <button
                                    onClick={() => setNoteToDelete(null)}
                                    className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteProjectNote}
                                    disabled={isSubmittingNote}
                                    className="flex-1 px-4 py-3 rounded-2xl bg-red-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2"
                                >
                                    {isSubmittingNote ? <Loader size={14} className="animate-spin" /> : 'Yes, Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectDetails;
