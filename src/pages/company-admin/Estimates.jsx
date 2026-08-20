import { useState, useEffect } from 'react';
import { DollarSign, FileText, CheckCircle, Clock, Download, Plus, X, Printer, PieChart, TrendingUp, AlertCircle, Calendar, User, Save, Trash2, Loader } from 'lucide-react';
import api from '../../utils/api';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in print:hidden">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 bg-white z-10">
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

const Estimates = () => {
  const [estimates, setEstimates] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    projectId: '', clientId: '', amount: '', dueDate: '', description: '', status: 'draft', title: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [estRes, projRes, clientRes] = await Promise.all([
        api.get('/estimates'),
        api.get('/projects'),
        api.get('/auth/users?role=CLIENT')
      ]);
      setEstimates(estRes.data);
      setProjects(projRes.data);
      setClients(clientRes.data);
    } catch (error) {
      console.error('Error fetching estimates:', error);
      alert('Failed to load data: ' + (error.response?.data?.message || error.message) + '. Please try logging out and back in.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        estimateNumber: `EST-${Date.now()}`,
        subtotal: Number(formData.amount),
        totalAmount: Number(formData.amount),
        items: [{
          description: formData.description,
          quantity: 1,
          unit: 'ls',
          unitPrice: Number(formData.amount),
          total: Number(formData.amount)
        }]
      };

      await api.post('/estimates', payload);
      fetchData();
      setIsModalOpen(false);
      setFormData({ projectId: '', clientId: '', amount: '', dueDate: '', description: '', status: 'draft', title: '' });
    } catch (error) {
      console.error('Error creating estimate:', error);
      alert(error.response?.data?.message || 'Error creating estimate');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this estimate?')) {
      try {
        await api.delete(`/estimates/${id}`);
        setEstimates(estimates.filter(e => e._id !== id));
      } catch (error) {
        console.error('Error deleting estimate:', error);
      }
    }
  };

  const stats = {
    totalEstimates: estimates.reduce((sum, e) => sum + (e.totalAmount || 0), 0),
    pending: estimates.filter(e => e.status === 'pending').length,
    approved: estimates.filter(e => e.status === 'approved').length,
    rejected: estimates.filter(e => e.status === 'rejected').length
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Estimates & Quotes</h1>
          <p className="text-slate-500 text-sm">Manage project estimates and client quotes.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition font-medium"
        >
          <Plus size={18} /> Create Estimate
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">Total Estimates</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">${stats.totalEstimates.toLocaleString()}</h3>
            </div>
            <PieChart className="text-blue-500 bg-blue-50 p-2 rounded-lg" size={36} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">Pending</p>
              <h3 className="text-2xl font-bold text-orange-500 mt-1">{stats.pending}</h3>
            </div>
            <Clock className="text-orange-500 bg-orange-50 p-2 rounded-lg" size={36} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">Approved</p>
              <h3 className="text-2xl font-bold text-emerald-500 mt-1">{stats.approved}</h3>
            </div>
            <CheckCircle className="text-emerald-500 bg-emerald-50 p-2 rounded-lg" size={36} />
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-sm font-medium">Rejected</p>
              <h3 className="text-2xl font-bold text-red-500 mt-1">{stats.rejected}</h3>
            </div>
            <AlertCircle className="text-red-500 bg-red-50 p-2 rounded-lg" size={36} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader size={48} className="animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-50 text-sm font-bold text-slate-700 flex justify-between items-center">
            <span>All Estimates</span>
            <span className="text-xs font-normal text-slate-400">Viewing {estimates.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 whitespace-nowrap">Estimate #</th>
                  <th className="px-6 py-4 whitespace-nowrap">Project</th>
                  <th className="px-6 py-4 whitespace-nowrap">Client</th>
                  <th className="px-6 py-4 whitespace-nowrap">Date</th>
                  <th className="px-6 py-4 whitespace-nowrap">Amount</th>
                  <th className="px-6 py-4 whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {estimates.map((est) => (
                  <tr key={est._id} className="border-b border-slate-50 hover:bg-slate-50 transition group">
                    <td className="px-6 py-4 font-bold text-slate-800">EST-{est._id.slice(-4)}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{est.projectId?.name || '---'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">{est.clientId?.fullName || '---'}</td>
                    <td className="px-6 py-4">{new Date(est.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">${est.totalAmount?.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1
                          ${est.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                          est.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                            est.status === 'rejected' ? 'bg-red-100 text-red-700 border border-red-200' :
                              'bg-slate-100 text-slate-500'}`}>
                        {est.status === 'approved' && <CheckCircle size={10} />}
                        {est.status === 'pending' && <Clock size={10} />}
                        {est.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(est._id)}
                        className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition" title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {estimates.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                      No estimates found. Create your first estimate to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Estimate">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition"
              placeholder="e.g., Kitchen Renovation Estimate"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
            <select
              value={formData.projectId}
              onChange={e => {
                const selectedProjectId = e.target.value;
                const project = projects.find(p => p._id === selectedProjectId);
                setFormData({
                  ...formData,
                  projectId: selectedProjectId,
                  clientId: project?.clientId?._id || ''
                });
              }}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition"
            >
              <option value="">Select Project</option>
              {projects.map(p => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
            <select
              value={formData.clientId}
              onChange={e => setFormData({ ...formData, clientId: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition"
            >
              <option value="">Select Client</option>
              {clients.map(c => (
                <option key={c._id} value={c._id}>{c.fullName}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount ($)</label>
              <div className="relative">
                <DollarSign size={18} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="number"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
              <div className="relative">
                <Calendar size={18} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description / Items</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition h-24 resize-none"
              placeholder="Details of services to be rendered..."
            />
          </div>
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition shadow-lg shadow-blue-200 flex items-center gap-2"
            >
              <Save size={18} /> Save Estimate
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Estimates;
