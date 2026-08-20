import React, { useState, useEffect } from 'react';
import {
    X, AlertTriangle, Save, Loader, Hammer,
    ShieldAlert, Layers, User, Calendar, Image as ImageIcon,
    Clock, Search, Filter, Check, FileText
} from 'lucide-react';
import Modal from '../Modal';

const SearchableSelect = ({ options, value, onChange, placeholder, disabled, mode, error }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const selectedOption = options.find(opt => opt.value === value);
    const filteredOptions = options.filter(opt => 
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (mode === 'view') {
        return (
            <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 text-sm opacity-75">
                {selectedOption ? selectedOption.label : placeholder}
            </div>
        );
    }

    return (
        <div className="relative">
            <div 
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full bg-slate-50 border rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none transition-all text-sm flex justify-between items-center cursor-pointer 
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500'}
                    ${error ? 'border-red-500 ring-4 ring-red-500/5 bg-red-50/30' : 'border-slate-200'}
                `}
            >
                <span className={!selectedOption ? 'text-slate-400' : ''}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <Filter size={14} className={error ? 'text-red-400' : 'text-slate-400'} />
            </div>

            {isOpen && (
                <div className="absolute z-[110] w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
                    <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                type="text"
                                autoFocus
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 transition-all"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto py-2 custom-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => (
                                <div
                                    key={opt.value}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                    className={`px-4 py-3 text-xs font-bold uppercase tracking-tight cursor-pointer transition-colors flex items-center justify-between
                                        ${value === opt.value ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-600'}`}
                                >
                                    {opt.label}
                                    {value === opt.value && <Check size={14} />}
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-6 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                No Results Found
                            </div>
                        )}
                    </div>
                </div>
            )}
            {isOpen && <div className="fixed inset-0 z-[105]" onClick={() => setIsOpen(false)} />}
        </div>
    );
};

const DeficiencyModal = ({
    isOpen,
    onClose,
    onSave,
    initialData = null,
    users = [],
    projectMembers = [],
    currentUser = null,
    isSubmitting = false,
    mode = 'edit' // 'add', 'edit', or 'view'
}) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'work',
        priority: 'medium',
        assignedTo: '',
        status: 'open',
        dueDate: ''
    });

    const [selectedRole, setSelectedRole] = useState('all');
    const [showErrors, setShowErrors] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title || '',
                description: initialData.description || '',
                category: initialData.category || 'work',
                priority: initialData.priority || 'medium',
                assignedTo: initialData.assignedTo?._id || initialData.assignedTo || '',
                status: initialData.status || 'open',
                dueDate: initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '',
                images: initialData.images || [],
                newImages: []
            });
            // Set role filter to match assigned user
            const assignedUser = users.find(u => u._id === (initialData.assignedTo?._id || initialData.assignedTo));
            if (assignedUser) {
                setSelectedRole(assignedUser.role);
            }
        } else {
            setFormData({
                title: '',
                description: '',
                category: 'work',
                priority: 'medium',
                assignedTo: '',
                status: 'open',
                dueDate: '',
                images: [],
                newImages: []
            });
        }
    }, [initialData, isOpen, users]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.title || !formData.assignedTo) {
            setShowErrors(true);
            return;
        }
        setShowErrors(false);
        onSave(formData);
    };

    const categories = [
        { value: 'safety', label: 'Safety Issue', icon: ShieldAlert, color: 'text-red-500' },
        { value: 'work', label: 'Workmanship / Quality', icon: Hammer, color: 'text-blue-500' },
        { value: 'material', label: 'Material Missing', icon: Layers, color: 'text-orange-500' },
        { value: 'other', label: 'Other', icon: AlertTriangle, color: 'text-slate-500' }
    ];

    const priorities = [
        { value: 'low', label: 'Low', color: 'bg-slate-100 text-slate-600' },
        { value: 'medium', label: 'Medium', color: 'bg-blue-50 text-blue-600' },
        { value: 'high', label: 'High', color: 'bg-orange-50 text-orange-600' },
        { value: 'critical', label: 'Critical', color: 'bg-red-600 text-white' }
    ];

    const availableRoles = [
        { value: 'all', label: 'All Roles' },
        { value: 'PM', label: 'Project Manager' },
        { value: 'FOREMAN', label: 'Foreman' },
        { value: 'WORKER', label: 'Worker' },
        { value: 'SUBCONTRACTOR', label: 'Subcontractor' },
    ];

    const filteredUsers = (() => {
        // Core Logic: Worker, Foreman, Subcontractor are ALWAYS project-scoped
        const isRestrictedRole = ['WORKER', 'FOREMAN', 'SUBCONTRACTOR'].includes(selectedRole);
        const isGlobalPMAccess = selectedRole === 'PM' && ['COMPANY_OWNER', 'SUPER_ADMIN'].includes(currentUser?.role);

        if (selectedRole === 'all') {
            // Mix of project members + global PMs if admin
            const pMembers = projectMembers.length > 0 ? projectMembers : users; // Fallback if projectMembers not provided
            const pmGlobal = ['COMPANY_OWNER', 'SUPER_ADMIN'].includes(currentUser?.role) 
                ? users.filter(u => u.role === 'PM') 
                : [];
            
            // Unique set of users
            const combined = [...pMembers];
            pmGlobal.forEach(pm => {
                if (!combined.find(u => u._id === pm._id)) combined.push(pm);
            });
            return combined;
        }

        if (isGlobalPMAccess) {
            return users.filter(u => u.role === 'PM');
        }

        if (isRestrictedRole) {
            return projectMembers.filter(u => u.role === selectedRole);
        }

        // Default role filtering
        return users.filter(u => u.role === selectedRole);
    })();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={mode === 'view' ? "Deficiency Details" : (initialData ? "Edit Deficiency" : "Add New Deficiency")}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        Issue Title <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        disabled={mode === 'view'}
                        value={formData.title}
                        onChange={e => {
                            setFormData({ ...formData, title: e.target.value });
                            if (showErrors) setShowErrors(false);
                        }}
                        className={`w-full bg-slate-50 border rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none transition-all text-sm disabled:opacity-75
                            ${showErrors && !formData.title 
                                ? 'border-red-500 ring-4 ring-red-500/5 bg-red-50/30' 
                                : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5'}
                        `}
                        placeholder="e.g. Incomplete wiring in Unit 4"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            Category
                        </label>
                        <div className="relative">
                            <select
                                value={formData.category}
                                disabled={mode === 'view'}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-500 transition-all text-sm appearance-none custom-select-appearance disabled:opacity-75"
                            >
                                {categories.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            Priority
                        </label>
                        <select
                            value={formData.priority}
                            disabled={mode === 'view'}
                            onChange={e => setFormData({ ...formData, priority: e.target.value })}
                            className={`w-full bg-slate-50 border rounded-2xl px-4 py-3 font-bold outline-none transition-all text-sm appearance-none custom-select-appearance disabled:opacity-75
                        ${formData.priority === 'critical' ? 'border-red-400 text-red-700 bg-red-50' : 'border-slate-200 text-slate-800'}`}
                        >
                            {priorities.map(p => (
                                <option key={p.value} value={p.value}>{p.label} Priority</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            Select Role
                        </label>
                        <select
                            value={selectedRole}
                            disabled={mode === 'view'}
                            onChange={e => setSelectedRole(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-500 transition-all text-sm appearance-none custom-select-appearance disabled:opacity-75"
                        >
                            {availableRoles.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            Assign To
                        </label>
                        <SearchableSelect
                            options={filteredUsers.map(u => ({ value: u._id, label: `${u.fullName} (${u.role})` }))}
                            value={formData.assignedTo}
                            disabled={mode === 'view'}
                            onChange={val => {
                                setFormData({ ...formData, assignedTo: val });
                                if (showErrors) setShowErrors(false);
                            }}
                            error={showErrors && !formData.assignedTo}
                            placeholder="Select Assignee"
                            mode={mode}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            Status
                        </label>
                        <select
                            value={formData.status}
                            disabled={mode === 'view'}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-500 transition-all text-sm appearance-none custom-select-appearance disabled:opacity-75"
                        >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="fixed">Fixed</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            Resolution Deadline
                        </label>
                        <input
                            type="date"
                            disabled={mode === 'view'}
                            value={formData.dueDate}
                            onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-500 transition-all text-sm disabled:opacity-75"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        Description
                    </label>
                    <textarea
                        value={formData.description}
                        disabled={mode === 'view'}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-6 font-bold text-slate-800 outline-none focus:border-blue-500 transition-all h-32 resize-none text-sm disabled:opacity-75"
                        placeholder="Provide technical details for the fix..."
                    />
                </div>

                <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        Photos & Attachments
                    </label>
                    <div className="grid grid-cols-4 lg:grid-cols-5 gap-3">
                        {/* Existing/Selected Images Previews */}
                        {(formData.images || []).map((img, idx) => {
                            const isPdf = typeof img === 'string' && img.toLowerCase().includes('.pdf');
                            return (
                                <div key={`existing-${idx}`} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 group bg-slate-50 cursor-pointer" onClick={() => window.open(img, '_blank')}>
                                    {isPdf ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-red-50 hover:bg-red-100 transition-colors">
                                            <FileText size={24} className="text-red-500" />
                                            <span className="text-[8px] font-black text-red-500 uppercase">PDF</span>
                                        </div>
                                    ) : (
                                        <img src={img} alt="Preview" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    )}
                                    {mode !== 'view' && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFormData({
                                                    ...formData,
                                                    images: formData.images.filter((_, i) => i !== idx)
                                                });
                                            }}
                                            className="absolute top-1 right-1 p-1 bg-white/90 rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-all border border-slate-100 z-10"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
                                </div>
                            );
                        })}
                        {formData.newImages?.map((file, idx) => {
                            const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                            const fileUrl = URL.createObjectURL(file);
                            return (
                                <div key={`new-${idx}`} className="relative aspect-square rounded-2xl overflow-hidden border border-blue-200 bg-blue-50 group cursor-pointer" onClick={() => window.open(fileUrl, '_blank')}>
                                    {isPdf ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-red-50/50 hover:bg-red-100 transition-colors">
                                            <FileText size={24} className="text-red-500" />
                                            <span className="text-[8px] font-black text-red-500 uppercase">PDF</span>
                                        </div>
                                    ) : (
                                        <img src={fileUrl} alt="Preview" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all group-hover:scale-110 duration-500" />
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <Clock size={16} className="text-blue-600 animate-pulse" />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFormData({
                                                ...formData,
                                                newImages: formData.newImages.filter((_, i) => i !== idx)
                                            });
                                        }}
                                        className="absolute top-1 right-1 p-1 bg-white/90 rounded-lg text-red-500 opacity-0 group-hover:opacity-100 transition-all z-10"
                                    >
                                        <X size={12} />
                                    </button>
                                    <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-colors pointer-events-none" />
                                </div>
                            );
                        })}

                        {/* Add Button */}
                        {mode !== 'view' && (
                            <label className="relative aspect-square rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer transition-all flex flex-col items-center justify-center gap-1 group">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*,application/pdf"
                                    onChange={(e) => {
                                        if (e.target.files) {
                                            const files = Array.from(e.target.files);
                                            setFormData({
                                                ...formData,
                                                newImages: [...(formData.newImages || []), ...files]
                                            });
                                        }
                                    }}
                                    className="hidden"
                                />
                                <ImageIcon size={20} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                <span className="text-[8px] font-black text-slate-400 group-hover:text-blue-600 uppercase">Attach</span>
                            </label>
                        )}
                    </div>
                </div>

                {mode !== 'view' && (
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader size={20} className="animate-spin" /> : <Save size={20} />}
                            {initialData ? "Update Deficiency" : "Save Deficiency"}
                        </button>
                    </div>
                )}
            </form>
        </Modal>
    );
};

export default DeficiencyModal;
