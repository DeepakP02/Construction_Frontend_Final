import { useState, useEffect } from 'react';
import { Image, X, Loader, Calendar } from 'lucide-react';
import api, { getServerUrl } from '../../utils/api';

const Photos = () => {
  const [photos, setPhotos] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [activeTab, setActiveTab] = useState('All');

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        setLoading(true);
        const [photoRes, projectRes] = await Promise.all([
          api.get('/photos'),
          api.get('/projects')
        ]);
        setPhotos(photoRes.data);
        setProjects(projectRes.data);
      } catch (error) {
        console.error('Error fetching photos:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPhotos();
  }, []);

  const filteredPhotos = activeTab === 'All'
    ? photos
    : photos.filter(p => p.projectId?._id === activeTab);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[calc(100vh-12rem)] gap-4">
        <Loader size={48} className="animate-spin text-blue-600" />
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Loading Portfolio Gallery...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Project Photos</h1>
        <p className="text-slate-500 mt-1 max-w-lg">
          Real-time visual progress from all your active construction sites.
        </p>
      </div>

      {/* Modern Project Tabs */}
      <div className="flex gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-100 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('All')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'All'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
              : 'text-slate-500 hover:text-slate-800 hover:bg-white'
            }`}
        >
          All Photos ({photos.length})
        </button>
        {projects.map(project => (
          <button
            key={project._id}
            onClick={() => setActiveTab(project._id)}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === project._id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white'
              }`}
          >
            {project.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredPhotos.map((photo) => (
          <div
            key={photo._id}
            className="group relative cursor-pointer overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            onClick={() => setSelectedPhoto(photo)}
          >
            <div className="aspect-square w-full overflow-hidden bg-slate-100">
              <img
                src={getServerUrl(photo.imageUrl)}
                alt={photo.description || 'Project Photo'}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="p-5">
              <h3 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate uppercase tracking-tighter">
                {photo.projectId?.name || 'General Update'}
              </h3>
              <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] text-slate-400 flex items-center gap-1 font-black uppercase tracking-widest">
                  <Calendar size={12} className="text-blue-500" /> {new Date(photo.createdAt).toLocaleDateString()}
                </p>
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 uppercase tracking-tighter">
                  Progress View
                </span>
              </div>
              {photo.description && (
                <p className="mt-4 text-xs text-slate-500 leading-relaxed line-clamp-2 italic">
                  "{photo.description}"
                </p>
              )}
            </div>
          </div>
        ))}

        {filteredPhotos.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <Image size={64} className="mx-auto mb-4 text-slate-200" />
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">No Photos Found</h3>
            <p className="text-slate-400 text-sm mt-1">No site photos have been uploaded for this project yet.</p>
          </div>
        )}
      </div>

      {/* Rich Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 p-4 backdrop-blur-md transition-all duration-500 animate-fade-in"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            className="absolute right-8 top-8 text-white/50 hover:text-white transition-all bg-white/10 p-3 rounded-2xl hover:scale-110"
            onClick={() => setSelectedPhoto(null)}
          >
            <X size={28} />
          </button>
          <div
            className="relative max-h-[90vh] max-w-5xl overflow-hidden rounded-[2.5rem] shadow-[0_0_100px_rgba(37,99,235,0.2)] bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getServerUrl(selectedPhoto.imageUrl)}
              alt={selectedPhoto.description}
              className="max-h-[80vh] w-auto object-contain"
            />
            <div className="bg-white/10 backdrop-blur-xl p-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1 block">Project Documentation</span>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{selectedPhoto.projectId?.name || 'General Update'}</h3>
                <p className="text-blue-300 text-xs font-bold mt-1 flex items-center gap-2">
                  <Calendar size={14} /> {new Date(selectedPhoto.createdAt).toLocaleDateString('en-US', { dateStyle: 'full' })}
                </p>
              </div>
              {selectedPhoto.description && (
                <div className="max-w-md bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-white/80 text-sm italic leading-relaxed">
                    "{selectedPhoto.description}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Photos;
