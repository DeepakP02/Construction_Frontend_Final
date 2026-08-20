import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, UserCheck, CheckCircle2 } from 'lucide-react';

const TimelineView = ({ tasks, onTaskUpdate, onTaskClick }) => {
    const [hoveredBar, setHoveredBar] = useState(null);
    const [dragState, setDragState] = useState(null); // { taskId, type: 'move'|'resize-left'|'resize-right', startX, deltaDays }
    const [expandedTasks, setExpandedTasks] = useState(new Set());

    const toggleExpansion = (taskId, e) => {
        e.stopPropagation();
        setExpandedTasks(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) next.delete(taskId);
            else next.add(taskId);
            return next;
        });
    };

    const { scheduledTasks, unscheduledTasks, rows, unscheduledRows } = useMemo(() => {
        const scheduled = tasks.filter(t => t.startDate);
        const unscheduled = tasks.filter(t => !t.startDate);
        
        const flattenedRows = [];
        scheduled.forEach(task => {
            const taskId = task._id || task.id;
            flattenedRows.push({ ...task, isSubTask: false });
            if (expandedTasks.has(taskId)) {
                (task.subTasks || []).forEach(st => {
                    flattenedRows.push({ ...st, isSubTask: true, parentId: taskId });
                });
            }
        });

        const flattenedUnscheduled = [];
        unscheduled.forEach(task => {
            const taskId = task._id || task.id;
            flattenedUnscheduled.push({ ...task, isSubTask: false });
            if (expandedTasks.has(taskId)) {
                (task.subTasks || []).forEach(st => {
                    flattenedUnscheduled.push({ ...st, isSubTask: true, parentId: taskId });
                });
            }
        });

        return { scheduledTasks: scheduled, unscheduledTasks: unscheduled, rows: flattenedRows, unscheduledRows: flattenedUnscheduled };
    }, [tasks, expandedTasks]);

    const today = new Date();
    const timelineDays = useMemo(() => {
        return Array.from({ length: 20 }).map((_, i) => {
            const d = new Date(today);
            d.setDate(d.getDate() + i - 4);
            return d;
        });
    }, []); // timelineDays only depends on the reference date at mount

    useEffect(() => {
        if (!dragState) return;

        const handleMouseMove = (e) => {
            const deltaX = e.clientX - dragState.startX;
            const deltaDays = Math.round(deltaX / 80);
            setDragState(prev => ({ ...prev, deltaDays }));
        };

        const handleMouseUp = () => {
            if (dragState.deltaDays !== 0) {
                const rowObj = rows.find(r => (r._id || r.id) === dragState.taskId);
                if (rowObj) {
                    const tStart = new Date(rowObj.startDate);
                    const tEnd = new Date(rowObj.endDate || rowObj.dueDate || rowObj.startDate);
                    const startIdx = timelineDays.findIndex(d => d.toDateString() === tStart.toDateString());
                    const endIdx = timelineDays.findIndex(d => d.toDateString() === tEnd.toDateString());

                    let ns = startIdx;
                    let ne = endIdx;

                    if (dragState.type === 'move') { ns += dragState.deltaDays; ne += dragState.deltaDays; }
                    else if (dragState.type === 'resize-left') { ns += dragState.deltaDays; }
                    else if (dragState.type === 'resize-right') { ne += dragState.deltaDays; }

                    ns = Math.max(0, Math.min(timelineDays.length - 1, ns));
                    ne = Math.max(ns, Math.min(timelineDays.length - 1, ne));

                    const finalStart = new Date(timelineDays[ns]);
                    finalStart.setHours(9, 0, 0, 0);
                    const finalEnd = new Date(timelineDays[ne]);
                    finalEnd.setHours(17, 0, 0, 0);

                    onTaskUpdate(dragState.taskId, { 
                        startDate: finalStart.toISOString(), 
                        dueDate: finalEnd.toISOString() 
                    }, rowObj.isSubTask);
                }
            }
            setDragState(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState, rows, timelineDays, onTaskUpdate]);

    const getBarColor = (status, overdue) => {
        if (status === 'completed') return 'bg-emerald-500 border-emerald-600 text-white';
        if (overdue) return 'bg-red-500 border-red-600 text-white';
        if (status === 'in_progress') return 'bg-blue-500 border-blue-600 text-white';
        return 'bg-slate-400 border-slate-500 text-white';
    };

    const renderTaskItem = (task, isSub = false) => {
        const taskId = task._id || task.id;
        const hasSubs = (task.subTasks || []).length > 0;
        const isExpanded = expandedTasks.has(taskId);

        return (
            <div 
                key={taskId} 
                draggable
                onDragStart={(e) => {
                    e.dataTransfer.setData('taskId', taskId);
                    e.dataTransfer.setData('isSubTask', isSub ? 'true' : 'false');
                }}
                onClick={() => onTaskClick && onTaskClick(task)}
                className={`h-[64px] border-b border-slate-100 last:border-0 hover:bg-blue-50/50 transition-colors duration-200 group relative ${isSub ? 'pl-8 bg-slate-50/50' : ''}`}
            >
                <div className="flex items-center gap-3 p-3 px-4 h-full cursor-pointer">
                    {isSub ? (
                        <div className="pl-6 flex items-center text-slate-300">
                             <div className="w-4 h-4 border-l-2 border-b-2 border-slate-200 rounded-bl-lg -mt-4 mr-2" />
                        </div>
                    ) : hasSubs ? (
                        <button 
                            onClick={(e) => toggleExpansion(taskId, e)}
                            className={`p-1.5 rounded-lg text-blue-500 hover:bg-blue-100 transition-all ${isExpanded ? 'rotate-90' : ''}`}
                        >
                            <ChevronRight size={14} />
                        </button>
                    ) : (
                        <div className="p-1 px-[18px]" />
                    )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-black text-slate-800 truncate group-hover:text-blue-700 transition-colors">{task.title}</p>
                    </div>
                </div>
                {task.status === 'completed' ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-200 group-hover:border-blue-400 shrink-0" />}
            </div>
        </div>
    );
};

    return (
        <div className="flex h-full bg-white rounded-3xl border border-slate-200/60 shadow-md overflow-hidden animate-fade-in group/timeline">
            <div className="w-full md:w-[40%] border-r border-slate-200/60 flex flex-col h-full bg-slate-50/50 shrink-0 relative z-20">
                <div className="p-4 border-b border-slate-200/60 bg-white h-14 flex items-center justify-between">
                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Scheduling View</h3>
                </div>
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    {scheduledTasks.length > 0 && <div>{rows.map(row => renderTaskItem(row, row.isSubTask))}</div>}
                    {unscheduledRows && unscheduledRows.length > 0 && (
                        <div>
                            <div className="bg-orange-50/50 px-4 py-2 border-b border-orange-100 text-[9px] font-black text-orange-600 uppercase sticky top-0 bg-white z-10">Unscheduled</div>
                            {unscheduledRows.map(t => renderTaskItem(t, t.isSubTask))}
                        </div>
                    )}
                </div>
            </div>

            <div className="hidden md:flex w-[60%] flex-col h-full bg-slate-50/30 relative overflow-hidden">
                <div className="flex border-b border-slate-200/60 bg-white h-14 overflow-x-hidden">
                    <div className="flex h-full min-w-max">
                        {timelineDays.map((date, i) => (
                            <div key={i} className="w-[80px] flex flex-col items-center justify-center border-r border-slate-100 shrink-0">
                                <span className="text-[9px] font-black text-slate-400 capitalize">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                <span className="text-[11px] font-black">{date.getDate()}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar relative">
                    <div className="absolute inset-0 flex pointer-events-none z-0 min-w-max">
                        {timelineDays.map((date, i) => (
                            <div key={i} className="w-[80px] border-r border-slate-200/40 shrink-0" 
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => {
                                    e.preventDefault();
                                    const taskId = e.dataTransfer.getData('taskId');
                                    const isSub = e.dataTransfer.getData('isSubTask') === 'true';
                                    if (taskId) {
                                        const finalStart = new Date(date);
                                        finalStart.setHours(9, 0, 0, 0);
                                        onTaskUpdate(taskId, { startDate: finalStart.toISOString() }, isSub);
                                    }
                                }}
                            />
                        ))}
                    </div>

                    <div className="absolute inset-0 z-10 min-w-max pt-0 pointer-events-none">
                        {rows.map((row) => {
                            if (!row.startDate) return null;
                            const tStart = new Date(row.startDate);
                            const tEnd = new Date(row.endDate || row.dueDate || row.startDate);
                            const sIdx = timelineDays.findIndex(d => d.toDateString() === tStart.toDateString());
                            const eIdx = timelineDays.findIndex(d => d.toDateString() === tEnd.toDateString());
                            if (sIdx === -1 && eIdx === -1) return null;

                            const ds = sIdx === -1 ? 0 : sIdx;
                            const de = eIdx === -1 ? timelineDays.length - 1 : eIdx;
                            const dur = Math.max(0.5, de - ds + 1);
                            const isDrg = dragState?.taskId === (row._id || row.id);

                            return (
                                <div key={row._id || row.id} className="h-[64px] relative w-full">
                                    <div
                                        onMouseDown={(e) => { if (e.button === 0) { e.stopPropagation(); setDragState({ taskId: row._id || row.id, type: 'move', startX: e.clientX, deltaDays: 0 }); } }}
                                        onMouseEnter={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHoveredBar({ ...row, x: r.left + r.width / 2, y: r.top - 10 }); }}
                                        onMouseLeave={() => setHoveredBar(null)}
                                        onClick={() => onTaskClick && onTaskClick(row)}
                                        className={`absolute h-[32px] top-4 rounded-xl border-2 cursor-grab active:cursor-grabbing hover:ring-2 pointer-events-auto z-20 flex items-center ${getBarColor(row.status)} shadow-sm group/bar overflow-visible ${isDrg ? 'ring-4 ring-white shadow-[0_0_20px_rgba(255,255,255,0.4)] border-white scale-[1.02]' : ''}`}
                                        style={{ 
                                            left: `${((isDrg && (dragState.type === 'move' || dragState.type === 'resize-left') ? ds + dragState.deltaDays : ds)) * 80 + 8}px`, 
                                            width: `${((isDrg ? (dragState.type === 'move' ? dur : (dragState.type === 'resize-left' ? dur - dragState.deltaDays : dur + dragState.deltaDays)) : dur)) * 80 - 16}px`
                                        }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-xl" />
                                        
                                        {/* High-visibility drag edges */}
                                        {isDrg && (
                                            <>
                                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-white shadow-[2px_0_10px_rgba(255,255,255,1)] z-40 rounded-l-xl animate-pulse" />
                                                <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-white shadow-[-2px_0_10px_rgba(255,255,255,1)] z-40 rounded-r-xl animate-pulse" />
                                            </>
                                        )}
                                        
                                        {/* Resize Handle Left */}
                                        <div 
                                            className="absolute left-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-white/20 z-30 flex items-center justify-center opacity-0 group-hover/bar:opacity-100 transition-opacity"
                                            onMouseDown={(e) => { e.stopPropagation(); setDragState({ taskId: row._id || row.id, type: 'resize-left', startX: e.clientX, deltaDays: 0 }); }}
                                        >
                                            <div className="w-[1.5px] h-3.5 bg-white/60 rounded-full" />
                                        </div>

                                        <span className="px-3 text-[10px] font-black truncate text-white select-none pointer-events-none w-full text-center relative z-10">{row.title}</span>
                                        
                                        {/* Resize Handle Right */}
                                        <div 
                                            className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-white/20 z-30 flex items-center justify-center opacity-0 group-hover/bar:opacity-100 transition-opacity"
                                            onMouseDown={(e) => { e.stopPropagation(); setDragState({ taskId: row._id || row.id, type: 'resize-right', startX: e.clientX, deltaDays: 0 }); }}
                                        >
                                            <div className="w-[1.5px] h-3.5 bg-white/60 rounded-full" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {hoveredBar && (
                    <div className="fixed z-[9999] pointer-events-none" style={{ left: hoveredBar.x, top: hoveredBar.y, transform: 'translate(-50%, -100%)' }}>
                        <div className="bg-slate-900 text-white p-3 rounded-2xl border border-white/10 min-w-[180px] shadow-2xl">
                            <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">{hoveredBar.isSubTask ? 'Sub Task' : 'Main Task'}</p>
                            <p className="text-sm font-black leading-tight mt-1">{hoveredBar.title}</p>
                            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/10">
                                <div><p className="text-[7px] text-slate-400 uppercase">Status</p><p className="text-[10px] font-black">{hoveredBar.status}</p></div>
                                <div><p className="text-[7px] text-slate-400 uppercase">Progress</p><p className="text-[10px] font-black">{hoveredBar.progress || 0}%</p></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimelineView;
