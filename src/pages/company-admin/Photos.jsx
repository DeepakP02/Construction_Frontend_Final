import { useState, useEffect, useRef } from 'react';
import { Image, MoreVertical, Filter, Download, Plus, X, Trash2, Maximize2, UploadCloud, Loader, Search, Check, ChevronDown } from 'lucide-react';
import api, { getServerUrl } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-scale-in">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h3 className="font-bold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

const SearchableSelect = ({ options, value, onChange, placeholder = "Select Project" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef(null);
    
    const selectedOption = options.find(opt => opt._id === value);
    const filteredOptions = options.filter(opt => 
        opt.name.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-2.5 bg-slate-50 border rounded-lg text-sm flex justify-between items-center cursor-pointer transition-all ${isOpen ? 'border-blue-500 ring-4 ring-blue-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
            >
                <span className={selectedOption ? "text-slate-800 font-medium" : "text-slate-400"}>
                    {selectedOption ? selectedOption.name : "General / None"}
                </span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-[100] mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                    <div className="p-2.5 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                            <input 
                                type="text"
                                autoFocus
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                                placeholder="Search project..."
                            />
                        </div>
                    </div>
                    <div className="max-h-56 overflow-y-auto custom-scrollbar p-1">
                        <div 
                            onClick={() => { onChange(""); setIsOpen(false); setSearch(""); }}
                            className={`px-3 py-2.5 text-sm rounded-lg cursor-pointer flex justify-between items-center transition-colors ${value === "" ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-500 italic'}`}
                        >
                            <span>General / None</span>
                            {value === "" && <Check size={14} className="text-blue-600" />}
                        </div>
                        <div className="h-px bg-slate-100 my-1 mx-2" />
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => (
                                <div 
                                    key={opt._id}
                                    onClick={() => { onChange(opt._id); setIsOpen(false); setSearch(""); }}
                                    className={`px-3 py-2.5 text-sm rounded-lg cursor-pointer flex justify-between items-center transition-colors ${value === opt._id ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-700'}`}
                                >
                                    <span>{opt.name}</span>
                                    {value === opt._id && <Check size={14} className="text-blue-600" />}
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-6 text-xs text-slate-400 text-center font-medium">No projects matching "{search}"</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const Lightbox = ({ photo, onClose, onDelete }) => {
    if (!photo) return null;
    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
            <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition bg-black/50 p-2 rounded-full">
                <X size={24} />
            </button>
            <div className="max-w-4xl w-full flex flex-col items-center">
                <img src={getServerUrl(photo.imageUrl)} alt={photo.description} className="max-h-[80vh] w-auto rounded-lg shadow-2xl object-contain border border-white/10" />
                <div className="mt-4 bg-white/10 backdrop-blur-md rounded-xl p-4 w-full max-w-lg text-white border border-white/20 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg">{photo.description || 'No Description'}</h3>
                        <p className="text-sm text-white/70">{photo.projectId?.name || 'General'} • {new Date(photo.createdAt).toLocaleDateString()}</p>
                        <p className="text-xs text-white/50 mt-1">Uploaded by {photo.uploadedBy?.fullName || 'Unknown'}</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition text-white" title="Download">
                            <Download size={20} />
                        </button>
                        <button onClick={() => onDelete(photo)} className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-200 hover:text-red-100 rounded-lg transition" title="Delete Photo">
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Photos = () => {
    const { user } = useAuth();
    const [photos, setPhotos] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [filterProject, setFilterProject] = useState('All');

    const [uploadData, setUploadData] = useState({ description: '', projectId: '', imageUrl: '', files: [] });
    const [uploading, setUploading] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [photoToDelete, setPhotoToDelete] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [photoRes, projectRes] = await Promise.all([
                api.get('/photos'),
                api.get('/projects')
            ]);
            setPhotos(photoRes.data);
            setProjects(projectRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredPhotos = photos.filter(p => {
        // Role based filtering for subcontractor
        if (user?.role === 'SUBCONTRACTOR') {
            const isOwner = p.uploadedBy?._id === user._id || p.uploadedBy === user._id;
            if (!isOwner) return false;
        }

        // Project filtering
        if (filterProject !== 'All') {
            return p.projectId?._id === filterProject;
        }

        return true;
    });

    const handleUpload = async () => {
        if (uploadData.files.length === 0 && !uploadData.imageUrl) return;
        try {
            setUploading(true);
            const formData = new FormData();
            
            if (uploadData.files.length > 0) {
                uploadData.files.forEach(file => {
                    formData.append('images', file);
                });
            } else if (uploadData.imageUrl) {
                formData.append('imageUrl', uploadData.imageUrl);
            }
            
            formData.append('description', uploadData.description);
            if (uploadData.projectId) {
                formData.append('projectId', uploadData.projectId);
            }

            await api.post('/photos/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            fetchData();
            setUploadData({ description: '', projectId: '', imageUrl: '', files: [] });
            setIsUploadOpen(false);
        } catch (error) {
            console.error('Error uploading photos:', error);
            alert('Error uploading photos. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const removeSelectedFile = (index) => {
        setUploadData(prev => ({
            ...prev,
            files: prev.files.filter((_, i) => i !== index)
        }));
    };

    const handleDelete = (photo) => {
        setPhotoToDelete(photo);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!photoToDelete) return;
        try {
            setUploading(true); // Using uploading state for delete loader too or create separate
            await api.delete(`/photos/${photoToDelete._id}`);
            setPhotos(photos.filter(p => p._id !== photoToDelete._id));
            setSelectedPhoto(null);
            setIsDeleteModalOpen(false);
            setPhotoToDelete(null);
        } catch (error) {
            console.error('Error deleting photo:', error);
            alert('Error deleting photo');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Site Photos</h1>
                    <p className="text-slate-500 text-sm">Centralized gallery for all project documentation.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Filter className="absolute left-3 top-2.5 text-slate-500" size={18} />
                        <select
                            value={filterProject}
                            onChange={(e) => setFilterProject(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-sm focus:outline-none focus:border-blue-500 appearance-none cursor-pointer hover:bg-slate-50 transition min-w-[150px]"
                        >
                            <option value="All">All Projects</option>
                            {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>
                    </div>
                    <button
                        onClick={() => setIsUploadOpen(true)}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition font-medium"
                    >
                        <UploadCloud size={18} /> Upload New
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader className="animate-spin text-blue-600" size={48} />
                </div>
            ) : (
                <>
                    {filteredPhotos.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {filteredPhotos.map((photo) => (
                                <div key={photo._id} className="group relative bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition">
                                    <div className="aspect-square relative overflow-hidden bg-slate-100 cursor-pointer" onClick={() => setSelectedPhoto(photo)}>
                                        <img src={getServerUrl(photo.imageUrl)} alt={photo.description} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <div className="bg-white/90 p-2 rounded-full text-slate-800 hover:text-blue-600 font-bold shadow-lg transform translate-y-4 group-hover:translate-y-0 transition">
                                                <Maximize2 size={20} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-semibold text-slate-800 text-sm truncate pr-2">{photo.description || 'Untitled'}</h4>
                                            <button onClick={() => handleDelete(photo)} className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-50 transition">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <p className="text-xs text-blue-600 font-medium">{photo.projectId?.name || 'General'}</p>
                                        <div className="flex justify-between items-center mt-2 text-xs text-slate-400">
                                            <span>{new Date(photo.createdAt).toLocaleDateString()}</span>
                                            <span>by {photo.uploadedBy?.fullName || '---'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                            <Image size={48} className="mb-2 opacity-20" />
                            <p>No photos found in this gallery.</p>
                        </div>
                    )}
                </>
            )}

            {/* Upload Modal */}
            <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Upload Photo">
                <div className="space-y-4">
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-blue-500 hover:bg-blue-50/50 transition cursor-pointer relative">
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            name="images"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => {
                                const newFiles = Array.from(e.target.files);
                                if (newFiles.length > 0) {
                                    setUploadData(prev => ({ 
                                        ...prev, 
                                        files: [...prev.files, ...newFiles], 
                                        imageUrl: '' 
                                    }));
                                }
                            }}
                        />
                        <UploadCloud size={40} className="mb-2" />
                        <p className="text-sm font-medium">Click to upload or drag & drop</p>
                        <p className="text-[10px]">SVG, PNG, JPG (max. 10 photos)</p>
                    </div>

                    {uploadData.files.length > 0 && (
                        <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar p-1">
                            {uploadData.files.map((file, i) => (
                                <div key={i} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100 animate-in slide-in-from-left-2 duration-200">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <Image size={14} className="text-blue-500 shrink-0" />
                                        <span className="text-xs font-medium text-slate-700 truncate">{file.name}</span>
                                    </div>
                                    <button onClick={() => removeSelectedFile(i)} className="text-slate-400 hover:text-red-500 transition">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Or Image URL (External)</label>
                        <input
                            type="text"
                            value={uploadData.imageUrl}
                            disabled={uploadData.files.length > 0}
                            onChange={e => setUploadData({ ...uploadData, imageUrl: e.target.value, files: [] })}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition disabled:opacity-50"
                            placeholder="https://images.unsplash.com/..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <input
                            type="text"
                            value={uploadData.description}
                            onChange={e => setUploadData({ ...uploadData, description: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition"
                            placeholder="e.g. Site Visit Day 1"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
                        <SearchableSelect 
                            options={projects}
                            value={uploadData.projectId}
                            onChange={(val) => setUploadData({ ...uploadData, projectId: val })}
                        />
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleUpload}
                            disabled={uploading || (uploadData.files.length === 0 && !uploadData.imageUrl)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition shadow-lg shadow-blue-200 flex items-center gap-2 disabled:opacity-50 w-full justify-center"
                        >
                            {uploading ? <Loader className="animate-spin" size={18} /> : <Plus size={18} />}
                            {uploading ? 'Uploading...' : 'Upload Photo'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Lightbox */}
            <Lightbox photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} onDelete={handleDelete} />

            {/* Delete Confirmation Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Photo">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto border border-red-100 shadow-sm">
                        <Trash2 size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Are you sure?</h3>
                        <p className="text-slate-500 text-sm mt-1">
                            You are about to delete <span className="font-bold text-slate-700 italic">"{photoToDelete?.description || 'Untitled Photo'}"</span>. This action cannot be undone.
                        </p>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-sm transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={uploading}
                            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm transition shadow-lg shadow-red-200 flex items-center justify-center gap-2"
                        >
                            {uploading ? <Loader size={18} className="animate-spin" /> : <Trash2 size={18} />}
                            Delete Now
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Photos;
