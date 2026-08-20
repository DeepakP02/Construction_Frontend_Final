import { useState, useEffect } from 'react';
import {
    CloudSun, Sun, CloudRain, Wind, Thermometer,
    Calendar, Search, Filter, Plus, FileText, Image as ImageIcon, Users, Loader, Trash2, Edit,
    MapPin, Clock, ChevronRight, MoreHorizontal, ExternalLink, Hash, Check, LayoutGrid, List, Eye
} from 'lucide-react';
import Modal from '../../components/Modal';
import api, { getServerUrl } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const WeatherIcon = ({ status, size = 20 }) => {
    switch (status) {
        case 'Sunny': return <Sun size={size} className="text-orange-500" />;
        case 'Cloudy': return <CloudSun size={size} className="text-slate-500" />;
        case 'Rainy': return <CloudRain size={size} className="text-blue-500" />;
        case 'Windy': return <Wind size={size} className="text-sky-500" />;
        default: return <Sun size={size} className="text-orange-500" />;
    }
};

const DailyLogs = () => {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const getLocalDateString = () => {
        const d = new Date();
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    };

    const formatSafeDate = (dateString, options) => {
        if (!dateString) return '';
        const parts = dateString.split('T')[0].split('-');
        const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
        return dateObj.toLocaleDateString(undefined, options);
    };

    const [formData, setFormData] = useState({
        date: getLocalDateString(),
        projectId: '',
        weather: { status: 'Sunny', temperature: '' },
        manpower: [{ role: 'General', count: 0, hours: 8 }],
        workPerformed: '',
        location: null
    });
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isCapturingLocation, setIsCapturingLocation] = useState(false);
    const [filters, setFilters] = useState({
        projectId: '',
        date: ''
    });
    const [viewMode, setViewMode] = useState('grid');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);
    const [logToDelete, setLogToDelete] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    const isSubcontractor = user?.role === 'SUBCONTRACTOR';

    const fetchData = async () => {
        try {
            setLoading(true);
            const [logRes, projRes] = await Promise.all([
                api.get('/dailylogs', { params: filters }),
                api.get('/projects')
            ]);
            setLogs(logRes.data);
            setProjects(projRes.data);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filters]);

    const handleCreate = () => {
        setFormData({
            date: getLocalDateString(),
            projectId: '',
            weather: { status: 'Sunny', temperature: '' },
            manpower: [{ role: 'General', count: 0, hours: 8 }],
            workPerformed: '',
            location: null
        });
        setSelectedFiles([]);
        setIsEditing(false);
        setEditId(null);
        setIsModalOpen(true);
    };

    const handleLocationCapture = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        setIsCapturingLocation(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setFormData(prev => ({
                    ...prev,
                    location: { latitude, longitude, address: 'Captured from GPS' }
                }));
                setIsCapturingLocation(false);
            },
            (error) => {
                console.error("Error capturing location:", error);
                alert("Unable to retrieve your location");
                setIsCapturingLocation(false);
            }
        );
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + selectedFiles.length > 5) {
            alert('Maximum 5 photos allowed');
            return;
        }
        setSelectedFiles(prev => [...prev, ...files]);
    };

    const handleView = (log) => {
        setSelectedLog(log);
        setIsViewModalOpen(true);
    };

    const handleEdit = (log) => {
        setFormData({
            date: log.date.split('T')[0],
            projectId: log.projectId?._id || '',
            weather: log.weather || { status: 'Sunny', temperature: '' },
            manpower: log.manpower?.length > 0 ? log.manpower : [{ role: 'General', count: 0, hours: 8 }],
            workPerformed: log.workPerformed || '',
            location: log.location || null
        });
        setIsEditing(true);
        setEditId(log._id);
        setSelectedFiles([]);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const data = new FormData();
            data.append('date', formData.date);
            data.append('projectId', formData.projectId);
            data.append('workPerformed', formData.workPerformed);
            /* data.append('weather', JSON.stringify({
                ...formData.weather,
                temperature: formData.weather.temperature === '' ? null : Number(formData.weather.temperature)
            })); */
            data.append('manpower', JSON.stringify(formData.manpower.map(m => ({
                role: m.role,
                count: parseInt(m.count) || 0,
                hours: parseFloat(m.hours) || 0
            }))));
            
            if (formData.location) {
                data.append('location', JSON.stringify(formData.location));
            }

            selectedFiles.forEach(file => {
                data.append('photos', file);
            });

            if (isEditing) {
                await api.patch(`/dailylogs/${editId}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await api.post('/dailylogs', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            fetchData();
            setIsModalOpen(false);
            setIsEditing(false);
            setEditId(null);
            setSelectedFiles([]);
        } catch (error) {
            console.error('Error saving log:', error);
            alert('Failed to save log. Please check the inputs.');
        }
    };

    const handleDelete = (id) => {
        setLogToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!logToDelete) return;
        try {
            await api.delete(`/dailylogs/${logToDelete}`);
            setLogs(logs.filter(l => l._id !== logToDelete));
            setIsDeleteModalOpen(false);
            setLogToDelete(null);
        } catch (error) {
            console.error('Error deleting log:', error);
        }
    };

    const filteredLogs = logs.filter(log =>
        log.projectId?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.workPerformed.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Daily Site Logs</h1>
                    <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-widest flex items-center gap-2">
                        <FileText size={14} className="text-blue-600" />
                        Track site progress and daily operations
                    </p>
                </div>
                <div className="flex gap-3">
                    {!isSubcontractor && (
                        <button
                            onClick={handleCreate}
                            className="bg-blue-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200 font-black text-sm uppercase tracking-tight"
                        >
                            <Plus size={18} /> New Daily log
                        </button>
                    )}
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search logs by project or content..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 text-sm font-bold text-slate-700 placeholder:text-slate-400"
                    />
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none min-w-[160px]">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                            value={filters.projectId}
                            onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500/50 text-xs font-bold text-slate-600 appearance-none cursor-pointer"
                        >
                            <option value="">All Projects</option>
                            {projects.map(p => (
                                <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative flex-1 md:flex-none">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="date"
                            value={filters.date}
                            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-blue-500/50 text-xs font-bold text-slate-600 cursor-pointer"
                        />
                    </div>
                    {(filters.projectId || filters.date) && (
                        <button
                            onClick={() => setFilters({ projectId: '', date: '' })}
                            className="px-4 py-3 bg-red-50 text-red-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all"
                        >
                            Clear
                        </button>
                    )}
                </div>

                {/* View Toggle */}
                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 ml-auto">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Grid View"
                    >
                        <LayoutGrid size={20} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        title="List View"
                    >
                        <List size={20} />
                    </button>
                </div>
            </div>

            {
                loading ? (
                    <div className="flex flex-col justify-center items-center h-96 gap-4 text-slate-400">
                        <div className="w-16 h-16 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
                        <p className="font-bold uppercase tracking-widest text-xs">Loading logs...</p>
                    </div>
                ) : (
                    viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredLogs.map(log => (
                                <div key={log._id} className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                                    {/* Card Header Illustration/Image Placeholder */}
                                    <div className="h-28 bg-slate-100 relative overflow-hidden">
                                        <img
                                            src={log.photos?.[0] ? getServerUrl(log.photos[0]) : `https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=400`}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            alt="Site"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-transparent"></div>
                                        {log.photos?.length > 1 && (
                                            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-lg backdrop-blur text-xs font-black">
                                                +{log.photos.length - 1} photos
                                            </div>
                                        )}
                                        {log.location && (
                                            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-white/80 backdrop-blur px-2 py-1 rounded-lg border border-white/50 shadow-sm">
                                                <MapPin size={10} className="text-red-500" />
                                                <span className="text-[9px] font-black text-slate-700">GPS Captured</span>
                                            </div>
                                        )}
                                        <div className="absolute top-4 left-4">
                                            <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl border border-white/50 shadow-sm flex items-center gap-2">
                                                <Hash size={12} className="text-blue-600" />
                                                <span className="text-[11px] font-black text-slate-800 truncate max-w-[120px] uppercase tracking-tight">
                                                    {log.projectId?.name || 'Unassigned'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            {!isSubcontractor && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEdit(log); }}
                                                    className="p-2 bg-white/90 backdrop-blur text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                                    title="Edit Log"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleView(log); }}
                                                className="p-2 bg-white/90 backdrop-blur text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                title="View Details"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(log._id); }}
                                                className="p-2 bg-red-50/90 backdrop-blur text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                                title="Delete Log"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-3.5 md:p-4 pt-0 space-y-3.5 flex-1 flex flex-col -mt-3 relative z-10">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 text-slate-400 mb-1">
                                                    <Calendar size={14} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">
                                                        {formatSafeDate(log.date, { weekday: 'long', month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                                <h3 className="text-[15px] md:text-base font-black text-slate-900 tracking-tight leading-none">
                                                    Daily Summary
                                                </h3>
                                            </div>
                                            {/* <div className="flex flex-col items-end">
                                                <WeatherIcon status={log.weather?.status} size={24} />
                                                <span className="text-xs font-black text-slate-800 mt-1">{log.weather?.temperature}°F</span>
                                            </div> */}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pb-3.5 border-b border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                                    <Users size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-900 leading-none">
                                                        {log.manpower?.reduce((acc, m) => acc + m.count, 0) || 0}
                                                    </p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Manpower</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                                    <Clock size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-900 leading-none">
                                                        {log.manpower?.reduce((acc, m) => acc + (m.hours * m.count), 0) || 0}h
                                                    </p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Total Hours</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <Check size={14} className="text-blue-600" />
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Work Performed</span>
                                            </div>
                                            <p className="text-[13px] font-bold text-slate-700 leading-relaxed line-clamp-3 italic bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
                                                "{log.workPerformed}"
                                            </p>
                                        </div>

                                        <div className="pt-3.5 mt-auto border-t border-slate-50 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[10px] font-black text-slate-600">
                                                    {log.reportedBy?.fullName?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-900 leading-none">{log.reportedBy?.fullName || 'Unknown'}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                                                        {log.reportedBy?.role === 'PM' ? 'Project Manager' :
                                                            log.reportedBy?.role === 'FOREMAN' ? 'Site Foreman' : 'Lead Worker'}
                                                    </p>
                                                </div>
                                            </div>
                                            <button className="text-blue-600 hover:text-blue-800 transition-colors">
                                                <ChevronRight size={20} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {filteredLogs.length === 0 && (
                                <div className="col-span-full py-24 flex flex-col items-center justify-center bg-white rounded-[40px] border-2 border-dashed border-slate-200 gap-6">
                                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                                        <FileText size={40} />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="text-xl font-black text-slate-900">No Daily Logs Found</h3>
                                        <p className="text-slate-500 font-bold max-w-xs mx-auto mt-2">
                                            We couldn't find any logs matching your search. Create one to get started.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleCreate}
                                        className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-tight hover:bg-slate-800 transition-all shadow-lg"
                                    >
                                        Create First Log
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Project</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Published By</th>
                                        {/* <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Weather</th> */}
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Team & Time</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLogs.map(log => (
                                        <tr key={log._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-black text-slate-900 leading-none">
                                                    {formatSafeDate(log.date, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                                                    {formatSafeDate(log.date, { weekday: 'short' })}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                    <span className="text-sm font-bold text-slate-700">{log.projectId?.name || 'Unassigned'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 shrink-0">
                                                        {log.reportedBy?.fullName?.charAt(0) || 'U'}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-900 leading-none">
                                                            {log.reportedBy?.fullName || 'Unknown'}
                                                        </p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                                                            {log.reportedBy?.role === 'PM' ? 'Project Manager' :
                                                             log.reportedBy?.role === 'FOREMAN' ? 'Site Foreman' : 'Lead Worker'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <WeatherIcon status={log.weather?.status} size={16} />
                                                    <span className="text-xs font-bold text-slate-600">{log.weather?.temperature}°F</span>
                                                </div>
                                            </td> */}
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-medium text-slate-600 line-clamp-1 max-w-[300px]">
                                                    {log.workPerformed}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-100/50" title="Total Personnel">
                                                        <Users size={12} className="text-blue-600" />
                                                        <span className="text-[11px] font-black text-blue-700">
                                                            {log.manpower?.reduce((acc, m) => acc + (parseInt(m.count) || 0), 0) || 0}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100/50" title="Total Man-hours">
                                                        <Clock size={12} className="text-emerald-600" />
                                                        <span className="text-[11px] font-black text-emerald-700">
                                                            {log.manpower?.reduce((acc, m) => acc + ((parseFloat(m.hours) || 0) * (parseInt(m.count) || 0)), 0) || 0}h
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {!isSubcontractor && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleEdit(log); }}
                                                            className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                                                            title="Edit Log"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleView(log); }}
                                                        className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(log._id); }}
                                                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                                        title="Delete Log"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredLogs.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                                                No logs found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )
                )
            }

            {/* Create/Edit Log Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isEditing ? "Edit Daily Construction Log" : "New Daily Construction Log"}>
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Calendar size={14} className="text-blue-600" /> Log Date
                            </label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                className="w-full bg-slate-100/50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <MapPin size={14} className="text-blue-600" /> Select Project
                            </label>
                            <select
                                value={formData.projectId}
                                onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                                className="w-full bg-slate-100/50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all appearance-none"
                            >
                                <option value="">Select an Active Project</option>
                                {projects.map(p => (
                                    <option key={p._id} value={p._id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100 space-y-6">
                        {/* Site Conditions (Commented out as per client request) */}
                        {/* <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <CloudSun size={14} className="text-orange-500" /> Site Conditions
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <select
                                    value={formData.weather.status}
                                    onChange={e => setFormData({ ...formData, weather: { ...formData.weather, status: e.target.value } })}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-sm outline-none shadow-sm focus:border-blue-500/30 transition-all"
                                >
                                    <option>Sunny</option>
                                    <option>Cloudy</option>
                                    <option>Rainy</option>
                                    <option>Windy</option>
                                    <option>Snowy</option>
                                </select>
                                <div className="relative">
                                    <Thermometer size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="number"
                                        value={formData.weather.temperature}
                                        onChange={e => setFormData({ ...formData, weather: { ...formData.weather, temperature: e.target.value } })}
                                        placeholder="Temp"
                                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 font-bold text-sm outline-none shadow-sm focus:border-blue-500/30 transition-all"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">°F</span>
                                </div>
                            </div>
                        </div> */}

                        <div className="h-px bg-slate-200/60"></div>

                        {/* Team Availability */}
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Users size={14} className="text-blue-600" /> Team Availability
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="relative">
                                    <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="number"
                                        value={formData.manpower[0].count}
                                        onChange={e => {
                                            const newManpower = [...formData.manpower];
                                            newManpower[0].count = e.target.value === '' ? '' : (parseInt(e.target.value) || 0);
                                            setFormData({ ...formData, manpower: newManpower });
                                        }}
                                        placeholder="Count"
                                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 font-bold text-sm outline-none shadow-sm focus:border-blue-500/30 transition-all"
                                    />
                                </div>
                                <div className="relative">
                                    <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="number"
                                        value={formData.manpower[0].hours}
                                        onChange={e => {
                                            const newManpower = [...formData.manpower];
                                            newManpower[0].hours = e.target.value === '' ? '' : (parseFloat(e.target.value) || 0);
                                            setFormData({ ...formData, manpower: newManpower });
                                        }}
                                        placeholder="Hrs"
                                        className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-14 py-2.5 font-bold text-sm outline-none shadow-sm focus:border-blue-500/30 transition-all"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-400 italic">HRS/EA</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Media & Location Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <ImageIcon size={14} className="text-blue-600" /> Photo Upload (Max 5)
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {selectedFiles.map((file, i) => (
                                    <div key={i} className="w-16 h-16 rounded-xl bg-slate-200 overflow-hidden relative group border border-slate-300">
                                        <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="" />
                                        <button 
                                            onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
                                            className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                                {selectedFiles.length < 5 && (
                                    <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 cursor-pointer transition-all">
                                        <Plus size={20} />
                                        <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <MapPin size={14} className="text-red-500" /> Site Location
                            </label>
                            <button
                                onClick={handleLocationCapture}
                                disabled={isCapturingLocation}
                                className={`w-full p-4 rounded-2xl border flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest transition-all
                                    ${formData.location 
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                            >
                                {isCapturingLocation ? (
                                    <>
                                        <Loader size={16} className="animate-spin" /> Capturing...
                                    </>
                                ) : formData.location ? (
                                    <>
                                        <Check size={16} /> Location Captured
                                    </>
                                ) : (
                                    <>
                                        <MapPin size={16} /> Capture GPS Location
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                            <span>Work Performed & Site Notes</span>
                            <span className="text-blue-600 lowercase italic font-medium">Be detailed about delays or safety</span>
                        </label>
                        <textarea
                            rows="6"
                            value={formData.workPerformed}
                            onChange={e => setFormData({ ...formData, workPerformed: e.target.value })}
                            placeholder="Typical work performed today: Started framing for 4th floor, HVAC units delivered, electrician completed rough-in..."
                            className="w-full bg-slate-100/50 border border-slate-200 rounded-3xl p-6 font-bold text-slate-800 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all resize-none shadow-inner"
                        ></textarea>
                    </div>

                    <div className="flex justify-between items-center gap-4 pt-4 border-t border-slate-100">
                        <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!formData.projectId || !formData.workPerformed}
                            className={`px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-tight transition-all shadow-xl flex items-center gap-3
                                ${formData.projectId && formData.workPerformed
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
                        >
                            <Check size={18} /> Complete & Save log
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion">
                <div className="space-y-6">
                    <div className="flex flex-col items-center justify-center py-4 gap-4">
                        <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center text-red-500 shadow-inner">
                            <Trash2 size={40} />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Delete Daily Log?</h3>
                            <p className="text-slate-500 font-bold mt-2 max-w-xs mx-auto text-sm leading-relaxed">
                                This action is permanent and cannot be undone. All data associated with this log will be removed.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-slate-100">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="flex-1 px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all border border-slate-100"
                        >
                            No, Keep it
                        </button>
                        <button
                            onClick={confirmDelete}
                            className="flex-1 bg-red-500 text-white px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl shadow-red-100 flex items-center justify-center gap-2"
                        >
                            <Trash2 size={18} /> Yes, Delete
                        </button>
                    </div>
                </div>
            </Modal>

            {/* View Log Modal */}
            <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Daily Log Details">
                {selectedLog && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-start border-b border-slate-100 pb-5">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                                    {selectedLog.projectId?.name || 'Unassigned Project'}
                                </h3>
                                <div className="flex items-center gap-3 text-slate-500 mt-1">
                                    <Calendar size={14} className="text-blue-600" />
                                    <span className="text-xs font-bold uppercase tracking-widest">
                                        {formatSafeDate(selectedLog.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                            {/* <div className="flex flex-col items-end">
                                <div className="flex items-center gap-2 mb-1">
                                    <WeatherIcon status={selectedLog.weather?.status} size={28} />
                                    <span className="text-xl font-black text-slate-800">{selectedLog.weather?.temperature}°F</span>
                                </div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">
                                    {selectedLog.weather?.status || 'Sunny'} Sky Condition
                                </p>
                            </div> */}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
                            <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                                    <Users size={24} />
                                </div>
                                <div>
                                    <p className="text-lg font-black text-slate-900 leading-none">
                                        {selectedLog.manpower?.reduce((acc, m) => acc + (m.count || 0), 0) || 0} People
                                    </p>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tight mt-1">Team Presence</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
                                    <Clock size={24} />
                                </div>
                                <div>
                                    <p className="text-lg font-black text-slate-900 leading-none">
                                        {selectedLog.manpower?.reduce((acc, m) => acc + ((m.hours || 0) * (m.count || 0)), 0) || 0} Hours
                                    </p>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tight mt-1">Productive Capacity</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <FileText size={14} className="text-blue-600" /> Work Performed & Site Logs
                            </label>
                            <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100 shadow-inner">
                                <p className="text-slate-800 font-bold leading-relaxed whitespace-pre-wrap italic">
                                    "{selectedLog.workPerformed}"
                                </p>
                            </div>
                        </div>

                        {selectedLog.photos?.length > 0 && (
                            <div className="space-y-3">
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <ImageIcon size={14} className="text-blue-600" /> Site Documentation ({selectedLog.photos.length})
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {selectedLog.photos.map((photo, i) => (
                                        <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-slate-200 group relative">
                                            <img
                                                src={getServerUrl(photo)}
                                                className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                                alt={`Site ${i + 1}`}
                                            />
                                            <a 
                                                href={getServerUrl(photo)} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <ExternalLink size={20} className="text-white" />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedLog.location && (
                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center shadow-xs">
                                        <MapPin size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-900 leading-none">GPS Verified Location</p>
                                        <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                                            Lat: {selectedLog.location.latitude?.toFixed(4)}, Lng: {selectedLog.location.longitude?.toFixed(4)}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${selectedLog.location.latitude},${selectedLog.location.longitude}`, '_blank')}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                                >
                                    Open Maps
                                </button>
                            </div>
                        )}

                        <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center text-xs font-black text-slate-600">
                                    {selectedLog.reportedBy?.fullName?.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-900 leading-none">{selectedLog.reportedBy?.fullName}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Reported by Author</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsViewModalOpen(false)}
                                className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-100 transition-transform active:scale-95"
                            >
                                Close View
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div >
    );
};

export default DailyLogs;
