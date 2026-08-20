import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, Clock, AlertCircle, Loader } from 'lucide-react';
import api from '../../utils/api';

const Timeline = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await api.get('/dailylogs');
        setLogs(res.data);
      } catch (error) {
        console.error('Error fetching logs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader size={48} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Project Timeline</h1>
        <p className="text-slate-500 text-sm">Track key milestones and daily progress records for your projects.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="relative border-l-2 border-slate-100 ml-3 md:ml-6 space-y-8">
          {logs.map((log) => (
            <div key={log._id} className="relative pl-8 md:pl-12">
              <span className={`absolute -left-[13px] md:-left-[17px] top-0 flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full border-4 border-white bg-blue-50 text-blue-600 shadow-sm`}>
                <Clock size={16} className="md:w-5 md:h-5" />
              </span>
              <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-1">
                <h3 className="text-lg font-bold text-slate-800">{log.projectId?.name || 'Site Update'}</h3>
                <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded inline-block w-fit mt-1 md:mt-0">
                  {new Date(log.date).toLocaleDateString()}
                </span>
              </div>
              <p className="text-slate-600 text-sm mb-2">{log.workPerformed}</p>
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-bold px-2 py-1 rounded-full border bg-emerald-50 text-emerald-600 border-emerald-200 uppercase">
                  Log Recorded
                </span>
                {/* <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Weather: {log.weather?.status} ({log.weather?.temperature}°F)
                </span> */}
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <Calendar size={48} className="mx-auto mb-2 opacity-20" />
              <p>No project timeline events found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
