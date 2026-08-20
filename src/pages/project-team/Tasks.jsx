import { useState, useEffect, useMemo } from 'react';
import {
    Search, CheckCircle2, Clock, AlertCircle,
    Calendar, User, Loader,
    Layers, AlertTriangle, CheckCheck, GripVertical, TrendingUp
} from 'lucide-react';
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
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getUrgency = (task) => {
    if (task.status === 'completed') return 'completed';
    if (!task.dueDate) return 'normal';
    const diff = new Date(task.dueDate) - new Date();
    if (diff < 0) return 'overdue';
    if (diff / (1000 * 60 * 60 * 24) <= 3) return 'due-soon';
    return 'normal';
};

const priorityColors = {
    High: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100', dot: 'bg-red-500' },
    Medium: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100', dot: 'bg-orange-400' },
    Low: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', dot: 'bg-blue-400' },
};

const statusConfig = {
    todo: { label: 'Pending', icon: AlertCircle, color: 'text-slate-400 bg-slate-50', border: 'border-slate-200' },
    in_progress: { label: 'In Progress', icon: Clock, color: 'text-blue-600 bg-blue-50', border: 'border-blue-100' },
    review: { label: 'In Review', icon: TrendingUp, color: 'text-orange-600 bg-orange-50', border: 'border-orange-100' }, // Added icon back
    completed: { label: 'Completed', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50', border: 'border-emerald-100' },
};


// ─── Sortable Task Card ──────────────────────────────────────────────────────
const SortableTaskCard = ({ id, task, onMarkComplete, canComplete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };

    const urgency = getUrgency(task);
    const pStyle = priorityColors[task.priority] || priorityColors.Medium;
    const sConfig = statusConfig[task.status] || statusConfig.todo;
    const StatusIcon = sConfig.icon;
    const [marking, setMarking] = useState(false);

    const handleComplete = async (e) => {
        e.stopPropagation();
        setMarking(true);
        await onMarkComplete(task._id);
        setMarking(false);
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className={`bg-white border rounded-3xl p-5 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/60 relative overflow-hidden group
            ${urgency === 'overdue' ? 'border-red-200 bg-red-50/20' : urgency === 'due-soon' ? 'border-yellow-200 bg-yellow-50/10' : urgency === 'completed' ? 'border-emerald-100 bg-emerald-50/10' : 'border-slate-200/60'}`}>

            {/* Drag Handle */}
            <div 
                {...attributes} 
                {...listeners} 
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
            >
                <GripVertical size={20} />
            </div>

            {/* Left urgency bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-3xl
                ${urgency === 'overdue' ? 'bg-red-500' : urgency === 'due-soon' ? 'bg-yellow-400' : urgency === 'completed' ? 'bg-emerald-500' : 'bg-transparent'}`} />

            <div className="flex items-start justify-between gap-4 pr-10">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Status icon */}
                    <div className={`mt-0.5 p-2 rounded-xl border ${sConfig.color} ${sConfig.border} shrink-0`}>
                        <StatusIcon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className={`font-black text-slate-900 leading-tight ${task.status === 'completed' ? 'line-through text-slate-400' : ''}`}>
                                {task.title}
                            </h4>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${pStyle.bg} ${pStyle.text} ${pStyle.border}`}>
                                {task.priority}
                            </span>
                            {urgency === 'overdue' && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-700 uppercase tracking-widest">Overdue</span>}
                            {urgency === 'due-soon' && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 uppercase tracking-widest">Due Soon</span>}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
                            {/* Project */}
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                {task.projectId?.name || 'Project'}
                            </span>
                            {/* Assigned by */}
                            {task.assignedBy?.fullName && (
                                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                    <User size={12} className="text-slate-400" />
                                    By {task.assignedBy.fullName}
                                </span>
                            )}
                            {/* Due date */}
                            <span className={`flex items-center gap-1.5 text-xs font-bold ${urgency === 'overdue' ? 'text-red-600' : urgency === 'due-soon' ? 'text-yellow-700' : 'text-slate-500'}`}>
                                <Calendar size={12} />
                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline'}
                            </span>
                        </div>

                        {task.description && (
                            <p className="text-xs text-slate-400 font-medium mt-2 line-clamp-2">{task.description}</p>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="shrink-0">
                    {canComplete && task.status !== 'completed' ? (
                        <button
                            onClick={handleComplete}
                            disabled={marking}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-200 disabled:opacity-60"
                        >
                            {marking ? <Loader size={13} className="animate-spin" /> : <CheckCheck size={14} />}
                            Mark Done
                        </button>
                    ) : task.status === 'completed' ? (
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                            <CheckCircle2 size={14} />
                            <span className="text-[10px] font-black uppercase">Done</span>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

// ─── Main Tasks Component ──────────────────────────────────────────────────────
const Tasks = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

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

    const canComplete = ['WORKER', 'FOREMAN', 'SUBCONTRACTOR', 'PM', 'ENGINEER'].includes(user?.role);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const res = await api.get('/tasks/my-tasks');
            setTasks(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching tasks:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTasks(); }, []);

    const handleMarkComplete = async (taskId) => {
        try {
            await api.patch(`/tasks/${taskId}`, { status: 'completed' });
            setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: 'completed' } : t));
        } catch (err) {
            console.error('Error completing task:', err);
        }
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            setTasks((items) => {
                const oldIndex = items.findIndex(t => t._id === active.id);
                const newIndex = items.findIndex(t => t._id === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);
                
                // Update positions in backend
                const updates = newItems.map((task, index) => ({
                    id: task._id,
                    status: task.status,
                    position: index
                }));

                api.patch('/tasks/reorder', { tasks: updates }).catch(err => {
                    console.error('Failed to persist task order:', err);
                });

                return newItems;
            });
        }
    };

    const filtered = useMemo(() => {
        return tasks.filter(t => {
            const matchSearch = t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.projectId?.name?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchStatus = filterStatus === 'all' || t.status === filterStatus;
            return matchSearch && matchStatus;
        });
    }, [tasks, searchTerm, filterStatus]);

    // Stats
    const stats = useMemo(() => ({
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'completed').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        overdue: tasks.filter(t => getUrgency(t) === 'overdue').length,
    }), [tasks]);

    const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">My Tasks</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Tasks assigned to you</p>
                </div>
                {/* Status Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    {[
                        { key: 'all', label: 'All' },
                        { key: 'todo', label: 'Pending' },
                        { key: 'in_progress', label: 'In Progress' },
                        { key: 'review', label: 'In Review' },
                        { key: 'completed', label: 'Done' },
                    ].map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilterStatus(f.key)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all
                                ${filterStatus === f.key ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Assigned', value: stats.total, color: 'blue', icon: Layers },
                    { label: 'In Progress', value: stats.inProgress, color: 'blue', icon: Clock },
                    { label: 'Completed', value: stats.completed, color: 'emerald', icon: CheckCircle2 },
                    { label: 'Overdue', value: stats.overdue, color: 'red', icon: AlertTriangle },
                ].map((s, i) => (
                    <div key={i} className={`bg-white rounded-2xl border p-4 flex items-center gap-3
                        ${s.color === 'red' ? 'border-red-100' : s.color === 'emerald' ? 'border-emerald-100' : 'border-slate-200/60'}`}>
                        <div className={`p-2.5 rounded-xl ${s.color === 'red' ? 'bg-red-50 text-red-600' : s.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                            <s.icon size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                            <p className={`text-xl font-black ${s.color === 'red' && s.value > 0 ? 'text-red-600' : s.color === 'emerald' ? 'text-emerald-600' : 'text-slate-900'}`}>{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Performance bar */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-4 flex items-center gap-5">
                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Completion Rate</p>
                    <p className="text-2xl font-black text-slate-900">{completionRate}%</p>
                </div>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-700"
                        style={{ width: `${completionRate}%` }} />
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stats.overdue > 0 ? `${stats.overdue} Overdue` : 'On Track'}</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Search tasks or projects..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 text-sm font-bold text-slate-700 placeholder:text-slate-400 shadow-sm"
                />
            </div>

            {/* Task list */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="w-10 h-10 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading tasks...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-300">
                    <Layers size={40} />
                    <p className="font-black uppercase tracking-widest text-sm">
                        {tasks.length === 0 ? 'No tasks assigned yet' : 'No matching tasks'}
                    </p>
                    {tasks.length === 0 && (
                        <p className="text-slate-400 text-xs font-bold">Your foreman or project manager will assign tasks</p>
                    )}
                </div>
            ) : (
                <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext 
                        items={filtered.map(t => t._id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-3">
                            {filtered.map(task => (
                                <SortableTaskCard
                                    key={task._id}
                                    id={task._id}
                                    task={task}
                                    onMarkComplete={handleMarkComplete}
                                    canComplete={canComplete}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
};

export default Tasks;
