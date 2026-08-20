import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Briefcase, Clock, CheckCircle, AlertCircle, Plus,
    Search, Filter, MoreHorizontal, Camera, FileText,
    Users, MapPin, DollarSign, ChevronRight, Layout,
    Trash2, Edit, Save, X, ArrowLeft, TrendingUp,
    AlertTriangle, ShoppingCart, Download, History, UserPlus,
    ChevronDown, ChevronUp, Check, Loader, MessageSquare, Info
} from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import TaskModal from '../../components/jobs/TaskModal';
import CancellationModal from '../../components/jobs/CancellationModal';

const JobDetails = () => {
    const { projectId, jobId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [job, setJob] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [companyUsers, setCompanyUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('tasks');
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [notesLoading, setNotesLoading] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState(null);
    const [isSubmittingNote, setIsSubmittingNote] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [taskToCancel, setTaskToCancel] = useState(null);
    const [jobPOs, setJobPOs] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [historyData, setHistoryData] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    // Assign modal state
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [assigningTask, setAssigningTask] = useState(null);
    const [availableWorkers, setAvailableWorkers] = useState([]);
    const [assignLoading, setAssignLoading] = useState(false);

    const [activeTimeLog, setActiveTimeLog] = useState(null);
    const [clockTogglingId, setClockTogglingId] = useState(null);

    // Tree State
    const [expandedTasks, setExpandedTasks] = useState(new Set());
    const [newSubTask, setNewSubTask] = useState({ 
        title: '', assignedTo: '', startDate: '', dueDate: '', 
        priority: 'Medium', parentTaskId: null, parentSubTaskId: null 
    });
    const [submittingSubTask, setSubmittingSubTask] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

    const fetchJobDetails = async () => {
        try {
            setLoading(true);
            // 1. Fetch Core Job data first
            const jobRes = await api.get(`/jobs/${jobId}`);
            setJob(jobRes.data);
            setLoading(false); // Unblock the UI

            // 2. Fetch everything else in background
            const [tasksRes, usersRes, poRes, logsRes] = await Promise.all([
                api.get(`/job-tasks/job/${jobId}`).catch(() => ({ data: [] })),
                api.get('/auth/users').catch(() => ({ data: [] })),
                api.get(`/purchase-orders?jobId=${jobId}`).catch(() => ({ data: [] })),
                api.get(`/timelogs?userId=${user?._id}`).catch(() => ({ data: [] }))
            ]);
            
            setTasks(tasksRes.data || []);
            const users = (usersRes.data || []).filter(u => !['CLIENT', 'COMPANY_OWNER'].includes(u.role));
            setCompanyUsers(users);
            setJobPOs(poRes?.data || []);

            const logs = logsRes.data || [];
            const activeLog = logs.find(l => !l.clockOut);
            setActiveTimeLog(activeLog || null);
            
            if (user?.role === 'FOREMAN') {
                setAvailableWorkers(users.filter(u => u.role === 'WORKER'));
            }
        } catch (err) {
            console.error('Error fetching job details:', err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobDetails();
        fetchTemplates();
    }, [jobId]);

    const fetchTemplates = async () => {
        try {
            const res = await api.get('/task-templates');
            setTemplates(res.data);
        } catch (err) { console.error('Error fetching templates:', err); }
    };

    const handleApplyTemplate = async (templateId) => {
        try {
            setSubmitting(true);
            await api.post(`/task-templates/${templateId}/apply`, { jobId });
            setIsTemplateModalOpen(false);
            fetchJobDetails();
            alert('Template applied successfully!');
        } catch (err) {
            console.error('Error applying template:', err);
            alert(err.response?.data?.message || 'Failed to apply template');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle assigning a worker to a task (Foreman action)
    const handleAssignWorker = async (workerId) => {
        if (!assigningTask) return;
        try {
            setAssignLoading(true);
            await api.patch(`/job-tasks/${assigningTask._id}`, { assignedTo: workerId });
            setIsAssignModalOpen(false);
            setAssigningTask(null);
            fetchJobDetails();
        } catch (err) {
            console.error('Error assigning worker:', err);
            alert('Failed to assign worker. Please try again.');
        } finally {
            setAssignLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            setHistoryLoading(true);
            const res = await api.get(`/jobs/${jobId}/full-history`);
            setHistoryData(res.data);
        } catch (err) {
            console.error('Error fetching job history:', err);
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'history') {
            fetchHistory();
        }
    }, [activeTab, jobId]);



    const handleDownloadHistory = async () => {
        try {
            const response = await api.get(`/jobs/${jobId}/history-pdf`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${job?.name || 'Job'}_History.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Error downloading history:', err);
            alert('Failed to download history PDF');
        }
    };

    const handleUpdateTaskStatus = async (taskId, newStatus) => {
        try {
            const res = await api.patch(`/job-tasks/${taskId}`, { status: newStatus });
            setTasks(prev => prev.map(t => t._id === taskId ? res.data : t));
            fetchJobDetails(); // Refresh to update job progress
        } catch (err) {
            console.error('Error updating task status:', err);
        }
    };

    const handleToggleExpand = (id) => {
        setExpandedTasks(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const fetchNotes = async () => {
        try {
            setNotesLoading(true);
            const res = await api.get(`/jobs/${jobId}/notes`);
            setNotes(res.data);
        } catch (err) {
            console.error('Failed to fetch notes:', err);
        } finally {
            setNotesLoading(false);
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newNote.trim()) return;
        try {
            setIsSubmittingNote(true);
            const res = await api.post(`/jobs/${jobId}/notes`, { content: newNote });
            setNotes(prev => [res.data, ...prev]);
            setNewNote('');
        } catch (err) {
            console.error('Error adding note:', err);
        } finally {
            setIsSubmittingNote(false);
        }
    };

    const handleDeleteNote = async () => {
        if (!noteToDelete) return;
        try {
            setIsSubmittingNote(true);
            await api.delete(`/jobs/${jobId}/notes/${noteToDelete}`);
            setNotes(prev => prev.filter(n => n._id !== noteToDelete));
            setNoteToDelete(null);
        } catch (err) {
            console.error('Error deleting note:', err);
        } finally {
            setIsSubmittingNote(false);
        }
    };

    const handleAddSubTask = async (parentTaskId, parentSubTaskId = null) => {
        if (!newSubTask.title.trim()) return;
        try {
            setSubmittingSubTask(true);
            await api.post(`/tasks/${parentTaskId}/subtasks`, {
                title: newSubTask.title,
                assignedTo: newSubTask.assignedTo || undefined,
                priority: newSubTask.priority,
                startDate: newSubTask.startDate || undefined,
                dueDate: newSubTask.dueDate || undefined,
                parentSubTaskId: parentSubTaskId
            });
            setNewSubTask({ title: '', assignedTo: '', startDate: '', dueDate: '', priority: 'Medium', parentTaskId: null, parentSubTaskId: null });
            fetchJobDetails();
        } catch (err) {
            console.error('Error adding sub-task:', err);
        } finally {
            setSubmittingSubTask(false);
        }
    };

    const renderTaskRow = (task, depth = 0, isLast = false, levelLines = []) => {
        const isExpanded = expandedTasks.has(task._id);
        const children = tasks.filter(t => t.parentSubTaskId === task._id || (t.isSubTask && t.taskId === task._id && !t.parentSubTaskId));
        const hasChildren = children.length > 0;
        
        // Tree Connector Geometry
        const indentStep = 28;
        const indentPx = 24 + depth * indentStep;
        const baseOffset = 24;

        return (
            <React.Fragment key={task._id}>
                <tr className="hover:bg-slate-50/50 transition-colors group relative border-b border-slate-50">
                    {/* Status Checkbox */}
                    <td className="px-5 py-4 w-16">
                        <button
                            onClick={() => {
                                if (task.status === 'cancelled') return;
                                const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
                                handleUpdateTaskStatus(task._id, nextStatus);
                            }}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shadow-sm ${task.status === 'completed'
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'bg-white border-slate-300 hover:border-blue-500 hover:bg-blue-50'
                                }`}
                        >
                            {task.status === 'completed' ? <Check size={12} strokeWidth={3} /> : <div className="w-1 h-1 bg-transparent" />}
                        </button>
                    </td>

                    {/* Task Content with Tree Connectors */}
                    <td className="px-5 py-4 relative" style={{ paddingLeft: `${indentPx}px` }}>
                        {/* Tree Lines */}
                        <div className="absolute left-0 top-0 bottom-0 pointer-events-none">
                            {levelLines.map((hasLine, i) => (
                                hasLine && (
                                    <div
                                        key={i}
                                        className="absolute top-0 bottom-0 border-l-[1.5px] border-slate-200"
                                        style={{ left: `${baseOffset + i * indentStep}px` }}
                                    />
                                )
                            ))}
                            {depth > 0 && (
                                <div
                                    className="absolute border-slate-200"
                                    style={{
                                        left: `${baseOffset + (depth - 1) * indentStep}px`,
                                        top: '0',
                                        height: '50%',
                                        width: '18px',
                                        borderLeftWidth: '1.5px',
                                        borderBottomWidth: '1.5px',
                                        borderBottomLeftRadius: '8px',
                                    }}
                                />
                            )}
                            {depth > 0 && !isLast && (
                                <div
                                    className="absolute border-l-[1.5px] border-slate-200"
                                    style={{
                                        left: `${baseOffset + (depth - 1) * indentStep}px`,
                                        top: '50%',
                                        bottom: '0',
                                    }}
                                />
                            )}
                        </div>

                        <div className="flex items-center gap-2 relative z-10">
                            {/* Expand Toggle */}
                            <button
                                onClick={() => handleToggleExpand(task._id)}
                                className={`shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all ${hasChildren
                                    ? 'text-slate-500 bg-white hover:bg-slate-50 shadow-sm border border-slate-100'
                                    : 'invisible'}`}
                                style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.1s ease-out' }}
                            >
                                <ChevronRight size={10} />
                            </button>

                            <div className="flex flex-col min-w-0">
                                <span className={`text-[13px] font-black tracking-tight truncate max-w-[300px] ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                    {task.title}
                                </span>
                                {task.description && <span className="text-[10px] text-slate-400 font-bold truncate">{task.description}</span>}
                            </div>

                            {/* Subtask Counter */}
                            {hasChildren && (
                                <span className="text-[7px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                                    {children.length}
                                </span>
                            )}
                        </div>
                    </td>

                    {/* Assigned To */}
                    <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-slate-100 text-slate-500 flex items-center justify-center text-[8px] font-black border border-slate-200">
                                {task.assignedTo?.fullName?.charAt(0) || '?'}
                            </div>
                            <span className="text-[11px] font-bold text-slate-700">{task.assignedTo?.fullName || 'Unassigned'}</span>
                        </div>
                    </td>

                    {/* Priority */}
                    <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border 
                            ${task.priority?.toLowerCase() === 'high' ? 'bg-red-50 text-red-600 border-red-100' :
                                task.priority?.toLowerCase() === 'medium' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                    'bg-blue-50 text-blue-600 border-blue-100'}`}>
                            {task.priority || 'Medium'}
                        </span>
                    </td>

                    {/* Due Date */}
                    <td className="px-5 py-4">
                         <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Flexible'}
                         </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-100">
                             {/* Add Subtask Indicator - Disabled locally per request */}
                             {/* <button
                                onClick={() => {
                                    setNewSubTask(prev => ({ 
                                        ...prev, 
                                        parentTaskId: task.isSubTask ? task.taskId : task._id, 
                                        parentSubTaskId: task.isSubTask ? task._id : null 
                                    }));
                                }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Add Subtask"
                             >
                                <Plus size={14} />
                             </button> */}
                             <button
                                onClick={() => { setEditingTask(task); setIsTaskModalOpen(true); }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Edit"
                             >
                                <Edit size={14} />
                             </button>
                             <button
                                onClick={() => handleDeleteTask(task._id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete"
                             >
                                <Trash2 size={14} />
                             </button>
                        </div>
                    </td>
                </tr>

                {/* Inline New Subtask Input */}
                {(newSubTask.parentTaskId === (task.isSubTask ? task.taskId : task._id) && 
                  newSubTask.parentSubTaskId === (task.isSubTask ? task._id : null)) && (
                    <tr className="bg-slate-50/10 border-b border-slate-50">
                        <td className="px-5 py-3" />
                        <td className="px-5 py-3" colSpan="5" style={{ paddingLeft: `${indentPx + indentStep}px` }}>
                            <form 
                                onSubmit={(e) => { e.preventDefault(); handleAddSubTask(newSubTask.parentTaskId, newSubTask.parentSubTaskId); }}
                                className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-200"
                            >
                                <div className="flex-1 bg-white border border-blue-200 rounded-xl px-3 py-1.5 shadow-sm ring-2 ring-blue-50/50">
                                    <input 
                                        autoFocus
                                        className="w-full bg-transparent border-none outline-none text-[12px] font-black text-slate-800 placeholder-slate-400"
                                        placeholder="Subtask title..."
                                        value={newSubTask.title}
                                        onChange={e => setNewSubTask({ ...newSubTask, title: e.target.value })}
                                        disabled={submittingSubTask}
                                    />
                                </div>
                                <select 
                                    className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none"
                                    value={newSubTask.assignedTo}
                                    onChange={e => setNewSubTask({ ...newSubTask, assignedTo: e.target.value })}
                                >
                                    <option value="">Assign To</option>
                                    {companyUsers.map(u => <option key={u._id} value={u._id}>{u.fullName}</option>)}
                                </select>
                                <div className="flex gap-1">
                                    <button 
                                        type="submit"
                                        disabled={submittingSubTask || !newSubTask.title.trim()}
                                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-1 shadow-lg shadow-blue-200 disabled:opacity-50"
                                    >
                                        {submittingSubTask ? <Loader size={12} className="animate-spin" /> : <Plus size={12} />}
                                        Add
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setNewSubTask({ ...newSubTask, parentTaskId: null, parentSubTaskId: null })}
                                        className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </form>
                        </td>
                    </tr>
                )}

                {/* Recursive Children Rendering */}
                {isExpanded && hasChildren && (
                    renderTree(children, depth + 1, [...levelLines, !isLast])
                )}
            </React.Fragment>
        );
    };

    const renderTree = (tasksToRender, depth = 0, levelLines = []) => {
        // Find orphans or root-level items for this depth
        const sorted = [...tasksToRender].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        return sorted.map((task, index) => renderTaskRow(task, depth, index === sorted.length - 1, levelLines));
    };

    const handleClockToggle = async (taskId) => {
        try {
            setClockTogglingId(taskId);

            const getPosition = () => new Promise((resolve, reject) => {
                if (!navigator.geolocation) return reject(new Error('Geolocation is not supported by your browser.'));
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve(pos.coords),
                    (err) => {
                        navigator.geolocation.getCurrentPosition(
                            (pos) => resolve(pos.coords),
                            (err2) => reject(err2),
                            { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
                        );
                    },
                    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                );
            });

            if (activeTimeLog && activeTimeLog.taskId?._id === taskId) {
                // Stop Clock
                const coords = await getPosition();
                await api.post('/timelogs/clock-out', {
                    latitude: coords?.latitude,
                    longitude: coords?.longitude
                });
                setActiveTimeLog(null);
            } else if (!activeTimeLog) {
                // Start Clock
                const coords = await getPosition();
                const res = await api.post('/timelogs/clock-in', {
                    projectId: job?.projectId?._id,
                    jobId: job?._id,
                    taskId: taskId,
                    latitude: coords?.latitude,
                    longitude: coords?.longitude,
                    deviceInfo: navigator.userAgent
                });
                setActiveTimeLog(res.data);
                // Update local task state to bypass refresh
                setTasks(prev => prev.map(t =>
                    t._id === taskId ? { ...t, status: 'in_progress' } : t
                ));
            } else {
                alert('You are already clocked into another task. Please clock out first.');
            }
        } catch (err) {
            console.error('Clock toggle error:', err);
            alert(err.response?.data?.message || 'Error occurred while toggling the clock.');
        } finally {
            setClockTogglingId(null);
        }
    };

    const handleCancelTask = async (reason) => {
        try {
            setSubmitting(true);
            const res = await api.patch(`/job-tasks/${taskToCancel}`, {
                status: 'cancelled',
                cancellationReason: reason
            });
            setTasks(prev => prev.map(t => t._id === taskToCancel ? res.data : t));
            setIsCancellationModalOpen(false);
            setTaskToCancel(null);
            fetchJobDetails(); // Refresh progress
        } catch (err) {
            console.error('Error cancelling task:', err);
            alert('Failed to cancel task. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;
        try {
            await api.delete(`/job-tasks/${taskId}`);
            setTasks(prev => prev.filter(t => t._id !== taskId));
            const refreshedJob = await api.get(`/jobs/${jobId}`);
            setJob(refreshedJob.data);
        } catch (err) {
            console.error('Error deleting task:', err);
        }
    };

    const isWorkerOrForeman = ['WORKER', 'FOREMAN', 'SUBCONTRACTOR'].includes(user?.role);
    const tabs = user?.role === 'WORKER'
        ? [
            { id: 'tasks', label: 'Tasks', icon: CheckCircle },
            { id: 'notes', label: 'Notes', icon: MessageSquare },
        ]
        : user?.role === 'FOREMAN' ? [
            { id: 'tasks', label: 'Tasks', icon: CheckCircle },
            { id: 'notes', label: 'Notes', icon: MessageSquare },
            { id: 'history', label: 'History', icon: History },
        ]
            : [
                // { id: 'overview', label: 'Overview', icon: Layout },
                { id: 'tasks', label: 'Tasks', icon: CheckCircle },
                { id: 'notes', label: 'Notes', icon: MessageSquare },
                { id: 'pos', label: 'Purchase Orders', icon: ShoppingCart },
                { id: 'history', label: 'History', icon: History },
                // { id: 'photos', label: 'Photos', icon: Camera },
                // { id: 'documents', label: 'Documents', icon: FileText },
                // { id: 'logs', label: 'Daily Logs', icon: Clock },
            ];

    if (loading && !job) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header / Breadcrumbs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div className="space-y-1">
                    <button
                        onClick={() => {
                            if (isWorkerOrForeman) {
                                navigate('/company-admin/projects');
                            } else {
                                navigate(`/company-admin/projects/${projectId}`);
                            }
                        }}
                        className="flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors mb-2"
                    >
                        <ArrowLeft size={14} /> {isWorkerOrForeman ? 'Back to My Jobs' : 'Back to Project'}
                    </button>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
                        {job?.name}
                        <span className={`px-3 py-1 text-[10px] uppercase tracking-widest rounded-full border shadow-sm 
                            ${job?.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                job?.status === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                    'bg-slate-50 text-slate-600 border-slate-200'}`}>
                            {job?.status}
                        </span>
                    </h1>
                    <p className="text-slate-500 font-bold text-sm tracking-tight flex items-center gap-2">
                        <MapPin size={14} className="text-slate-400" /> {job?.location || 'No location set'}
                    </p>
                </div>

                {/* {['COMPANY_OWNER', 'PM', 'FOREMAN'].includes(user?.role) && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setEditingTask(null);
                                setIsTaskModalOpen(true);
                            }}
                            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-tight hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
                        >
                            <Plus size={16} /> New Task
                        </button>
                    </div>
                )} */}
            </div>

            {/* Stats / Progress Quick Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-black relative">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-blue-100" />
                            <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={150.8} strokeDashoffset={150.8 - (150.8 * (job?.progress || 0)) / 100} className="text-blue-600 transition-all duration-1000" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs">{job?.progress || 0}%</span>
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Global Progress</p>
                        <p className="text-xl font-black text-slate-900 tracking-tighter">{job?.progress || 0}% Complete</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                        <CheckCircle size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Tasks Overview</p>
                        <p className="text-xl font-black text-slate-900 tracking-tighter">
                            {tasks.filter(t => t.status === 'completed').length} / {tasks.length} Completed
                        </p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Users size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Team Assigned</p>
                        <p className="text-xl font-black text-slate-900 tracking-tighter">
                            {job?.assignedWorkers?.length || 0} Workers
                        </p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white border-b border-slate-200 flex overflow-x-auto no-scrollbar rounded-t-3xl">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id);
                            if (tab.id === 'notes') fetchNotes();
                        }}
                        className={`px-8 py-5 flex items-center gap-2.5 text-xs font-black uppercase tracking-widest transition-all relative whitespace-nowrap
                            ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-b-3xl border-x border-b border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                {activeTab === 'tasks' && (
                    <div className="p-0 animate-fade-in">
                        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search tasks..."
                                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm font-bold shadow-sm"
                                />
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                                <button className="flex-1 md:flex-none px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                                    <Filter size={14} /> Filter
                                </button>
                                <button className="flex-1 md:flex-none px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                                    Priority: All
                                </button>
                                {['COMPANY_OWNER', 'PM', 'FOREMAN', 'SUBCONTRACTOR'].includes(user?.role) && (
                                    <button 
                                        onClick={() => setIsTemplateModalOpen(true)}
                                        className="flex-1 md:flex-none px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-100 transition-all flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <Briefcase size={14} /> Import Template
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/80 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Task Details</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned To</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Priority</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Due Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {tasks.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-24 text-center">
                                                <div className="flex flex-col items-center gap-3 text-slate-300">
                                                    <CheckCircle size={48} className="opacity-20" />
                                                    <p className="font-black uppercase tracking-widest text-xs">No tasks added yet</p>
                                                    {(user.role !== 'WORKER') && (
                                                        <button
                                                            onClick={() => setIsTaskModalOpen(true)}
                                                            className="mt-2 text-blue-600 text-xs font-bold hover:underline"
                                                        >
                                                            Create the first task
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        renderTree(tasks.filter(t => !t.isSubTask))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {activeTab === 'overview' && (
                    <div className="p-10 flex flex-col items-center justify-center text-center gap-4 animate-fade-in py-32">
                        <TrendingUp size={48} className="text-slate-200" />
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Detail View Coming Soon</h3>
                        <p className="max-w-xs text-xs text-slate-400 font-bold leading-relaxed">The job overview will feature advanced analytics, budget tracking, and timeline visualizations in the next update.</p>
                    </div>
                )}
                {activeTab === 'pos' && (
                    <div className="p-0 animate-fade-in">
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Job Purchase Orders</h3>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Procurement specifically for this site job</p>
                            </div>
                            <button
                                onClick={() => navigate(`/company-admin/purchase-orders/new?projectId=${projectId}&jobId=${jobId}`)}
                                className="w-full md:w-auto bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 transition shadow-xl shadow-blue-200 border border-blue-500/50"
                            >
                                <Plus size={18} /> Raise PO Request
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white border-b border-slate-100">
                                    <tr>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">PO Number</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendor Details</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total Amount</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Created Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {jobPOs.length > 0 ? jobPOs.map(po => (
                                        <tr
                                            key={po._id}
                                            onClick={() => navigate(`/company-admin/purchase-orders/${po._id}`)}
                                            className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                                        >
                                            <td className="px-8 py-5 font-black text-slate-900">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                                                        <FileText size={16} />
                                                    </div>
                                                    {po.poNumber}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-[10px] uppercase border border-blue-100">
                                                        {(po.vendorName || po.vendorId?.name || 'V').charAt(0)}
                                                    </div>
                                                    <span className="font-bold text-slate-700">{po.vendorName || po.vendorId?.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right font-black text-slate-900">
                                                ${po.totalAmount?.toLocaleString()}
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border shadow-sm bg-slate-50 text-slate-600 border-slate-200`}>
                                                    {po.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-slate-400 font-bold text-xs">
                                                {new Date(po.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="5" className="px-8 py-24 text-center">
                                                <div className="flex flex-col items-center gap-4 text-slate-300">
                                                    <div className="w-20 h-20 bg-slate-50 rounded-[30px] flex items-center justify-center border border-slate-100">
                                                        <ShoppingCart size={32} className="opacity-20" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="font-black uppercase tracking-widest text-xs">No project costs recorded</p>
                                                        <p className="text-[10px] font-bold text-slate-400">Raise a PO to start tracking expenses for this job</p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="p-0 animate-fade-in flex flex-col gap-6 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Job Full History</h3>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Complete record of every action and work hour</p>
                            </div>
                            <button
                                onClick={handleDownloadHistory}
                                className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2"
                            >
                                <Download size={14} /> Download Full History
                            </button>
                        </div>

                        {historyLoading && !historyData ? (
                            <div className="flex items-center justify-center py-24">
                                <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <>
                                {/* SECTION 1: Summary Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Total Workers', value: historyData?.worker_summary?.length || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                                        { label: 'Total Hours', value: historyData?.worker_summary?.reduce((acc, curr) => acc + curr.totalHours, 0).toFixed(1) || '0.0', icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                        { label: 'Total Days Worked', value: historyData?.daily_logs?.length || 0, icon: Briefcase, color: 'text-orange-600', bg: 'bg-orange-50' },
                                        { label: 'Completion', value: `${job?.progress || 0}%`, icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
                                    ].map((stat, i) => (
                                        <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                                                <stat.icon size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                                <p className="text-lg font-black text-slate-900 tracking-tighter">{stat.value}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* SECTION 2: Worker Summary Table */}
                                <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm mt-4">
                                    <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Worker Summary Aggregation</h4>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50/30 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Worker</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Total Days</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Total Hours</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Avg Hours/Day</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {historyData?.worker_summary?.length > 0 ? historyData.worker_summary.map((w, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-[10px] uppercase">
                                                                    {w.workerName.charAt(0)}
                                                                </div>
                                                                <span className="text-xs font-black text-slate-700">{w.workerName}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center text-xs font-bold text-slate-500">{w.totalDays}</td>
                                                        <td className="px-6 py-4 text-center text-xs font-black text-slate-900">{w.totalHours.toFixed(1)} hrs</td>
                                                        <td className="px-6 py-4 text-right text-xs font-bold text-blue-600">{(w.totalHours / (w.totalDays || 1)).toFixed(1)} hrs</td>
                                                    </tr>
                                                )) : (
                                                    <tr><td colSpan="4" className="px-6 py-10 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">No work records found</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* SECTION 2.5: Task Summary Table */}
                                <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm mt-4">
                                    <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Task Hours Aggregation</h4>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50/30 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Task Title</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Total Hours Allocated</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {historyData?.task_summary?.length > 0 ? historyData.task_summary.map((t, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center font-black text-[10px] uppercase">
                                                                    {(t.taskName || 'U').charAt(0)}
                                                                </div>
                                                                <span className="text-xs font-black text-slate-700">{t.taskName || 'Unassigned / Global'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-xs font-black text-slate-900">{t.totalTaskHours.toFixed(2)} hrs</td>
                                                    </tr>
                                                )) : (
                                                    <tr><td colSpan="2" className="px-6 py-10 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">No task records found</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                                    {/* SECTION 3: Daily Time Log Table */}
                                    <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                                        <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Daily Work Records</h4>
                                        </div>
                                        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                                            <table className="w-full text-left">
                                                <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                                                    <tr>
                                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Worker | Date</th>
                                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">In / Out</th>
                                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Hours</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {historyData?.daily_logs?.length > 0 ? historyData.daily_logs.map((log, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <p className="text-xs font-black text-slate-700">{log.workerId?.fullName || 'Worker'}</p>
                                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(log.workDate).toLocaleDateString()}</p>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <p className="text-[10px] font-bold text-slate-600">
                                                                    {new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {log.checkOut ? new Date(log.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                                                                </p>
                                                            </td>
                                                            <td className="px-6 py-4 text-right text-xs font-black text-emerald-600">{log.totalHours.toFixed(1)}</td>
                                                        </tr>
                                                    )) : (
                                                        <tr><td colSpan="3" className="px-6 py-10 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">No logs yet</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* SECTION 4: Activity Timeline */}
                                    <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm flex flex-col">
                                        <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Activity Timeline</h4>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[500px] custom-scrollbar">
                                            {historyData?.activity_logs?.length > 0 ? historyData.activity_logs.map((act, idx) => (
                                                <div key={idx} className="relative pl-8 pb-2">
                                                    {/* Timeline Line */}
                                                    {idx !== historyData.activity_logs.length - 1 && (
                                                        <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-100" />
                                                    )}

                                                    {/* Timeline Dot */}
                                                    <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center
                                                        ${act.actionType === 'CREATED' ? 'bg-blue-500' :
                                                            act.actionType === 'COMPLETED' ? 'bg-emerald-500' :
                                                                act.actionType === 'STATUS_CHANGED' ? 'bg-orange-400' :
                                                                    act.actionType.includes('WORKER') ? 'bg-indigo-500' : 'bg-slate-400'}`}>
                                                        {act.actionType === 'CREATED' ? <Plus size={10} className="text-white" /> :
                                                            act.actionType === 'COMPLETED' ? <CheckCircle size={10} className="text-white" /> :
                                                                act.actionType.includes('WORKER') ? <Users size={10} className="text-white" /> :
                                                                    <Clock size={10} className="text-white" />}
                                                    </div>

                                                    <div>
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[8px] font-black uppercase tracking-widest text-slate-500">{act.actionType}</span>
                                                            <span className="text-[9px] font-bold text-slate-400">{new Date(act.createdAt).toLocaleString()}</span>
                                                        </div>
                                                        <p className="text-xs font-bold text-slate-700 leading-snug">{act.description}</p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">By {act.createdBy?.fullName || 'System'}</p>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="flex flex-col items-center justify-center py-20 opacity-20">
                                                    <History size={40} />
                                                    <p className="text-[10px] font-black uppercase tracking-widest mt-3">No activity recorded</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'notes' && (
                    <div className="p-4 md:p-8 animate-fade-in space-y-8">
                        {/* Note Input Form */}
                        <div className="bg-white p-6 rounded-[30px] border border-slate-200 shadow-sm">
                            <form onSubmit={handleAddNote} className="space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <MessageSquare size={16} className="text-blue-600" />
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Add Job Note</h3>
                                </div>
                                <textarea
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    placeholder="Write a note about this job, specific requirements, or updates..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/50 transition-all min-h-[120px] resize-none"
                                />
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={!newNote.trim() || isSubmittingNote}
                                        className="bg-blue-600 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                                    >
                                        {isSubmittingNote ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />} 
                                        Save Note
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Notes List */}
                        <div className="space-y-4">
                            <h3 className="px-1 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Recent Job Notes</h3>
                            {notesLoading && notes.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader size={30} className="text-blue-600 animate-spin" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading notes...</p>
                                </div>
                            ) : notes.length === 0 ? (
                                <div className="bg-white border border-dashed border-slate-200 rounded-[30px] p-20 flex flex-col items-center gap-4 text-center">
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
                                        <MessageSquare size={32} strokeWidth={1} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No notes found</p>
                                        <p className="text-xs text-slate-400 font-bold max-w-[200px]">Important updates and notes will appear here once added.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {notes.map((note) => (
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
                                                        <button
                                                            onClick={() => setNoteToDelete(note._id)}
                                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                            title="Delete Note"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
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
            </div>

            {
                isTaskModalOpen && (
                    <TaskModal
                        isOpen={isTaskModalOpen}
                        onClose={() => setIsTaskModalOpen(false)}
                        onSave={() => {
                            setIsTaskModalOpen(false);
                            fetchJobDetails();
                        }}
                        jobId={jobId}
                        task={editingTask}
                        assignedWorkers={(() => {
                            let list = [];
                            if (companyUsers && companyUsers.length > 0) {
                                if (['COMPANY_OWNER', 'SUPER_ADMIN'].includes(user?.role)) {
                                    list = companyUsers.filter(u => ['PM', 'FOREMAN', 'SUBCONTRACTOR', 'WORKER'].includes(u.role));
                                } else if (user?.role === 'PM') {
                                    list = companyUsers.filter(u => ['FOREMAN', 'SUBCONTRACTOR'].includes(u.role));
                                } else {
                                    list = companyUsers.filter(u => u.role === 'WORKER');
                                }
                            }

                            // Fallback
                            if (list.length === 0 && job?.assignedWorkers && job.assignedWorkers.length > 0) {
                                if (user?.role !== 'PM' && !['COMPANY_OWNER', 'SUPER_ADMIN'].includes(user?.role)) {
                                    list = job.assignedWorkers.filter(u => u.role === 'WORKER');
                                }
                            }

                            console.log('Modal Personnel Count:', list.length);
                            return list;
                        })()}
                    />
                )
            }

            {
                isCancellationModalOpen && (
                    <CancellationModal
                        isOpen={isCancellationModalOpen}
                        onClose={() => {
                            setIsCancellationModalOpen(false);
                            setTaskToCancel(null);
                        }}
                        onConfirm={handleCancelTask}
                        loading={submitting}
                    />
                )
            }

            {/* Assign Worker Modal - For Foreman */}
            {isAssignModalOpen && assigningTask && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden">
                        {/* Header */}
                        <div className="bg-slate-900 p-7 text-white relative">
                            <button
                                onClick={() => { setIsAssignModalOpen(false); setAssigningTask(null); }}
                                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                            >
                                <X size={18} />
                            </button>
                            <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg">
                                    <UserPlus size={20} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black tracking-tight">Assign Worker</h2>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5 truncate max-w-[240px]">Task: {assigningTask.title}</p>
                                </div>
                            </div>
                        </div>
                        {/* Worker List */}
                        <div className="p-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Select a worker to assign this task</p>
                            {availableWorkers.length === 0 ? (
                                <div className="py-10 text-center text-slate-300">
                                    <Users size={36} className="mx-auto mb-3 opacity-30" />
                                    <p className="text-xs font-bold uppercase tracking-widest">No workers available</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                                    {/* Unassign option */}
                                    <button
                                        onClick={() => handleAssignWorker('')}
                                        disabled={assignLoading}
                                        className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-all text-left group"
                                    >
                                        <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400">
                                            <X size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-500 tracking-tight">Unassigned</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Remove current assignment</p>
                                        </div>
                                    </button>
                                    {availableWorkers.map(worker => (
                                        <button
                                            key={worker._id}
                                            onClick={() => handleAssignWorker(worker._id)}
                                            disabled={assignLoading}
                                            className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left group ${assigningTask?.assignedTo?._id === worker._id || assigningTask?.assignedTo === worker._id
                                                ? 'border-emerald-200 bg-emerald-50'
                                                : 'border-slate-100 hover:border-blue-200 hover:bg-blue-50'
                                                }`}
                                        >
                                            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm">
                                                {worker.fullName?.charAt(0) || 'W'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-black text-slate-900 tracking-tight">{worker.fullName}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{worker.role}</p>
                                            </div>
                                            {(assigningTask?.assignedTo?._id === worker._id || assigningTask?.assignedTo === worker._id) && (
                                                <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {assignLoading && (
                                <div className="flex items-center justify-center gap-2 mt-4 text-blue-600">
                                    <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                                    <span className="text-xs font-bold">Assigning...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}


            {/* Template Library Modal */}
            <Modal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} title="Import Task Template">
                <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3">
                        <Info size={18} className="text-blue-500 mt-0.5" />
                        <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                            Select a task structure to import into this job. This will create a new main task and all associated subtasks automatically.
                        </p>
                    </div>

                    <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                        {templates.length === 0 ? (
                            <div className="p-12 text-center rounded-[32px] border-2 border-dashed border-slate-100 bg-slate-50/30">
                                <Briefcase size={32} className="mx-auto text-slate-200 mb-3" />
                                <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest leading-none">No templates found</p>
                                <p className="text-slate-300 text-[10px] mt-2 font-bold leading-none">Create templates in the main Tasks page.</p>
                            </div>
                        ) : (
                            templates.map(tmpl => (
                                <div key={tmpl._id} className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/5 rounded-2xl p-4 flex justify-between items-center group transition-all duration-300">
                                    <div className="flex-1">
                                        <h3 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{tmpl.templateName}</h3>
                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                            <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 uppercase tracking-widest leading-none">
                                                {tmpl.assignedRole || 'Any Role'}
                                            </span>
                                            <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md uppercase tracking-tight border border-slate-200 leading-none">
                                                {tmpl.steps?.length || 0} Subtasks
                                            </span>
                                            {tmpl.estimatedHours > 0 && (
                                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md uppercase tracking-tight border border-emerald-100 leading-none">
                                                    {tmpl.estimatedHours}h
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleApplyTemplate(tmpl._id)}
                                        disabled={submitting}
                                        className="h-10 px-6 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {submitting ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />}
                                        Apply
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Modal>


            {/* Note Deletion Confirmation Modal */}
            {noteToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl border border-white/20 animate-in zoom-in duration-200">
                        <div className="flex flex-col items-center text-center gap-5">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center">
                                <Trash2 size={32} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Delete Note?</h3>
                                <p className="text-xs text-slate-400 font-bold leading-relaxed px-4">
                                    Are you sure you want to remove this note? This action cannot be undone and will be permanently removed.
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
                                    onClick={handleDeleteNote}
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

export default JobDetails;
