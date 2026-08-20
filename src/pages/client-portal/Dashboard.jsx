import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Clock, CheckCircle, FileText, Download,
  TrendingUp, Calendar, AlertCircle,
  Image as ImageIcon, MoreHorizontal,
  ArrowUpRight, DollarSign, Target, ShieldCheck, Loader, ExternalLink, FileQuestion
} from 'lucide-react';
import api, { getServerUrl } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const ClientStatCard = ({ title, value, subtext, icon: Icon, color, onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg hover:shadow-slate-200/50 transition-all ${onClick ? 'cursor-pointer hover:border-blue-200' : ''}`}
  >
    <div className="flex justify-between items-start">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <button className="p-1.5 text-slate-300 hover:text-slate-500 rounded-lg" onClick={(e) => { e.stopPropagation(); }}>
        <MoreHorizontal size={20} />
      </button>
    </div>
    <div className="mt-4">
      <p className="text-slate-400 text-xs font-black uppercase tracking-widest">{title}</p>
      <h3 className="text-2xl font-black text-slate-800 mt-1">{value}</h3>
      <p className="text-[10px] text-slate-500 font-medium mt-2 flex items-center gap-1.5">
        <ShieldCheck size={12} className="text-emerald-500" /> {subtext}
      </p>
    </div>
  </div>
);

const ClientPortalDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    projects: [],
    invoices: [],
    photos: [],
    drawings: [],
    logs: [],
    rfis: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [projRes, invRes, photoRes, drawRes, logRes, rfiRes] = await Promise.all([
          api.get('/projects'),
          api.get('/invoices'),
          api.get('/photos'),
          api.get('/drawings'),
          api.get('/dailylogs'),
          api.get('/rfis')
        ]);

        const projects = projRes.data;
        let updates = [];
        if (projects.length > 0) {
          try {
            const updatesRes = await api.get(`/projects/${projects[0]._id}/client-updates`);
            updates = updatesRes.data.slice(0, 3); // Latest 3 updates
          } catch (err) {
            console.error('Error fetching updates:', err);
          }
        }

        setData({
          projects,
          invoices: invRes.data,
          photos: photoRes.data.slice(0, 4),
          drawings: drawRes.data.slice(0, 3),
          logs: logRes.data.slice(0, 4),
          rfis: rfiRes.data.filter(rfi => rfi.raisedBy?.role !== 'SUBCONTRACTOR'),
          updates
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Loader size={48} className="animate-spin text-blue-600" />
      </div>
    );
  }

  const primaryProject = data.projects[0] || {};
  const avgProgress = data.projects.length > 0
    ? Math.round(data.projects.reduce((acc, p) => acc + (p.progress || 0), 0) / data.projects.length)
    : 0;
  const unpaidInvoices = data.invoices.filter(i => i.status !== 'paid').length;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="text-[10px] font-black text-blue-600 background-blue-50 px-2 py-1 rounded-full uppercase tracking-tighter mb-2 inline-block">Client Overview</span>
          <h1 className="text-3xl font-black text-slate-800">Welcome, {user?.fullName || 'Client'}</h1>
          <p className="text-slate-500 mt-1 max-w-lg">
            {data.projects.length > 0 ? (
              <>Everything is on track for <span className="font-bold text-slate-700 underline decoration-blue-500 underline-offset-4">{primaryProject.name}</span>.</>
            ) : (
              "You don't have any active projects yet."
            )}
          </p>
        </div>
      </div>

      {/* High-Level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ClientStatCard
          title="Avg Completion"
          value={`${avgProgress}%`}
          subtext="Overall portfolio progress"
          icon={Target}
          color="bg-emerald-500 shadow-lg shadow-emerald-100"
          onClick={() => navigate('/client-portal/projects')}
        />
        <ClientStatCard
          title="Pending Invoices"
          value={unpaidInvoices}
          subtext="Requiring your attention"
          icon={FileText}
          color="bg-amber-500 shadow-lg shadow-amber-100"
          onClick={() => navigate('/client-portal/invoices')}
        />
        <ClientStatCard
          title="Site Photos"
          value={data.photos.length}
          subtext="Latest visual updates"
          icon={ImageIcon}
          color="bg-indigo-600 shadow-lg shadow-indigo-100"
          onClick={() => navigate('/client-portal/photos')}
        />
        <ClientStatCard
          title="RFIs"
          value={data.rfis.length}
          subtext="Requests for Information"
          icon={FileQuestion}
          color="bg-violet-600 shadow-lg shadow-violet-100"
          onClick={() => navigate('/client-portal/rfi')}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Progress & Timeline Section */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-600" /> Project Timeline
              </h3>
            </div>

            <div className="p-8">
              {/* Advanced Progress Bar for primary project */}
              {data.projects.length > 0 && (
                <div className="mb-12">
                  <div className="flex justify-between items-end mb-4">
                    <div
                      className="cursor-pointer group"
                      onClick={() => navigate(`/client-portal/progress/${primaryProject._id}`)}
                    >
                      <p className="text-2xl font-black text-slate-800 group-hover:text-blue-600 transition-colors">{primaryProject.progress}%</p>
                      <p className="text-xs text-slate-400 font-bold uppercase group-hover:text-slate-600">
                        {primaryProject.name} Progress
                        <ArrowUpRight size={12} className="inline ml-1" />
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/client-portal/drawings?projectId=${primaryProject._id}`)}
                      className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-2 rounded-xl border border-blue-100 uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <ExternalLink size={12} /> View Drawings
                    </button>
                  </div>
                  <div className="w-full bg-slate-100 rounded-2xl h-6 p-1">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-xl relative shadow-inner transition-all duration-1000"
                      style={{ width: `${primaryProject.progress}%` }}
                    >
                      <div className="absolute -top-1 right-0 w-6 h-6 bg-white border-4 border-blue-600 rounded-full shadow-xl"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Latest Project Updates Section */}
              {data.updates && data.updates.length > 0 && (
                <div className="mb-12">
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2 mb-6">
                    <TrendingUp size={18} className="text-blue-600" /> Latest Project Updates
                  </h3>
                  <div className="space-y-6">
                    {data.updates.map((update) => (
                      <div key={update._id} className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 hover:border-blue-100 transition-all group">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-black text-slate-800 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{update.title}</h4>
                          <span className="text-[10px] font-black text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-100 uppercase">
                            {new Date(update.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed mb-4">{update.description}</p>

                        {update.images && update.images.length > 0 && (
                          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                            {update.images.map((img, i) => (
                              <div key={i} className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200">
                                <img src={img} className="w-full h-full object-cover" alt="Update Attachment" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => navigate(`/client-portal/progress/${primaryProject._id}`)}
                      className="w-full py-3 bg-white border border-dashed border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-400 tracking-widest hover:border-blue-300 hover:text-blue-600 transition-all"
                    >
                      Explore All Work Progress Updates
                    </button>
                  </div>
                </div>
              )}

              {/* Rich Timeline from Daily Logs */}
              <div className="space-y-8 relative before:absolute before:left-5 before:top-4 before:bottom-0 before:w-1 before:bg-slate-100">
                {data.logs.length > 0 ? (
                  data.logs.map((log, i) => (
                    <div key={log._id} className="flex gap-8 relative group">
                      <div className="w-10 h-10 rounded-2xl border-4 flex-shrink-0 z-10 flex items-center justify-center bg-blue-600 border-white text-white shadow-xl shadow-blue-200">
                        <Clock size={18} />
                      </div>
                      <div className="flex-1 p-6 rounded-2xl border transition-all bg-white border-slate-50 group-hover:bg-slate-50">
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                          <h4 className="text-base font-black text-slate-800">
                            {log.projectId?.name || 'Site Update'}
                          </h4>
                          <span className="text-[10px] font-black text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-100 h-fit w-fit uppercase tracking-tighter">
                            {new Date(log.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-2 leading-relaxed">{log.workPerformed}</p>
                        {/* <div className="mt-2 text-[10px] text-blue-600 font-bold uppercase truncate">
                          Weather: {log.weather?.status} • {log.weather?.temperature}°F
                        </div> */}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 font-medium italic">
                    No recent site logs available.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Sidebar */}
        <div className="space-y-8">
          {/* Site Progress Photos */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Latest Site Views</h3>
              <Link to="/client-portal/photos" className="text-[10px] font-black text-blue-600 uppercase hover:underline">View Gallery</Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {data.photos.length > 0 ? (
                data.photos.map((photo, i) => (
                  <div key={photo._id} className="aspect-square rounded-2xl overflow-hidden relative group cursor-pointer shadow-sm">
                    <img src={getServerUrl(photo.imageUrl)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Site" />
                    <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <ImageIcon size={20} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 aspect-video flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                  <ImageIcon size={24} className="mb-2 opacity-50" />
                  <p className="text-[10px] font-bold uppercase">No Photos Yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Document Section */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-6">Vault & Drawings</h3>
            <div className="space-y-3">
              {data.drawings.length > 0 ? (
                data.drawings.map((draw, i) => (
                  <div key={draw._id} className="flex items-center justify-between p-3 rounded-2xl border border-slate-50 hover:bg-slate-50 transition-all cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                        {draw.versions?.[0]?.fileUrl?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                          <img
                            src={getServerUrl(draw.versions[0].fileUrl)}
                            alt={draw.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText size={18} />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 truncate max-w-[120px]">{draw.title}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                          {draw.category} • v{draw.currentVersion}
                        </p>
                      </div>
                    </div>
                    {draw.versions?.[0]?.fileUrl && (
                      <a
                        href={getServerUrl(draw.versions[0].fileUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-100"
                        title="Download Drawing"
                      >
                        <Download size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-center text-slate-400 py-4 italic">No drawings uploaded yet.</p>
              )}
            </div>
            <Link to="/client-portal/drawings" className="block w-full text-center mt-6 py-3 border border-slate-100 text-slate-400 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition">
              View All Vault
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientPortalDashboard;
