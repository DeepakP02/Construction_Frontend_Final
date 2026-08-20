import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, UserCheck } from 'lucide-react';

const CalendarView = ({ tasks, onTaskUpdate, onTaskClick }) => {
    const [viewDate, setViewDate] = useState(new Date());
    const [cellSearches, setCellSearches] = useState({}); // { dayIndex: 'query' }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentMonth = viewDate.getMonth();
    const currentYear = viewDate.getFullYear();

    // Get days in month using local dates
    const daysInMonthCount = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

    const days = Array.from({ length: daysInMonthCount }).map((_, i) => i + 1);
    const paddingDays = Array.from({ length: firstDayOfMonth }).map((_, i) => null);

    const rows = [];
    tasks.forEach(task => {
        if (task.startDate) {
            rows.push({ ...task, isSubTask: false });
        }
        (task.subTasks || []).forEach(st => {
            if (st.startDate) {
                rows.push({ ...st, isSubTask: true, parentId: task.id || task._id });
            }
        });
    });

    const taskMap = rows.reduce((acc, t) => {
        const sStr = t.startDate ? (t.startDate.includes('T') ? t.startDate.split('T')[0] : t.startDate) : null;
        const eStr = (t.endDate || t.dueDate) ? ((t.endDate || t.dueDate).includes('T') ? (t.endDate || t.dueDate).split('T')[0] : (t.endDate || t.dueDate)) : sStr;
        
        if (!sStr) return acc;

        const [sY, sM, sD] = sStr.split('-').map(Number);
        const [eY, eM, eD] = eStr.split('-').map(Number);
        
        const start = new Date(sY, sM - 1, sD);
        const end = new Date(eY, eM - 1, eD);
        
        const viewStart = new Date(currentYear, currentMonth, 1);
        const viewEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

        if (start <= viewEnd && end >= viewStart) {
            let d = new Date(start);
            if (d < viewStart) d = new Date(viewStart);
            
            const loopEnd = end < viewEnd ? end : viewEnd;
            
            while (d <= loopEnd) {
                const day = d.getDate();
                if (!acc[day]) acc[day] = [];
                acc[day].push(t);
                d.setDate(d.getDate() + 1);
            }
        }
        return acc;
    }, {});

    const getStatusColor = (status, overdue) => {
        if (status === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
        if (overdue) return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
        if (status === 'in_progress') return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
        if (status === 'review') return 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100';
        return 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100';
    };

    return (
        <>
            <div className="flex flex-col min-h-[900px] bg-slate-50 rounded-3xl border border-slate-200/60 shadow-md overflow-hidden p-3 md:p-4 gap-3 animate-fade-in relative z-0 mb-20">
                {/* Header */}
                <div className="flex items-center justify-between px-2 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-900 p-2 rounded-xl text-white shadow-lg shadow-slate-200">
                            <CalendarIcon size={18} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tighter leading-none">
                                Scheduling
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-white px-4 py-1.5 rounded-2xl border border-slate-200 shadow-sm">
                        <button
                            onClick={() => setViewDate(new Date(currentYear, currentMonth - 1, 1))}
                            className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-1"
                        >
                            <ChevronLeft size={16} /> Prev
                        </button>
                        <h3 className="text-sm font-black text-slate-800 tracking-tighter w-24 text-center uppercase">
                            {viewDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </h3>
                        <button
                            onClick={() => setViewDate(new Date(currentYear, currentMonth + 1, 1))}
                            className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-1"
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="flex bg-slate-50 rounded-xl border border-slate-200 p-1 shadow-sm">
                        {[0, 1, 2].map((offset) => {
                            const date = new Date(currentYear, currentMonth + (offset - 1), 1);
                            const label = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                            const isCurrent = offset === 1;
                            return (
                                <button 
                                    key={label}
                                    onClick={() => setViewDate(date)}
                                    className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${isCurrent ? 'bg-white text-slate-800 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative z-0">
                    <div className="grid grid-cols-7 border-b border-slate-200 bg-white shrink-0 sticky top-0 z-20">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                            <div key={day} className="py-4 text-center border-r border-slate-100 last:border-0 relative group">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">{day}</span>
                                <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-500 group-hover:w-full transition-all duration-300" />
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 bg-slate-100/40 gap-[1px]">
                        {paddingDays.map((_, i) => (
                            <div key={`padding-${i}`} className="bg-slate-50/30 p-2.5 opacity-40 shadow-inner" />
                        ))}

                        {days.map(day => {
                            const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                            const dayTasks = taskMap[day] || [];
                            const dayKey = `${currentYear}-${currentMonth}-${day}`;
                            const currentSearch = cellSearches[dayKey] || '';
                            const filteredDayTasks = dayTasks.filter(t => t.title.toLowerCase().includes(currentSearch.toLowerCase()));

                            return (
                                <div
                                    key={day}
                                    className={`bg-white p-2.5 flex flex-col min-h-[140px] hover:bg-slate-50 transition-colors duration-200 relative group/cell ${isToday ? 'ring-2 ring-inset ring-blue-500/20 bg-blue-50/5' : ''}`}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        const taskId = e.dataTransfer.getData('taskId');
                                        const isSubTask = e.dataTransfer.getData('isSubTask') === 'true';
                                        if (onTaskUpdate) {
                                            const newDate = new Date(currentYear, currentMonth, day);
                                            const year = newDate.getFullYear();
                                            const month = String(newDate.getMonth() + 1).padStart(2, '0');
                                            const d = String(newDate.getDate()).padStart(2, '0');
                                            onTaskUpdate(taskId, {
                                                startDate: `${year}-${month}-${d}`,
                                                isSubTask
                                            });
                                        }
                                    }}
                                >
                                    <span className={`absolute top-2 right-2 text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-lg transition-all duration-300 z-40 ${isToday ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 ring-2 ring-white' : 'text-slate-400 bg-white/90 backdrop-blur-sm shadow-sm group-hover/cell:text-slate-900 group-hover/cell:bg-white'}`}>
                                        {day}
                                    </span>

                                    <div className="overflow-y-auto max-h-[240px] space-y-1 hide-scrollbar-y pt-7 pr-0.5 relative z-20">
                                        {dayTasks.length > 5 && (
                                            <div className="mb-2 relative px-0.5">
                                                <input 
                                                    type="text"
                                                    value={currentSearch}
                                                    onChange={e => setCellSearches({ ...cellSearches, [dayKey]: e.target.value })}
                                                    placeholder="Search..."
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1 text-[8px] font-bold text-slate-600 outline-none focus:border-blue-300/50 focus:ring-2 focus:ring-blue-500/5 transition-all shadow-sm"
                                                />
                                            </div>
                                        )}
                                        {filteredDayTasks.map(t => {
                                            const dStr = (t.endDate || t.dueDate) ? ((t.endDate || t.dueDate).includes('T') ? (t.endDate || t.dueDate).split('T')[0] : (t.endDate || t.dueDate)) : null;
                                            let isOverdue = false;
                                            if (dStr) {
                                                const [dy, dm, dd] = dStr.split('-').map(Number);
                                                const due = new Date(dy, dm - 1, dd);
                                                isOverdue = due < today && t.status !== 'completed';
                                            }
                                            const accentColor = t.isSubTask ? '#8b5cf6' : (t.status === 'completed' ? '#10b981' : (isOverdue ? '#ef4444' : '#3b82f6'));

                                            return (
                                                <div
                                                    key={t._id || t.id}
                                                    draggable
                                                    onDragStart={(e) => {
                                                        e.dataTransfer.setData('taskId', t._id || t.id);
                                                        e.dataTransfer.setData('isSubTask', t.isSubTask ? 'true' : 'false');
                                                    }}
                                                    onClick={() => onTaskClick && onTaskClick(t)}
                                                    className={`p-1.5 rounded-lg border-l-[3px] shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md hover:scale-[1.01] transition-all relative z-10 group/card ${getStatusColor(t.status, isOverdue)} border border-slate-100/50`}
                                                    style={{ borderLeftColor: accentColor }}
                                                >
                                                    <div className="flex flex-col gap-0">
                                                        <div className="flex items-center justify-between gap-1">
                                                            <span className="text-[10px] font-black underline decoration-2 decoration-transparent group-hover/card:decoration-current transition-all truncate leading-tight flex-1 uppercase">{t.title}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-60 group-hover/card:opacity-100 transition-opacity">
                                                            <UserCheck size={7} className="shrink-0" />
                                                            <span className="text-[8px] font-extrabold truncate uppercase">
                                                                {Array.isArray(t.assignedTo) ? t.assignedTo[0]?.fullName?.split(' ')[0] : (typeof t.assignedTo === 'object' ? t.assignedTo?.fullName?.split(' ')[0] : (t.jobName?.split(' ')[0] || 'Crew'))}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {filteredDayTasks.length === 0 && dayTasks.length > 0 && (
                                            <p className="text-[8px] text-slate-400 font-bold text-center py-2 italic">Nothing found</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {Array.from({ length: Math.max(0, 42 - (paddingDays.length + days.length)) }).map((_, i) => (
                            <div key={`empty-${i}`} className="bg-slate-50/20 p-2.5 border-r border-slate-100 last:border-0" />
                        ))}
                    </div>
                </div>
            </div>

        </>
    );
};

export default CalendarView;
