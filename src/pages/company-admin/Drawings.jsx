import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FileText, Eye, Download, Search, Filter, Upload, Trash2, X, Save, AlertTriangle, CheckCircle, Loader, File, Send, Check, ChevronDown } from 'lucide-react';
import api, { getServerUrl } from '../../utils/api';
import DrawingViewer from './DrawingViewer';
import emailjs from '@emailjs/browser';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-scale-in border border-white/20">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
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

const SearchableSelect = ({ options, value, onChange }) => {
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
        className={`w-full px-4 py-2.5 bg-slate-50 border rounded-lg text-sm flex justify-between items-center cursor-pointer transition-all ${isOpen ? 'border-blue-500 ring-4 ring-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
      >
        <span className={selectedOption ? "text-slate-800 font-medium" : "text-slate-400"}>
          {selectedOption ? selectedOption.name : "Select Project"}
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
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 transition-all"
                placeholder="Search project..."
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto custom-scrollbar p-1">
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

const Drawings = () => {
  const { user } = useAuth();
  const canManage = ['COMPANY_OWNER', 'PM'].includes(user?.role);

  const [searchParams, setSearchParams] = useSearchParams();
  const projectFilter = searchParams.get('projectId');

  const [drawings, setDrawings] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDiscipline, setFilterDiscipline] = useState('All Disciplines');
  const [filterProject, setFilterProject] = useState(projectFilter || 'All Projects');

  // Modal States
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isFullViewerOpen, setIsFullViewerOpen] = useState(false);
  const [isDistributionOpen, setIsDistributionOpen] = useState(false);
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });
  const [warningMessage, setWarningMessage] = useState({ title: '', message: '' });

  const [trades, setTrades] = useState([]);
  const [selectedTrades, setSelectedTrades] = useState([]);
  const [tradeCategoryFilter, setTradeCategoryFilter] = useState('All');

  const [selectedDrawing, setSelectedDrawing] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [formData, setFormData] = useState({
    projectId: '', title: '', drawingNumber: '', category: '', file: null
  });

  const fetchDrawings = async () => {
    try {
      const res = await api.get('/drawings');
      setDrawings(res.data);
    } catch (err) {
      console.error('Error fetching drawings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [drwRes, projRes, tradeRes] = await Promise.all([
        api.get('/drawings'),
        api.get('/projects'),
        api.get('/vendors?status=active')
      ]);
      setDrawings(drwRes.data);
      setProjects(projRes.data);
      setTrades(tradeRes.data);
    } catch (error) {
      console.error('Error fetching drawing data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Derived State (Filtering)
  const filteredDrawings = drawings.filter(drawing => {
    const matchesSearch = drawing.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDiscipline = filterDiscipline === 'All Disciplines' || drawing.category === filterDiscipline.toLowerCase();
    const matchesProject = filterProject === 'All Projects' || (typeof drawing.projectId === 'object' ? drawing.projectId?._id === filterProject : drawing.projectId === filterProject);
    return matchesSearch && matchesDiscipline && matchesProject;
  });

  // Handlers
  const handleUploadClick = () => {
    setFormData({ projectId: '', title: '', drawingNumber: '', category: '', file: null });
    setIsUploadOpen(true);
  };

  const handleSaveUpload = async () => {
    try {
      if (!formData.file || !formData.projectId) {
        alert('Please select a project and a file');
        return;
      }

      // Check file size (25MB limit)
      const MAX_SIZE = 25 * 1024 * 1024; // 25MB
      if (formData.file.size > MAX_SIZE) {
        setWarningMessage({
          title: 'File Too Large!',
          message: `Your file size is too large (${(formData.file.size / (1024 * 1024)).toFixed(2)} MB). Please upload a file smaller than 25 MB to ensure compatibility.`
        });
        setIsWarningOpen(true);
        return;
      }

      setLoading(true);
      const data = new FormData();
      data.append('projectId', formData.projectId);
      data.append('title', formData.title);
      data.append('drawingNumber', formData.drawingNumber);
      data.append('category', formData.category);
      data.append('file', formData.file);

      await api.post('/drawings', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      await fetchDrawings();
      setIsUploadOpen(false);
      setSuccessMessage({
        title: 'Drawing Uploaded!',
        message: `"${formData.title}" has been successfully added to the project repository.`
      });
      setIsSuccessOpen(true);
    } catch (error) {
      console.error('Error uploading drawing:', error);
      alert('Failed to upload drawing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleView = (drawing) => {
    const latestVersion = drawing.versions?.[drawing.versions.length - 1];
    setSelectedDrawing(drawing);
    setSelectedVersion(latestVersion);
    setIsFullViewerOpen(true);
  };

  const handleDelete = (drawing) => {
    setSelectedDrawing(drawing);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    const drawingId = selectedDrawing._id;
    try {
      setIsDeleteOpen(false);
      // Optimistic Update: Remove from list immediately
      setDrawings(prev => prev.filter(d => d._id !== drawingId));
      
      await api.delete(`/drawings/${drawingId}`);
      // Notification is enough, data is already updated locally
      // but we call fetchDrawings in background to stay in sync
      fetchDrawings();
    } catch (error) {
      console.error('Error deleting drawing:', error);
      alert('Failed to delete drawing');
      fetchDrawings(); // Revert on failure
    }
  };

  const handleSendToTrade = (drawing) => {
    setSelectedDrawing(drawing);
    setSelectedTrades([]);
    setIsDistributionOpen(true);
  };

  const confirmSend = async () => {
    if (selectedTrades.length === 0) return alert('Select at least one trade');
    try {
      setLoading(true);

      // 1. Backend update for status tracking
      await api.post('/vendors/send-drawing', {
        drawingId: selectedDrawing._id,
        vendorIds: selectedTrades
      });

      // 2. EmailJS Logic
      const selectedTradeData = trades.filter(t => selectedTrades.includes(t._id));

        const fetchedCompany = selectedDrawing?.companyId || user?.companyId;
        const publicLogoUrl = (typeof fetchedCompany === 'object' && fetchedCompany?.logo) 
          ? getServerUrl(fetchedCompany.logo) 
          : "https://img.icons8.com/color/96/ring.png";

        const emailPromises = selectedTradeData.map(trade => {
          const templateParams = {
            to_email: trade.email,
            trade_name: trade.name,
            drawing_title: selectedDrawing.title,
            project_name: selectedDrawing.projectId?.name || 'Construction Project',
            title: selectedDrawing.title, // Contact Us: {{title}}
            name: user?.fullName || 'Company Admin', // Maps to {{name}} in your screenshot
            email: user?.email || 'admin@kaal.com', // Maps to {{email}} in your screenshot
            logoUrl: publicLogoUrl, // Maps to {{logoUrl}}
            download_link: getServerUrl(selectedDrawing.versions?.[selectedDrawing.versions.length - 1]?.fileUrl),
            bid_link: `${window.location.origin}/submit-bid/${selectedDrawing._id}?vendorId=${trade._id}`
          };

        // Note: Please replace these with your actual IDs from EmailJS Dashboard
        return emailjs.send(
          'service_nwnykea', // Your Service ID
          'template_zfy7qdu', // Your Template ID
          templateParams,
          'Vr5-H0-BgfNboKu2q' // Your Public Key
        );
      });

      await Promise.all(emailPromises);

      setIsDistributionOpen(false);
      setSuccessMessage({
        title: 'Distribution Complete!',
        message: `Drawings have been dispatched to ${selectedTrades.length} trades via email successfully.`
      });
      setIsSuccessOpen(true);
    } catch (error) {
      console.error('Error sending drawing:', error);
      alert('Failed to send emails. Make sure your EmailJS IDs are correct.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (drawing) => {
    const latestVersion = drawing.versions?.[drawing.versions.length - 1];
    const fileUrl = latestVersion?.fileUrl;

    if (fileUrl) {
      try {
        setLoading(true);
        const fullUrl = getServerUrl(fileUrl);
        const response = await fetch(fullUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const extension = fileUrl.substring(fileUrl.lastIndexOf('.'));
        link.setAttribute('download', `${drawing.title}_v${drawing.currentVersion}${extension}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Download error:', error);
        // Fallback to old method if fetch fails
        window.open(getServerUrl(fileUrl), '_blank');
      } finally {
        setLoading(false);
      }
    } else {
      alert(`No file available for this drawing.`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Drawings & Blueprints</h1>
          <p className="text-slate-500 text-sm">Manage latest revisions and architectural plans.</p>
        </div>
        {canManage && (
          <button
            onClick={handleUploadClick}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center gap-2 transition"
          >
            <Upload size={18} /> Upload Revision
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-50 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search drawings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-lg text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
          <select
            value={filterProject}
            onChange={(e) => {
              setFilterProject(e.target.value);
              if (e.target.value === 'All Projects') {
                searchParams.delete('projectId');
              } else {
                searchParams.set('projectId', e.target.value);
              }
              setSearchParams(searchParams);
            }}
            className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
          >
            <option>All Projects</option>
            {projects.map(p => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>

          <select
            value={filterDiscipline}
            onChange={(e) => setFilterDiscipline(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
          >
            <option>All Disciplines</option>
            <option>Architectural</option>
            <option>Structural</option>
            <option>Electrical</option>
            <option>Plumbing</option>
            <option>Landscape</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Drawing Name</th>
                <th className="px-6 py-4 whitespace-nowrap">Project</th>
                <th className="px-6 py-4 whitespace-nowrap">Category</th>
                <th className="px-6 py-4 whitespace-nowrap">Date</th>
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <Loader className="animate-spin text-blue-600 mx-auto" />
                  </td>
                </tr>
              ) : filteredDrawings.length > 0 ? (
                filteredDrawings.map((drawing) => (
                  <tr key={drawing._id} className="border-b border-slate-50 hover:bg-slate-50 transition group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition border border-slate-100 shadow-sm">
                          {drawing.versions?.[drawing.versions.length - 1]?.fileUrl?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                            <img
                              src={getServerUrl(drawing.versions[drawing.versions.length - 1].fileUrl)}
                              alt={drawing.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FileText size={20} />
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-800 block">{drawing.title}</span>
                          <span className="text-xs text-slate-400 uppercase tracking-tighter font-bold">{drawing.category} • {drawing.drawingNumber || 'No #'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">{drawing.projectId?.name || '---'}</td>
                    <td className="px-6 py-4 font-bold text-slate-700 capitalize">{drawing.category || '---'}</td>
                    <td className="px-6 py-4">{new Date(drawing.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase inline-flex items-center gap-1
                        ${drawing.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                          drawing.status === 'superseded' ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-100 text-slate-600'}`}>
                        {drawing.status === 'active' && <CheckCircle size={10} />}
                        {drawing.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 text-blue-600">
                        <button onClick={() => handleDownload(drawing)} className="p-2 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100" title="Download Drawing">
                          <Download size={18} />
                        </button>
                        <button onClick={() => handleView(drawing)} className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100" title="View Details">
                          <Eye size={18} />
                        </button>
                        <button onClick={() => handleSendToTrade(drawing)} className="p-2 text-violet-600 hover:bg-violet-50 rounded-lg transition-colors border border-transparent hover:border-violet-100" title="Send to Trade">
                          <Send size={18} />
                        </button>
                        {canManage && (
                          <button onClick={() => handleDelete(drawing)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100" title="Delete">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                    No drawings found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}

      {/* Upload Modal */}
      <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Upload New Revision">
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition cursor-pointer relative">
            <input
              type="file"
              accept=".pdf,.dwg,.dxf"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setFormData({ ...formData, file: file, name: file.name });
                }
              }}
            />
            <Upload className="mx-auto text-slate-400 mb-2" size={32} />
            {formData.file ? (
              <div>
                <p className="text-sm font-bold text-blue-600 truncate px-4">{formData.file.name}</p>
                <p className="text-xs text-slate-500">{(formData.file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-600">Click to upload or drag and drop</p>
                <p className="text-xs text-slate-400">PDF, DWG, DXF up to 10MB</p>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
            <SearchableSelect 
              options={projects}
              value={formData.projectId}
              onChange={(val) => setFormData({ ...formData, projectId: val })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Drawing Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 transition"
              placeholder="e.g. First Floor Plan"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Drawing Number</label>
              <input
                type="text"
                value={formData.drawingNumber}
                onChange={e => setFormData({ ...formData, drawingNumber: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 transition"
                placeholder="e.g. A-101"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 transition"
                placeholder="e.g. Architectural, Structural, etc."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 transition"
            >
              <option>Draft</option>
              <option>In Review</option>
              <option>Approved</option>
            </select>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSaveUpload}
              disabled={loading}
              className={`bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition shadow-lg shadow-blue-200 flex items-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? <Loader className="animate-spin" size={18} /> : <Save size={18} />}
              {loading ? 'Uploading...' : 'Upload Drawing'}
            </button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Drawing Details">
        {selectedDrawing && (
          <div className="space-y-6">
            <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center gap-4">
              <div className="w-14 h-14 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-blue-600">
                <FileText size={28} />
              </div>
              <div className="overflow-hidden">
                <h4 className="font-extrabold text-slate-800 text-lg leading-tight truncate">{selectedDrawing.title}</h4>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                  {selectedDrawing.drawingNumber || 'NO #'} • {selectedDrawing.category}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-sm">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Project</p>
                <p className="font-bold text-slate-700">{selectedDrawing.projectId?.name || '---'}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Current Version</p>
                <p className="font-bold text-slate-700 text-blue-600">v{selectedDrawing.currentVersion}.0</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Upload Date</p>
                <p className="font-bold text-slate-700">{new Date(selectedDrawing.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Status</p>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest inline-block border border-emerald-200">
                  {selectedDrawing.status || 'ACTIVE'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Version History ({selectedDrawing.versions?.length})</h5>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {selectedDrawing.versions?.map((v, idx) => (
                  <div key={idx} className="flex justify-between items-center px-4 py-3 rounded-xl bg-slate-50/80 border border-slate-100 group hover:border-blue-200 transition">
                    <div>
                      <span className="text-xs font-black text-slate-800">v{v.versionNumber}.0</span>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5">{v.description || 'Initial Version'}</p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{new Date(v.uploadedAt).toLocaleDateString()}</span>
                  </div>
                )).reverse()}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => handleDownload(selectedDrawing)} 
                className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl hover:bg-blue-700 transition-all font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-500/30 flex justify-center items-center gap-2 active:scale-95"
              >
                <Download size={16} /> DOWNLOAD DRAWING
              </button>
              <button 
                onClick={() => setIsViewOpen(false)} 
                className="flex-1 bg-slate-100 text-slate-600 py-3.5 rounded-xl hover:bg-slate-200 transition font-black uppercase text-[10px] tracking-widest active:scale-95 border border-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Drawing">
        <div className="text-center space-y-4">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="text-red-600" size={32} />
          </div>
          <div>
            <p className="font-medium text-slate-800">Delete this drawing revision?</p>
            <p className="text-sm text-slate-500 mt-1">
              Are you sure you want to delete <b>{selectedDrawing?.name}</b>?<br />
              This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button onClick={() => setIsDeleteOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition font-medium">
              Cancel
            </button>
            <button onClick={confirmDelete} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition font-medium shadow-lg shadow-red-200">
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Distribution Modal */}
      <Modal isOpen={isDistributionOpen} onClose={() => setIsDistributionOpen(false)} title="Send to Trades">
        <div className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Drawing</p>
            <p className="text-sm font-bold text-slate-800">{selectedDrawing?.title}</p>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Filter by Category</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm"
              value={tradeCategoryFilter}
              onChange={(e) => setTradeCategoryFilter(e.target.value)}
            >
              <option>All</option>
              <option>Flooring</option>
              <option>Plumbing</option>
              <option>Electrical</option>
              <option>Carpentry</option>
              <option>Painting</option>
            </select>
          </div>

          <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-50">
            <div className="px-4 py-2 bg-slate-50 flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedTrades.length === trades.length && trades.length > 0}
                onChange={(e) => {
                  if (e.target.checked) setSelectedTrades(trades.map(t => t._id));
                  else setSelectedTrades([]);
                }}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-bold text-slate-700">Select All</span>
            </div>
            {trades
              .filter(t => tradeCategoryFilter === 'All' || t.category === tradeCategoryFilter)
              .map(trade => (
                <label key={trade._id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={selectedTrades.includes(trade._id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedTrades([...selectedTrades, trade._id]);
                      else setSelectedTrades(selectedTrades.filter(id => id !== trade._id));
                    }}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-800 leading-none">{trade.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter mt-1">{trade.category}</p>
                  </div>
                </label>
              ))}
          </div>

          <button
            onClick={confirmSend}
            disabled={selectedTrades.length === 0 || loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-all font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-200 flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader className="animate-spin" size={18} /> : <><Send size={18} /> Send to {selectedTrades.length} Trades</>}
          </button>
        </div>
      </Modal>

      {/* Warning Modal */}
      <Modal isOpen={isWarningOpen} onClose={() => setIsWarningOpen(false)} title="Attention Needed">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 mx-auto border border-orange-100 shadow-sm animate-pulse">
            <AlertTriangle size={40} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">{warningMessage.title}</h3>
            <p className="text-slate-500 font-bold mt-2 leading-relaxed">
              {warningMessage.message}
            </p>
          </div>
          <button
            onClick={() => setIsWarningOpen(false)}
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-200 transition active:scale-95 mt-4"
          >
            I Understand
          </button>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal isOpen={isSuccessOpen} onClose={() => setIsSuccessOpen(false)} title="Action Successful">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mx-auto border border-emerald-100 shadow-sm animate-bounce">
            <CheckCircle size={40} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">{successMessage.title}</h3>
            <p className="text-slate-500 font-bold mt-2 leading-relaxed">
              {successMessage.message}
            </p>
          </div>
          <button
            onClick={() => setIsSuccessOpen(false)}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 transition active:scale-95 mt-4"
          >
            Great, Got it!
          </button>
        </div>
      </Modal>

      {/* Full PDF Viewer & Annotation System */}
      {isFullViewerOpen && selectedDrawing && selectedVersion && (
        <DrawingViewer
          drawing={selectedDrawing}
          version={selectedVersion}
          onClose={() => setIsFullViewerOpen(false)}
        />
      )}
    </div>
  );
};

export default Drawings;
