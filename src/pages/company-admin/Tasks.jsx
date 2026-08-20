import React, { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import {
    Plus, Search, Filter, Calendar, MoreVertical,
    CheckCircle, Clock, AlertCircle, LayoutGrid, List, Loader,
    Hash, Target, Edit, Trash2, Info, Save, Tag,
    AlertTriangle, Layers, TrendingUp, X, UserCheck, Flag, HardHat,
    ChevronDown, Users, Briefcase, CheckCircle2, ArrowRight, Camera,
    ChevronUp, Settings, ChevronRight, Check, GripVertical, CalendarDays, KanbanSquare, AlignLeft, CalendarRange, XCircle
} from 'lucide-react';
import Modal from '../../components/Modal';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const TopScrollbar = ({ containerRef }) => {
    const topScrollRef = useRef(null);
    const [tableWidth, setTableWidth] = useState(0);

    useEffect(() => {
        const container = containerRef.current;
        const topScroll = topScrollRef.current;
        if (!container || !topScroll) return;

        const syncTop = () => {
            if (topScroll.scrollLeft !== container.scrollLeft) {
                topScroll.scrollLeft = container.scrollLeft;
            }
        };

        const syncContainer = () => {
            if (container.scrollLeft !== topScroll.scrollLeft) {
                container.scrollLeft = topScroll.scrollLeft;
            }
        };

        container.addEventListener('scroll', syncTop);
        topScroll.addEventListener('scroll', syncContainer);

        // Resize observer to keep widths in sync
        const resizeObserver = new ResizeObserver(() => {
            const table = container.querySelector('table');
            if (table) {
                setTableWidth(table.scrollWidth);
            }
        });

        const table = container.querySelector('table');
        if (table) {
            resizeObserver.observe(table);
            setTableWidth(table.scrollWidth);
        }

        return () => {
            container.removeEventListener('scroll', syncTop);
            topScroll.removeEventListener('scroll', syncContainer);
            resizeObserver.disconnect();
        };
    }, [containerRef]);

    return (
        <div
            ref={topScrollRef}
            className="w-full overflow-x-auto border-b border-slate-100 sticky top-0 z-[30] bg-white scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-transparent h-3 cursor-pointer"
            style={{ borderRadius: '24px 24px 0 0' }}
        >
            <div style={{ width: `${tableWidth}px`, height: '1px' }} />
        </div>
    );
};



import GanttView from '../../components/tasks/GanttView';
import CalendarView from '../../components/tasks/CalendarView';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ROLE_LABELS = {
    WORKER: 'Worker',
    FOREMAN: 'Foreman',
    SUBCONTRACTOR: 'Subcontractor',
    PM: 'Project Manager',
    COMPANY_OWNER: 'Owner',
};

const ROLE_COLORS = {
    ADMIN: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    WORKER: 'bg-blue-50 text-blue-600 border-blue-100',
    FOREMAN: 'bg-orange-50 text-orange-600 border-orange-100',
    SUBCONTRACTOR: 'bg-purple-50 text-purple-600 border-purple-100',
    PM: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    COMPANY_OWNER: 'bg-slate-50 text-slate-700 border-slate-200',
};

const formatDateUTC = (dateStr, options = { month: 'short', day: 'numeric' }) => {
    if (!dateStr) return '';
    // Treat dateStr as YYYY-MM-DD
    const dStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = dStr.split('-');
    if (parts.length !== 3) return dateStr;
    
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', options);
};

const getTaskUrgency = (task) => {
    if (task.status === 'completed') return 'completed';
    if (!task.dueDate) return 'normal';
    
    // Normalize "now" to local midnight for day-based comparison
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // Parse dueDate as local YYYY-MM-DD
    const dStr = task.dueDate.includes('T') ? task.dueDate.split('T')[0] : task.dueDate;
    const [y, m, d] = dStr.split('-').map(Number);
    const due = new Date(y, m - 1, d);
    
    const diffMs = due - now;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    if (diffMs < 0) return 'overdue';
    if (diffDays <= 3) return 'due-soon';
    return 'normal';
};

const formatDateForInput = (date) => {
    if (!date) return "";
    if (typeof date === 'string') return date.split('T')[0];
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const urgencyStyles = {
    overdue: { card: 'border-red-200 bg-red-50/30', badge: 'bg-red-100 text-red-700', label: 'OVERDUE' },
    'due-soon': { card: 'border-yellow-200 bg-yellow-50/20', badge: 'bg-yellow-100 text-yellow-700', label: 'DUE SOON' },
    completed: { card: 'border-emerald-200 bg-emerald-50/10', badge: 'bg-emerald-100 text-emerald-700', label: 'DONE' },
    normal: { card: 'border-slate-200/60 bg-white', badge: '', label: '' },
};

const priorityStyles = {
    High: 'bg-red-50 text-red-600 border-red-100',
    Medium: 'bg-orange-50 text-orange-600 border-orange-100',
    Low: 'bg-blue-50 text-blue-600 border-blue-100',
};

// ─── Kanban Task Card ──────────────────────────────────────────────────────────
const DraggableTask = ({ task, onEdit, onDelete, onClick, isHighlighted, canManage }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task._id || task.id });
    const [menuOpen, setMenuOpen] = useState(false);
    const urgency = getTaskUrgency(task);
    const uStyle = urgencyStyles[urgency];

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            id={`task-card-${task._id || task.id}`}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onClick(task)}
            className={`p-3.5 md:p-4 rounded-xl md:rounded-2xl border shadow-sm hover:shadow-xl hover:shadow-slate-200/50 cursor-pointer active:cursor-grabbing transition-all group relative overflow-hidden ${uStyle.card} ${isDragging ? 'z-50 ring-2 ring-blue-500/20' : ''} ${isHighlighted ? 'ring-2 ring-blue-500 shadow-xl bg-blue-50/50' : ''}`}
        >
            {/* Urgency strip */}
            {urgency !== 'normal' && (
                <div className={`absolute top-0 left-0 right-0 h-1 ${urgency === 'overdue' ? 'bg-red-500' : urgency === 'due-soon' ? 'bg-yellow-400' : 'bg-emerald-500'}`} />
            )}

            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${priorityStyles[task.priority] || priorityStyles.Medium}`}>
                        {task.priority}
                    </span>
                    {task.category === 'TODO' && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-600">
                            Todo
                        </span>
                    )}
                </div>
                {canManage && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                        className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-lg transition-colors"
                    >
                        <MoreVertical size={14} />
                    </button>
                )}
                {menuOpen && canManage && (
                    <div className="absolute right-4 top-12 w-40 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden py-1">
                        <button onClick={(e) => { e.stopPropagation(); onEdit(task); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                            <Edit size={13} /> Edit Task
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(task); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-xs font-black text-red-600 hover:bg-red-50 flex items-center gap-2">
                            <Trash2 size={13} /> Delete
                        </button>
                    </div>
                )}
            </div>

            <div className="space-y-0.5 mb-3">
                <div className="flex justify-between items-start mb-2">
                    <h4 className="font-black text-slate-900 leading-tight text-[13px] md:text-sm group-hover:text-blue-600 transition-colors">{task.title}</h4>
                    {task.parentTaskTitle && (
                        <span className="text-[7px] font-black bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-tighter shrink-0">
                            Child Of: {task.parentTaskTitle}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    <Hash size={9} className="text-blue-500" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase truncate">{task.projectId?.name || '—'}</span>
                </div>
            </div>

            {/* Progress / Sub-task count */}
            <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                        <Layers size={10} /> {task.subTaskCount || 0} Sub-tasks
                    </span>
                    <span className="text-[10px] font-black text-blue-600">{task.progress || 0}%</span>
                </div>
                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${task.progress || 0}%` }}
                    />
                </div>
            </div>

            {/* Assignee row */}
            {(() => {
                const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? [task.assignedTo] : []);
                return assignees.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        <div className="flex flex-wrap gap-1.5">
                            {assignees.slice(0, 3).map((u, i) => (
                                <div key={i} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 pr-2 rounded-full overflow-hidden" title={u.fullName || 'User'}>
                                    <div className="w-5 h-5 rounded-full bg-white text-slate-500 flex items-center justify-center text-[8px] font-black shadow-sm shrink-0">
                                        {u.fullName ? u.fullName.charAt(0) : '?'}
                                    </div>
                                    <span className="text-[9.5px] font-bold text-slate-600 truncate max-w-[90px] tracking-tight">
                                        {u.fullName ? u.fullName.split(' ')[0] + (u.fullName.split(' ')[1] ? ' ' + u.fullName.split(' ')[1][0] + '.' : '') : 'User'}
                                    </span>
                                </div>
                            ))}
                            {assignees.length > 3 && (
                                <div className="text-[9px] font-black text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-full flex items-center justify-center shadow-sm">
                                    +{assignees.length - 3}
                                </div>
                            )}
                        </div>
                        {task.assignedRoleType && (
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${ROLE_COLORS[task.assignedRoleType] || 'bg-slate-50 text-slate-500 border-slate-200'} uppercase tracking-tighter whitespace-nowrap`}>
                                {ROLE_LABELS[task.assignedRoleType] || task.assignedRoleType}
                            </span>
                        )}
                    </div>
                ) : (
                    <div className="mb-2 px-1">
                        <span className="text-[9px] font-black px-2 py-0.5 rounded border bg-amber-50 text-amber-600 border-amber-100 uppercase tracking-tighter whitespace-nowrap">
                            Unassigned
                        </span>
                    </div>
                );
            })()}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                {urgency !== 'normal' && (
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${uStyle.badge}`}>{uStyle.label}</span>
                )}
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-xl text-[10px] font-black ml-auto ${urgency === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-slate-50 text-slate-500'}`}>
                    <Clock size={11} />
                    {task.dueDate ? formatDateUTC(task.dueDate) : 'ASAP'}
                </div>
            </div>
        </div>
    );
};

// ─── Sortable Template Item ───────────────────────────────────────────────────
const SortableTemplateItem = ({ tmpl, selectedTemplates, handleSelectTemplate, setEditingTemplate, setTemplateFormData, setIsSaveTemplateModalOpen, api, fetchTemplates, priorityStyles, user, setFormData, setSubTasksList, setIsTemplateModalOpen, setIsModalOpen, setTemplateToDelete, setIsTemplateDeleteModalOpen }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tmpl._id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: isDragging ? 'relative' : 'static',
        zIndex: isDragging ? 50 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`bg-white border hover:shadow-md transition-all rounded-xl p-3 flex justify-between items-center group ${selectedTemplates.has(tmpl._id) ? 'border-blue-500 bg-blue-50/5' : 'border-slate-200 hover:border-blue-200'} ${isDragging ? 'shadow-2xl ring-2 ring-blue-500/20' : ''}`}
        >
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="flex items-center gap-3">
                    <div
                        {...attributes}
                        {...listeners}
                        className="p-1.5 hover:bg-slate-100 rounded text-slate-300 hover:text-slate-500 transition-colors cursor-grab active:cursor-grabbing"
                    >
                        <GripVertical size={14} />
                    </div>
                    <div className="shrink-0" onClick={e => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            checked={selectedTemplates.has(tmpl._id)}
                            onChange={(e) => handleSelectTemplate(tmpl._id, e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-black text-slate-800 text-sm tracking-tight mb-1 truncate">{tmpl.templateName}</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                        {tmpl.assignedRole && (
                            <span className="inline-flex items-center text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-widest leading-none">
                                {tmpl.assignedRole}
                            </span>
                        )}
                        <span className="inline-flex items-center text-[9px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded uppercase tracking-tighter border border-slate-200 leading-none">
                            {tmpl.steps?.length || 0} sub-tasks
                        </span>
                        {tmpl.estimatedHours > 0 && (
                            <span className="inline-flex items-center text-[9px] font-bold text-blue-500 bg-blue-50/50 px-2 py-0.5 rounded uppercase tracking-tighter border border-blue-100 leading-none">
                                <Clock size={10} className="mr-1" /> {tmpl.estimatedHours}h
                            </span>
                        )}
                        <span className={`inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter border leading-none ${priorityStyles[tmpl.priority] || 'bg-slate-100 text-slate-500'}`}>
                            {tmpl.priority}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4 shrink-0 ml-4">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => {
                            setEditingTemplate(tmpl);
                            setTemplateFormData({
                                templateName: tmpl.templateName || '',
                                assignedRole: tmpl.assignedRole || '',
                                taskTitle: tmpl.taskTitle || '',
                                description: tmpl.description || '',
                                estimatedHours: tmpl.estimatedHours || 0,
                                priority: tmpl.priority || 'Medium',
                                steps: tmpl.steps || []
                            });
                            setIsSaveTemplateModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all"
                        title="Edit Template"
                    >
                        <Edit size={16} />
                    </button>
                    {['ADMIN', 'SUPER_ADMIN', 'COMPANY_OWNER'].includes(user?.role) && (
                        <button
                            onClick={() => {
                                setTemplateToDelete(tmpl);
                                setIsTemplateDeleteModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-all"
                            title="Delete Template"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>

                <button
                    onClick={() => {
                        setFormData({
                            title: tmpl.taskTitle,
                            description: tmpl.description || '',
                            priority: tmpl.priority || 'Medium',
                            assignedRoleType: tmpl.assignedRole,
                            projectId: '', assignedTo: [], status: 'todo', dueDate: '', startDate: '', category: 'TASK'
                        });
                        setSubTasksList(tmpl.steps || []);
                        setIsTemplateModalOpen(false);
                        setIsModalOpen(true);
                    }}
                    className="h-10 px-6 bg-[#0F172A] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 transition shadow-lg shadow-slate-200 active:scale-95 whitespace-nowrap"
                >
                    Use Template
                </button>
            </div>
        </div>
    );
};

// ─── Kanban Column ─────────────────────────────────────────────────────────────
const DroppableColumn = ({ status, style, filteredTasks, onEdit, onDelete, onTaskClick, highlightTaskId, canManage }) => {
    const { setNodeRef } = useDroppable({ id: status });
    const colTasks = filteredTasks.filter(t => t.status === status);
    const taskIds = colTasks.map(t => t._id || t.id);

    return (
        <div ref={setNodeRef} className="flex-1 flex flex-col min-w-[320px] bg-slate-50/50 rounded-[32px] border border-slate-200/60 pb-5">
            <div className="p-5 pb-2">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">{style.label}</h3>
                    </div>
                    <span className="bg-white border border-slate-200 text-slate-400 px-2.5 py-1 rounded-xl text-[10px] font-black">
                        {colTasks.length}
                    </span>
                </div>
            </div>
            <div className="p-3 space-y-3 overflow-y-auto max-h-[1200px] hide-scrollbar-y px-5">
                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                    {colTasks.map(task => (
                        <DraggableTask
                            key={task._id || task.id}
                            task={task}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onClick={onTaskClick}
                            isHighlighted={highlightTaskId === (task._id || task.id)}
                            canManage={canManage}
                        />
                    ))}
                </SortableContext>
                {colTasks.length === 0 && (
                    <div className="py-16 flex flex-col items-center justify-center text-slate-200 border-2 border-dashed border-slate-200 rounded-3xl">
                        <Layers size={28} />
                        <span className="text-[10px] font-black uppercase mt-2">Empty</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Sortable List Row wrapper ────────────────────────────────────────────────
const SortableTaskRow = ({ task, isCompactView, columnWidths, isHighlighted, ...props }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task._id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        position: isDragging ? 'relative' : 'static',
        zIndex: isDragging ? 50 : 1,
    };

    return (
        <React.Fragment>
            <tr
                ref={setNodeRef}
                id={`task-row-${task._id}`}
                style={style}
                onClick={() => props.onTaskClick(task)}
                className={`hover:bg-slate-50/50 cursor-pointer transition-colors group ${props.urgency === 'overdue' ? 'bg-red-50/30' : props.urgency === 'due-soon' ? 'bg-yellow-50/20' : ''} ${isDragging ? 'shadow-2xl' : ''} ${isHighlighted ? 'ring-2 ring-blue-500 shadow-xl bg-blue-50/20 relative z-[20]' : ''}`}
            >
                <td className="w-10 px-4 py-2.5" onClick={e => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        checked={props.isSelected}
                        onChange={(e) => props.onSelect(task._id, e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                </td>
                <td className="w-10 px-4 py-2.5">
                    <div
                        {...attributes}
                        {...listeners}
                        onClick={e => e.stopPropagation()}
                        className="p-1 hover:bg-slate-200 rounded-md text-slate-300 hover:text-slate-600 transition-colors cursor-grab active:cursor-grabbing"
                    >
                        <GripVertical size={14} />
                    </div>
                </td>
                <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); props.onToggleExpansion(task._id); }}
                            className="p-1 hover:bg-slate-200 rounded-md text-slate-400 transition-transform duration-200"
                            style={{ transform: props.isExpanded ? 'rotate(90deg)' : 'none' }}
                        >
                            <ChevronRight size={12} />
                        </button>

                        {/* Status Toggle Checkbox */}
                        <button
                            onClick={(e) => { e.stopPropagation(); props.onToggleStatus && props.onToggleStatus(task); }}
                            className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all shadow-sm ${task.status === 'completed'
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'bg-white border-slate-300 hover:border-blue-500 hover:bg-blue-50'
                                }`}
                        >
                            {task.status === 'completed' && <Check size={10} strokeWidth={3} />}
                        </button>

                        {props.urgency === 'overdue' && <div className="w-1 h-6 bg-red-500 rounded-full shrink-0" />}
                        {props.urgency === 'due-soon' && <div className="w-1 h-6 bg-yellow-400 rounded-full shrink-0" />}
                        {props.urgency === 'completed' && <div className="w-1 h-6 bg-emerald-400 rounded-full shrink-0" />}
                        <div>
                            <div className="flex items-center gap-1.5 overflow-hidden">
                                <p className={`font-black text-slate-900 text-[13px] ${isCompactView ? 'truncate' : 'whitespace-normal'}`} title={task.title}>{task.title}</p>
                                {task.parentTaskTitle && (
                                    <span className="text-[8px] font-black bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-tighter shrink-0">
                                        Child Of: {task.parentTaskTitle}
                                    </span>
                                )}
                                {task.subTaskCount > 0 && (
                                    <span className="text-[8px] font-black bg-slate-100 text-slate-400 px-1 py-0.5 rounded-md">
                                        {task.subTaskCount}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                                <div className="w-20 h-0.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${task.progress || 0}%` }} />
                                </div>
                                <span className="text-[8px] font-bold text-slate-400">{task.progress || 0}%</span>
                            </div>
                        </div>
                    </div>
                </td>
                <td className={`px-4 py-2.5 text-xs font-bold text-slate-500 ${isCompactView ? 'truncate' : 'whitespace-normal'}`}>{task.projectId?.name || '—'}</td>
                <td className="px-4 py-2.5">
                    {task.assignedTo?.length > 0 ? (
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black text-[9px] border border-blue-100">
                                {task.assignedTo[0]?.fullName?.charAt(0) || '?'}
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-slate-700">{task.assignedTo[0]?.fullName}</p>
                                {task.assignedTo.length > 1 && <p className="text-[9px] font-bold text-slate-400">+{task.assignedTo.length - 1} more</p>}
                            </div>
                        </div>
                    ) : (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded border bg-amber-50 text-amber-600 border-amber-100 uppercase tracking-tighter whitespace-nowrap">
                            Unassigned
                        </span>
                    )}
                </td>
                <td className="px-4 py-2.5">
                    {(() => {
                        const role = task.assignedRoleType || (task.assignedTo && task.assignedTo[0]?.role);
                        return role ? (
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border whitespace-nowrap ${ROLE_COLORS[role] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                {ROLE_LABELS[role] || role}
                            </span>
                        ) : <span className="text-slate-300 text-[9px] font-bold">—</span>;
                    })()}
                </td>
                <td className="px-4 py-2.5">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-widest whitespace-nowrap
                        ${task.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            task.status === 'in_progress' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                task.status === 'review' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                    'bg-slate-50 text-slate-500 border-slate-200'}`}>
                        {task.status?.replace('_', ' ')}
                    </span>
                </td>
                <td className="px-4 py-2.5">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-widest whitespace-nowrap ${priorityStyles[task.priority] || priorityStyles.Medium}`}>
                        {task.priority}
                    </span>
                </td>
                <td className="px-4 py-2.5 text-[11px] font-black text-slate-800">
                    {task.startDate ? formatDateUTC(task.startDate) : '—'}
                </td>
                <td className={`px-4 py-2.5 text-[11px] font-black ${props.urgency === 'overdue' ? 'text-red-600' : props.urgency === 'due-soon' ? 'text-yellow-600' : 'text-slate-800'}`}>
                    {task.dueDate ? formatDateUTC(task.dueDate) : 'ASAP'}
                </td>
                {props.canManage && (
                    <td className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                            <button onClick={(e) => { e.stopPropagation(); props.onEdit(task); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                                <Edit size={13} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); props.onDelete(task); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                                <Trash2 size={13} />
                            </button>
                        </div>
                    </td>
                )}
            </tr>
            {props.isExpanded && props.renderChildren()}
        </React.Fragment>
    );
};


// ─── Quick Add Sub-task form (Root level) ───────────────────────────────────
const QuickAddSubTask = ({ taskId, onSave, team, isSubmitting }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [assignedRoleType, setAssignedRoleType] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [status, setStatus] = useState('todo');
    const [startDate, setStartDate] = useState('');
    const [dueDate, setDueDate] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onSave(taskId, { title, assignedTo, assignedRoleType, priority, status, startDate, dueDate });
        setTitle(''); setAssignedTo(''); setAssignedRoleType(''); setPriority('Medium'); setStatus('todo'); setStartDate(''); setDueDate('');
    };

    return (
        <tr className="bg-slate-50/10 relative group">
            <td className="w-10 px-4 py-2" />
            <td className="w-10 px-4 py-2" />
            <td className="py-2 pr-6 pl-4 relative" colSpan={9} style={{ paddingLeft: '58px' }}>
                <div className="absolute left-0 top-0 bottom-0 pointer-events-none">
                    <div className="absolute top-0 h-full w-[1px] bg-slate-200/40" style={{ left: '26px' }} />
                    <div className="absolute top-1/2 h-[1px] bg-slate-200/40" style={{ left: '26px', width: '18px' }} />
                </div>

                <form onSubmit={handleSubmit} className="flex items-center gap-2 relative z-10 opacity-70 hover:opacity-100 transition-opacity">
                    <div className="flex-1 relative">
                        <Plus size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            required type="text"
                            placeholder="Add subtask..."
                            value={title} onChange={e => setTitle(e.target.value)}
                            className="w-full bg-white border border-slate-200/80 rounded-xl pl-8 pr-3 py-1.5 text-[11px] font-bold text-slate-700 outline-none focus:border-blue-400 transition-all shadow-sm"
                        />
                    </div>

                    <div className="flex flex-col gap-1 min-w-[120px]">
                        <select
                            value={assignedRoleType} onChange={e => { setAssignedRoleType(e.target.value); setAssignedTo(''); }}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[9px] font-black text-blue-600 outline-none shadow-sm uppercase tracking-tighter"
                        >
                            <option value="">Any Role</option>
                            <option value="WORKER">Worker</option>
                            <option value="FOREMAN">Foreman</option>
                            <option value="SUBCONTRACTOR">Subcontractor</option>
                            {(!user?.role || ['COMPANY_OWNER', 'SUPER_ADMIN', 'PM'].includes(user?.role)) && (
                                <option value="PM">Project Manager</option>
                            )}
                        </select>
                        <select
                            value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-600 outline-none shadow-sm"
                        >
                            <option value="">Assign To</option>
                            {team.filter(u => !assignedRoleType || u.role === assignedRoleType).map(u => (
                                <option key={u._id} value={u._id}>{u.fullName}</option>
                            ))}
                        </select>
                    </div>

                    <select
                        value={priority} onChange={e => setPriority(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[10px] font-bold text-slate-600 outline-none shadow-sm"
                    >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                    </select>

                    <select
                        value={status} onChange={e => setStatus(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[10px] font-bold text-slate-600 outline-none shadow-sm"
                    >
                        <option value="todo">Todo</option>
                        <option value="in_progress">Active</option>
                        <option value="completed">Done</option>
                    </select>

                    <div className="flex gap-2">
                        <input
                            type="date"
                            title="Start Date"
                            value={startDate} onChange={e => setStartDate(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[10px] font-bold text-slate-600 outline-none w-[110px] shadow-sm"
                        />
                        <input
                            type="date"
                            title="Due Date"
                            value={dueDate} onChange={e => setDueDate(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[10px] font-bold text-slate-600 outline-none w-[110px] shadow-sm"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!title.trim() || isSubmitting}
                        className="bg-slate-900 text-white p-1.5 rounded-xl hover:bg-black transition-all disabled:opacity-30 flex items-center gap-1.5 px-4 shadow-md"
                    >
                        <Plus size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Add</span>
                    </button>
                </form>
            </td>
        </tr>
    );
};


// ─── SubTaskTableRow: table-compatible recursive subtask row (list view) ──────
const SubTaskTableRow = ({ subTask, depth, allSubTasks, taskId, team, canManage, onToggle, onUpdate, onAddChild, isSubmitting, renderChildren, isLast, levelLines, isCompactView, columnWidths, projectName, isSelected, onSelect, setNodeRef, style, attributes, listeners }) => {
    const { user } = useAuth();
    const [childrenOpen, setChildrenOpen] = useState(true);
    const [addingHere, setAddingHere] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState({
        title: subTask.title || '',
        assignedTo: subTask.assignedTo?._id || subTask.assignedTo || '',
        assignedRoleType: subTask.assignedRoleType || '',
        priority: subTask.priority || 'Medium',
        status: subTask.status || 'todo',
        startDate: formatDateForInput(subTask.startDate),
        dueDate: formatDateForInput(subTask.dueDate)
    });
    const [childTitle, setChildTitle] = useState('');
    const [childRole, setChildRole] = useState('');
    const [childAssigned, setChildAssigned] = useState('');
    const [childPriority, setChildPriority] = useState('Medium');
    const [childStatus, setChildStatus] = useState('todo');
    const [childStartDate, setChildStartDate] = useState('');
    const [childDueDate, setChildDueDate] = useState('');
    const [savingChild, setSavingChild] = useState(false);

    const directChildren = allSubTasks.filter(st =>
        st.parentSubTaskId === subTask._id || st.parentSubTaskId?._id === subTask._id
    );
    const hasChildren = directChildren.length > 0;

    // Adjusted Indentation & Tree logic
    const baseOffset = 26; // Align with main task toggle center (relative to second td)
    const step = 32;
    const indentPx = (depth + 1) * step + 16; // 16px is px-4 padding

    const handleAddChild = async (e) => {
        e.preventDefault();
        if (!childTitle.trim()) return;
        setSavingChild(true);
        await onAddChild(taskId, {
            title: childTitle,
            assignedTo: childAssigned || undefined,
            assignedRoleType: childRole || undefined,
            priority: childPriority,
            status: childStatus,
            startDate: childStartDate || undefined,
            dueDate: childDueDate || undefined,
            parentSubTaskId: subTask._id
        });
        setChildTitle(''); setChildRole(''); setChildAssigned(''); setChildPriority('Medium'); setChildStatus('todo'); setChildStartDate(''); setChildDueDate('');
        setAddingHere(false);
        setSavingChild(false);
    };

    const handleEditSave = async (e) => {
        if (e) e.preventDefault();
        await onUpdate(subTask, editFormData);
        setIsEditing(false);
    };

    const depthColor = ['border-blue-200', 'border-violet-200', 'border-emerald-200', 'border-amber-200'][depth % 4];

    return (
        <React.Fragment>
            {/* ── Subtask Row ── */}
            <tr
                ref={setNodeRef}
                style={style}
                className={`bg-white hover:bg-slate-50/40 transition-colors border-b border-slate-50 relative group`}
            >
                {/* Selection Checkbox */}
                <td className="w-10 px-4 py-2.5">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => onSelect(subTask._id, e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                </td>
                {/* Grip column (Column 1) */}
                <td className="w-10 px-4 py-2.5">
                    <div
                        {...attributes}
                        {...listeners}
                        onClick={e => e.stopPropagation()}
                        className="p-1 hover:bg-slate-200 rounded-md text-slate-300 hover:text-slate-600 transition-colors cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100"
                    >
                        <GripVertical size={14} />
                    </div>
                </td>

                {/* Task — indent + toggle + checkbox + title (Column 2) */}
                <td className="py-2.5 px-4 relative" style={{ paddingLeft: `${indentPx}px` }}>
                    {/* Tree Connectors */}
                    <div className="absolute left-0 top-0 bottom-0 pointer-events-none">
                        {/* Previous Depth Vertical Lines */}
                        {levelLines.map((hasLine, i) => (
                            hasLine && (
                                <div
                                    key={i}
                                    className="absolute top-0 bottom-0 border-l-[1.5px] border-slate-200"
                                    style={{ left: `${baseOffset + i * step}px` }}
                                />
                            )
                        ))}
                        {/* Current branch vertical line to the next sibling, if not last */}
                        {!isLast && (
                            <div
                                className="absolute border-l-[1.5px] border-slate-200"
                                style={{
                                    left: `${baseOffset + depth * step}px`,
                                    top: '50%',
                                    bottom: '0',
                                }}
                            />
                        )}
                        {/* Curving L shape pointing to the task */}
                        <div
                            className="absolute border-slate-300"
                            style={{
                                left: `${baseOffset + depth * step}px`,
                                top: '0',
                                height: '50%',
                                width: '22px',
                                borderLeftWidth: '1.5px',
                                borderBottomWidth: '1.5px',
                                borderBottomLeftRadius: '8px',
                            }}
                        >
                            {/* SVG Arrowhead at the end */}
                            <div className="absolute -right-[3px] -bottom-[4px] text-slate-400">
                                <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 18l6-6-6-6" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 relative z-10">
                        {/* Expand/Collapse children toggle */}
                        <button
                            onClick={() => setChildrenOpen(!childrenOpen)}
                            className={`shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all ${hasChildren
                                ? 'text-slate-500 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 shadow-sm border border-slate-100'
                                : 'invisible'
                                }`}
                            style={{ transform: childrenOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
                        >
                            <ChevronRight size={10} />
                        </button>

                        {/* Status checkbox */}
                        <button
                            onClick={() => onToggle(subTask)}
                            className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all shadow-sm ${subTask.status === 'completed'
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'bg-white border-slate-300 hover:border-blue-500 hover:bg-blue-50'
                                }`}
                        >
                            {subTask.status === 'completed' && <Check size={10} strokeWidth={3} />}
                        </button>

                        {/* Title */}
                        {isEditing ? (
                            <form onSubmit={handleEditSave} className="flex items-center gap-2 flex-1">
                                <input
                                    autoFocus
                                    className="text-[13px] font-black text-slate-800 bg-white border-2 border-blue-400 rounded-lg px-2 py-0.5 outline-none shadow-sm flex-1 min-w-[120px]"
                                    value={editFormData.title}
                                    onChange={e => setEditFormData({ ...editFormData, title: e.target.value })}
                                />
                                <button type="submit" className="p-1 px-2 bg-blue-600 text-white rounded text-[10px] font-black uppercase tracking-widest">OK</button>
                                <button type="button" onClick={() => setIsEditing(false)} className="p-1 px-2 bg-slate-200 text-slate-500 rounded text-[10px] font-black uppercase tracking-widest">X</button>
                            </form>
                        ) : (
                            <span className={`text-[13px] font-black ${isCompactView ? 'truncate' : 'whitespace-normal'} ${subTask.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900 font-black'
                                }`} title={subTask.title}>
                                {subTask.title}
                            </span>
                        )}

                        {/* Children count badge */}
                        {hasChildren && (
                            <span className="shrink-0 text-[8px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-md">
                                {directChildren.length}
                            </span>
                        )}
                    </div>
                </td>

                {/* Project (Column 3) */}
                <td className={`px-4 py-2.5 text-xs font-bold text-slate-300 ${isCompactView ? 'truncate' : 'whitespace-normal'}`}>{projectName || '—'}</td>

                <td className="px-4 py-2.5">
                    {isEditing ? (
                        <div className="space-y-1">
                            <select
                                value={editFormData.assignedRoleType}
                                onChange={e => setEditFormData({ ...editFormData, assignedRoleType: e.target.value, assignedTo: '' })}
                                className="w-full bg-white border border-slate-200 rounded-lg px-1.5 py-1 text-[9px] font-black text-blue-600 outline-none uppercase tracking-tighter"
                            >
                                <option value="">Any Role</option>
                                <option value="WORKER">Worker</option>
                                <option value="FOREMAN">Foreman</option>
                                <option value="SUBCONTRACTOR">Subcontractor</option>
                                {(!user?.role || ['COMPANY_OWNER', 'SUPER_ADMIN', 'PM'].includes(user?.role)) && (
                                    <option value="PM">Project Manager</option>
                                )}
                            </select>
                            <select
                                value={editFormData.assignedTo}
                                onChange={e => setEditFormData({ ...editFormData, assignedTo: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-lg px-1.5 py-1 text-[10px] font-bold text-slate-700 outline-none"
                            >
                                <option value="">Assign To</option>
                                {team.filter(u => !editFormData.assignedRoleType || u.role === editFormData.assignedRoleType).map(u => (
                                    <option key={u._id} value={u._id}>{u.fullName}</option>
                                ))}
                            </select>
                        </div>
                    ) : subTask.assignedTo?.fullName ? (
                        <div className="flex items-center gap-1.5 opacity-100">
                            <div className="w-5 h-5 rounded bg-slate-100 text-slate-600 flex items-center justify-center text-[8px] font-black border border-slate-200 shadow-sm">
                                {subTask.assignedTo.fullName.charAt(0)}
                            </div>
                            <span className={`text-[10px] font-bold text-slate-700 ${isCompactView ? 'truncate max-w-[100px]' : 'whitespace-normal'}`}>{subTask.assignedTo.fullName}</span>
                        </div>
                    ) : (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded border bg-amber-50 text-amber-600 border-amber-100 uppercase tracking-tighter whitespace-nowrap">
                            Unassigned
                        </span>
                    )}
                </td>

                <td className="px-4 py-2.5">
                    {(() => {
                        const role = (isEditing ? editFormData.assignedRoleType : subTask.assignedRoleType) || subTask.assignedTo?.role;
                        return role ? (
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border whitespace-nowrap ${ROLE_COLORS[role] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                {ROLE_LABELS[role] || role}
                            </span>
                        ) : <span className="text-slate-300 text-[9px] font-bold">—</span>;
                    })()}
                </td>

                <td className="px-4 py-2.5">
                    {canManage ? (
                        <select
                            value={subTask.status}
                            onChange={e => onUpdate(subTask, { status: e.target.value })}
                            className={`text-[10px] font-black px-2 py-1 rounded border outline-none cursor-pointer transition-all uppercase tracking-tighter whitespace-nowrap min-w-[70px] ${subTask.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                subTask.status === 'in_progress' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                    'bg-white text-slate-500 border-slate-200'
                                }`}
                        >
                            <option value="todo">Todo</option>
                            <option value="in_progress">Active</option>
                            <option value="completed">Done</option>
                        </select>
                    ) : (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-tighter ${subTask.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            subTask.status === 'in_progress' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                'bg-slate-50 text-slate-500 border-slate-200'
                            }`}>{subTask.status === 'in_progress' ? 'Active' : subTask.status === 'completed' ? 'Done' : 'Todo'}</span>
                    )}
                </td>

                <td className="px-4 py-2.5">
                    {canManage ? (
                        <select
                            value={subTask.priority}
                            onChange={e => onUpdate(subTask, { priority: e.target.value })}
                            className={`text-[10px] font-black px-2 py-1 rounded border outline-none cursor-pointer transition-all uppercase tracking-tighter whitespace-nowrap min-w-[75px] ${priorityStyles[subTask.priority] || priorityStyles.Medium}`}
                        >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                        </select>
                    ) : (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-tighter ${priorityStyles[subTask.priority] || priorityStyles.Medium}`}>
                            {subTask.priority}
                        </span>
                    )}
                </td>

                {/* Start Date (Column 8) */}
                <td className="px-4 py-2.5 text-[11px] font-black text-slate-500">
                    {isEditing ? (
                        <input
                            type="date"
                            value={editFormData.startDate}
                            onChange={e => setEditFormData({ ...editFormData, startDate: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-lg px-1.5 py-1 text-[10px] font-bold text-slate-700 outline-none"
                        />
                    ) : subTask.startDate ? (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                            <Calendar size={10} className="text-blue-400" />
                            <span>{formatDateUTC(subTask.startDate)}</span>
                        </div>
                    ) : '—'}
                </td>

                {/* End Date (Column 9) */}
                <td className="px-4 py-2.5 text-[11px] font-black text-slate-700">
                    {isEditing ? (
                        <input
                            type="date"
                            value={editFormData.dueDate}
                            onChange={e => setEditFormData({ ...editFormData, dueDate: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-lg px-1.5 py-1 text-[10px] font-bold text-slate-700 outline-none"
                        />
                    ) : subTask.dueDate ? (
                        <div className="flex items-center gap-1.5 opacity-60">
                            <Calendar size={11} />
                            <span>{formatDateUTC(subTask.dueDate)}</span>
                        </div>
                    ) : '—'}
                </td>

                {/* Actions (Column 9) */}
                {canManage && (
                    <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={handleEditSave}
                                        title="Save Changes"
                                        className="p-1.5 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all"
                                    >
                                        <CheckCircle2 size={13} />
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        title="Cancel"
                                        className="p-1.5 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                                    >
                                        <XCircle size={13} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setAddingHere(!addingHere)}
                                        title="Add subtask"
                                        className={`p-1.5 rounded-lg transition-all ${addingHere ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                    >
                                        <Plus size={13} />
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        title="Edit"
                                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                    >
                                        <Edit size={13} />
                                    </button>
                                    <button
                                        onClick={() => onUpdate(subTask, { delete: true })}
                                        title="Delete"
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </>
                            )}
                        </div>
                    </td>
                )}
            </tr>

            {/* ── Inline Add Child Row ── */}
            {addingHere && (
                <tr className="bg-blue-50/20 border-l-[3px] border-blue-400 relative">
                    <td className="w-10 px-4 py-2.5 text-center" />
                    <td className="w-10 px-4 py-2.5" />
                    <td colSpan={9} style={{ paddingLeft: `${indentPx + step}px` }} className="py-2.5 px-4 relative">
                        {/* Tree connector for adding child */}
                        <div className="absolute left-0 top-0 bottom-0 pointer-events-none">
                            {levelLines.map((hasLine, i) => hasLine && <div key={i} className="absolute top-0 bottom-0 w-[1.5px] bg-slate-200/60" style={{ left: `${baseOffset + i * step}px` }} />)}
                            <div className="absolute top-0 bottom-0 w-[1.5px] bg-slate-200/60" style={{ left: `${baseOffset + depth * step}px` }} />
                            <div className="absolute top-0 h-1/2 w-[1.5px] bg-slate-200/60" style={{ left: `${baseOffset + (depth + 1) * step}px` }} />
                            <div className="absolute top-1/2 h-[1.5px] bg-slate-200/60" style={{ left: `${baseOffset + (depth + 1) * step}px`, width: '18px' }} />
                        </div>

                        <form onSubmit={handleAddChild} className="flex flex-wrap items-center gap-2 relative z-10">
                            <input
                                autoFocus required type="text"
                                placeholder="New subtask title..."
                                value={childTitle} onChange={e => setChildTitle(e.target.value)}
                                className="flex-1 bg-white border border-blue-300 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 min-w-[160px] shadow-sm"
                            />
                            <div className="flex flex-col gap-1 min-w-[110px]">
                                <select
                                    value={childRole} onChange={e => { setChildRole(e.target.value); setChildAssigned(''); }}
                                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[9px] font-black text-blue-600 outline-none shadow-sm uppercase tracking-tighter"
                                >
                                    <option value="">Any Role</option>
                                    <option value="WORKER">Worker</option>
                                    <option value="FOREMAN">Foreman</option>
                                    <option value="SUBCONTRACTOR">Subcontractor</option>
                                    {(!user?.role || ['COMPANY_OWNER', 'SUPER_ADMIN', 'PM'].includes(user?.role)) && (
                                        <option value="PM">Project Manager</option>
                                    )}
                                </select>
                                <select
                                    value={childAssigned} onChange={e => setChildAssigned(e.target.value)}
                                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-600 outline-none shadow-sm"
                                >
                                    <option value="">Assign</option>
                                    {team.filter(u => !childRole || u.role === childRole).map(u => (
                                        <option key={u._id} value={u._id}>{u.fullName}</option>
                                    ))}
                                </select>
                            </div>
                            <select value={childPriority} onChange={e => setChildPriority(e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none shadow-sm">
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                            </select>
                            <select
                                value={childStatus} onChange={e => setChildStatus(e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none shadow-sm"
                            >
                                <option value="todo">Todo</option>
                                <option value="in_progress">Active</option>
                                <option value="completed">Done</option>
                            </select>
                            <div className="relative">
                                <span className="absolute -top-3 left-1 text-[7px] font-black text-blue-400 uppercase tracking-widest">Start</span>
                                <input type="date" value={childStartDate} onChange={e => setChildStartDate(e.target.value)}
                                    className="bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-[10px] font-bold text-slate-700 outline-none shadow-sm w-[105px]" />
                            </div>
                            <div className="relative">
                                <span className="absolute -top-3 left-1 text-[7px] font-black text-blue-400 uppercase tracking-widest">End</span>
                                <input type="date" value={childDueDate} onChange={e => setChildDueDate(e.target.value)}
                                    className="bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-[10px] font-bold text-slate-700 outline-none shadow-sm w-[105px]" />
                            </div>
                            <button type="submit" disabled={savingChild}
                                className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-xs font-black hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm">
                                <Plus size={12} /> Add
                            </button>
                            <button type="button" onClick={() => setAddingHere(false)}
                                className="p-1.5 text-slate-500 hover:text-slate-700 rounded-xl hover:bg-white transition border border-slate-200">
                                <X size={14} />
                            </button>
                        </form>
                    </td>
                </tr>
            )}

            {/* ── Recursive children ── */}
            {childrenOpen && hasChildren && renderChildren(subTask._id, depth + 1, [...levelLines, !isLast], projectName)}
        </React.Fragment>
    );
};


// ─── Recursive SubTask Tree Node (ClickUp Style) ─────────────────────────────
const SubTaskTreeNode = ({ node, allSubTasks, depth = 0, taskId, team, canManage, onToggle, onAddChild, onUpdate, onDelete }) => {
    const { user } = useAuth();
    const [collapsed, setCollapsed] = useState(false);
    const [addingHere, setAddingHere] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState({
        title: node.title || '',
        assignedTo: node.assignedTo?._id || node.assignedTo || '',
        assignedRoleType: node.assignedRoleType || '',
        priority: node.priority || 'Medium',
        status: node.status || 'todo',
        startDate: formatDateForInput(node.startDate),
        dueDate: formatDateForInput(node.dueDate)
    });
    const [childTitle, setChildTitle] = useState('');
    const [childRole, setChildRole] = useState('');
    const [childAssigned, setChildAssigned] = useState('');
    const [childPriority, setChildPriority] = useState('Medium');
    const [childStatus, setChildStatus] = useState('todo');
    const [childStartDate, setChildStartDate] = useState('');
    const [childDueDate, setChildDueDate] = useState('');
    const [savingChild, setSavingChild] = useState(false);

    const children = allSubTasks.filter(st => st.parentSubTaskId === node._id || st.parentSubTaskId?._id === node._id);

    const handleAddChild = async (e) => {
        e.preventDefault();
        if (!childTitle.trim()) return;
        setSavingChild(true);
        await onAddChild({
            title: childTitle,
            assignedTo: childAssigned || undefined,
            assignedRoleType: childRole || undefined,
            priority: childPriority,
            status: childStatus,
            startDate: childStartDate || undefined,
            dueDate: childDueDate || undefined,
            parentSubTaskId: node._id
        });
        setChildTitle('');
        setChildRole('');
        setChildAssigned('');
        setChildPriority('Medium');
        setChildStatus('todo');
        setChildStartDate('');
        setChildDueDate('');
        setAddingHere(false);
        setSavingChild(false);
    };

    const indentPx = depth * 20;

    return (
        <div>
            {/* ── Node Row ── */}
            <div
                className="group flex items-center gap-2 py-2 px-3 rounded-xl hover:bg-slate-50 transition-colors"
                style={{ marginLeft: `${indentPx}px` }}
            >
                {/* Collapse toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={`shrink-0 w-4 h-4 flex items-center justify-center transition-transform text-slate-300 hover:text-slate-500 ${children.length === 0 ? 'invisible' : ''}`}
                >
                    <ChevronRight size={12} style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform 0.15s' }} />
                </button>

                {/* Checkbox */}
                <button
                    onClick={() => onToggle(node)}
                    className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${node.status === 'completed'
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-300 hover:border-blue-400'
                        }`}
                >
                    {node.status === 'completed' && <Check size={11} strokeWidth={3} />}
                </button>

                {/* Title and Editing Form */}
                {isEditing ? (
                    <div className="flex-1 flex flex-wrap gap-2 items-center bg-white p-2 rounded-xl shadow-inner border border-blue-100">
                        <input
                            required
                            className="bg-white border-2 border-blue-400 rounded-lg px-2 py-1 text-sm font-bold flex-1"
                            value={editFormData.title}
                            onChange={e => setEditFormData({ ...editFormData, title: e.target.value })}
                        />
                        <div className="flex flex-col gap-1 min-w-[110px]">
                            <select
                                value={editFormData.assignedRoleType}
                                onChange={e => setEditFormData({ ...editFormData, assignedRoleType: e.target.value, assignedTo: '' })}
                                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[9px] font-black text-blue-600 outline-none uppercase tracking-tighter"
                            >
                                <option value="">Any Role</option>
                                <option value="WORKER">Worker</option>
                                <option value="FOREMAN">Foreman</option>
                                <option value="SUBCONTRACTOR">Subcontractor</option>
                                {(!user?.role || ['COMPANY_OWNER', 'SUPER_ADMIN', 'PM'].includes(user?.role)) && (
                                    <option value="PM">Project Manager</option>
                                )}
                            </select>
                            <select value={editFormData.assignedTo} onChange={e => setEditFormData({ ...editFormData, assignedTo: e.target.value })}
                                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold">
                                <option value="">Assign</option>
                                {team.filter(u => !editFormData.assignedRoleType || u.role === editFormData.assignedRoleType).map(u => (
                                    <option key={u._id} value={u._id}>{u.fullName}</option>
                                ))}
                            </select>
                        </div>
                        <select value={editFormData.status} onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold">
                            <option value="todo">Todo</option>
                            <option value="in_progress">Active</option>
                            <option value="completed">Done</option>
                        </select>
                        <div className="flex gap-2">
                            <input type="date" value={editFormData.startDate} onChange={e => setEditFormData({ ...editFormData, startDate: e.target.value })}
                                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold w-[110px]" />
                            <input type="date" value={editFormData.dueDate} onChange={e => setEditFormData({ ...editFormData, dueDate: e.target.value })}
                                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold w-[110px]" />
                        </div>
                        <div className="flex gap-1 ml-auto">
                            <button onClick={async () => { await onUpdate(node, editFormData); setIsEditing(false); }} className="p-1 px-3 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase">Save</button>
                            <button onClick={() => setIsEditing(false)} className="p-1 px-3 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase">X</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <span className={`flex-1 text-sm font-bold truncate ${node.status === 'completed' ? 'line-through text-slate-300' : 'text-slate-800'
                            }`}>
                            {node.title}
                        </span>

                        {/* Badges */}
                        <span className={`shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${priorityStyles[node.priority] || priorityStyles.Medium}`}>
                            {node.priority}
                        </span>
                        {node.status !== 'completed' && (
                            <span className={`shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${node.status === 'in_progress' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-400 border-slate-200'
                                }`}>
                                {node.status.replace('_', ' ')}
                            </span>
                        )}
                        {(() => {
                            const role = node.assignedRoleType || node.assignedTo?.role;
                            return role && (
                                <span className={`shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded border uppercase ${ROLE_COLORS[role] || 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                    {ROLE_LABELS[role] || role}
                                </span>
                            );
                        })()}
                        {node.assignedTo?.fullName ? (
                            <span className="shrink-0 text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                <UserCheck size={10} className="text-blue-400" />{node.assignedTo.fullName}
                            </span>
                        ) : (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded border bg-amber-50 text-amber-600 border-amber-100 uppercase tracking-tighter whitespace-nowrap">
                                Unassigned
                            </span>
                        )}
                        {node.startDate && (
                            <span className="shrink-0 text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                <Calendar size={10} className="text-blue-400" />{formatDateUTC(node.startDate)}
                            </span>
                        )}
                        {node.dueDate && (
                            <span className="shrink-0 text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                <Clock size={10} className="text-orange-400" />{formatDateUTC(node.dueDate)}
                            </span>
                        )}

                        {/* Actions */}
                        <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!isEditing && canManage && (
                                <>
                                    <button
                                        onClick={() => setAddingHere(!addingHere)}
                                        title="Add subtask here"
                                        className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                                    >
                                        <Plus size={13} />
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        title="Edit"
                                        className="p-1 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition"
                                    >
                                        <Edit size={13} />
                                    </button>
                                    <button
                                        onClick={() => onDelete(node)}
                                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Progress bar if has children */}
            {children.length > 0 && (
                <div className="flex items-center gap-2 px-3 pb-1" style={{ marginLeft: `${indentPx + 28}px` }}>
                    <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-400 transition-all"
                            style={{ width: `${Math.round((children.filter(c => c.status === 'completed').length / children.length) * 100)}%` }}
                        />
                    </div>
                    <span className="text-[9px] font-black text-slate-300">
                        {children.filter(c => c.status === 'completed').length}/{children.length}
                    </span>
                </div>
            )}

            {/* Inline Add Form */}
            {addingHere && (
                <form onSubmit={handleAddChild} className="flex flex-wrap gap-2 items-center px-3 py-2 bg-blue-50/60 rounded-xl border border-blue-100 mb-1" style={{ marginLeft: `${indentPx + 28}px` }}>
                    <input
                        autoFocus
                        required
                        type="text"
                        placeholder="Subtask title..."
                        value={childTitle}
                        onChange={e => setChildTitle(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 min-w-[140px]"
                    />
                    <div className="flex flex-col gap-1 min-w-[110px]">
                        <select
                            value={childRole} onChange={e => { setChildRole(e.target.value); setChildAssigned(''); }}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[9px] font-black text-blue-600 outline-none shadow-sm uppercase tracking-tighter"
                        >
                            <option value="">Any Role</option>
                            <option value="WORKER">Worker</option>
                            <option value="FOREMAN">Foreman</option>
                            <option value="SUBCONTRACTOR">Subcontractor</option>
                            {(!user?.role || ['COMPANY_OWNER', 'SUPER_ADMIN', 'PM'].includes(user?.role)) && (
                                <option value="PM">Project Manager</option>
                            )}
                        </select>
                        <select value={childAssigned} onChange={e => setChildAssigned(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none">
                            <option value="">Assign</option>
                            {team.filter(u => !childRole || u.role === childRole).map(u => (
                                <option key={u._id} value={u._id}>{u.fullName}</option>
                            ))}
                        </select>
                    </div>
                    <select value={childPriority} onChange={e => setChildPriority(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 outline-none">
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                    </select>
                    <select
                        value={childStatus} onChange={e => setChildStatus(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none shadow-sm"
                    >
                        <option value="todo">Todo</option>
                        <option value="in_progress">Active</option>
                        <option value="completed">Done</option>
                    </select>
                    <div className="relative">
                        <span className="absolute -top-3 left-1 text-[7px] font-black text-blue-400 uppercase tracking-widest">Start</span>
                        <input type="date" value={childStartDate} onChange={e => setChildStartDate(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-700 outline-none w-[100px]" />
                    </div>
                    <div className="relative">
                        <span className="absolute -top-3 left-1 text-[7px] font-black text-blue-400 uppercase tracking-widest">End</span>
                        <input type="date" value={childDueDate} onChange={e => setChildDueDate(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-700 outline-none w-[100px]" />
                    </div>
                    <button type="submit" disabled={savingChild}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-black hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1">
                        <Plus size={12} /> Add
                    </button>
                    <button type="button" onClick={() => setAddingHere(false)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white transition">
                        <X size={14} />
                    </button>
                </form>
            )}

            {/* Children */}
            {!collapsed && children.length > 0 && (
                <div className="border-l-2 border-slate-100 ml-5">
                    {children.map(child => (
                        <SubTaskTreeNode
                            key={child._id}
                            node={child}
                            allSubTasks={allSubTasks}
                            depth={depth + 1}
                            taskId={taskId}
                            team={team}
                            canManage={canManage}
                            onToggle={onToggle}
                            onAddChild={onAddChild}
                            onUpdate={onUpdate}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Sortable SubTask Row wrapper ─────────────────────────────────────────────
const SortableSubTaskRow = (props) => {
    const { subTask } = props;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: subTask._id || subTask.id
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        position: isDragging ? 'relative' : 'static',
        zIndex: isDragging ? 50 : 1,
    };

    return (
        <SubTaskTableRow
            {...props}
            setNodeRef={setNodeRef}
            style={style}
            attributes={attributes}
            listeners={listeners}
        />
    );
};

// ─── Main Tasks Page ───────────────────────────────────────────────────────────
const Tasks = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const highlightTaskId = searchParams.get('taskId');
    const [view, setView] = useState('list');
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [subTasks, setSubTasks] = useState([]);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [isSubmittingSubTask, setIsSubmittingSubTask] = useState(false);
    const [expandedTasks, setExpandedTasks] = useState(new Set());
    const [subTasksMap, setSubTasksMap] = useState({});
    const [scheduleTasks, setScheduleTasks] = useState([]);
    const [activeTab, setActiveTab] = useState('all_tasks'); // 'all_tasks' | 'my_tasks'
    const [jobs, setJobs] = useState([]);
    const [isCompactView, setIsCompactView] = useState(true);
    const [selectedTasks, setSelectedTasks] = useState(new Set());
    const tableContainerRef = useRef(null);

    // Quick Template States
    const [isQuickTemplateModalOpen, setIsQuickTemplateModalOpen] = useState(false);
    const [quickTemplateName, setQuickTemplateName] = useState('');
    const [taskForQuickTemplate, setTaskForQuickTemplate] = useState(null);

    // Scroll to highlighted task
    useEffect(() => {
        if (highlightTaskId && !loading && tasks.length > 0) {
            const timer = setTimeout(() => {
                const element = document.getElementById(`task-row-${highlightTaskId}`) ||
                    document.getElementById(`task-card-${highlightTaskId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [highlightTaskId, loading, tasks]);
    const [columnWidths, setColumnWidths] = useState({
        task: 500,
        project: 180,
        assignee: 180,
        role: 120,
        status: 120,
        priority: 120,
        startDate: 120,
        endDate: 120,
        actions: 100
    });

    const handleResizeStart = (e, col) => {
        e.preventDefault();
        const startX = e.pageX;
        const startWidth = columnWidths[col];
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onMouseMove = (moveEvent) => {
            const newWidth = Math.max(50, startWidth + (moveEvent.pageX - startX));
            setColumnWidths(prev => ({ ...prev, [col]: newWidth }));
        };

        const onMouseUp = () => {
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    // Task Templates State
    const [templates, setTemplates] = useState([]);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [isTemplateDeleteModalOpen, setIsTemplateDeleteModalOpen] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState(null);
    const [templateFormData, setTemplateFormData] = useState({
        templateName: '',
        assignedRole: '',
        taskTitle: '',
        description: '',
        priority: 'Medium',
        estimatedHours: 0,
        steps: []
    });
    const [subTasksList, setSubTasksList] = useState([]);
    const [selectedTemplates, setSelectedTemplates] = useState(new Set());
    const [isBulkSaveConfirmModalOpen, setIsBulkSaveConfirmModalOpen] = useState(false);
    const [isBulkDeleteTemplateModalOpen, setIsBulkDeleteTemplateModalOpen] = useState(false);
    const [isSubTaskDeleteModalOpen, setIsSubTaskDeleteModalOpen] = useState(false);
    const [subTaskToDeleteInfo, setSubTaskToDeleteInfo] = useState(null);

    // Bulk Apply States
    const [isBulkApplyModalOpen, setIsBulkApplyModalOpen] = useState(false);
    const [bulkApplyProject, setBulkApplyProject] = useState('');
    const [bulkApplyJob, setBulkApplyJob] = useState('');
    const [bulkJobs, setBulkJobs] = useState([]);

    // Filters
    const [filterStatus, setFilterStatus] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterDueFrom, setFilterDueFrom] = useState('');
    const [filterDueTo, setFilterDueTo] = useState('');
    const [filterProject, setFilterProject] = useState(searchParams.get('projectId') || '');
    
    // Sync filterProject with URL searchParams
    useEffect(() => {
        const urlProjId = searchParams.get('projectId') || '';
        if (urlProjId !== filterProject) {
            setFilterProject(urlProjId);
        }
    }, [searchParams]);

    const handleProjectFilterChange = (val) => {
        setFilterProject(val);
        setSearchParams(prev => {
            if (val) prev.set('projectId', val);
            else prev.delete('projectId');
            return prev;
        });
    };
    const [formData, setFormData] = useState({
        title: '', projectId: '', jobId: '', assignedTo: [], assignedRoleType: '',
        priority: 'Medium', status: 'todo', dueDate: '', startDate: '', description: '',
        category: 'TASK'
    });

    useEffect(() => {
        const fetchJobs = async () => {
            if (!formData.projectId) {
                setJobs([]);
                setFormData(prev => ({ ...prev, jobId: '' }));
                return;
            }
            try {
                const res = await api.get(`/jobs?projectId=${formData.projectId}`);
                setJobs(res.data);
            } catch (err) {
                console.error('Error fetching jobs:', err);
                setJobs([]);
            }
        };
        fetchJobs();
    }, [formData.projectId]);

    useEffect(() => {
        const fetchBulkJobs = async () => {
            if (!bulkApplyProject) {
                setBulkJobs([]);
                setBulkApplyJob('');
                return;
            }
            try {
                const res = await api.get(`/jobs?projectId=${bulkApplyProject}`);
                setBulkJobs(res.data);
            } catch (err) {
                console.error('Error fetching bulk jobs:', err);
                setBulkJobs([]);
            }
        };
        fetchBulkJobs();
    }, [bulkApplyProject]);

    const [newSubTask, setNewSubTask] = useState({
        title: '', assignedTo: '', assignedRoleType: '', startDate: '', dueDate: '', remarks: '', priority: 'Medium'
    });

    const columns = {
        'todo': { label: 'To Do', dot: 'bg-slate-400' },
        'in_progress': { label: 'In Progress', dot: 'bg-blue-600' },
        'review': { label: 'In Review', dot: 'bg-orange-500' },
        'completed': { label: 'Completed', dot: 'bg-emerald-500' },
    };

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    const fetchSubTasks = async (taskId, viewUpdate = true) => {
        if (!taskId || taskId === 'undefined') return [];
        try {
            const res = await api.get(`/tasks/${taskId}/subtasks`);
            const data = res.data || [];
            if (viewUpdate) setSubTasks(data);
            setSubTasksMap(prev => ({ ...prev, [taskId]: data }));
            return data;
        } catch (error) {
            console.error('Error fetching subtasks:', error);
        }
    };

    const toggleTaskExpansion = async (taskId) => {
        const newExpanded = new Set(expandedTasks);
        if (newExpanded.has(taskId)) {
            newExpanded.delete(taskId);
        } else {
            newExpanded.add(taskId);
            if (!subTasksMap[taskId]) {
                await fetchSubTasks(taskId, false);
            }
        }
        setExpandedTasks(newExpanded);
    };

    const handleSelectTask = (taskId, isSelected) => {
        setSelectedTasks(prev => {
            const next = new Set(prev);
            if (isSelected) next.add(taskId);
            else next.delete(taskId);
            return next;
        });
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            // Include all root tasks AND their subtasks currently in the flat list
            const allIds = tasks.map(t => t._id || t.id);
            // Also recursively find subtasks in the map
            Object.values(subTasksMap).forEach(list => {
                list.forEach(st => allIds.push(st._id || st.id));
            });
            setSelectedTasks(new Set(allIds));
        } else {
            setSelectedTasks(new Set());
        }
    };

    const handleSelectTemplate = (id, checked) => {
        const next = new Set(selectedTemplates);
        if (checked) next.add(id);
        else next.delete(id);
        setSelectedTemplates(next);
    };

    const handleSelectAllTemplates = (checked) => {
        if (checked) {
            setSelectedTemplates(new Set(templates.map(t => t._id)));
        } else {
            setSelectedTemplates(new Set());
        }
    };

    const handleBulkUseTemplates = () => {
        if (selectedTemplates.size === 0) return;
        setBulkApplyProject('');
        setBulkApplyJob('');
        setIsBulkApplyModalOpen(true);
        setIsTemplateModalOpen(false);
    };

    const confirmBulkApply = async () => {
        if (!bulkApplyProject) {
            toast.error('Please select a project');
            return;
        }
        try {
            setIsSubmitting(true);
            const selected = templates.filter(t => selectedTemplates.has(t._id));

            const promises = selected.map(tmpl => {
                const basicPayload = {
                    title: tmpl.taskTitle,
                    description: tmpl.description || '',
                    priority: tmpl.priority || 'Medium',
                    assignedRoleType: tmpl.assignedRole,
                    projectId: bulkApplyProject,
                    status: 'todo',
                    category: 'TASK',
                    subTasksList: tmpl.steps || []
                };

                if (bulkApplyJob) {
                    return api.post('/job-tasks', {
                        ...basicPayload,
                        jobId: bulkApplyJob,
                        priority: basicPayload.priority.toLowerCase(),
                        status: 'pending',
                        assignedTo: undefined // Match existing logic
                    });
                } else {
                    return api.post('/tasks', {
                        ...basicPayload,
                        assignedTo: []
                    });
                }
            });

            await Promise.all(promises);
            toast.success(`Successfully created ${selected.length} separate tasks!`);
            setIsBulkApplyModalOpen(false);
            setSelectedTemplates(new Set());
            fetchData();
            if (['kanban', 'gantt', 'calendar'].includes(view)) fetchScheduleData();
        } catch (err) {
            console.error('Bulk apply error:', err);
            toast.error(err.response?.data?.message || 'Failed to apply templates');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBulkDeleteTemplates = () => {
        if (selectedTemplates.size === 0) return;
        setIsBulkDeleteTemplateModalOpen(true);
    };

    const confirmBulkDeleteTemplates = async () => {
        try {
            setIsSubmitting(true);
            setIsBulkDeleteTemplateModalOpen(false);
            await api.post('/task-templates/bulk-delete', { ids: Array.from(selectedTemplates) });
            toast.success('Templates deleted successfully');
            setSelectedTemplates(new Set());
            fetchTemplates();
        } catch (err) {
            console.error('Bulk delete error:', err);
            toast.error(err.response?.data?.message || 'Failed to delete templates');
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmTemplateDelete = async () => {
        if (!templateToDelete) return;
        try {
            setIsSubmitting(true);
            await api.delete(`/task-templates/${templateToDelete._id}`);
            toast.success('Template deleted successfully');
            setIsTemplateDeleteModalOpen(false);
            setTemplateToDelete(null);
            fetchTemplates();
        } catch (error) {
            console.error('Error deleting template:', error);
            toast.error('Failed to delete template');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBulkSaveAsTemplate = () => {
        if (selectedTasks.size === 0) return;
        setIsBulkSaveConfirmModalOpen(true);
    };

    const confirmBulkSaveAsTemplate = async () => {
        try {
            setIsSubmitting(true);
            setIsBulkSaveConfirmModalOpen(false);

            // All tasks and subtasks flat list
            const allTasksFull = [...tasks];
            Object.values(subTasksMap).forEach(list => allTasksFull.push(...list));

            // Logic to filter top-most selected items to avoid redundancy
            const topMostSelected = Array.from(selectedTasks).filter(id => {
                const task = allTasksFull.find(t => (t._id || t.id) === id);
                if (!task) return false;

                // If it has a parent in the selection, skip it (because parent will include it)
                let current = task;
                while (current) {
                    const pid = current.parentSubTaskId || current.taskId || current.parentTask?._id || current.parentTask?.id;
                    if (pid && selectedTasks.has(pid)) return false;

                    // Traverse up
                    if (pid) {
                        current = allTasksFull.find(t => (t._id || t.id) === pid);
                    } else {
                        break;
                    }
                }
                return true;
            });

            const promises = topMostSelected.map(taskId => {
                const task = allTasksFull.find(t => (t._id || t.id) === taskId);
                return api.post('/task-templates/from-task', {
                    taskId,
                    isJobTask: !!task?.isJobTask
                });
            });

            await Promise.all(promises);
            setSelectedTasks(new Set());
            fetchTemplates();
            toast.success(`Successfully saved ${topMostSelected.length} templates!`);
        } catch (err) {
            console.error('Error bulk saving templates:', err);
            toast.error('Failed to save templates');
        } finally {
            setIsSubmitting(false);
        }
    };

    const fetchTemplates = async () => {
        try {
            const res = await api.get('/task-templates');
            setTemplates(res.data);
        } catch (error) { console.error('Error fetching templates:', error); }
    };

    const handleSaveAsTemplate = (task) => {
        setTaskForQuickTemplate(task);
        setQuickTemplateName(`${task.title} Template`);
        setIsQuickTemplateModalOpen(true);
    };

    const confirmQuickSaveTemplate = async () => {
        if (!taskForQuickTemplate || !quickTemplateName.trim()) return;
        try {
            setIsSubmitting(true);
            await api.post('/task-templates/from-task', {
                taskId: taskForQuickTemplate._id || taskForQuickTemplate.id,
                isJobTask: !!taskForQuickTemplate.isJobTask,
                templateName: quickTemplateName.trim()
            });
            toast.success('Task saved as template!');
            setIsQuickTemplateModalOpen(false);
            setTaskForQuickTemplate(null);
            fetchTemplates();
        } catch (error) {
            console.error('Error saving task as template:', error);
            toast.error('Failed to save template');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDragEndTemplates = async (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = templates.findIndex(t => t._id === active.id);
        const newIndex = templates.findIndex(t => t._id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            const newOrderedTemplates = arrayMove(templates, oldIndex, newIndex);

            // Optimistic UI update
            setTemplates(newOrderedTemplates);

            try {
                const reorderPayload = newOrderedTemplates.map((t, idx) => ({
                    id: t._id,
                    position: idx
                }));

                await api.post('/task-templates/reorder', { templates: reorderPayload });
                toast.success('Templates reordered');
            } catch (error) {
                console.error('Failed to reorder templates:', error);
                fetchTemplates();
                toast.error('Failed to save template order');
            }
        }
    };

    const fetchData = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const params = {
                status: filterStatus || undefined,
                projectId: filterProject || undefined,
                assignedRoleType: filterRole || undefined,
                category: filterCategory || undefined,
                dueFrom: filterDueFrom || undefined,
                dueTo: filterDueTo || undefined,
                q: searchTerm || undefined
            };
            const tasksRes = await api.get('/tasks', { params });
            setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
        } catch (error) {
            console.error('Error fetching task data:', error);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const fetchDropdownData = async () => {
        try {
            const isFieldRole = ['FOREMAN', 'WORKER', 'SUBCONTRACTOR'].includes(user?.role);
            const [projectsRes, usersRes, metricsRes] = await Promise.all([
                api.get('/projects'),
                api.get('/auth/users'),
                isFieldRole ? api.get('/reports/sidebar-metrics') : Promise.resolve({ data: { projects: [] } })
            ]);
            
            if (isFieldRole) {
                // For field roles, 'projects' state will hold JOBS (from sidebar-metrics)
                setProjects(metricsRes.data.projects || []);
            } else {
                setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
            }
            
            setTeam((usersRes.data || []).filter(u =>
                ['WORKER', 'FOREMAN', 'SUBCONTRACTOR', 'PM'].includes(u.role)
            ));
        } catch (error) {
            console.error('Error fetching dropdown data:', error);
        }
    };

    useEffect(() => {
        fetchDropdownData();
    }, []);

    useEffect(() => {
        fetchData();
    }, [filterStatus, filterProject, filterRole, filterCategory, filterDueFrom, filterDueTo, searchTerm]);

    useEffect(() => {
        fetchData();
        fetchTemplates();
        // Default to list view for workers/subcontractors for better mobile experience
        if (['WORKER', 'SUBCONTRACTOR'].includes(user?.role)) {
            setView('list');
            setActiveTab('my_tasks');
        }
    }, [user?.role]);

    // Team members eligible based on current user's role (RBAC)
    const availableTeam = useMemo(() => {
        let list = team;
        if (user?.role === 'PM') {
            list = list.filter(u => ['PM', 'FOREMAN', 'SUBCONTRACTOR', 'WORKER'].includes(u.role));
        } else if (['FOREMAN', 'SUBCONTRACTOR'].includes(user?.role)) {
            list = list.filter(u => u.role === 'WORKER');
        }
        return list;
    }, [team, user?.role]);

    // Team members filtered by the selected role in the Create/Edit Task form
    const filteredTeamByRole = useMemo(() => {
        if (formData.assignedRoleType) {
            return availableTeam.filter(u => u.role === formData.assignedRoleType);
        }
        return availableTeam;
    }, [availableTeam, formData.assignedRoleType]);

    // Filtering Logic Helper
    const isDirectlyAssigned = (task) => {
        if (!task) return false;
        const currentUserId = user?._id || user?.id;
        if (!currentUserId) return false;

        const checkMe = (t) => {
            const assignedIds = Array.isArray(t.assignedTo)
                ? t.assignedTo.map(u => (u._id || u.id || u).toString())
                : (t.assignedTo ? [(t.assignedTo._id || t.assignedTo.id || t.assignedTo).toString()] : []);
            if (assignedIds.includes(currentUserId.toString())) return true;
            if (t.createdBy === currentUserId.toString() || t.createdBy?._id === currentUserId.toString()) return true;
            return false;
        };

        if (checkMe(task)) return true;

        // Check assigned children if any
        const children = task.subTasks || subTasksMap[task._id || task.id] || [];
        if (children.some(checkMe)) return true;

        return false;
    };

    // Apply all filters to general task list
    const filteredTasks = useMemo(() => {
        const matchesCriteria = (task) => {
            const matchSearch = !searchTerm || 
                String(task.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                String(task.projectId?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (Array.isArray(task.assignedTo) 
                    ? task.assignedTo.some(u => String(u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()))
                    : String(task.assignedTo?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
                (task.isSubTask);

            const matchStatus = !filterStatus || task.status === filterStatus;
            const matchRole = !filterRole || task.assignedRoleType === filterRole;
            const matchProject = !filterProject || (task.projectId?._id || task.projectId) === filterProject;
            const matchCategory = !filterCategory || task.category === filterCategory;
            const matchTab = activeTab === 'all_tasks' || isDirectlyAssigned(task);

            let matchDue = true;
            if (task.dueDate || task.startDate) {
                const sStr = task.startDate ? (task.startDate.includes('T') ? task.startDate.split('T')[0] : task.startDate) : null;
                const eStr = task.dueDate ? (task.dueDate.includes('T') ? task.dueDate.split('T')[0] : task.dueDate) : sStr;
                if (filterDueFrom && eStr) matchDue = matchDue && eStr >= filterDueFrom;
                if (filterDueTo && sStr) matchDue = matchDue && sStr <= filterDueTo;
            }
            
            return matchStatus && matchRole && matchProject && matchDue && matchCategory && matchTab && matchSearch;
        };

        return tasks.filter(task => {
            if (matchesCriteria(task)) return true;
            if (task.subTasks && task.subTasks.some(st => matchesCriteria(st))) return true;
            return false;
        });
    }, [tasks, searchTerm, filterStatus, filterRole, filterProject, filterDueFrom, filterDueTo, filterCategory, activeTab, user]);

    const isAllSelected = useMemo(() => {
        if (tasks.length === 0) return false;
        const allFilteredIds = filteredTasks.map(t => t._id || t.id);
        // Also check subtasks of expanded tasks
        expandedTasks.forEach(pId => {
            const list = subTasksMap[pId] || [];
            list.forEach(st => allFilteredIds.push(st._id || st.id));
        });
        return allFilteredIds.length > 0 && allFilteredIds.every(id => selectedTasks.has(id));
    }, [filteredTasks, expandedTasks, subTasksMap, selectedTasks]);

    // Apply all filters to specialized schedule data
    const filteredScheduleTasks = useMemo(() => {
        const matchesCriteria = (task) => {
            const matchSearch = !searchTerm || 
                String(task.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                String(task.projectId?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (Array.isArray(task.assignedTo) 
                    ? task.assignedTo.some(u => String(u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()))
                    : String(task.assignedTo?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
                (task.isSubTask);

            const matchStatus = !filterStatus || task.status === filterStatus;
            const matchRole = !filterRole || task.assignedRoleType === filterRole;
            const matchProject = !filterProject || (task.projectId?._id || task.projectId) === filterProject;
            const matchCategory = !filterCategory || task.category === filterCategory;
            const matchTab = activeTab === 'all_tasks' || isDirectlyAssigned(task);

            let matchDue = true;
            if (task.dueDate || task.startDate) {
                const sStr = task.startDate ? (task.startDate.includes('T') ? task.startDate.split('T')[0] : task.startDate) : null;
                const eStr = task.dueDate ? (task.dueDate.includes('T') ? task.dueDate.split('T')[0] : task.dueDate) : sStr;
                if (filterDueFrom && eStr) matchDue = matchDue && eStr >= filterDueFrom;
                if (filterDueTo && sStr) matchDue = matchDue && sStr <= filterDueTo;
            }
            
            return matchStatus && matchRole && matchProject && matchDue && matchCategory && matchTab && matchSearch;
        };

        return scheduleTasks.filter(task => {
            if (matchesCriteria(task)) return true;
            if (task.subTasks && task.subTasks.some(st => matchesCriteria(st))) return true;
            return false;
        });
    }, [scheduleTasks, searchTerm, filterStatus, filterRole, filterProject, filterDueFrom, filterDueTo, filterCategory, activeTab, user]);

    // Flatten all tasks and subtasks for unified board view
    const allFlattenedTasks = useMemo(() => {
        const flat = [];
        const process = (taskItems, parentTitle = null) => {
            taskItems.forEach(t => {
                const subId = t._id || t.id;
                // Avoid duplicates if a task appears in both lists
                if (flat.some(f => (f._id || f.id) === subId)) return;

                flat.push({ ...t, parentTaskTitle: parentTitle });

                // Merge subtasks from inline t.subTasks and the loaded subTasksMap
                // Prioritize whatever has data to prevent "disappearing" on empty refreshes
                const subsFromTask = t.subTasks || [];
                const subsFromMap = subTasksMap[subId] || [];
                const subs = subsFromTask.length > 0 ? subsFromTask : subsFromMap;

                if (subs.length > 0) process(subs, t.title);
            });
        };

        // Start processing from both sources to ensure we catch all potential tasks
        // We use the UNFILTERED results as base for flattening so we don't skip children
        // whose parents might have been filtered out (e.g. parent not assigned to worker)
        process([...scheduleTasks, ...tasks]);

        // NOW filter the flat list for what should actually appear on the board
        return flat.filter(task => {
            // Apply similar logic to filteredTasks but on the flattened individual items
            const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? [task.assignedTo] : []);
            const matchSearch = !searchTerm ||
                String(task.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                String(task.projectId?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                assignees.some(u => String(u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()));

            const matchStatus = !filterStatus || task.status === filterStatus;
            const matchRole = !filterRole || task.assignedRoleType === filterRole;
            const isFieldRole = ['FOREMAN', 'WORKER', 'SUBCONTRACTOR'].includes(user?.role);
            const matchProject = !filterProject || 
                (isFieldRole 
                    ? (task.jobId?._id || task.jobId) === filterProject 
                    : (task.projectId?._id || task.projectId) === filterProject);
            const matchCategory = !filterCategory || task.category === filterCategory;

            // Important for Worker Dashboard: only show tasks they are involved in if on 'my_tasks'
            const matchTab = activeTab === 'all_tasks' || isDirectlyAssigned(task);

            let matchDue = true;
            if (task.dueDate) {
                const dueStr = task.dueDate.includes('T') ? task.dueDate.split('T')[0] : task.dueDate;
                if (filterDueFrom) matchDue = matchDue && dueStr >= filterDueFrom;
                if (filterDueTo) matchDue = matchDue && dueStr <= filterDueTo;
            }

            return matchSearch && matchStatus && matchRole && matchProject && matchDue && matchCategory && matchTab;
        });
    }, [tasks, scheduleTasks, subTasksMap, searchTerm, filterStatus, filterRole, filterProject, filterDueFrom, filterDueTo, filterCategory, activeTab, user]);
    const handleTaskUpdate = async (taskId, updates, isSubTask = false, activeTask = null) => {
        try {
            if (isSubTask) {
                let pId = activeTask?.taskId?._id || activeTask?.taskId;
                if (!pId) {
                    const parentTask = scheduleTasks.find(t => (t.subTasks || []).some(st => (st._id || st.id) === taskId));
                    pId = parentTask?.id || parentTask?._id;
                }

                if (pId) {
                    await api.patch(`/tasks/${pId}/subtasks/${taskId}`, updates);
                } else {
                    console.error("Could not determine root task ID for subtask update");
                    return;
                }
            } else {
                const isJobTask = (scheduleTasks.find(t => String(t._id || t.id) === String(taskId))?.isJobTask) ||
                    (tasks.find(t => String(t._id || t.id) === String(taskId))?.isJobTask);

                const endpoint = isJobTask ? `/job-tasks/${taskId}` : `/tasks/${taskId}`;
                let finalUpdates = { ...updates };
                if (isJobTask) {
                    if (finalUpdates.assignedTo !== undefined) {
                        finalUpdates.assignedTo = Array.isArray(updates.assignedTo) ? (updates.assignedTo[0] || null) : updates.assignedTo;
                    }
                    if (finalUpdates.priority !== undefined && typeof finalUpdates.priority === 'string') {
                        finalUpdates.priority = finalUpdates.priority.toLowerCase();
                    }
                }

                await api.patch(endpoint, finalUpdates);
            }
            // Silent sync after optimistic update
            if (['kanban', 'gantt', 'calendar'].includes(view)) fetchScheduleData(false);
            fetchData(false);
        } catch (error) {
            console.error('Failed to update task:', error);
            // Revert on failure
            fetchData();
            if (['kanban', 'gantt', 'calendar'].includes(view)) fetchScheduleData();
        }
    };

    const fetchScheduleData = async (showLoading = true) => {
        try {
            const params = {
                projectId: filterProject || undefined,
                status: filterStatus || undefined,
                assignedRoleType: filterRole || undefined,
                category: filterCategory || undefined,
                q: searchTerm || undefined
            };
            const res = await api.get('/tasks/schedule', { params });
            setScheduleTasks(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Error fetching schedule data:', error);
        }
    };

    useEffect(() => {
        if (['kanban', 'gantt', 'calendar'].includes(view)) {
            fetchScheduleData();

            // For Kanban view, if we have tasks with sub-tasks that aren't loaded yet, fetch them
            // This ensures workers see all their sub-tasks on the board immediately
            if (view === 'kanban') {
                const tasksWithSubs = tasks.filter(t => t.subTaskCount > 0 && !subTasksMap[t._id]);
                tasksWithSubs.forEach(t => fetchSubTasks(t._id, false));
            }
        }
    }, [view, filterProject, filterStatus, filterRole, filterCategory, tasks]);

    // Stats
    const stats = useMemo(() => ({
        total: filteredTasks.length,
        overdue: filteredTasks.filter(t => getTaskUrgency(t) === 'overdue').length,
        completed: filteredTasks.filter(t => t.status === 'completed').length,
        inProgress: filteredTasks.filter(t => t.status === 'in_progress').length,
    }), [filteredTasks]);

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeId = active.id;
        const overId = over.id;

        // --- List View Reordering ---
        if (view === 'list') {
            const oldIndex = filteredTasks.findIndex(t => (t._id || t.id) === activeId);
            const newIndex = filteredTasks.findIndex(t => (t._id || t.id) === overId);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newOrderedTasks = arrayMove(filteredTasks, oldIndex, newIndex);

                // Optimistic UI update: Replace sorted visible tasks in the main tasks array
                setTasks(prev => {
                    const otherTasks = prev.filter(t => !filteredTasks.some(ft => (ft._id || ft.id) === (t._id || t.id)));
                    return [...newOrderedTasks, ...otherTasks];
                });

                try {
                    const reorderPayload = newOrderedTasks.map((t, idx) => ({
                        id: t._id || t.id,
                        position: idx,
                        status: t.status,
                        isJobTask: !!t.isJobTask,
                        isSubTask: !!t.isSubTask
                    }));

                    await api.patch('/tasks/reorder', { tasks: reorderPayload });
                } catch (error) {
                    console.error('Failed to reorder tasks:', error);
                    fetchData();
                }
            } else {
                // Check if it's a sub-task reorder
                let activeParentId = null;
                let activeTask = null;

                // Find the dragged subtask and its root parent task
                for (const rootId in subTasksMap) {
                    const list = subTasksMap[rootId];
                    const found = list.find(st => (st._id || st.id) === activeId);
                    if (found) {
                        activeParentId = rootId;
                        activeTask = found;
                        break;
                    }
                }

                if (activeParentId && activeTask) {
                    const list = subTasksMap[activeParentId];
                    const oldSTIndex = list.findIndex(st => (st._id || st.id) === activeId);
                    const newSTIndex = list.findIndex(st => (st._id || st.id) === overId);

                    if (oldSTIndex !== -1 && newSTIndex !== -1) {
                        const newOrderedSubTasks = arrayMove(list, oldSTIndex, newSTIndex);

                        // Optimistic UI update
                        setSubTasksMap(prev => ({ ...prev, [activeParentId]: newOrderedSubTasks }));

                        try {
                            const reorderPayload = newOrderedSubTasks.map((st, idx) => ({
                                id: st._id || st.id,
                                position: idx,
                                status: st.status,
                                isSubTask: true
                            }));

                            await api.patch('/tasks/reorder', { tasks: reorderPayload });
                            toast.success('Subtasks reordered');
                        } catch (error) {
                            console.error('Failed to reorder subtasks:', error);
                            fetchSubTasks(activeParentId);
                            toast.error('Failed to save subtask order');
                        }
                    }
                }
            }
            return;
        }

        // --- Kanban View Drag & Drop (Status change) ---
        const activeTask = allFlattenedTasks.find(t => (t._id || t.id) === activeId);
        if (!activeTask) return;

        let newStatus = activeTask.status;

        if (columns[overId]) {
            newStatus = overId;
        } else {
            const overTask = allFlattenedTasks.find(t => (t._id || t.id) === overId);
            if (overTask) {
                newStatus = overTask.status;
            }
        }

        if (activeTask.status === newStatus) return;

        try {
            const taskId = activeTask._id || activeTask.id;
            const isSubTask = !!activeTask.parentSubTaskId || !!activeTask.parentTaskTitle;

            // --- OPTIMISTIC UPDATES FOR ALL SOURCES ---

            // 1. Update tasks (root list)
            setTasks(prev => prev.map(t => (t._id || t.id) === taskId ? { ...t, status: newStatus } : t));

            // 2. Update subTasksMap (for list view and modal view)
            setSubTasksMap(prev => {
                const updatedMap = { ...prev };
                Object.keys(updatedMap).forEach(key => {
                    updatedMap[key] = updatedMap[key].map(st => (st._id || st.id) === taskId ? { ...st, status: newStatus } : st);
                });
                return updatedMap;
            });

            // 3. Update scheduleTasks tree (for board view, gantt, calendar)
            setScheduleTasks(prev => {
                const processUpdates = (list) => {
                    return list.map(t => {
                        if ((t._id || t.id) === taskId) return { ...t, status: newStatus };
                        if (t.subTasks && t.subTasks.length > 0) {
                            return { ...t, subTasks: processUpdates(t.subTasks) };
                        }
                        return t;
                    });
                };
                return processUpdates(prev);
            });

            await handleTaskUpdate(taskId, { status: newStatus }, isSubTask, activeTask);
        } catch (error) {
            console.error('Drag and drop error:', error);
            fetchData();
            if (['kanban', 'gantt', 'calendar'].includes(view)) fetchScheduleData();
        }
    };

    const openDetails = (task) => {
        const taskId = task?._id || task?.id;
        setSelectedTask(task);
        if (taskId && !task.isSubTask) {
            fetchSubTasks(taskId);
        } else {
            setSubTasks([]);
        }
        setIsDetailModalOpen(true);
    };

    const handleSubTaskSave = async (e) => {
        e.preventDefault();
        if (!newSubTask.title) return;
        try {
            setIsSubmittingSubTask(true);
            const res = await api.post(`/tasks/${selectedTask._id}/subtasks`, {
                ...newSubTask,
                priority: newSubTask.priority || 'Medium'
            });
            setSubTasks(prev => [...prev, res.data]);
            setNewSubTask({ title: '', assignedTo: '', startDate: '', dueDate: '', remarks: '', priority: 'Medium' });
            fetchData(false);
        } catch (error) {
            console.error('Error adding subtask:', error);
        } finally {
            setIsSubmittingSubTask(false);
        }
    };

    // Add a nested subtask under a parent subtask node
    const handleAddNestedSubTask = async (subTaskData) => {
        try {
            const res = await api.post(`/tasks/${selectedTask._id}/subtasks`, subTaskData);
            setSubTasks(prev => [...prev, res.data]);
            if (selectedTask?._id) fetchSubTasks(selectedTask._id, false);
            fetchData(false);
        } catch (error) {
            console.error('Error adding nested subtask:', error);
        }
    };

    // Delete a subtask (cascade handled by backend)
    const handleDeleteSubTask = (subTask) => {
        setSubTaskToDeleteInfo({ subTask, taskId: selectedTask._id });
        setIsSubTaskDeleteModalOpen(true);
    };

    const confirmSubTaskDelete = async () => {
        if (!subTaskToDeleteInfo) return;
        const { subTask, taskId } = subTaskToDeleteInfo;

        try {
            setIsSubmitting(true);
            await api.delete(`/tasks/${taskId}/subtasks/${subTask._id}`);

            // Handle List View map update
            setSubTasksMap(prev => {
                const current = prev[taskId] || [];
                const removeDescendants = (id, list) => {
                    const children = list.filter(s => s.parentSubTaskId === id || s.parentSubTaskId?._id === id);
                    return [id, ...children.flatMap(c => removeDescendants(c._id, list))];
                };
                const toRemove = new Set(removeDescendants(subTask._id, current));
                return { ...prev, [taskId]: current.filter(st => !toRemove.has(st._id)) };
            });

            // Handle Modal View state update
            if (selectedTask?._id === taskId) {
                setSubTasks(prev => {
                    const removeDescendants = (id, list) => {
                        const children = list.filter(s => s.parentSubTaskId === id || s.parentSubTaskId?._id === id);
                        return [id, ...children.flatMap(c => removeDescendants(c._id, list))];
                    };
                    const toRemove = new Set(removeDescendants(subTask._id, prev));
                    return prev.filter(st => !toRemove.has(st._id));
                });
            }

            setIsSubTaskDeleteModalOpen(false);
            setSubTaskToDeleteInfo(null);
            fetchData(false);
            toast.success('Sub-task deleted');
        } catch (error) {
            console.error('Error deleting subtask:', error);
            toast.error('Failed to delete sub-task');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Toggle subtask status
    const handleToggleSubTask = async (subTask) => {
        const newStatus = subTask.status === 'completed' ? 'todo' : 'completed';
        try {
            const res = await api.patch(`/tasks/${selectedTask._id}/subtasks/${subTask._id}`, { status: newStatus });
            setSubTasks(prev => prev.map(s => s._id === subTask._id ? res.data : s));
            fetchData(false);
        } catch (error) {
            console.error('Error toggling subtask:', error);
        }
    };

    const handleSubTaskToggle = async (subTaskId, currentStatus) => {
        const newStatus = currentStatus === 'completed' ? 'todo' : 'completed';
        const subTask = subTasks.find(st => st._id === subTaskId);
        if (subTask) {
            handleSubTaskUpdateInList(selectedTask._id, subTask, { status: newStatus });
        }
    };

    const openCreate = () => {
        setEditingTask(null);
        setFormData({ title: '', projectId: '', assignedTo: [], assignedRoleType: '', priority: 'Medium', status: 'todo', dueDate: '', startDate: '', description: '', category: 'TASK' });
        setSubTasksList([]);
        setIsModalOpen(true);
    };

    const openEdit = (task) => {
        setEditingTask(task);
        setFormData({
            title: task.title || '',
            projectId: task.projectId?._id || task.projectId || '',
            assignedTo: task.assignedTo?.map(u => u._id || u) || [],
            assignedRoleType: task.assignedRoleType || '',
            priority: task.priority || 'Medium',
            status: task.status || 'todo',
            dueDate: formatDateForInput(task.dueDate),
            startDate: formatDateForInput(task.startDate),
            description: task.description || '',
            category: task.category || 'TASK'
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const payload = {
                ...formData,
                assignedTo: formData.assignedTo.filter(Boolean),
                subTasksList: subTasksList.length > 0 ? subTasksList : undefined
            };
            if (editingTask) {
                const isJobTask = editingTask.isJobTask || !!formData.jobId;
                const taskId = editingTask._id || editingTask.id;
                const endpoint = isJobTask ? `/job-tasks/${taskId}` : `/tasks/${taskId}`;

                const finalPayload = isJobTask ? {
                    ...payload,
                    assignedTo: payload.assignedTo[0] || undefined,
                    priority: payload.priority ? payload.priority.toLowerCase() : undefined
                } : payload;

                await api.patch(endpoint, finalPayload);
                toast.success('Task updated successfully');
            } else {
                if (formData.jobId) {
                    const jobTaskPayload = {
                        jobId: formData.jobId,
                        title: formData.title,
                        description: formData.description,
                        assignedTo: formData.assignedTo[0],
                        assignedRoleType: formData.assignedRoleType || '',
                        priority: formData.priority.toLowerCase(),
                        status: formData.status === 'todo' ? 'pending' : formData.status,
                        dueDate: formData.dueDate || undefined,
                        startDate: formData.startDate || undefined,
                        subTasksList: subTasksList.length > 0 ? subTasksList : undefined
                    };
                    await api.post('/job-tasks', jobTaskPayload);
                } else {
                    await api.post('/tasks', payload);
                }
                toast.success('Task created successfully');
            }
            if (['kanban', 'gantt', 'calendar'].includes(view)) fetchScheduleData(false);
            await fetchData(false);
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving task:', error);
            toast.error('Failed to save task');
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmDelete = async () => {
        if (!taskToDelete) return;
        try {
            setIsSubmitting(true);
            const taskId = taskToDelete._id || taskToDelete.id;
            const endpoint = taskToDelete.isJobTask ? `/job-tasks/${taskId}` : `/tasks/${taskId}`;
            await api.delete(endpoint);
            setTasks(prev => prev.filter(t => (t._id || t.id) !== taskId));
            if (['kanban', 'gantt', 'calendar'].includes(view)) fetchScheduleData();
            setIsDeleteModalOpen(false);
            setTaskToDelete(null);
            toast.success('Task deleted successfully');
        } catch (error) {
            console.error('Error deleting task:', error);
            toast.error('Failed to delete task');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleQuickSubTaskSave = async (taskId, subTaskData) => {
        try {
            setIsSubmittingSubTask(true);
            const res = await api.post(`/tasks/${taskId}/subtasks`, subTaskData);

            // Update local map
            setSubTasksMap(prev => ({
                ...prev,
                [taskId]: [...(prev[taskId] || []), res.data]
            }));

            // If this is the currently selected task in the modal, update it too
            if (selectedTask?._id === taskId) {
                setSubTasks(prev => [...prev, res.data]);
                // Update selectedTask progress locally if possible or just rely on fetchData
                setSelectedTask(prev => ({ ...prev, progress: Math.min(100, (prev.progress || 0)) }));
            }

            fetchData(false); // Refresh main task progress
            toast.success('Sub-task added');
        } catch (error) {
            console.error('Error saving quick sub-task:', error);
            toast.error('Failed to add sub-task');
        } finally {
            setIsSubmittingSubTask(false);
        }
    };

    const handleSubTaskUpdateInList = async (taskId, subTask, updates) => {
        try {
            if (updates.delete) {
                setSubTaskToDeleteInfo({ subTask, taskId });
                setIsSubTaskDeleteModalOpen(true);
                return;
            }

            // Perform sub-task update (not a deletion)
            const res = await api.patch(`/tasks/${taskId}/subtasks/${subTask._id}`, updates);

            setSubTasksMap(prev => ({
                ...prev,
                [taskId]: (prev[taskId] || []).map(st => st._id === subTask._id ? res.data : st)
            }));

            if (selectedTask?._id === taskId) {
                setSubTasks(prev => prev.map(st => st._id === subTask._id ? res.data : st));
            }
            toast.success('Sub-task updated');
            fetchData(false);
        } catch (error) {
            console.error('Error updating sub-task:', error);
            toast.error('Failed to update sub-task');
        }
    };


    const handleSubTaskToggleInList = async (taskId, subTask) => {
        const newStatus = subTask.status === 'completed' ? 'todo' : 'completed';
        handleSubTaskUpdateInList(taskId, subTask, { status: newStatus });
    };

    const handleToggleTaskStatus = async (task) => {
        const taskId = task._id || task.id;
        const newStatus = task.status === 'completed' ? 'todo' : 'completed';
        
        // Optimistic UI update
        setTasks(prev => prev.map(t => (t._id === taskId || t.id === taskId) ? { ...t, status: newStatus } : t));
        
        try {
            await handleTaskUpdate(taskId, { status: newStatus });
        } catch (error) {
            console.error('Failed to toggle task status:', error);
            // Revert is handled by handleTaskUpdate -> fetchData on failure
        }
    };

    const canManage = ['ADMIN', 'SUPER_ADMIN', 'COMPANY_OWNER', 'PM', 'FOREMAN'].includes(user?.role);

    return (
        <div className={`space-y-4 animate-fade-in ${['calendar', 'list', 'kanban', 'gantt'].includes(view) ? 'pb-20' : 'h-[calc(100vh-80px)] flex flex-col'}`}>

            <div className="flex justify-between items-center gap-4 shrink-0 w-full mb-2">
                <div className="shrink-0">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tighter whitespace-nowrap">Task Command Center</h1>
                    <p className="text-slate-400 font-bold text-[10px] mt-0.5 uppercase tracking-widest flex items-center gap-2 whitespace-nowrap">
                        <Layers size={11} className="text-blue-600" /> Task tracking & assignment
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Stats pills */}
                    <div className="hidden md:flex items-center gap-1.5 shrink-0">
                        <button
                            onClick={() => navigate('/company-admin#overdue')}
                            className="bg-red-50 text-red-600 border border-red-100 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all shadow-sm active:scale-95"
                            title="View Overdue Details in Dashboard"
                        >
                            <AlertTriangle size={10} /> {stats.overdue} Overdue
                        </button>
                        <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                            <Clock size={10} /> {stats.inProgress} Active
                        </span>
                        <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                            <CheckCircle size={10} /> {stats.completed} Done
                        </span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-1 flex shadow-sm shrink-0">
                        <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 ${view === 'list' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent'}`}>
                            <AlignLeft size={14} /> <span className="text-[10px] font-black uppercase tracking-widest hidden 2xl:inline">List</span>
                        </button>
                        <button onClick={() => setView('kanban')} className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 ${view === 'kanban' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent'}`}>
                            <KanbanSquare size={14} /> <span className="text-[10px] font-black uppercase tracking-widest hidden 2xl:inline">Board</span>
                        </button>
                        <div className="w-px bg-slate-200/60 my-1.5 mx-1" />

                        <button onClick={() => setView('gantt')} className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 ${view === 'gantt' ? 'bg-purple-600 text-white shadow-lg shadow-purple-200/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent'}`}>
                            <CalendarRange size={14} /> <span className="text-[10px] font-black uppercase tracking-widest hidden 2xl:inline">Gantt</span>
                        </button>
                        <button onClick={() => setView('calendar')} className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 ${view === 'calendar' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200/50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent'}`}>
                            <CalendarDays size={14} /> <span className="text-[10px] font-black uppercase tracking-widest hidden 2xl:inline">Calendar</span>
                        </button>
                    </div>

                    {canManage && (
                        <div className="flex gap-2 shrink-0">
                            {selectedTasks.size > 0 && (
                                <button
                                    onClick={handleBulkSaveAsTemplate}
                                    disabled={isSubmitting}
                                    className="bg-emerald-600 text-white px-4 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 font-black text-[10px] uppercase tracking-tight"
                                >
                                    {isSubmitting ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
                                    Save as Template ({selectedTasks.size})
                                </button>
                            )}
                            <button onClick={() => setIsTemplateModalOpen(true)} className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-slate-50 transition shadow-sm font-black text-[10px] uppercase tracking-tight">
                                <Briefcase size={14} /> <span className="hidden sm:inline">Templates</span>
                            </button>
                            <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-blue-700 transition shadow-lg shadow-blue-200 font-black text-xs uppercase tracking-tight">
                                <Plus size={15} /> <span className="hidden sm:inline">New Task</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Search & Filters ── */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200/60 space-y-3 shrink-0">
                <div className="flex flex-col md:flex-row gap-3 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search tasks, projects, or assignees..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 text-sm font-bold text-slate-700 placeholder:text-slate-400"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-5 py-2.5 border rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all ${showFilters ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Filter size={16} /> Filters
                        {(filterStatus || filterRole || filterProject || filterDueFrom || filterDueTo) && (
                            <span className="bg-white/30 text-white px-1.5 py-0.5 rounded-full text-[9px]">ON</span>
                        )}
                    </button>
                </div>
                {showFilters && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500">
                            <option value="">All Statuses</option>
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="review">In Review</option>
                            <option value="completed">Completed</option>
                        </select>
                        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500">
                            <option value="">All Types</option>
                            <option value="TASK">Tasks</option>
                            <option value="TODO">To-Dos</option>
                        </select>
                        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500">
                            <option value="">All Roles</option>
                            <option value="WORKER">Worker</option>
                            <option value="FOREMAN">Foreman</option>
                            <option value="SUBCONTRACTOR">Subcontractor</option>
                            <option value="PM">Project Manager</option>
                        </select>
                        <select value={filterProject} onChange={e => handleProjectFilterChange(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500">
                            <option value="">{['FOREMAN', 'WORKER', 'SUBCONTRACTOR'].includes(user?.role) ? 'All Jobs' : 'All Projects'}</option>
                            {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>
                        <input type="date" value={filterDueFrom} onChange={e => setFilterDueFrom(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500" placeholder="Due From" />
                        <div className="flex items-center gap-2">
                            <input type="date" value={filterDueTo} onChange={e => setFilterDueTo(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500" placeholder="Due To" />
                            <button onClick={() => { setFilterStatus(''); setFilterRole(''); setFilterProject(''); setFilterDueFrom(''); setFilterDueTo(''); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition">
                                <X size={15} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Role-based Tab Switcher - Lower Position */}
            {['PM', 'FOREMAN'].includes(user?.role) && (
                <div className="flex justify-start px-1 shrink-0">
                    <div className="flex p-1 bg-slate-100/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 shadow-inner">
                        <button
                            onClick={() => setActiveTab('my_tasks')}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'my_tasks'
                                ? 'bg-white text-blue-600 shadow-md transform scale-[1.02]'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <UserCheck size={13} />
                            My Tasks
                        </button>
                        <button
                            onClick={() => setActiveTab('all_tasks')}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'all_tasks'
                                ? 'bg-white text-blue-600 shadow-md transform scale-[1.02]'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <Users size={13} />
                            All Tasks
                        </button>
                    </div>
                </div>
            )}

            {/* ── Content ── */}
            <div className={['calendar', 'list', 'kanban', 'gantt'].includes(view) ? 'w-full pb-10' : 'flex-1 overflow-hidden min-h-0'}>
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4">
                        <div className="w-12 h-12 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin" />
                        <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Loading Tasks...</p>
                    </div>
                ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        {view === 'gantt' ? (
                            <GanttView tasks={filteredScheduleTasks} onTaskUpdate={handleTaskUpdate} onTaskClick={openDetails} />
                        ) : view === 'calendar' ? (
                            <CalendarView tasks={filteredScheduleTasks} onTaskUpdate={handleTaskUpdate} onTaskClick={openDetails} />
                        ) : view === 'kanban' ? (
                            <div className="flex gap-5 overflow-x-auto pb-10 hide-scrollbar-y scroll-smooth h-[calc(100vh-230px)] min-h-[600px]">
                                {Object.entries(columns).map(([status, style]) => (
                                    <DroppableColumn
                                        key={status}
                                        status={status}
                                        style={style}
                                        filteredTasks={allFlattenedTasks}
                                        onEdit={openEdit}
                                        onDelete={(t) => { setTaskToDelete(t); setIsDeleteModalOpen(true); }}
                                        onTaskClick={openDetails}
                                        canManage={canManage}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl relative h-[calc(100vh-190px)] min-h-[600px] flex flex-col overflow-hidden group/container">
                                <TopScrollbar containerRef={tableContainerRef} />
                                <div
                                    ref={tableContainerRef}
                                    className="flex-1 overflow-auto p-4 pt-0 custom-scrollbar-sync cursor-pointer"
                                >
                                    <div className="w-full">

                                        <table className="text-left border-separate border-spacing-0 w-full" style={{ width: 'max-content', minWidth: '100%' }}>
                                            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                                                <tr className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                    <th className="w-10 px-4 py-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={isAllSelected}
                                                            onChange={handleSelectAll}
                                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                        />
                                                    </th>
                                                    <th className="w-10 px-4 py-3"></th>
                                                    {[
                                                        { key: 'task', label: 'Task' },
                                                        { key: 'project', label: 'Project' },
                                                        { key: 'assignee', label: 'Assigned To' },
                                                        { key: 'role', label: 'Role' },
                                                        { key: 'status', label: 'Status' },
                                                        { key: 'priority', label: 'Priority' },
                                                        { key: 'startDate', label: 'Start Date' },
                                                        { key: 'endDate', label: 'End Date' }
                                                    ].map(col => (
                                                        <th
                                                            key={col.key}
                                                            className={`px-4 py-3 relative group select-none transition-colors border-r border-slate-100 last:border-r-0 ${col.key === 'task' ? 'w-full' : ''}`}
                                                            style={{
                                                                width: col.key === 'task' ? 'auto' : `${columnWidths[col.key]}px`,
                                                                minWidth: col.key === 'task' ? '300px' : '50px'
                                                            }}
                                                        >
                                                            <div className="flex items-center justify-between pointer-events-none">
                                                                <span className="truncate">{col.label}</span>
                                                            </div>
                                                            {/* Visible Resize Handle */}
                                                            <div
                                                                onMouseDown={(e) => handleResizeStart(e, col.key)}
                                                                className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize group-hover:bg-blue-400/30 active:bg-blue-600 transition-all z-20 flex justify-center items-center"
                                                            >
                                                                {/* Subtle Visual Line */}
                                                                <div className="w-[1.5px] h-4 bg-slate-200 group-hover:bg-blue-400 active:bg-white rounded-full transition-colors opacity-0 group-hover:opacity-100" />
                                                            </div>
                                                        </th>
                                                    ))}
                                                    {canManage && <th className="px-4 py-3 text-right" style={{ width: `${columnWidths.actions}px` }}>Actions</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                <SortableContext items={filteredTasks.map(t => t._id)} strategy={verticalListSortingStrategy}>
                                                    {filteredTasks.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={9} className="px-6 py-20 text-center">
                                                                <div className="flex flex-col items-center gap-3 text-slate-300">
                                                                    <Layers size={36} />
                                                                    <p className="font-black uppercase tracking-widest text-xs">No tasks found</p>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ) : filteredTasks.map(task => {
                                                        const urgency = getTaskUrgency(task);
                                                        const isExpanded = expandedTasks.has(task._id);
                                                        const taskSubTasks = subTasksMap[task._id] || [];

                                                        return (
                                                            <SortableTaskRow
                                                                key={task._id}
                                                                task={task}
                                                                urgency={urgency}
                                                                isExpanded={isExpanded}
                                                                isSelected={selectedTasks.has(task._id)}
                                                                isCompactView={isCompactView}
                                                                columnWidths={columnWidths}
                                                                canManage={canManage}
                                                                isHighlighted={highlightTaskId === task._id}
                                                                onTaskClick={openDetails}
                                                                onSelect={handleSelectTask}
                                                                onToggleExpansion={toggleTaskExpansion}
                                                                onSaveAsTemplate={handleSaveAsTemplate}
                                                                onToggleStatus={handleToggleTaskStatus}
                                                                onEdit={openEdit}
                                                                onDelete={(t) => { setTaskToDelete(t); setIsDeleteModalOpen(true); }}
                                                                renderChildren={() => {
                                                                    const renderSubTaskRows = (parentId, depth, levelLines = [], currentProjectName) => {
                                                                        const nodes = taskSubTasks.filter(st =>
                                                                            parentId === null
                                                                                ? !st.parentSubTaskId
                                                                                : (st.parentSubTaskId === parentId || st.parentSubTaskId?._id === parentId)
                                                                        );
                                                                        return (
                                                                            <SortableContext items={nodes.map(n => n._id)} strategy={verticalListSortingStrategy}>
                                                                                {nodes.map((st, index) => (
                                                                                    <SortableSubTaskRow
                                                                                        key={st._id}
                                                                                        subTask={st}
                                                                                        depth={depth}
                                                                                        isSelected={selectedTasks.has(st._id)}
                                                                                        allSubTasks={taskSubTasks}
                                                                                        taskId={task._id}
                                                                                        team={availableTeam}
                                                                                        canManage={canManage}
                                                                                        onSelect={handleSelectTask}
                                                                                        onToggle={(s) => handleSubTaskToggleInList(task._id, s)}
                                                                                        onUpdate={(s, updates) => handleSubTaskUpdateInList(task._id, s, updates)}
                                                                                        onAddChild={handleQuickSubTaskSave}
                                                                                        isSubmitting={isSubmittingSubTask}
                                                                                        renderChildren={renderSubTaskRows}
                                                                                        isLast={index === nodes.length - 1}
                                                                                        levelLines={levelLines}
                                                                                        isCompactView={isCompactView}
                                                                                        columnWidths={columnWidths}
                                                                                        projectName={currentProjectName}
                                                                                    />
                                                                                ))}
                                                                            </SortableContext>
                                                                        );
                                                                    };
                                                                    return (
                                                                        <>
                                                                            {renderSubTaskRows(null, 0, [true], task.projectId?.name || task.jobName || '—')}
                                                                            {canManage && (
                                                                                <QuickAddSubTask
                                                                                    taskId={task._id}
                                                                                    onSave={handleQuickSubTaskSave}
                                                                                    team={availableTeam}
                                                                                    isSubmitting={isSubmittingSubTask}
                                                                                />
                                                                            )}
                                                                        </>
                                                                    );
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                </SortableContext>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </DndContext>
                )}
            </div>

            {/* ── Create / Edit Modal ── */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTask ? 'Edit Task' : 'Create New Task'} maxWidth="max-w-2xl">
                <form onSubmit={handleSave} className="space-y-5">
                    {subTasksList.length > 0 && !editingTask && (
                        <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm">
                            <span className="flex items-center gap-2"><Briefcase size={14} className="text-emerald-500" /> Template Applied: {subTasksList.length} sub-tasks will be generated.</span>
                            <button type="button" onClick={() => setSubTasksList([])} className="text-red-500 hover:bg-red-50 p-2 rounded-xl border border-transparent hover:border-red-100 transition"><X size={14} /></button>
                        </div>
                    )}
                    {/* Title */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Target size={12} className="text-blue-600" /> Task Title
                        </label>
                        <input
                            required
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all text-sm"
                            placeholder="e.g. Install Safety Nets Level 3"
                        />
                    </div>

                    {/* Project & Job Row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Briefcase size={12} className="text-blue-600" /> Project
                            </label>
                            <select
                                required
                                value={formData.projectId}
                                onChange={e => setFormData({ ...formData, projectId: e.target.value, jobId: '' })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:border-blue-500 appearance-none text-sm"
                            >
                                <option value="">Select Project</option>
                                {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Target size={12} className="text-blue-600" /> Job (Optional)
                            </label>
                            <select
                                value={formData.jobId}
                                onChange={e => setFormData({ ...formData, jobId: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:border-blue-500 appearance-none text-sm"
                                disabled={!formData.projectId}
                            >
                                <option value="">Select Job</option>
                                {jobs.map(j => <option key={j._id} value={j._id}>{j.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Role + Assignee row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <UserCheck size={12} className="text-blue-600" /> Assign Role
                            </label>
                            <select
                                value={formData.assignedRoleType}
                                onChange={e => setFormData({ ...formData, assignedRoleType: e.target.value, assignedTo: [] })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:border-blue-500 appearance-none text-sm"
                            >
                                <option value="">Any Role</option>
                                {(!user?.role || ['COMPANY_OWNER', 'SUPER_ADMIN', 'PM'].includes(user?.role) || ['FOREMAN', 'SUBCONTRACTOR'].includes(user?.role)) && (
                                    <option value="WORKER">Worker</option>
                                )}
                                {(!user?.role || ['COMPANY_OWNER', 'SUPER_ADMIN', 'PM'].includes(user?.role)) && (
                                    <>
                                        <option value="FOREMAN">Foreman</option>
                                        <option value="SUBCONTRACTOR">Subcontractor</option>
                                    </>
                                )}
                                {(!user?.role || ['COMPANY_OWNER', 'SUPER_ADMIN', 'PM'].includes(user?.role)) && (
                                    <option value="PM">Project Manager</option>
                                )}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Users size={12} className="text-blue-600" /> Assign To
                            </label>
                            <select
                                value={formData.assignedTo[0] || ''}
                                onChange={e => setFormData({ ...formData, assignedTo: e.target.value ? [e.target.value] : [] })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:border-blue-500 appearance-none text-sm"
                            >
                                <option value="">Unassigned</option>
                                {filteredTeamByRole.map(m => (
                                    <option key={m._id} value={m._id}>{m.fullName} ({ROLE_LABELS[m.role] || m.role})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Category + Priority + Status */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Layers size={12} className="text-blue-600" /> Category
                            </label>
                            <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:border-blue-500 appearance-none text-sm">
                                <option value="TASK">Task</option>
                                <option value="TODO">To-Do</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Flag size={12} className="text-blue-600" /> Priority
                            </label>
                            <select value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:border-blue-500 appearance-none text-sm">
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</label>
                        <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:border-blue-500 appearance-none text-sm">
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="review">In Review</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Calendar size={12} className="text-blue-600" /> Start Date
                            </label>
                            <input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:border-blue-500 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Calendar size={12} className="text-orange-500" /> Due Date
                            </label>
                            <input type="date" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:border-blue-500 text-sm" />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</label>
                        <textarea
                            rows={2}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-blue-500/50 resize-none text-sm"
                            placeholder="Task description or scope..."
                        />
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-100 gap-3">
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
                            {!editingTask && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTemplateFormData({
                                            templateName: formData.title + ' Template',
                                            assignedRole: formData.assignedRoleType || '',
                                            taskTitle: formData.title,
                                            description: formData.description || '',
                                            priority: formData.priority || 'Medium',
                                            estimatedHours: 0,
                                            steps: []
                                        });
                                        setIsSaveTemplateModalOpen(true);
                                    }}
                                    disabled={!formData.title}
                                    className="px-4 py-2 rounded-xl bg-blue-50 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 border border-blue-100 flex items-center gap-2 transition-all disabled:opacity-50"
                                >
                                    <Save size={12} /> Save Template
                                </button>
                            )}
                        </div>
                        <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-tight hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center gap-2 disabled:opacity-60">
                            {isSubmitting ? <Loader size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                            {editingTask ? 'Save Changes' : 'Create Task'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ── Delete Modal ── */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Task">
                <div className="flex flex-col items-center p-4 text-center">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-5 border border-red-100">
                        <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">Delete Task?</h3>
                    <p className="text-slate-500 font-bold mb-7 text-sm max-w-xs">
                        <span className="text-red-500">"{taskToDelete?.title}"</span> will be permanently deleted.
                    </p>
                    <div className="flex gap-3 w-full">
                        <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition">Cancel</button>
                        <button onClick={confirmDelete} disabled={isSubmitting} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-200 transition flex items-center justify-center gap-2">
                            {isSubmitting ? <Loader size={15} className="animate-spin" /> : null} Delete
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ── Task Details & Sub-Tasks Modal (ClickUp Inspired) ── */}
            <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Task Execution" maxWidth="max-w-4xl">
                {selectedTask && (
                    <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
                        {/* Header Stats */}
                        <div className="bg-slate-50 rounded-[32px] p-6 border border-slate-100 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-200">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-700"
                                    style={{ width: `${selectedTask.progress || 0}%` }}
                                />
                            </div>
                            <div className="flex justify-between items-start mb-4 pt-2">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedTask.title}</h2>
                                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1 flex items-center gap-2">
                                        <Hash size={12} className="text-blue-500" /> {selectedTask.projectId?.name || 'Unassigned Project'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className={`text-[10px] font-black px-3 py-1.5 rounded-full border uppercase tracking-widest bg-white ${priorityStyles[selectedTask.priority]}`}>
                                        {selectedTask.priority} Priority
                                    </span>
                                    <p className="text-[10px] font-black text-blue-600 mt-2">{selectedTask.progress || 0}% Complete</p>
                                </div>
                            </div>

                            <p className="text-sm font-bold text-slate-600 leading-relaxed italic bg-white/50 p-4 rounded-2xl border border-white">
                                "{selectedTask.description || 'No description provided.'}"
                            </p>
                        </div>

                        {/* Sub Tasks Section — ClickUp Style Nested Tree */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center px-1">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <Layers size={14} className="text-blue-600" /> Subtasks
                                </h3>
                                <span className="bg-slate-100 text-slate-400 px-2.5 py-1 rounded-xl text-[10px] font-black">
                                    {subTasks.length} ITEMS
                                </span>
                            </div>

                            {/* Tree — only render root-level nodes (parentSubTaskId is null) */}
                            <div className="bg-white border border-slate-100 rounded-2xl p-3 space-y-0.5">
                                {subTasks.filter(st => !st.parentSubTaskId).length === 0 && (
                                    <p className="text-xs font-bold text-slate-300 text-center py-4">No subtasks yet. Add one below.</p>
                                )}
                                {subTasks
                                    .filter(st => !st.parentSubTaskId)
                                    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                                    .map(root => (
                                        <SubTaskTreeNode
                                            key={root._id}
                                            node={root}
                                            allSubTasks={subTasks}
                                            depth={0}
                                            taskId={selectedTask._id}
                                            team={availableTeam}
                                            canManage={canManage}
                                            onToggle={handleToggleSubTask}
                                            onUpdate={async (st, updates) => {
                                                try {
                                                    const res = await api.patch(`/tasks/${selectedTask._id}/subtasks/${st._id}`, updates);
                                                    setSubTasks(prev => prev.map(s => s._id === st._id ? res.data : s));
                                                    fetchData();
                                                } catch (err) { console.error('Update subtask error:', err); }
                                            }}
                                            onAddChild={handleAddNestedSubTask}
                                            onDelete={handleDeleteSubTask}
                                        />
                                    ))
                                }
                            </div>

                            {/* Add root-level subtask form */}
                            {canManage && (
                                <form onSubmit={handleSubTaskSave} className="bg-slate-50 rounded-2xl p-4 border border-dashed border-slate-200">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                        <Plus size={11} /> Add Root Subtask
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <input
                                            required
                                            type="text"
                                            placeholder="Subtask title..."
                                            value={newSubTask.title}
                                            onChange={e => setNewSubTask({ ...newSubTask, title: e.target.value })}
                                            className="col-span-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-blue-500"
                                        />
                                        <div className="flex flex-col gap-2">
                                            <select
                                                value={newSubTask.assignedRoleType}
                                                onChange={e => setNewSubTask({ ...newSubTask, assignedRoleType: e.target.value, assignedTo: '' })}
                                                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-blue-600 outline-none uppercase tracking-widest"
                                            >
                                                <option value="">Any Role</option>
                                                <option value="WORKER">Worker</option>
                                                <option value="FOREMAN">Foreman</option>
                                                <option value="SUBCONTRACTOR">Subcontractor</option>
                                                {(!user?.role || ['COMPANY_OWNER', 'SUPER_ADMIN', 'PM'].includes(user?.role)) && (
                                                    <option value="PM">Project Manager</option>
                                                )}
                                            </select>
                                            <select value={newSubTask.assignedTo} onChange={e => setNewSubTask({ ...newSubTask, assignedTo: e.target.value })}
                                                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-900 outline-none">
                                                <option value="">Assign To</option>
                                                {availableTeam.filter(u => !newSubTask.assignedRoleType || u.role === newSubTask.assignedRoleType).map(u => (
                                                    <option key={u._id} value={u._id}>{u.fullName}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <select value={newSubTask.priority || 'Medium'} onChange={e => setNewSubTask({ ...newSubTask, priority: e.target.value })}
                                            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-900 outline-none">
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                        </select>
                                        <div className="relative mt-3">
                                            <span className="absolute -top-3.5 left-1 text-[8px] font-black text-slate-400 uppercase tracking-widest">Start Date</span>
                                            <input type="date" value={newSubTask.startDate || ''} onChange={e => setNewSubTask({ ...newSubTask, startDate: e.target.value })}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 outline-none" />
                                        </div>
                                        <div className="relative mt-3">
                                            <span className="absolute -top-3.5 left-1 text-[8px] font-black text-slate-400 uppercase tracking-widest">End Date</span>
                                            <input type="date" value={newSubTask.dueDate || ''} onChange={e => setNewSubTask({ ...newSubTask, dueDate: e.target.value })}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 outline-none" />
                                        </div>
                                        <button type="submit" disabled={isSubmittingSubTask}
                                            className="col-span-full bg-slate-900 text-white py-2.5 rounded-xl hover:bg-blue-600 transition font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50">
                                            <Plus size={15} /> Add Subtask
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                            {canManage && (
                                <button
                                    onClick={() => handleSaveAsTemplate(selectedTask)}
                                    className="px-6 py-2 rounded-xl bg-blue-50 text-blue-600 font-black text-xs uppercase tracking-widest hover:bg-blue-100 border border-blue-100 flex items-center gap-2"
                                >
                                    <Save size={14} /> Save as Template
                                </button>
                            )}
                            <button onClick={() => setIsDetailModalOpen(false)} className="px-6 py-2 rounded-xl bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-slate-200">
                                Close Details
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
            {/* ── Save Template Modal ── */}
            <Modal isOpen={isSaveTemplateModalOpen} onClose={() => setIsSaveTemplateModalOpen(false)} title="Save Task as Template" maxWidth="max-w-3xl">
                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        if (!templateFormData.templateName || !templateFormData.taskTitle || !templateFormData.assignedRole) {
                            alert('Template Name, Role, and Task Title are required');
                            return;
                        }
                        try {
                            setIsSubmitting(true);
                            const outSteps = templateFormData.steps.map(st => ({
                                title: st.title || 'Untitled Step',
                                remarks: st.remarks || '',
                                priority: st.priority || 'Medium'
                            }));

                            if (editingTemplate) {
                                await api.patch(`/task-templates/${editingTemplate._id}`, {
                                    ...templateFormData,
                                    steps: outSteps
                                });
                            } else {
                                await api.post('/task-templates', {
                                    ...templateFormData,
                                    steps: outSteps
                                });
                            }

                            setIsSaveTemplateModalOpen(false);
                            setEditingTemplate(null);
                            await fetchTemplates();
                            alert(editingTemplate ? 'Template updated successfully!' : 'Template saved successfully!');
                        } catch (err) {
                            console.error('Save template error:', err);
                            alert(err.response?.data?.message || 'Error saving template. Please ensure all required fields are filled.');
                        } finally {
                            setIsSubmitting(false);
                        }
                    }}
                    className="space-y-5"
                >
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                        <Info size={18} className="text-blue-500 mt-0.5" />
                        <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                            This template will store the task structure and its {subTasks.length} subtasks. When used later, it will pre-fill these details for new tasks.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Tag size={12} className="text-blue-50" /> Template Identifier
                            </label>
                            <input
                                required
                                type="text"
                                value={templateFormData.templateName}
                                onChange={e => setTemplateFormData({ ...templateFormData, templateName: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-800 outline-none focus:border-blue-500"
                                placeholder="e.g. Standard Foundation Check"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <HardHat size={12} className="text-blue-500" /> Assign Role
                            </label>
                            <div className="relative">
                                <select
                                    required
                                    value={templateFormData.assignedRole}
                                    onChange={e => setTemplateFormData({ ...templateFormData, assignedRole: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-800 outline-none appearance-none focus:border-blue-500 cursor-pointer text-sm"
                                >
                                    <option value="">Select Role...</option>
                                    <option value="ELECTRICIAN">Electrician</option>
                                    <option value="PLUMBER">Plumber</option>
                                    <option value="CARPENTER">Carpenter</option>
                                    <option value="FOREMAN">Foreman</option>
                                    <option value="PM">PM</option>
                                    <option value="WORKER">Worker</option>
                                    <option value="SUBCONTRACTOR">Subcontractor</option>
                                    <option value="OTHER">Other</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Default Description</label>
                            <textarea
                                rows={2}
                                value={templateFormData.description}
                                onChange={e => setTemplateFormData({ ...templateFormData, description: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-blue-500 resize-none"
                            />
                        </div>

                        <div className="space-y-1.5 flex-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Target size={12} className="text-blue-500" /> Default Task Title
                            </label>
                            <input
                                required
                                type="text"
                                value={templateFormData.taskTitle}
                                onChange={e => setTemplateFormData({ ...templateFormData, taskTitle: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-800 outline-none focus:border-blue-500 text-sm"
                                placeholder="Main task name when applied"
                            />
                        </div>
                    </div>


                    <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <List size={12} className="text-blue-500" /> Template Sub-tasks
                            </label>
                            <button
                                type="button"
                                onClick={() => {
                                    setTemplateFormData(prev => ({
                                        ...prev,
                                        steps: [...prev.steps, { title: '', remarks: '', priority: 'Medium' }]
                                    }));
                                }}
                                className="p-1 px-2.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all flex items-center gap-1 text-[9px] font-black uppercase tracking-widest border border-blue-100"
                            >
                                <Plus size={12} /> Add Step
                            </button>
                        </div>

                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 flex flex-col gap-2">

                            {templateFormData.steps.length === 0 ? (
                                <div className="py-6 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">No sub-tasks added to template</p>
                                </div>
                            ) : templateFormData.steps.map((step, idx) => (
                                <div key={idx} className="flex gap-2 items-start bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 group">
                                    <div className="flex-1 space-y-2">
                                        <input
                                            required
                                            type="text"
                                            placeholder="Sub-task title..."
                                            value={step.title}
                                            onChange={e => {
                                                const newSteps = [...templateFormData.steps];
                                                newSteps[idx].title = e.target.value;
                                                setTemplateFormData({ ...templateFormData, steps: newSteps });
                                            }}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all shadow-sm"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newSteps = templateFormData.steps.filter((_, i) => i !== idx);
                                            setTemplateFormData({ ...templateFormData, steps: newSteps });
                                        }}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button type="button" onClick={() => setIsSaveTemplateModalOpen(false)} className="px-5 py-2.5 rounded-xl font-black text-xs uppercase text-slate-500 hover:bg-slate-50">Cancel</button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmitting ? <Loader size={15} className="animate-spin" /> : <Save size={15} />}
                            Save Template
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ── Templates Library Modal ── */}
            <Modal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} title="Templates Library" maxWidth="max-w-4xl">
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={templates.length > 0 && selectedTemplates.size === templates.length}
                                    onChange={(e) => handleSelectAllTemplates(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Select All</span>
                            </div>
                            <div className="h-4 w-[1px] bg-slate-200" />
                            <div className="flex items-center gap-2 text-slate-500">
                                <Briefcase size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">{templates.length} Total</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {selectedTemplates.size > 0 && (
                                <>
                                    <button
                                        onClick={handleBulkUseTemplates}
                                        className="h-8 px-3 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center gap-2 active:scale-95"
                                    >
                                        <ArrowRight size={14} /> Use Selected ({selectedTemplates.size})
                                    </button>
                                    {['ADMIN', 'SUPER_ADMIN', 'COMPANY_OWNER'].includes(user?.role) && (
                                        <button
                                            onClick={handleBulkDeleteTemplates}
                                            disabled={isSubmitting}
                                            title={`Delete ${selectedTemplates.size} selected template${selectedTemplates.size > 1 ? 's' : ''}`}
                                            className="p-2 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition-all flex items-center justify-center shadow-sm"
                                        >
                                            {isSubmitting ? <Loader size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                        </button>
                                    )}
                                </>
                            )}
                            <button
                                onClick={() => {
                                    setEditingTemplate(null);
                                    setTemplateFormData({ templateName: '', assignedRole: '', taskTitle: '', description: '', priority: 'Medium', estimatedHours: 0, steps: [] });
                                    setIsSaveTemplateModalOpen(true);
                                }}
                                className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition"
                            >
                                + Create New
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                        {templates.length === 0 ? (
                            <div className="p-12 text-center rounded-3xl border-2 border-dashed border-slate-100">
                                <Layers size={32} className="mx-auto text-slate-200 mb-3" />
                                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">No templates found.</p>
                                <p className="text-slate-300 text-[9px] mt-1">Save a task as a template or create one from scratch.</p>
                            </div>
                        ) : (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndTemplates}>
                                <SortableContext items={templates.map(t => t._id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-2.5">
                                        {templates.map(tmpl => (
                                            <SortableTemplateItem
                                                key={tmpl._id}
                                                tmpl={tmpl}
                                                selectedTemplates={selectedTemplates}
                                                handleSelectTemplate={handleSelectTemplate}
                                                setEditingTemplate={setEditingTemplate}
                                                setTemplateFormData={setTemplateFormData}
                                                setIsSaveTemplateModalOpen={setIsSaveTemplateModalOpen}
                                                api={api}
                                                fetchTemplates={fetchTemplates}
                                                priorityStyles={priorityStyles}
                                                user={user}
                                                setFormData={setFormData}
                                                setSubTasksList={setSubTasksList}
                                                setIsTemplateModalOpen={setIsTemplateModalOpen}
                                                setIsModalOpen={setIsModalOpen}
                                                setTemplateToDelete={setTemplateToDelete}
                                                setIsTemplateDeleteModalOpen={setIsTemplateDeleteModalOpen}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        )}
                    </div>
                </div>
            </Modal>
            {/* ── Quick Save Template Modal ── */}
            <Modal
                isOpen={isQuickTemplateModalOpen}
                onClose={() => setIsQuickTemplateModalOpen(false)}
                title="Save as Template"
            >
                <div className="p-2 space-y-6">
                    <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100 mb-4 transition-transform hover:scale-110">
                            <Briefcase size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Create Reusable Template</h3>
                        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-2 px-6">
                            Convert "{taskForQuickTemplate?.title}" and all its nested subtasks into a permanent template.
                        </p>
                    </div>

                    <div className="space-y-4 px-4 pb-2">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-2 block">
                                Template Name
                            </label>
                            <input
                                autoFocus
                                required
                                type="text"
                                value={quickTemplateName}
                                onChange={e => setQuickTemplateName(e.target.value)}
                                placeholder="Enter template name..."
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-800 outline-none focus:border-emerald-400 focus:bg-white transition-all shadow-sm shadow-slate-100"
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setIsQuickTemplateModalOpen(false)}
                                className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmQuickSaveTemplate}
                                disabled={isSubmitting || !quickTemplateName.trim()}
                                className="flex-1 px-6 py-4 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {isSubmitting ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                                Confirm Save
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* ── Bulk Save Template Confirmation Modal ── */}
            <Modal isOpen={isBulkSaveConfirmModalOpen} onClose={() => setIsBulkSaveConfirmModalOpen(false)} title="Bulk Save Templates">
                <div className="p-4 text-center">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-100 mx-auto mb-6 shadow-sm">
                        <Save size={36} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">Save {selectedTasks.size} Templates?</h3>
                    <p className="text-slate-500 font-bold mb-8 text-sm px-4">
                        You are about to convert <span className="text-emerald-600 font-black">{selectedTasks.size} tasks</span> and all their nested subtasks into reusable templates.
                    </p>
                    <div className="flex gap-3 px-2">
                        <button
                            onClick={() => setIsBulkSaveConfirmModalOpen(false)}
                            className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest transition active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmBulkSaveAsTemplate}
                            disabled={isSubmitting}
                            className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 transition active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                            Confirm Save
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ── Bulk Delete Template Confirmation Modal ── */}
            <Modal isOpen={isBulkDeleteTemplateModalOpen} onClose={() => setIsBulkDeleteTemplateModalOpen(false)} title="Delete Templates">
                <div className="p-4 text-center">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 border border-red-100 mx-auto mb-6 shadow-sm">
                        <Trash2 size={36} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">Delete {selectedTemplates.size} Templates?</h3>
                    <p className="text-slate-500 font-bold mb-8 text-sm px-4">
                        This action <span className="text-red-600 font-black underline">cannot be undone</span>. All selected templates will be permanently removed from your library.
                    </p>
                    <div className="flex gap-3 px-2">
                        <button
                            onClick={() => setIsBulkDeleteTemplateModalOpen(false)}
                            className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest transition active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmBulkDeleteTemplates}
                            disabled={isSubmitting}
                            className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-200 transition active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            Delete Templates
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ── Bulk Apply Templates Config Modal ── */}
            <Modal isOpen={isBulkApplyModalOpen} onClose={() => setIsBulkApplyModalOpen(false)} title={`Bulk Apply ${selectedTemplates.size} Templates`} maxWidth="max-w-md">
                <div className="p-4 space-y-6">
                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex items-start gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-sm border border-blue-100 shrink-0">
                            <Layers size={20} />
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight mb-1">Separate Tasks Creation</p>
                            <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
                                You are about to create <span className="text-blue-600 font-black">{selectedTemplates.size} separate main tasks</span>.
                                Each task will include its own sub-tasks and hierarchy.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                                <Briefcase size={12} className="text-blue-600" /> Target Project
                            </label>
                            <select
                                required
                                value={bulkApplyProject}
                                onChange={e => setBulkApplyProject(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all text-sm appearance-none cursor-pointer"
                            >
                                <option value="">Select Project...</option>
                                {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
                                <Target size={12} className="text-blue-600" /> Target Job (Optional)
                            </label>
                            <select
                                value={bulkApplyJob}
                                onChange={e => setBulkApplyJob(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all text-sm appearance-none cursor-pointer disabled:opacity-50"
                                disabled={!bulkApplyProject}
                            >
                                <option value="">Select Job...</option>
                                {bulkJobs.map(j => <option key={j._id} value={j._id}>{j.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setIsBulkApplyModalOpen(false)}
                            className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest transition active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmBulkApply}
                            disabled={!bulkApplyProject || isSubmitting}
                            className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-200 transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                            Create {selectedTemplates.size} Tasks
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ── Subtask Delete Confirmation Modal ── */}
            <Modal isOpen={isSubTaskDeleteModalOpen} onClose={() => setIsSubTaskDeleteModalOpen(false)} title="Delete Sub-task">
                <div className="p-4 text-center">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 border border-red-100 mx-auto mb-6 shadow-sm">
                        <Trash2 size={36} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">Delete Sub-task?</h3>
                    <p className="text-slate-500 font-bold mb-8 text-sm px-4 leading-relaxed">
                        Are you sure you want to delete <span className="text-red-600 font-black underline italic">"{subTaskToDeleteInfo?.subTask?.title}"</span>? <br />
                        <span className="text-[11px] uppercase tracking-widest text-slate-400 mt-2 block">All nested sub-tasks will be permanently removed.</span>
                    </p>
                    <div className="flex gap-3 px-2">
                        <button
                            onClick={() => setIsSubTaskDeleteModalOpen(false)}
                            className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest transition active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmSubTaskDelete}
                            disabled={isSubmitting}
                            className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-200 transition active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            Delete Sub-task
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ── Template Delete Confirmation Modal ── */}
            <Modal isOpen={isTemplateDeleteModalOpen} onClose={() => setIsTemplateDeleteModalOpen(false)} title="Delete Template">
                <div className="p-4 text-center">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 border border-red-100 mx-auto mb-6 shadow-sm">
                        <Trash2 size={36} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">Delete Template?</h3>
                    <p className="text-slate-500 font-bold mb-8 text-sm px-4">
                        Are you sure you want to delete <span className="text-red-600 font-black underline italic">"{templateToDelete?.templateName}"</span>? This action cannot be undone.
                    </p>
                    <div className="flex gap-3 px-2">
                        <button
                            onClick={() => setIsTemplateDeleteModalOpen(false)}
                            className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest transition active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmTemplateDelete}
                            disabled={isSubmitting}
                            className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-200 transition active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            Delete Template
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Tasks;