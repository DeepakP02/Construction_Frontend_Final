import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Layers, ChevronRight, ChevronLeft, Share2, CornerDownRight, UserCheck, CalendarDays } from 'lucide-react';

const GanttView = ({ tasks, onTaskUpdate, onTaskClick }) => {
    const timelineRef = useRef(null);
    const sidebarRef = useRef(null);
    const [viewMode, setViewMode] = useState('month');
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [hoveredBar, setHoveredBar] = useState(null);
    const [dragState, setDragState] = useState(null); // { taskId, type: 'move'|'resize-left'|'resize-right', startX, deltaDays }
    const lastScrollLeft = useRef(0);
    const jumpCooldown = useRef(false);
    const ignoreScroll = useRef(false);
    const pendingScrollDirection = useRef(null);

    const [baseDate, setBaseDate] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentMonthLabel = baseDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const normalizeBaseDate = (date, mode = viewMode) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        if (mode === 'month') {
            d.setDate(1);
            return d;
        }
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        return d;
    };

    const getMonthDeltaDate = (date, mode = viewMode, direction = 1) => {
        const d = normalizeBaseDate(date, mode);
        if (mode === 'month') {
            d.setMonth(d.getMonth() + direction);
            return d;
        }
        d.setDate(d.getDate() + 7 * direction);
        return d;
    };

    const days = useMemo(() => {
        const d_base = normalizeBaseDate(baseDate, viewMode);
        const result = [];

        if (viewMode === 'month') {
            const year = d_base.getFullYear();
            const month = d_base.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            for (let i = 0; i < daysInMonth; i++) {
                const d = new Date(year, month, 1 + i);
                result.push(d);
            }
        } else {
            const start = new Date(d_base);
            for (let i = 0; i < 7; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                result.push(d);
            }
        }

        return result;
    }, [viewMode, baseDate]);

    const { scheduledTasks, rows } = useMemo(() => {
        const flattenedRows = [];
        tasks.forEach(task => {
            // Include parent in rows so it shows in sidebar
            flattenedRows.push({ ...task, isSubTask: false });
            (task.subTasks || []).forEach(st => {
                if (st.startDate) {
                    flattenedRows.push({ ...st, isSubTask: true, parentId: task.id || task._id });
                }
            });
        });
        const scheduled = flattenedRows.filter(r => r.startDate);
        return { scheduledTasks: scheduled, rows: flattenedRows };
    }, [tasks]);

    useEffect(() => {
        if (!dragState) return;

        const handleMouseMove = (e) => {
            const deltaX = e.clientX - dragState.startX;
            const dayWidth = 52;
            const deltaDays = Math.round(deltaX / dayWidth);

            setDragState(prev => ({ ...prev, deltaDays }));
        };

        const handleMouseUp = () => {
            if (dragState.deltaDays !== 0) {
                const rowObj = rows.find(r => (r._id || r.id) === dragState.taskId);
                if (rowObj) {
                    const sStr = rowObj.startDate.includes('T') ? rowObj.startDate.split('T')[0] : rowObj.startDate;
                    const eStr = (rowObj.endDate || rowObj.dueDate || rowObj.startDate).includes('T') ? (rowObj.endDate || rowObj.dueDate || rowObj.startDate).split('T')[0] : (rowObj.endDate || rowObj.dueDate || rowObj.startDate);
                    
                    const startIdx = days.findIndex(d => {
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}` === sStr;
                    });
                    const endIdx = days.findIndex(d => {
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}` === eStr;
                    });

                    let newStartIdx = startIdx;
                    let newEndIdx = endIdx;

                    if (dragState.type === 'move') {
                        newStartIdx += dragState.deltaDays;
                        newEndIdx += dragState.deltaDays;
                    } else if (dragState.type === 'resize-left') {
                        newStartIdx += dragState.deltaDays;
                    } else if (dragState.type === 'resize-right') {
                        newEndIdx += dragState.deltaDays;
                    }

                    // Ensure indices are within bounds and valid
                    newStartIdx = Math.max(0, Math.min(days.length - 1, newStartIdx));
                    newEndIdx = Math.max(newStartIdx, Math.min(days.length - 1, newEndIdx));

                    const dStart = days[newStartIdx];
                    const dEnd = days[newEndIdx];

                    const fmtDate = (d) => {
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                    };

                    onTaskUpdate(dragState.taskId, { 
                        startDate: fmtDate(dStart), 
                        dueDate: fmtDate(dEnd) 
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
    }, [dragState, days, rows, onTaskUpdate]);

    const getStatusColor = (status, overdue) => {
        if (status === 'completed') return 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-200/50';
        if (overdue) return 'bg-red-500 border-red-600 text-white shadow-red-200/50';
        if (status === 'in_progress') return 'bg-blue-500 border-blue-600 text-white shadow-blue-200/50';
        if (status === 'review') return 'bg-orange-400 border-orange-500 text-white shadow-orange-200/50';
        return 'bg-slate-400 border-slate-500 text-white shadow-slate-200/50';
    };

    // Shared scroll sync logic
    const handleScrollSync = (source) => {
        if (source === 'sidebar' && timelineRef.current && sidebarRef.current) {
            timelineRef.current.scrollTop = sidebarRef.current.scrollTop;
            return;
        }

        if (ignoreScroll.current) return;

        if (source === 'timeline' && sidebarRef.current && timelineRef.current) {
            sidebarRef.current.scrollTop = timelineRef.current.scrollTop;

            const { scrollLeft, scrollWidth, clientWidth } = timelineRef.current;
            if (scrollWidth <= clientWidth) {
                lastScrollLeft.current = scrollLeft;
                pendingScrollDirection.current = null;
                return;
            }

            const deltaX = scrollLeft - lastScrollLeft.current;
            if (Math.abs(deltaX) < 4) {
                lastScrollLeft.current = scrollLeft;
                return;
            }

            const atRightEdge = scrollLeft + clientWidth >= scrollWidth - 12;
            const atLeftEdge = scrollLeft <= 12;
            const direction = deltaX > 0 ? 'right' : 'left';

            if (!atRightEdge && !atLeftEdge) {
                pendingScrollDirection.current = null;
                lastScrollLeft.current = scrollLeft;
                return;
            }

            if (pendingScrollDirection.current && pendingScrollDirection.current !== direction) {
                pendingScrollDirection.current = direction;
            }

            pendingScrollDirection.current = direction;

            if (jumpCooldown.current) {
                lastScrollLeft.current = scrollLeft;
                return;
            }

            if (direction === 'right' && atRightEdge) {
                jumpCooldown.current = true;
                ignoreScroll.current = true;
                setBaseDate(getMonthDeltaDate(baseDate, viewMode, 1));

                requestAnimationFrame(() => {
                    if (timelineRef.current) {
                        timelineRef.current.scrollLeft = 10;
                        lastScrollLeft.current = 10;
                    }
                    ignoreScroll.current = false;
                    jumpCooldown.current = false;
                });
                return;
            }

            if (direction === 'left' && atLeftEdge) {
                jumpCooldown.current = true;
                ignoreScroll.current = true;
                setBaseDate(getMonthDeltaDate(baseDate, viewMode, -1));

                requestAnimationFrame(() => {
                    if (timelineRef.current) {
                        const newScrollWidth = timelineRef.current.scrollWidth;
                        const newClientWidth = timelineRef.current.clientWidth;
                        const targetScroll = Math.max(newScrollWidth - newClientWidth - 10, 0);
                        timelineRef.current.scrollLeft = targetScroll;
                        lastScrollLeft.current = targetScroll;
                    }
                    ignoreScroll.current = false;
                    jumpCooldown.current = false;
                });
                return;
            }

            lastScrollLeft.current = scrollLeft;
        }
    };

    useEffect(() => {
        if (!timelineRef.current) return;
        ignoreScroll.current = true;
        lastScrollLeft.current = 1;
        timelineRef.current.scrollLeft = 1;
        requestAnimationFrame(() => {
            ignoreScroll.current = false;
        });
    }, [baseDate, viewMode]);

    const handleTaskSync = (row) => {
        const taskId = row._id || row.id;
        setSelectedTaskId(taskId);

        // Calculate Y position (Row elevation)
        const rowIndex = rows.findIndex(r => (r._id || r.id) === taskId);
        const scrollY = rowIndex !== -1 ? rowIndex * 56 - 150 : 0; // Position row with offset for context

        if (row.startDate && timelineRef.current) {
            const sStr = row.startDate.includes('T') ? row.startDate.split('T')[0] : row.startDate;
            const startIdx = days.findIndex(d => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}` === sStr;
            });
            if (startIdx !== -1) {
                // Dual-Axis Scroll: Horizontal to date + Vertical to row
                const scrollX = startIdx * 52 - 100; 
                timelineRef.current.scrollTo({ top: scrollY, left: scrollX, behavior: 'smooth' });
            } else {
                // Vertical-only fallback
                timelineRef.current.scrollTo({ top: scrollY, behavior: 'smooth' });
            }
        } else if (timelineRef.current) {
            // Vertical-only fallback
            timelineRef.current.scrollTo({ top: scrollY, behavior: 'smooth' });
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-230px)] min-h-[600px] bg-slate-50 rounded-3xl border border-slate-200/60 shadow-md overflow-hidden animate-fade-in group">
            {/* Toolbar */}
            <div className="p-3 border-b border-slate-200/60 flex items-center justify-between bg-white shadow-sm relative z-20">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shadow-sm">
                        <Share2 size={14} />
                    </div>
                    <div>
                        <h2 className="text-xs font-black text-slate-800 tracking-tight flex items-center gap-2">Project Gantt Chart</h2>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{currentMonthLabel}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-slate-50 rounded-xl border border-slate-200 p-1 shadow-sm mr-2">
                        <button 
                            onClick={() => setBaseDate(getMonthDeltaDate(baseDate, viewMode, -1))}
                            className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 hover:text-slate-800 transition-all"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button 
                            onClick={() => setBaseDate(normalizeBaseDate(new Date(), viewMode))}
                            className="px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800"
                        >
                            Today
                        </button>
                        <button 
                            onClick={() => setBaseDate(getMonthDeltaDate(baseDate, viewMode, 1))}
                            className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-500 hover:text-slate-800 transition-all"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="relative group/date shrink-0">
                        <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover/date:text-purple-500 transition-colors pointer-events-none" />
                        <input 
                            type="date"
                            value={`${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, '0')}-${String(baseDate.getDate()).padStart(2, '0')}`}
                            onChange={(e) => {
                                const [y, m, d] = e.target.value.split('-').map(Number);
                                if (y && m && d) {
                                    setBaseDate(normalizeBaseDate(new Date(y, m - 1, d), viewMode));
                                }
                            }}
                            className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-[10px] font-black text-slate-700 outline-none focus:border-purple-400 focus:bg-white transition-all w-[130px] appearance-none cursor-pointer"
                        />
                    </div>

                    <div className="flex bg-slate-50 rounded-xl border border-slate-200 p-1 shadow-sm ml-2">
                        <button 
                            onClick={() => setViewMode('month')}
                            className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'month' ? 'bg-white text-slate-800 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            Month
                        </button>
                        <button 
                            onClick={() => setViewMode('week')}
                            className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'week' ? 'bg-white text-slate-800 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            Week
                        </button>
                    </div>
                </div>
            </div>

            {/* Gantt Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Task List Column */}
                <div className="w-64 border-r border-slate-200/60 bg-white flex flex-col shrink-0 shadow-[4px_0_12px_rgba(0,0,0,0.02)] z-10 relative">
                    <div className="h-[48px] border-b border-slate-200/60 bg-slate-50/80 flex items-center px-4 shrink-0 shadow-sm sticky top-0">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Layers size={13} className="text-slate-400" /> Task Structure
                        </span>
                    </div>
                    <div 
                        ref={sidebarRef}
                        onScroll={() => handleScrollSync('sidebar')}
                        className="overflow-y-auto flex-1 hide-scrollbar-y max-h-[700px]"
                    >
                        {rows.map((row) => (
                            <div 
                                key={row._id || row.id} 
                                onClick={() => handleTaskSync(row)}
                                className={`h-[56px] border-b border-slate-100 flex flex-col justify-center transition-all relative group/row cursor-pointer ${selectedTaskId === (row._id || row.id) ? (row.isSubTask ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white') : (row.isSubTask ? 'bg-slate-50/30' : 'bg-white')} hover:bg-slate-100`}
                            >
                                {/* Row selection indicator */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-opacity ${selectedTaskId === (row._id || row.id) ? 'opacity-100 bg-white/40 ring-4 ring-white/20' : 'opacity-0 group-hover/row:opacity-100'} ${row.isSubTask ? 'bg-blue-400' : 'bg-purple-500'}`} />

                                <div className="flex items-center gap-2 px-4">
                                    {row.isSubTask && <CornerDownRight size={12} className={selectedTaskId === (row._id || row.id) ? "text-white/60" : "text-slate-300"} />}
                                    <span className={`text-[12px] font-black truncate leading-tight transition-colors ${selectedTaskId === (row._id || row.id) ? 'text-white' : (row.isSubTask ? 'text-slate-600' : 'text-slate-800')}`}>
                                        {row.title}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5 px-4 opacity-70 group-hover/row:opacity-100 transition-opacity">
                                    {(row.assignedTo || Array.isArray(row.assignedTo)) && (
                                        <div className={`w-[14px] h-[14px] rounded-full flex items-center justify-center text-[7px] font-bold border ${selectedTaskId === (row._id || row.id) ? 'bg-white/20 text-white border-white/40' : (row.isSubTask ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200')}`}>
                                            {(() => {
                                                const assigned = Array.isArray(row.assignedTo) ? row.assignedTo[0] : row.assignedTo;
                                                const name = assigned?.fullName || assigned?.name || row.jobName || 'A';
                                                return name.charAt(0).toUpperCase();
                                            })()}
                                        </div>
                                    )}
                                    <span className={`text-[9px] font-bold uppercase truncate leading-none ${selectedTaskId === (row._id || row.id) ? 'text-white/80' : 'text-slate-400'}`}>
                                        {(row.status || 'todo').replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Timeline Grid */}
                <div 
                    ref={timelineRef}
                    onScroll={() => handleScrollSync('timeline')}
                    className="flex-1 flex flex-col overflow-auto hide-scrollbar-y max-h-[700px] relative bg-slate-50/30"
                >
                    {/* Header Dates */}
                    <div className="flex h-[48px] border-b border-slate-200/60 bg-white shrink-0 sticky top-0 z-30 shadow-sm">
                        {days.map((date, idx) => {
                            const isToday = date.toDateString() === today.toDateString();
                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                            return (
                                <div key={idx} className={`w-[52px] shrink-0 border-r border-slate-100 flex flex-col items-center justify-center relative ${isWeekend ? 'bg-slate-50/80' : ''}`}>
                                    {isToday && <div className="absolute top-0 w-full h-[3px] bg-red-400" />}
                                    <span className={`text-[7px] font-black uppercase tracking-widest ${isToday ? 'text-red-500' : 'text-slate-400'}`}>
                                        {date.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 1)}
                                    </span>
                                    <span className={`text-[11px] font-black mt-0.5 ${isToday ? 'text-white bg-red-500 w-5 h-5 flex items-center justify-center rounded-md shadow-sm' : 'text-slate-700'}`}>
                                        {date.getDate()}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Gantt Body */}
                    <div className="relative min-w-max">
                        {/* Vertical Grid Lines */}
                        <div className="absolute inset-0 flex pointer-events-none z-0">
                            {days.map((date, idx) => {
                                const isToday = date.toDateString() === today.toDateString();
                                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                return (
                                    <div key={idx} className={`w-[52px] shrink-0 border-r border-slate-100 relative ${isWeekend ? 'bg-slate-50/80' : ''}`}>
                                        {isToday && <div className="absolute inset-y-0 left-1/2 w-px bg-red-200 drop-shadow-[0_0_2px_rgba(248,113,113,0.5)] -translate-x-1/2 z-0" />}
                                    </div>
                                );
                            })}
                        </div>

                        {/* SVG Overlay for Dependency Lines */}
                        <svg className="absolute inset-0 pointer-events-none z-5 w-full h-full min-w-max">
                            <defs>
                                <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#cbd5e1" />
                                </marker>
                            </defs>
                            {rows.map(target => {
                                if (!target.dependencies?.length) return null;
                                const targetIdx = rows.findIndex(r => (r._id || r.id) === (target._id || target.id));
                                if (targetIdx === -1) return null;

                                return target.dependencies.map(depId => {
                                    const source = rows.find(r => (r._id || r.id) === depId);
                                    if (!source || !source.startDate) return null;
                                    const sourceIdx = rows.findIndex(r => (r._id || r.id) === depId);

                                    const sStr = source.startDate.includes('T') ? source.startDate.split('T')[0] : source.startDate;
                                    const eStr = (source.endDate || source.dueDate || source.startDate).includes('T') ? (source.endDate || source.dueDate || source.startDate).split('T')[0] : (source.endDate || source.dueDate || source.startDate);
                                    const tStr = target.startDate.includes('T') ? target.startDate.split('T')[0] : target.startDate;

                                    const sStart = days.findIndex(d => {
                                        const year = d.getFullYear();
                                        const month = String(d.getMonth() + 1).padStart(2, '0');
                                        const day = String(d.getDate()).padStart(2, '0');
                                        return `${year}-${month}-${day}` === sStr;
                                    });
                                    const sEnd = days.findIndex(d => {
                                        const year = d.getFullYear();
                                        const month = String(d.getMonth() + 1).padStart(2, '0');
                                        const day = String(d.getDate()).padStart(2, '0');
                                        return `${year}-${month}-${day}` === eStr;
                                    });
                                    const tStart = days.findIndex(d => {
                                        const year = d.getFullYear();
                                        const month = String(d.getMonth() + 1).padStart(2, '0');
                                        const day = String(d.getDate()).padStart(2, '0');
                                        return `${year}-${month}-${day}` === tStr;
                                    });

                                    if (sStart === -1 || tStart === -1) return null;

                                    const sDrag = dragState?.taskId === (source._id || source.id);
                                    const tDrag = dragState?.taskId === (target._id || target.id);
                                    
                                    const sEndIdx = (sEnd === -1 ? days.length - 1 : sEnd) + (sDrag && (dragState.type === 'move' || dragState.type === 'resize-right') ? dragState.deltaDays || 0 : 0);
                                    const tStartIdx = (tStart === -1 ? 0 : tStart) + (tDrag && (dragState.type === 'move' || dragState.type === 'resize-left') ? dragState.deltaDays || 0 : 0);

                                    const x1 = (sEndIdx + 1) * 52 - 4;
                                    const y1 = sourceIdx * 56 + 28;
                                    const x2 = tStartIdx * 52 + 4;
                                    const y2 = targetIdx * 56 + 28;

                                    return (
                                        <g key={`${source._id || source.id}-${target._id || target.id}`}>
                                            <path 
                                                d={`M ${x1} ${y1} L ${x1 + 10} ${y1} L ${x1 + 10} ${y2} L ${x2} ${y2}`} 
                                                stroke="#cbd5e1" 
                                                strokeWidth="1.5" 
                                                fill="none" 
                                                markerEnd="url(#arrow)"
                                                className="transition-all duration-75"
                                            />
                                        </g>
                                    );
                                });
                            })}
                        </svg>

                        {/* Task Rows & Connector Lines */}
                        <div className="relative z-10 pt-0">
                            {rows.map((row, i) => {
                                const hasSchedule = row.startDate && (row.endDate || row.dueDate);
                                if (!hasSchedule) {
                                    return (
                                        <div 
                                            key={row._id || row.id} 
                                            className={`h-[56px] border-b border-slate-100/50 flex items-center relative group/row hover:bg-slate-100/40 transition-all w-full z-10 ${selectedTaskId === (row._id || row.id) ? (row.isSubTask ? 'bg-blue-500/10' : 'bg-purple-500/10') : ''}`}
                                        />
                                    );
                                }

                                const sStr = row.startDate.includes('T') ? row.startDate.split('T')[0] : row.startDate;
                                const eStr = (row.endDate || row.dueDate || row.startDate).includes('T') ? (row.endDate || row.dueDate || row.startDate).split('T')[0] : (row.endDate || row.dueDate || row.startDate);

                                const startIdx = days.findIndex(d => {
                                    const year = d.getFullYear();
                                    const month = String(d.getMonth() + 1).padStart(2, '0');
                                    const day = String(d.getDate()).padStart(2, '0');
                                    return `${year}-${month}-${day}` === sStr;
                                });
                                const endIdx = days.findIndex(d => {
                                    const year = d.getFullYear();
                                    const month = String(d.getMonth() + 1).padStart(2, '0');
                                    const day = String(d.getDate()).padStart(2, '0');
                                    return `${year}-${month}-${day}` === eStr;
                                });
                                
                                if (startIdx === -1 && endIdx === -1) {
                                    return (
                                        <div 
                                            key={row._id || row.id} 
                                            className={`h-[56px] border-b border-slate-100/50 flex items-center relative group/row hover:bg-slate-100/40 transition-all w-full z-10 ${selectedTaskId === (row._id || row.id) ? (row.isSubTask ? 'bg-blue-500/10' : 'bg-purple-500/10') : ''}`}
                                        />
                                    );
                                }

                                const displayStart = startIdx === -1 ? 0 : startIdx;
                                const displayEnd = endIdx === -1 ? days.length - 1 : endIdx;
                                const durationDays = Math.max(0.5, displayEnd - displayStart + 1);

                                const eStrForOverdue = (row.endDate || row.dueDate) ? ((row.endDate || row.dueDate).includes('T') ? (row.endDate || row.dueDate).split('T')[0] : (row.endDate || row.dueDate)) : null;
                                let isOverdue = false;
                                if (eStrForOverdue) {
                                    const [oy, om, od] = eStrForOverdue.split('-').map(Number);
                                    const oDue = new Date(oy, om - 1, od);
                                    isOverdue = oDue < today && row.status !== 'completed';
                                }
                                const colorClass = row.isSubTask ? 'bg-blue-400 border-blue-500 shadow-blue-200/50' : getStatusColor(row.status, isOverdue);

                                return (
                                    <div 
                                        key={row._id || row.id} 
                                        className={`h-[56px] border-b border-transparent flex items-center relative group/row hover:bg-slate-100/40 transition-all w-full z-10 ${selectedTaskId === (row._id || row.id) ? (row.isSubTask ? 'bg-blue-500/10' : 'bg-purple-500/10') : ''}`}
                                    >
                                        <div
                                            onMouseDown={(e) => {
                                                if (e.button !== 0) return;
                                                e.stopPropagation();
                                                setDragState({ 
                                                    taskId: row._id || row.id, 
                                                    type: 'move', 
                                                    startX: e.clientX, 
                                                    deltaDays: 0 
                                                });
                                            }}
                                            onMouseEnter={(e) => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setHoveredBar({
                                                    ...row,
                                                    x: rect.left + rect.width / 2,
                                                    y: rect.top - 10
                                                });
                                            }}
                                            onMouseLeave={() => setHoveredBar(null)}
                                            onClick={(e) => { e.stopPropagation(); handleTaskSync(row); }}
                                            className={`absolute h-[32px] rounded-lg border-2 shadow-sm transition-all duration-75 cursor-grab active:cursor-grabbing z-20 flex items-center hover:ring-2 hover:ring-white/80 group/bar hover:shadow-lg ${colorClass} overflow-visible ${dragState?.taskId === (row._id || row.id) ? 'ring-4 ring-white shadow-[0_0_20px_rgba(255,255,255,0.4)] border-white scale-[1.01]' : ''} ${selectedTaskId === (row._id || row.id) ? 'ring-2 ring-white scale-[1.05] z-[55] shadow-[0_0_25px_rgba(37,99,235,0.6)] animate-pulse border-white' : ''}`}
                                            style={{ 
                                                left: `${(dragState?.taskId === (row._id || row.id) && (dragState.type === 'move' || dragState.type === 'resize-left') 
                                                    ? displayStart + (dragState.deltaDays || 0) 
                                                    : displayStart) * 52 + 4}px`, 
                                                width: `${(dragState?.taskId === (row._id || row.id) 
                                                    ? (dragState.type === 'move' ? durationDays : (dragState.type === 'resize-left' ? durationDays - (dragState.deltaDays || 0) : durationDays + (dragState.deltaDays || 0)))
                                                    : durationDays) * 52 - 8}px` 
                                            }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-lg" />
                                            
                                            {/* High-visibility drag/selection edges */}
                                            {(dragState?.taskId === (row._id || row.id) || selectedTaskId === (row._id || row.id)) && (
                                                <>
                                                    <div className={`absolute left-0 top-0 bottom-0 w-1 bg-white z-40 rounded-l-lg ${dragState?.taskId === (row._id || row.id) ? 'shadow-[2px_0_10px_rgba(255,255,255,1)] animate-pulse' : ''}`} />
                                                    <div className={`absolute right-0 top-0 bottom-0 w-1 bg-white z-40 rounded-r-lg ${dragState?.taskId === (row._id || row.id) ? 'shadow-[-2px_0_10px_rgba(255,255,255,1)] animate-pulse' : ''}`} />
                                                </>
                                            )}
                                            
                                            {/* Resize Handle Left */}
                                            <div 
                                                className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/30 z-30 flex items-center justify-center opacity-0 group-hover/bar:opacity-100 transition-opacity"
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    setDragState({ taskId: row._id || row.id, type: 'resize-left', startX: e.clientX, deltaDays: 0 });
                                                }}
                                            >
                                                <div className="w-[1px] h-3 bg-white/60" />
                                            </div>

                                            <div className="px-3 flex items-center gap-1.5 w-full relative z-10 pointer-events-none">
                                                <span className="text-[10px] font-black text-white truncate drop-shadow-sm select-none break-all">
                                                    {row.title}
                                                </span>
                                            </div>

                                            {/* Resize Handle Right */}
                                            <div 
                                                className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/30 z-30 flex items-center justify-center opacity-0 group-hover/bar:opacity-100 transition-opacity"
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    setDragState({ taskId: row._id || row.id, type: 'resize-right', startX: e.clientX, deltaDays: 0 });
                                                }}
                                            >
                                                <div className="w-[1px] h-3 bg-white/60" />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Rich Details Popover */}
                    {hoveredBar && (
                        <div 
                            className="fixed z-[9999] pointer-events-none animate-in fade-in zoom-in duration-200"
                            style={{ 
                                left: `${hoveredBar.x}px`, 
                                top: `${hoveredBar.y}px`,
                                transform: 'translate(-50%, -100%)'
                            }}
                        >
                            <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-2xl border border-white/10 min-w-[200px] backdrop-blur-xl bg-opacity-95">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-purple-400">
                                            {hoveredBar.isSubTask ? 'Sub Task Details' : 'Gantt Task Details'}
                                        </span>
                                        <div className={`w-2 h-2 rounded-full ${hoveredBar.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                                    </div>
                                    <h4 className="text-sm font-black leading-tight">{hoveredBar.title}</h4>
                                    <div className="h-px bg-white/10 my-1" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Project</p>
                                            <p className="text-[10px] font-black truncate">{hoveredBar.projectId?.name || 'Site'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Assignee</p>
                                            <div className="flex items-center gap-1">
                                                <UserCheck size={10} className="text-purple-400" />
                                                <p className="text-[10px] font-black">
                                                    {(Array.isArray(hoveredBar.assignedTo) ? hoveredBar.assignedTo[0]?.fullName : hoveredBar.assignedTo?.fullName) || 'Crew'}
                                                </p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
                                            <p className="text-[10px] font-black capitalize">{(hoveredBar.status || 'todo').replace('_', ' ')}</p>
                                        </div>
                                        <div>
                                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">Progress</p>
                                            <p className="text-[10px] font-black">{hoveredBar.progress || 0}%</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-r border-b border-white/10 rotate-45" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GanttView;
