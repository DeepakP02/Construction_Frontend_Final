import { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus,
  Save, AlertTriangle, Trash2, Edit, Loader, MapPin, Users,
  Clock, CheckCircle, Target, ShieldAlert, Hash, MoreHorizontal,
  LayoutGrid, List, Filter, Search, ChevronDown, Check
} from 'lucide-react';
import Modal from '../../components/Modal';
import api from '../../utils/api';

const EventForm = ({ data, setData, onSubmit, submitLabel, projects, team, isSubmitting }) => (
  <div className="space-y-6">
    <div className="space-y-2">
      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
        <Target size={14} className="text-blue-600" /> Event / Task Title
      </label>
      <input
        type="text"
        required
        value={data.title}
        onChange={e => setData({ ...data, title: e.target.value })}
        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all"
        placeholder="e.g. Foundation Pour - Zone A"
      />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="space-y-2">
        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Active Project</label>
        <select
          required
          value={data.projectId}
          onChange={e => setData({ ...data, projectId: e.target.value })}
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-500 appearance-none"
        >
          <option value="">Select Project</option>
          {projects.map(p => (
            <option key={p._id} value={p._id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Assignee / Crew Lead</label>
        <select
          value={data.assignedTo[0] || ''}
          onChange={e => setData({ ...data, assignedTo: [e.target.value] })}
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-500 appearance-none"
        >
          <option value="">Select Crew Lead</option>
          {team.map(m => (
            <option key={m._id} value={m._id}>{m.fullName}</option>
          ))}
        </select>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <div className="space-y-2">
        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Clock size={14} className="text-emerald-500" /> Start Date
        </label>
        <input
          type="date"
          required
          value={data.startDateTime ? data.startDateTime.split('T')[0] : ''}
          onChange={e => setData({ ...data, startDateTime: e.target.value })}
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-500"
        />
      </div>
      <div className="space-y-2">
        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Clock size={14} className="text-red-500" /> End Date
        </label>
        <input
          type="date"
          required
          value={data.endDateTime ? data.endDateTime.split('T')[0] : ''}
          onChange={e => setData({ ...data, endDateTime: e.target.value })}
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-500"
        />
      </div>
    </div>

    <div className="flex flex-wrap gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100">
      <label className="flex items-center gap-3 px-4 py-2 bg-white rounded-2xl border border-slate-200 cursor-pointer hover:border-blue-500 transition-all">
        <input
          type="checkbox"
          checked={data.isMilestone}
          onChange={e => setData({ ...data, isMilestone: e.target.checked })}
          className="w-5 h-5 text-blue-600 rounded-lg focus:ring-blue-500/20 border-slate-300"
        />
        <span className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
          <Target size={14} className="text-orange-500" /> Milestone
        </span>
      </label>
      <label className="flex items-center gap-3 px-4 py-2 bg-white rounded-2xl border border-slate-200 cursor-pointer hover:border-red-500 transition-all">
        <input
          type="checkbox"
          checked={data.isCritical}
          onChange={e => setData({ ...data, isCritical: e.target.checked })}
          className="w-5 h-5 text-red-600 rounded-lg focus:ring-red-500/20 border-slate-300"
        />
        <span className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
          <ShieldAlert size={14} className="text-red-500" /> Critical Path
        </span>
      </label>
    </div>

    <div className="space-y-2">
      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Additional Notes</label>
      <textarea
        value={data.description}
        onChange={e => setData({ ...data, description: e.target.value })}
        className="w-full bg-slate-100/50 border border-slate-200 rounded-[32px] p-6 font-bold text-slate-800 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all h-32 resize-none shadow-inner"
        placeholder="Scope of work, equipment needed, and special instructions..."
      />
    </div>

    <button
      onClick={onSubmit}
      disabled={isSubmitting}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition shadow-xl shadow-blue-200 flex items-center justify-center gap-3 disabled:opacity-50"
    >
      {isSubmitting ? <Loader size={20} className="animate-spin" /> : <CheckCircle size={20} />}
      {submitLabel}
    </button>
  </div>
);

const Schedule = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
  const [viewMode, setViewMode] = useState('project');
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [projects, setProjects] = useState([]);
  const [team, setTeam] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [schRes, projRes, teamRes] = await Promise.all([
        api.get('/schedules'),
        api.get('/projects'),
        api.get('/auth/users')
      ]);
      setSchedules(schRes.data);
      setProjects(projRes.data);
      const filteredTeam = teamRes.data.filter(user => !['COMPANY_OWNER', 'CLIENT'].includes(user.role));
      setTeam(filteredTeam);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: '', projectId: '', assignedTo: [], startDateTime: '', endDateTime: '', color: 'bg-blue-600', description: '', isMilestone: false, isCritical: false
  });

  const getDaysInMonth = (monthYearString) => {
    const [monthName, year] = monthYearString.split(' ');
    const monthIndex = new Date(Date.parse(monthName + " 1, " + year)).getMonth();
    return new Date(year, monthIndex + 1, 0).getDate();
  };
  const daysInMonth = getDaysInMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const openAddModal = () => {
    setFormData({ title: '', projectId: '', assignedTo: [], startDateTime: '', endDateTime: '', color: 'bg-blue-600', description: '', isMilestone: false, isCritical: false });
    setIsAddOpen(true);
  };

  const handleSaveAdd = async () => {
    try {
      setIsSubmitting(true);
      const cleanedData = { ...formData, assignedTo: formData.assignedTo.filter(id => id && id.length > 0) };
      await api.post('/schedules', cleanedData);
      fetchData();
      setIsAddOpen(false);
    } catch (error) {
      console.error('Error adding event:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openViewModal = (event) => {
    setSelectedEvent(event);
    setIsViewOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      setIsSubmitting(true);
      const cleanedData = { ...formData, assignedTo: formData.assignedTo.filter(id => id && id.length > 0) };
      await api.patch(`/schedules/${selectedEvent._id}`, cleanedData);
      fetchData();
      setIsEditOpen(false);
    } catch (error) {
      console.error('Error editing event:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/schedules/${selectedEvent._id}`);
      fetchData();
      setIsDeleteOpen(false);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Timeline Master</h1>
          <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-widest flex items-center gap-2">
            <CalendarIcon size={14} className="text-blue-600" />
            Gantt oversight and critical path mapping
          </p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-1 flex shadow-sm">
            <button
              onClick={() => setViewMode('project')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'project' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Projects
            </button>
            <button
              onClick={() => setViewMode('resource')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'resource' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Resources
            </button>
          </div>
          <button
            onClick={openAddModal}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-blue-700 transition shadow-xl shadow-blue-200 font-black text-sm uppercase tracking-tight"
          >
            <Plus size={18} /> Schedule Task
          </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200/60 transition-all">
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
          <div className="flex items-center gap-6">
            <div className="flex gap-1">
              <button className="p-3 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-2xl transition-all border border-slate-100 hover:border-blue-100">
                <ChevronLeft size={20} />
              </button>
              <button className="p-3 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-2xl transition-all border border-slate-100 hover:border-blue-100">
                <ChevronRight size={20} />
              </button>
            </div>
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tighter">
              <CalendarIcon size={24} className="text-blue-600" />
              {currentMonth}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-4 bg-slate-50/80 px-4 py-2.5 rounded-2xl border border-slate-100">
              <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCriticalPath}
                  onChange={(e) => setShowCriticalPath(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded focus:ring-red-500 border-slate-300"
                />
                Critical Path
              </label>
              <div className="h-4 w-px bg-slate-200"></div>
              <div className="flex gap-3">
                <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                  <div className="w-2 h-2 rotate-45 bg-orange-500 shadow-sm shadow-orange-200"></div> Milestone
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                  <div className="w-2.5 h-2.5 rounded-sm bg-blue-600 shadow-sm shadow-blue-200"></div> Task
                </span>
              </div>
            </div>
            <button className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-slate-900 rounded-2xl transition-all shadow-sm">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto pb-6 custom-scrollbar rounded-3xl border border-slate-100">
          <div className="min-w-[1200px] relative">
            {/* Days Header */}
            <div className="grid bg-slate-50/50 border-b border-slate-100 sticky top-0 z-20 backdrop-blur-md"
              style={{ gridTemplateColumns: `200px repeat(${daysInMonth}, 1fr)` }}>
              <div className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 bg-white">
                {viewMode === 'project' ? 'Phases & Scope' : 'Site Resources'}
              </div>
              {days.map(d => (
                <div key={d} className="py-4 text-center text-[10px] font-black text-slate-500 border-r border-slate-100 last:border-r-0">
                  {d}
                </div>
              ))}
            </div>

            {/* Chart Body */}
            <div className="relative">
              {!loading && (viewMode === 'project' ? schedules : team).map((item, idx) => {
                const isProjectMode = viewMode === 'project';
                const rowKey = isProjectMode ? item._id : item._id;
                const rowTitle = isProjectMode ? item.title : item.fullName;
                const rowEvents = isProjectMode ? [item] : schedules.filter(e => e.assignedTo?.some(u => u._id === item._id));

                return (
                  <div key={rowKey} className="grid border-b border-slate-50 hover:bg-slate-50/40 transition-colors group"
                    style={{ gridTemplateColumns: `200px repeat(${daysInMonth}, 1fr)` }}>
                    <div className="p-5 text-sm font-black text-slate-900 border-r border-slate-100 flex items-center bg-white sticky left-0 z-10 shadow-[5px_0_10px_-5px_rgba(0,0,0,0.05)]">
                      <div className="flex flex-col gap-1 truncate">
                        <span className="truncate">{rowTitle}</span>
                        {isProjectMode && <span className="text-[9px] text-blue-500 uppercase flex items-center gap-1 font-bold">
                          <Hash size={8} /> {item.projectId?.name || '---'}
                        </span>}
                      </div>
                    </div>
                    <div className="col-span-full col-start-2 relative h-16">
                      {/* Vertical Grid Lines */}
                      <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateColumns: `repeat(${daysInMonth}, 1fr)` }}>
                        {days.map(d => <div key={d} className="border-r border-slate-50 h-full last:border-r-0"></div>)}
                      </div>

                      {/* Event Bars */}
                      {rowEvents.map(event => {
                        const start = new Date(event.startDateTime).getDate();
                        const end = new Date(event.endDateTime).getDate();
                        const isMilestone = event.isMilestone;
                        const isCritical = event.isCritical;

                        return (
                          <div
                            key={event._id}
                            onClick={() => openViewModal(event)}
                            className={`absolute top-4 h-8 rounded-xl shadow-md text-white text-[9px] font-black px-3 flex items-center gap-2 cursor-pointer hover:scale-[1.02] hover:shadow-xl transition-all z-10 uppercase tracking-tighter
                                                            ${isMilestone ? 'w-8 h-8 rotate-45 !rounded-lg flex justify-center p-0 overflow-hidden' : ''}
                                                            ${event.color || 'bg-blue-600'}
                                                            ${showCriticalPath && isCritical ? 'ring-4 ring-red-500/20 border border-red-400' : 'border border-white/20'}
                                                        `}
                            style={{
                              left: isMilestone ? `calc(${(start - 1) * 100 / daysInMonth}% + ${(100 / daysInMonth) / 2}%)` : `calc(${(start - 1) * 100 / daysInMonth}% + 4px)`,
                              width: isMilestone ? '32px' : `calc(${(end - start + 1) * 100 / daysInMonth}% - 8px)`,
                              marginLeft: isMilestone ? '-16px' : '0'
                            }}
                            title={`${event.title} (${event.projectId?.name})`}
                          >
                            {!isMilestone && <span className="truncate drop-shadow-sm">{event.title}</span>}
                            {isCritical && !isMilestone && <ShieldAlert size={10} className="shrink-0" />}
                            {isMilestone && <div className="-rotate-45 shrink-0"><Target size={14} /></div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Timeline Event">
        <EventForm data={formData} setData={setFormData} onSubmit={handleSaveAdd} submitLabel="Deploy to Schedule" projects={projects} team={team} isSubmitting={isSubmitting} />
      </Modal>

      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Timeline Snapshot">
        {selectedEvent && (
          <div className="space-y-8">
            <div className="p-6 bg-slate-50/50 rounded-[32px] border border-slate-100 shadow-inner flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white ${selectedEvent.color || 'bg-blue-600'}`}>
                    {selectedEvent.isMilestone ? 'Milestone' : 'Operational Task'}
                  </span>
                  {selectedEvent.isCritical && (
                    <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-red-100 flex items-center gap-1">
                      <ShieldAlert size={10} /> Critical Path
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{selectedEvent.title}</h3>
                <div className="flex items-center gap-2 text-slate-400 mt-1">
                  <MapPin size={14} />
                  <span className="text-sm font-bold">{selectedEvent.projectId?.name}</span>
                </div>
              </div>
              <div className="w-16 h-16 rounded-3xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <CalendarIcon size={24} className="text-blue-600" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="p-4 bg-white border-2 border-slate-50 rounded-3xl group">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <Users size={12} className="text-blue-500" /> Ownership
                </p>
                <p className="text-sm font-black text-slate-900">
                  {selectedEvent.assignedTo?.map(u => u.fullName).join(', ') || 'Global Access'}
                </p>
              </div>
              <div className="p-4 bg-white border-2 border-slate-50 rounded-3xl group">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <Clock size={12} className="text-emerald-500" /> Timeline
                </p>
                <p className="text-sm font-black text-slate-900">
                  {new Date(selectedEvent.startDateTime).toLocaleDateString()} - {new Date(selectedEvent.endDateTime).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Work Scope & Context</p>
              <div className="bg-white border-2 border-slate-50 rounded-[32px] p-6 shadow-sm">
                <p className="text-sm text-slate-700 font-bold leading-relaxed italic italic-bg">
                  "{selectedEvent.description || "No specific technical instructions provided for this phase."}"
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 mt-4 border-t border-slate-100">
              <button onClick={() => setIsViewOpen(false)} className="w-full sm:w-auto px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">
                Return to Charts
              </button>
              <div className="flex gap-3 w-full sm:w-auto">
                <button onClick={() => { setIsEditOpen(true); setIsViewOpen(false); setFormData({ ...selectedEvent, projectId: selectedEvent.projectId?._id, assignedTo: selectedEvent.assignedTo?.map(u => u._id) || [] }); }}
                  className="flex-1 sm:flex-none px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2">
                  <Edit size={16} /> Edit Phase
                </button>
                <button onClick={() => { setIsDeleteOpen(true); setIsViewOpen(false); }}
                  className="flex-1 sm:flex-none px-6 py-4 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100 flex items-center justify-center gap-2">
                  <Trash2 size={16} /> Archive
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Schedule;
