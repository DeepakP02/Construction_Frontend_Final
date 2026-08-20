import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X, Loader, Send, FileQuestion } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/Modal';
import { AlertCircle } from 'lucide-react';

const CreateRFI = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const basePath = window.location.pathname.startsWith('/client-portal') ? '/client-portal' : '/company-admin';

    useEffect(() => {
        if (user?.role === 'CLIENT') {
            navigate(basePath === '/client-portal' ? '/client-portal/rfi' : '/company-admin/rfi');
            return;
        }
    }, [user, navigate, basePath]);

    const [form, setForm] = useState({
        projectId: '',
        subject: '',
        description: '',
        location: '',
        category: 'other',
        priority: 'medium',
        assignedTo: '',
        dueDate: '',
    });
    const [files, setFiles] = useState([]);
    const [errors, setErrors] = useState({});
    const [isSizeLimitModalOpen, setIsSizeLimitModalOpen] = useState(false);
    const [oversizedFile, setOversizedFile] = useState(null);
    const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });

    useEffect(() => {
        Promise.all([api.get('/projects'), api.get('/auth/users')])
            .then(([projRes, userRes]) => {
                setProjects(Array.isArray(projRes.data) ? projRes.data : []);
                const filtered = (Array.isArray(userRes.data) ? userRes.data : [])
                    .filter(u => ['PM', 'COMPANY_OWNER', 'FOREMAN'].includes(u.role));
                setUsers(filtered);
            })
            .catch(console.error);
    }, []);

    const validate = () => {
        const e = {};
        if (!form.projectId) e.projectId = 'Project is required';
        if (!form.subject.trim()) e.subject = 'Subject is required';
        if (!form.description.trim()) e.description = 'Description is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files);
        const MAX_SIZE = 50 * 1024 * 1024; // 50MB
        
        const validFiles = [];
        let foundOversized = null;

        newFiles.forEach(file => {
            if (file.size > MAX_SIZE) {
                foundOversized = file;
            } else {
                validFiles.push(file);
            }
        });

        if (foundOversized) {
            setOversizedFile(foundOversized);
            setIsSizeLimitModalOpen(true);
        }

        setFiles(prev => [...prev, ...validFiles]);
    };

    const removeFile = (idx) => {
        setFiles(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setSubmitting(true);
        try {
            const data = new FormData();
            Object.keys(form).forEach(key => {
                if (form[key]) data.append(key, form[key]);
            });

            files.forEach(file => {
                data.append('files', file);
            });

            const res = await api.post('/rfis', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            navigate(`${basePath}/rfi/${res.data._id}`);
        } catch (err) {
            setErrorModal({ isOpen: true, message: err.response?.data?.message || 'Failed to create RFI' });
        } finally {
            setSubmitting(false);
        }
    };

    const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition";
    const labelClass = "block text-sm font-bold text-slate-700 mb-1.5";
    const errClass = "text-xs text-red-500 mt-1 font-medium";

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition"
                >
                    <ArrowLeft size={18} className="text-slate-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tighter">Create New RFI</h1>
                    <p className="text-slate-500 text-sm">Submit a Request for Information</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Main Card */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
                    <h2 className="font-black text-slate-800 pb-3 border-b border-slate-100 flex items-center gap-2">
                        <FileQuestion size={18} className="text-blue-500" /> RFI Details
                    </h2>

                    {/* Project */}
                    <div>
                        <label className={labelClass}>Project <span className="text-red-500">*</span></label>
                        <select
                            value={form.projectId}
                            onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                            className={`${inputClass} ${errors.projectId ? 'border-red-300' : ''}`}
                        >
                            <option value="">Select Project...</option>
                            {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>
                        {errors.projectId && <p className={errClass}>{errors.projectId}</p>}
                    </div>

                    {/* Subject */}
                    <div>
                        <label className={labelClass}>Subject <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={form.subject}
                            onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                            placeholder="Brief description of the request..."
                            className={`${inputClass} ${errors.subject ? 'border-red-300' : ''}`}
                        />
                        {errors.subject && <p className={errClass}>{errors.subject}</p>}
                    </div>

                    {/* Description */}
                    <div>
                        <label className={labelClass}>Description <span className="text-red-500">*</span></label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            rows={5}
                            placeholder="Detailed description of the information requested..."
                            className={`${inputClass} resize-none ${errors.description ? 'border-red-300' : ''}`}
                        />
                        {errors.description && <p className={errClass}>{errors.description}</p>}
                    </div>

                    {/* Grid: Location + Category */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Location <span className="text-slate-400 font-normal">(Optional)</span></label>
                            <input
                                type="text"
                                value={form.location}
                                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                                placeholder="e.g. Level 3, Grid B-4"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Category <span className="text-slate-400 font-normal">(Optional)</span></label>
                            <select
                                value={form.category}
                                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                className={inputClass}
                            >
                                <option value="design">Design</option>
                                <option value="structural">Structural</option>
                                <option value="mechanical">Mechanical</option>
                                <option value="electrical">Electrical</option>
                                <option value="civil">Civil</option>
                                <option value="safety">Safety</option>
                                <option value="material">Material</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>

                    {/* Grid: Priority + Assign To + Due Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className={labelClass}>Priority</label>
                            <div className="flex gap-2">
                                {['low', 'medium', 'high'].map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setForm(f => ({ ...f, priority: p }))}
                                        className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize border transition ${form.priority === p
                                            ? p === 'high' ? 'bg-red-500 text-white border-red-500 shadow-md'
                                                : p === 'medium' ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                                                    : 'bg-slate-600 text-white border-slate-600 shadow-md'
                                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Assign To</label>
                            <select
                                value={form.assignedTo}
                                onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
                                className={inputClass}
                            >
                                <option value="">Unassigned</option>
                                {users.map(u => (
                                    <option key={u._id} value={u._id}>{u.fullName} ({u.role})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Due Date</label>
                            <input
                                type="date"
                                value={form.dueDate}
                                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                                min={new Date().toISOString().split('T')[0]}
                                className={inputClass}
                            />
                        </div>
                    </div>
                </div>

                {/* Attachments */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h2 className="font-black text-slate-800 pb-3 border-b border-slate-100 mb-4 flex items-center gap-2">
                        <Upload size={18} className="text-blue-500" /> Attachments
                    </h2>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-8 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition group">
                        <Upload size={24} className="text-slate-300 group-hover:text-blue-400 mb-2 transition" />
                        <p className="text-sm font-bold text-slate-500 group-hover:text-blue-600 transition">Click to upload files</p>
                        <p className="text-xs text-slate-400 mt-1">PDF, DWG, Images, etc.</p>
                        <input type="file" multiple className="hidden" onChange={handleFileChange} />
                    </label>
                    {files.length > 0 && (
                        <div className="mt-3 space-y-2">
                            {files.map((f, i) => (
                                <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="text-sm text-slate-700 font-medium truncate">{f.name}</span>
                                    <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500 transition ml-2">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Buttons */}
                <div className="flex gap-3 justify-end">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="px-6 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200 transition disabled:opacity-60"
                    >
                        {submitting ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                        {submitting ? 'Submitting...' : 'Submit RFI'}
                    </button>
                </div>
            </form>
            
            {/* File Size Limit Modal */}
            <Modal 
                isOpen={isSizeLimitModalOpen} 
                onClose={() => setIsSizeLimitModalOpen(false)}
                title="File Too Large"
                maxWidth="max-w-sm"
            >
                <div className="flex flex-col items-center text-center py-4">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle size={32} />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mb-2">Limit Exceeded</h3>
                    <p className="text-slate-500 text-sm font-medium mb-6">
                        The file <span className="text-slate-800 font-bold">"{oversizedFile?.name}"</span> exceeds our 50MB upload limit. 
                        Please upload a smaller version or compress your file.
                    </p>
                    <button
                        onClick={() => setIsSizeLimitModalOpen(false)}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition shadow-lg active:scale-95"
                    >
                        Understood
                    </button>
                </div>
            </Modal>

            {/* Error Modal */}
            <Modal 
                isOpen={errorModal.isOpen} 
                onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
                title="Notice"
                maxWidth="max-w-sm"
            >
                <div className="flex flex-col items-center text-center py-4">
                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle size={32} />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mb-2">Something went wrong</h3>
                    <p className="text-slate-500 text-sm font-medium mb-6">
                        {errorModal.message}
                    </p>
                    <button
                        onClick={() => setErrorModal({ ...errorModal, isOpen: false })}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition shadow-lg active:scale-95"
                    >
                        Okay
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default CreateRFI;
