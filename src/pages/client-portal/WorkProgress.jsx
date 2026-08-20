import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Activity, CheckCircle2, Clock, Calendar,
    ArrowLeft, ChevronRight, ListChecks, 
    MessageSquare, Loader, FileQuestion, ArrowUpRight
} from 'lucide-react';
import api from '../../utils/api';

const WorkProgress = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('activity');
    const [progressData, setProgressData] = useState(null);
    const [updates, setUpdates] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [rfis, setRfis] = useState([]);

    useEffect(() => {
        const fetchProgress = async () => {
            try {
                setLoading(true);
                const [progRes, updateRes, taskRes, rfiRes] = await Promise.all([
                    api.get(`/projects/${projectId}/client-progress`),
                    api.get(`/projects/${projectId}/client-updates`),
                    api.get(`/tasks/project/${projectId}`),
                    api.get(`/rfis?projectId=${projectId}`)
                ]);
                setProgressData(progRes.data);
                setUpdates(updateRes.data);
                setTasks(taskRes.data || []);
                setRfis((rfiRes.data || []).filter(rfi => rfi.raisedBy?.role !== 'SUBCONTRACTOR'));
            } catch (err) {
                console.error('Error fetching progress:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProgress();
    }, [projectId]);

    // Calculate Task Statistics
    const taskStats = useMemo(() => {
        const stats = {
            total: tasks.length,
            completed: tasks.filter(t => t.status === 'completed' || t.status === 'Done').length,
            pending: tasks.filter(t => t.status === 'in_progress' || t.status === 'Active' || t.status === 'pending').length,
            planning: tasks.filter(t => t.status === 'planning' || !t.status).length
        };
        return stats;
    }, [tasks]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-40">
                <div className="flex flex-col items-center gap-4">
                    <Loader size={40} className="text-blue-600 animate-spin" />
                    <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Analyzing Progress...</p>
                </div>
            </div>
        );
    }

    if (!progressData) return <div className="p-20 text-center font-bold text-slate-400">Project details not found.</div>;

    const statusColors = {
        active: 'text-emerald-500 bg-emerald-50 border-emerald-100',
        planning: 'text-blue-500 bg-blue-50 border-blue-100',
        on_hold: 'text-orange-500 bg-orange-50 border-orange-100',
        completed: 'text-indigo-500 bg-indigo-50 border-indigo-100'
    };

    return (
        <div className="w-full space-y-8 md:space-y-12 pb-20 animate-fade-in px-4 md:px-8 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="w-full">
                    <button
                        onClick={() => navigate('/client-portal/projects')}
                        className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors mb-4"
                    >
                        <ArrowLeft size={12} /> Back to Projects
                    </button>
                    <div className="flex flex-wrap items-center gap-4">
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                            {progressData.projectName}
                        </h1>
                        <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full border shadow-sm ${statusColors[progressData.status] || 'bg-slate-50 text-slate-500'}`}>
                            {progressData.status?.replace('_', ' ')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Metrics Dashboard Row */}
            <div className="bg-white rounded-[32px] md:rounded-[40px] p-2 border border-slate-100 shadow-sm overflow-x-auto scrollbar-hide">
                <div className="flex items-center gap-2 min-w-max">
                    {/* Start Date */}
                    <div className="flex-1 min-w-[180px] p-6 md:p-8 flex flex-col items-center justify-center gap-3 border-r border-slate-50">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
                            <Calendar size={18} />
                        </div>
                        <div className="text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Start Date</p>
                            <p className="text-sm font-black text-slate-900">
                                {progressData.startDate ? new Date(progressData.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                            </p>
                        </div>
                    </div>

                    {/* End Date */}
                    <div className="flex-1 min-w-[180px] p-6 md:p-8 flex flex-col items-center justify-center gap-3 border-r border-slate-50">
                        <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500">
                            <Calendar size={18} />
                        </div>
                        <div className="text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">End Date</p>
                            <p className="text-sm font-black text-slate-900">
                                {progressData.endDate ? new Date(progressData.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                            </p>
                        </div>
                    </div>

                    {/* Budget */}
                    <div className="flex-1 min-w-[180px] p-6 md:p-8 flex flex-col items-center justify-center gap-3 border-r border-slate-50">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                            <span className="text-lg font-black">$</span>
                        </div>
                        <div className="text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Project Budget</p>
                            <p className="text-sm font-black text-slate-900">
                                ${progressData.budget?.toLocaleString() || '0'}
                            </p>
                        </div>
                    </div>

                    {/* Total Tasks */}
                    <div className="flex-1 min-w-[180px] p-6 md:p-8 flex flex-col items-center justify-center gap-3 border-r border-slate-50">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                            <ListChecks size={18} />
                        </div>
                        <div className="text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Tasks</p>
                            <p className="text-sm font-black text-slate-900">{taskStats.total}</p>
                        </div>
                    </div>

                    {/* Pending Tasks */}
                    <div className="flex-1 min-w-[180px] p-6 md:p-8 flex flex-col items-center justify-center gap-3 border-r border-slate-50">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                            <Clock size={18} />
                        </div>
                        <div className="text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">In Progress</p>
                            <p className="text-sm font-black text-slate-900">{taskStats.pending}</p>
                        </div>
                    </div>

                    {/* Completed Tasks */}
                    <div className="flex-1 min-w-[180px] p-6 md:p-8 flex flex-col items-center justify-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                            <CheckCircle2 size={18} />
                        </div>
                        <div className="text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Completed</p>
                            <p className="text-sm font-black text-slate-900">{taskStats.completed}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-col gap-8">
                <div className="flex items-center gap-4 p-1.5 bg-slate-100/50 w-fit rounded-2xl border border-slate-100">
                    <button 
                        onClick={() => setActiveTab('activity')}
                        className={`flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                            ${activeTab === 'activity' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <MessageSquare size={14} />
                        Recent Site Activity
                    </button>
                    <button 
                        onClick={() => setActiveTab('tasks')}
                        className={`flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                            ${activeTab === 'tasks' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <ListChecks size={14} />
                        Project Deliverables & Tasks
                    </button>
                    <button 
                        onClick={() => setActiveTab('rfis')}
                        className={`flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                            ${activeTab === 'rfis' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <FileQuestion size={14} />
                        Project RFIs
                    </button>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'activity' ? (
                        <div className="space-y-8">
                            <div className="relative space-y-8 before:absolute before:left-5 md:before:left-8 before:top-4 before:bottom-0 before:w-[2px] before:bg-slate-100">
                                {updates.length > 0 ? (
                                    updates.map((update) => (
                                        <div key={update._id} className="relative pl-12 md:pl-24 group">
                                            <div className="absolute left-1.5 md:left-4 top-2 w-7 h-7 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-white border-[3px] md:border-4 border-blue-600 shadow-lg group-hover:scale-110 transition-transform flex items-center justify-center text-blue-600 z-10">
                                                <Calendar size={14} className="md:w-[18px] md:h-[18px]" />
                                            </div>
                                            <div className="bg-white rounded-[32px] p-6 md:p-10 border border-slate-100 shadow-sm hover:shadow-md transition-all">
                                                <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4 md:mb-6">
                                                    <h4 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight">{update.title}</h4>
                                                    <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 h-fit w-fit uppercase tracking-tighter">
                                                        {new Date(update.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                <p className="text-slate-500 font-medium leading-relaxed text-sm md:text-base">{update.description}</p>

                                                {update.images && update.images.length > 0 && (
                                                    <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                        {update.images.map((img, i) => (
                                                            <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-slate-100 shadow-sm group/img">
                                                                <img src={img} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-700" alt="Activity" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="bg-slate-50/50 rounded-[40px] p-20 border-2 border-dashed border-slate-100 text-center flex flex-col items-center justify-center gap-6">
                                        <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-200">
                                            <Loader size={40} className="animate-spin-slow" />
                                        </div>
                                        <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">No site updates have been posted yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : activeTab === 'tasks' ? (
                        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Task Details</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {(() => {
                                            const buildTree = (items) => {
                                                const itemMap = {};
                                                items.forEach(item => {
                                                    itemMap[item._id] = { ...item, children: [] };
                                                });

                                                const roots = [];
                                                items.forEach(item => {
                                                    const node = itemMap[item._id];
                                                    let parentId = item.parentTaskId || item.parentSubTaskId || (item.isSubTask ? item.taskId : null);
                                                    if (parentId && itemMap[parentId]) {
                                                        itemMap[parentId].children.push(node);
                                                    } else {
                                                        roots.push(node);
                                                    }
                                                });
                                                return roots;
                                            };

                                            const taskTree = buildTree(tasks);

                                            const RenderTaskRow = ({ node, depth = 0 }) => {
                                                const [expanded, setExpanded] = useState(depth < 1);
                                                const hasChildren = node.children && node.children.length > 0;

                                                return (
                                                    <>
                                                        <tr className={`hover:bg-slate-50/30 transition-colors ${depth > 0 ? 'bg-slate-50/5' : ''}`}>
                                                            <td className="px-8 py-6">
                                                                <div className="flex items-center gap-4" style={{ paddingLeft: `${depth * 32}px` }}>
                                                                    {hasChildren ? (
                                                                        <button onClick={() => setExpanded(!expanded)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-all">
                                                                            <ChevronRight size={14} className={`transition-transform duration-300 ${expanded ? 'rotate-90' : ''}`} />
                                                                        </button>
                                                                    ) : (
                                                                        <div className="w-8" />
                                                                    )}
                                                                    <div className="flex flex-col gap-1">
                                                                        <span className={`text-base font-black ${depth === 0 ? 'text-slate-800' : 'text-slate-600'}`}>
                                                                            {node.title}
                                                                        </span>
                                                                        {node.dueDate && depth === 0 && (
                                                                            <span className="text-[9px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                                                                                <Calendar size={12} className="text-blue-500" /> Target: {new Date(node.dueDate).toLocaleDateString()}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <span className={`text-[8px] font-black px-3 py-1 rounded-full border uppercase tracking-widest
                                                                    ${node.priority === 'High' ? 'bg-red-50 text-red-500 border-red-100' : 
                                                                      node.priority === 'Medium' ? 'bg-orange-50 text-orange-500 border-orange-100' : 
                                                                      'bg-blue-50 text-blue-500 border-blue-100'}`}>
                                                                    {node.priority}
                                                                </span>
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                        <div className="h-full bg-blue-600 transition-all duration-700" style={{ width: `${node.progress || 0}%` }} />
                                                                    </div>
                                                                    <span className="text-[10px] font-black text-slate-500">{node.progress || 0}%</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6 text-right">
                                                                <span className={`text-[9px] font-black px-4 py-2 rounded-xl border uppercase tracking-[0.1em]
                                                                    ${node.status === 'completed' || node.status === 'Done' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                                      node.status === 'in_progress' || node.status === 'Active' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                                                      'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                                                    {node.status?.replace('_', ' ')}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                        {expanded && hasChildren && node.children.map(child => (
                                                            <RenderTaskRow key={child._id} node={child} depth={depth + 1} />
                                                        ))}
                                                    </>
                                                );
                                            };

                                            return taskTree.length > 0 ? (
                                                taskTree.map((task) => <RenderTaskRow key={task._id} node={task} />)
                                            ) : (
                                                <tr>
                                                    <td colSpan="4" className="px-8 py-20 text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                                                        No deliverables found for this project.
                                                    </td>
                                                </tr>
                                            );
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <FileQuestion size={18} className="text-violet-600" />
                                    Project RFIs Summary
                                </h3>
                                <button 
                                    onClick={() => navigate('/client-portal/rfi')}
                                    className="text-[10px] font-black text-violet-600 bg-violet-50 px-4 py-2 rounded-xl border border-violet-100 uppercase tracking-widest hover:bg-violet-600 hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
                                >
                                    View All RFIs <ArrowUpRight size={12} />
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">RFI #</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Raised By</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Created Date</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Updated</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {rfis.length > 0 ? (
                                            rfis.map((rfi) => (
                                                <tr key={rfi._id} className="hover:bg-slate-50/30 transition-colors">
                                                    <td className="px-8 py-6">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-base font-black text-slate-800">{rfi.subject || rfi.title}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{rfi.rfiNumber}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[10px]">
                                                                {rfi.raisedBy?.fullName?.charAt(0)}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[11px] font-black text-slate-700">{rfi.raisedBy?.fullName}</span>
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase">{rfi.raisedBy?.role}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className="text-[11px] font-bold text-slate-500">
                                                            {new Date(rfi.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className="text-[11px] font-bold text-slate-500">
                                                            {new Date(rfi.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className={`text-[8px] font-black px-3 py-1 rounded-full border uppercase tracking-widest
                                                            ${rfi.priority === 'high' ? 'bg-red-50 text-red-500 border-red-100' : 
                                                              rfi.priority === 'medium' ? 'bg-orange-50 text-orange-500 border-orange-100' : 
                                                              'bg-blue-50 text-blue-500 border-blue-100'}`}>
                                                            {rfi.priority}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <span className={`text-[9px] font-black px-4 py-2 rounded-xl border uppercase tracking-[0.1em]
                                                            ${rfi.status === 'closed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                              rfi.status === 'open' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                                              rfi.status === 'answered' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                              'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                                            {rfi.status?.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="px-8 py-20 text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                                                    No RFIs recorded for this project.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WorkProgress;
