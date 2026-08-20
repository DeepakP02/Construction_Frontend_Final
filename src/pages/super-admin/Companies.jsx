import { useState, useEffect } from 'react';
import { Search, Shield, Plus, Trash2, Edit, Eye, AlertTriangle, Briefcase, Calendar, DollarSign, Users, CheckCircle, XCircle } from 'lucide-react';
import api from '../../utils/api';
import Modal from '../../components/Modal';

const Companies = () => {
  const [companies, setCompanies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanies();
    fetchPlans();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies');
      const data = response.data.map((comp, index) => ({
        ...comp,
        displayId: String(index + 1).padStart(3, '0') // Generate COMP-001, COMP-002...
      }));
      setCompanies(data);
    } catch (error) {
      console.error("Error fetching companies", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await api.get('/plans');
      setPlans(response.data);
    } catch (error) {
      console.error("Error fetching plans", error);
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    startDate: '',
    expireDate: '',
    plan: '',
    planType: 'Monthly',
    password: '',
    confirmPassword: '',
    users: 1,
    status: 'Active',
    revenue: 0,
    storage: '0 GB',
    projects: 0
  });
  const [editingId, setEditingId] = useState(null);
  const [viewingCompany, setViewingCompany] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [suspendingId, setSuspendingId] = useState(null);

  // Filter Logic
  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterStatus === 'All' || c.subscriptionStatus === filterStatus)
  );

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      startDate: '',
      expireDate: '',
      plan: plans.length > 0 ? (plans[0]._id || plans[0].id) : '',
      planType: 'Monthly',
      password: '',
      confirmPassword: '',
      users: 1,
      status: 'Active',
      revenue: 0,
      storage: '0 GB',
      projects: 0
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (!editingId && formData.password !== formData.confirmPassword) {
        // Only check password matching if creating new password
        alert("Passwords do not match!");
        return;
      }
      // If editing and password is left blank, it might mean "don't change password" - backend should handle this if configured, 
      // but for now let's assume if they type nothing, they don't want to change it.
      // However, frontend validation requires password. We might need to make password optional on edit. 
      // For this simplified task, we'll keep it required for new, but we need to handle the update logic.

      const dataToSend = { ...formData };
      if (editingId && !dataToSend.password) {
        delete dataToSend.password;
        delete dataToSend.confirmPassword;
      }


      if (editingId) {
        await api.patch(`/companies/${editingId}`, dataToSend);
      } else {
        await api.post('/companies', formData);
      }
      fetchCompanies();
      closeModal();
    } catch (error) {
      console.error("Error saving company", error);
      alert(error.response?.data?.message || "Error saving company");
    }
  };

  const handleEdit = (company) => {
    setEditingId(company._id || company.id);
    setFormData({
      ...company,
      startDate: company.startDate ? new Date(company.startDate).toISOString().split('T')[0] : '',
      expireDate: company.expireDate ? new Date(company.expireDate).toISOString().split('T')[0] : '',
      plan: company.subscriptionPlanId || '', // Map backend subscriptionPlanId to frontend form plan
      password: '', // Reset password fields on edit for security
      confirmPassword: ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id) => {
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  };

  const handleApprove = async (id) => {
    try {
      await api.patch(`/super-admin/companies/${id}/approve`);
      fetchCompanies();
    } catch (error) {
      console.error("Error approving company", error);
    }
  };

  const handleReject = async (id) => {
    if (window.confirm("Are you sure you want to reject this company?")) {
      try {
        await api.patch(`/super-admin/companies/${id}/reject`);
        fetchCompanies();
      } catch (error) {
        console.error("Error rejecting company", error);
      }
    }
  };

  const handleSuspendClick = (id) => {
    setSuspendingId(id);
    setIsSuspendModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/companies/${deletingId}`);
      fetchCompanies();
      setIsDeleteModalOpen(false);
      setDeletingId(null);
    } catch (error) {
      console.error("Error deleting company", error);
      alert("Error deleting company");
    }
  };

  const confirmSuspend = () => {
    setCompanies(companies.map(c => (c._id === suspendingId || c.id === suspendingId) ? { ...c, subscriptionStatus: 'suspended' } : c));
    setIsSuspendModalOpen(false);
    setSuspendingId(null);
  };

  const handleView = (company) => {
    setViewingCompany(company);
    setIsViewModalOpen(true);
  }

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      startDate: new Date().toISOString().split('T')[0],
      expireDate: '',
      plan: plans.length > 0 ? (plans[0]._id || plans[0].id) : '',
      planType: 'Monthly',
      password: '',
      confirmPassword: '',
      users: 1,
      status: 'Active',
      revenue: 0,
      storage: '0 GB',
      projects: 0
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Companies Management</h1>
          <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-widest flex items-center gap-2">
            <Briefcase size={14} className="text-blue-600" />
            Overview of all registered construction companies
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={openAddModal} className="bg-blue-600 text-white px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg hover:bg-blue-700 shadow-blue-200 active:scale-95">
            <Plus size={18} /> Add New Company
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200/60 overflow-hidden shadow-sm min-h-[400px]">
        {/* Toolbar */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-6 justify-between bg-white">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search companies by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white focus:border-blue-500/50 transition-all font-bold text-slate-800"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-100 text-slate-700 px-6 py-4 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white transition-all cursor-pointer"
          >
            <option value="All">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="past_due">Past Due</option>
            <option value="canceled">Cancelled</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Company Name</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Users Count</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCompanies.length > 0 ? (
                filteredCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black border border-slate-100 group-hover:bg-white group-hover:border-blue-200 group-hover:text-blue-600 transition-all shadow-sm">
                          {company.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 tracking-tight">{company.name}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">ID: COMP-{company.displayId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${typeof company.subscriptionPlanId === 'object' ? (company.subscriptionPlanId?.name === 'Enterprise' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600') : (company.subscriptionPlanId === 'Enterprise' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600')}`}>
                          <Shield size={14} />
                        </div>
                        <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{typeof company.subscriptionPlanId === 'object' ? (company.subscriptionPlanId?.name || 'No Plan') : (company.subscriptionPlanId || 'No Plan')}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex w-fit items-center gap-2
                         ${company.subscriptionStatus === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          company.subscriptionStatus === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                            company.subscriptionStatus === 'past_due' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                              company.subscriptionStatus === 'suspended' ? 'bg-slate-100 text-slate-500 border border-slate-100' :
                                'bg-red-50 text-red-600 border border-red-100'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${company.subscriptionStatus === 'active' ? 'bg-emerald-500' :
                          company.subscriptionStatus === 'pending' ? 'bg-amber-500' :
                            company.subscriptionStatus === 'past_due' ? 'bg-orange-500' :
                              company.subscriptionStatus === 'suspended' ? 'bg-slate-400' :
                                'bg-red-500'
                          }`}></span>
                        {company.subscriptionStatus}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-black text-slate-900 leading-none">{company.users || 0} <span className="text-[10px] text-slate-400 uppercase ml-1">Seats</span></p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {company.subscriptionStatus === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleApprove(company._id || company.id)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition border border-emerald-200"
                              title="Approve"
                            >
                              <CheckCircle size={18} />
                            </button>
                            <button
                              onClick={() => handleReject(company._id || company.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition border border-red-200"
                              title="Reject"
                            >
                              <XCircle size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleView(company)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="View Details"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleEdit(company)}
                              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                              title="Edit Company"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleSuspendClick(company._id || company.id)}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition"
                              title="Suspend Company"
                            >
                              <AlertTriangle size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(company._id || company.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete Company"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Briefcase size={48} className="text-slate-200 mb-4" />
                      <p className="text-lg font-medium text-slate-900">No companies found</p>
                      <p className="text-sm text-slate-500">Try adjusting your search or filters.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? "Edit Company" : "Add New Company"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:border-blue-500 outline-none transition"
              placeholder="e.g. Acme Construction"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:border-blue-500 outline-none transition"
                placeholder="Enter Email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:border-blue-500 outline-none transition"
                placeholder="Enter Phone Number"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:border-blue-500 outline-none transition"
              placeholder="Enter Address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:border-blue-500 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expire Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                required
                value={formData.expireDate}
                onChange={(e) => setFormData({ ...formData, expireDate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:border-blue-500 outline-none transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Plan Type <span className="text-red-500">*</span></label>
              <select
                value={formData.planType}
                onChange={(e) => setFormData({ ...formData, planType: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:border-blue-500 outline-none transition cursor-pointer"
              >
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Plan <span className="text-red-500">*</span></label>
              <select
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:border-blue-500 outline-none transition cursor-pointer"
              >
                <option value="" disabled>Select Plan</option>
                {plans.map((plan) => (
                  <option key={plan._id || plan.id} value={plan._id || plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password {editingId ? <span className="text-xs text-slate-400 font-normal">(Leave blank to keep current)</span> : <span className="text-red-500">*</span>}</label>
              <input
                type="password"
                required={!editingId}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:border-blue-500 outline-none transition"
                placeholder="Enter password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password {editingId ? '' : <span className="text-red-500">*</span>}</label>
              <input
                type="password"
                required={!editingId}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:border-blue-500 outline-none transition"
                placeholder="Confirm password"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
            <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition font-medium">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition font-medium">Save Company</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion">
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Company?</h3>
          <p className="text-slate-500 mb-6">
            Are you sure you want to delete this company? This action cannot be undone and will remove all associated data.
          </p>
          <div className="flex gap-3 w-full">
            <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition font-medium">Cancel</button>
            <button onClick={confirmDelete} className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition font-medium">Delete Forever</button>
          </div>
        </div>
      </Modal>

      {/* Suspend Confirmation Modal */}
      <Modal isOpen={isSuspendModalOpen} onClose={() => setIsSuspendModalOpen(false)} title="Suspend Company">
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 text-orange-600">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Suspend Access?</h3>
          <p className="text-slate-500 mb-6">
            Are you sure you want to suspend this company? This will prevent all <b>{companies.find(c => c.id === suspendingId)?.users} users</b> from accessing the platform.
          </p>
          <div className="flex gap-3 w-full">
            <button onClick={() => setIsSuspendModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition font-medium">Cancel</button>
            <button onClick={confirmSuspend} className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition font-medium">Suspend Access</button>
          </div>
        </div>
      </Modal>

      {/* View Details Modal */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Company Details">
        {viewingCompany && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-[2rem] border border-slate-200">
              <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-2xl font-bold text-blue-600 border border-slate-100 shadow-sm">
                {viewingCompany.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 leading-none">{viewingCompany.name}</h3>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1.5">ID: COMP-{viewingCompany.displayId}</p>
              </div>
              <div className="ml-auto">
                <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border
                   ${(viewingCompany.subscriptionStatus === 'active' || viewingCompany.status === 'Active') ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                    (viewingCompany.subscriptionStatus === 'past_due' || viewingCompany.status === 'Past Due') ? 'bg-orange-50 text-orange-600 border-orange-200' :
                      'bg-red-50 text-red-600 border-red-200'}`}>
                  {viewingCompany.subscriptionStatus || viewingCompany.status || 'Unknown'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Plan Info */}
              <div className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-3">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Company Contact</label>
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-blue-500">@</span> {viewingCompany.email || 'No email provided'}
                  </p>
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-2 mt-1">
                    <span className="text-blue-500">#</span> {viewingCompany.phone || 'No phone provided'}
                  </p>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Address</label>
                  <p className="text-xs font-bold text-slate-600 leading-relaxed italic">{viewingCompany.address || 'No address provided'}</p>
                </div>
              </div>

              {/* Usage Stats */}
              <div className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <Users size={12} className="text-blue-500" /> Seats
                  </div>
                  <p className="text-lg font-black text-slate-900">{viewingCompany.users || 0}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <Shield size={12} className="text-indigo-500" /> Plan
                  </div>
                  <p className="text-xs font-black text-slate-700 uppercase">{typeof viewingCompany.subscriptionPlanId === 'object' ? (viewingCompany.subscriptionPlanId?.name || 'No Plan') : (viewingCompany.subscriptionPlanId || 'No Plan')}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <Briefcase size={12} className="text-emerald-500" /> Projects
                  </div>
                  <p className="text-lg font-black text-slate-900">{viewingCompany.projects || 0}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <Shield size={12} className="text-red-500" /> Storage
                  </div>
                  <p className="text-xs font-black text-slate-700 uppercase">{viewingCompany.storage || '0 GB'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <div className="flex items-center gap-2 mb-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <Calendar size={14} className="text-blue-500" /> Subscription Dates
                    </div>
                    <div className="space-y-1">
                        <p className="text-[11px] font-bold text-slate-600 flex justify-between">
                            <span>Started:</span>
                            <span className="text-slate-900">{viewingCompany.startDate ? new Date(viewingCompany.startDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : 'N/A'}</span>
                        </p>
                        <p className="text-[11px] font-bold text-slate-600 flex justify-between">
                            <span>Expires:</span>
                            <span className="text-slate-900">{viewingCompany.expireDate ? new Date(viewingCompany.expireDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : 'N/A'}</span>
                        </p>
                    </div>
                </div>

                <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/30 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1 text-[9px] font-black text-blue-500 uppercase tracking-widest">
                        <DollarSign size={14} /> Total Revenue
                    </div>
                    <p className="text-2xl font-black text-slate-900 tracking-tighter">
                        ₹{viewingCompany.revenue?.toLocaleString() || '0'}
                    </p>
                    <p className="text-[9px] font-bold text-blue-400 uppercase italic mt-1">Platform Contributions</p>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => { setIsViewModalOpen(false); handleSuspendClick(viewingCompany._id || viewingCompany.id); }}
                className="px-6 py-3 text-orange-600 hover:bg-orange-50 rounded-xl transition border border-orange-200 font-bold text-xs uppercase tracking-widest active:scale-95"
              >
                Suspend Company
              </button>
              <button onClick={() => setIsViewModalOpen(false)} className="px-6 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition font-bold text-xs uppercase tracking-widest active:scale-95">Close</button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default Companies;
