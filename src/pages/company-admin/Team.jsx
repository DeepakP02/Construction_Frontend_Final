import { useState, useEffect } from 'react';
import { Plus, Search, Mail, Phone, Shield, User, X, Save, Trash2, Edit, CheckCircle, AlertTriangle, Eye, Loader, Lock, Briefcase, Users } from 'lucide-react';
import api from '../../utils/api';
import Toast from '../../components/Toast';


const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
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

// Shared form for both Team Members and Clients
const UserForm = ({ data, setData, onSubmit, submitLabel, isEdit = false, roleOptions }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
      <div className="relative">
        <User size={18} className="absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          value={data.fullName}
          onChange={e => setData({ ...data, fullName: e.target.value })}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition"
          placeholder="John Doe"
        />
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
      <div className="relative">
        <Mail size={18} className="absolute left-3 top-2.5 text-slate-400" />
        <input
          type="email"
          value={data.email}
          onChange={e => setData({ ...data, email: e.target.value })}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition"
          placeholder="john@example.com"
        />
      </div>
    </div>
    {!isEdit && (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <div className="relative">
            <Lock size={18} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="password"
              value={data.password}
              onChange={e => setData({ ...data, password: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition"
              placeholder="******"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Confirm</label>
          <div className="relative">
            <Lock size={18} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="password"
              value={data.confirmPassword}
              onChange={e => setData({ ...data, confirmPassword: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition"
              placeholder="******"
            />
          </div>
        </div>
      </div>
    )}
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
        <div className="relative">
          <Phone size={18} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={data.phone}
            onChange={e => setData({ ...data, phone: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition"
            placeholder="+1 (555)..."
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
        <div className="relative">
          <Shield size={18} className="absolute left-3 top-2.5 text-slate-400" />
          <select
            value={data.role}
            onChange={e => {
              const selectedRole = roleOptions.find(r => r.name === e.target.value) || { name: e.target.value };
              setData({ ...data, role: selectedRole.name, roleId: selectedRole._id || data.roleId });
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition appearance-none"
          >
            {roleOptions.map(opt => (
              <option key={opt._id || opt.value} value={opt.name || opt.value}>
                {opt.description || opt.label || opt.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
      <select
        value={data.status}
        onChange={e => setData({ ...data, status: e.target.value })}
        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 transition"
      >
        <option>Active</option>
        <option>On Site</option>
        <option>Offline</option>
      </select>
    </div>
    <div className="flex justify-end pt-4">
      <button
        onClick={onSubmit}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition shadow-lg shadow-blue-200 flex items-center gap-2"
      >
        <Save size={18} /> {submitLabel}
      </button>
    </div>
  </div>
);

// Status badge helper
const StatusBadge = ({ status }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-bold flex w-fit items-center gap-1
    ${status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
      status === 'On Site' ? 'bg-blue-100 text-blue-700' :
        'bg-slate-100 text-slate-500'}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${status === 'Active' ? 'bg-emerald-500' :
      status === 'On Site' ? 'bg-blue-500' : 'bg-slate-400'}`} />
    {status}
  </span>
);

// Reusable user table
const UserTable = ({ users, onView, onEdit, onDelete, onManagePermissions, onChangePassword, emptyMessage }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left text-sm text-slate-600">
      <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
        <tr>
          <th className="px-6 py-4 whitespace-nowrap">Name</th>
          <th className="px-6 py-4 whitespace-nowrap">Role</th>
          <th className="px-6 py-4 whitespace-nowrap">Status</th>
          <th className="px-6 py-4 whitespace-nowrap">Contact</th>
          <th className="px-6 py-4 text-right whitespace-nowrap">Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.length > 0 ? (
          users.map((member) => (
            <tr key={member._id} className="border-b border-slate-100 hover:bg-slate-50 transition group">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border border-slate-200 shadow-sm">
                    {member.fullName?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{member.fullName}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-slate-400" />
                  <span className="font-medium text-xs uppercase">{member.role}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <StatusBadge status={member.status} />
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail size={14} className="text-slate-400" />
                    <span className="text-sm">{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone size={14} className="text-slate-400" />
                    <span className="text-sm">{member.phone || '---'}</span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2 text-right">
                  {/* <button onClick={() => onManagePermissions(member)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition" title="Manage Permissions">
                    <Shield size={18} />
                  </button> */}
                  <button onClick={() => onChangePassword(member)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition" title="Change Password">
                    <Lock size={18} />
                  </button>
                  <button onClick={() => onView(member)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition" title="View Details">
                    <Eye size={18} />
                  </button>
                  <button onClick={() => onEdit(member)} className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg transition" title="Edit Info">
                    <Edit size={18} />
                  </button>
                  <button onClick={() => onDelete(member)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition" title="Delete User">
                    <Trash2 size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="5" className="text-center py-10 text-slate-400">{emptyMessage}</td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const TEAM_ROLE_OPTIONS = [
  { value: 'PM', label: 'Project Manager' },
  { value: 'FOREMAN', label: 'Forman' },
  { value: 'WORKER', label: 'Worker' },
  { value: 'SUBCONTRACTOR', label: 'Subcontractor' },
];

const CLIENT_ROLE_OPTIONS = [
  { value: 'CLIENT', label: 'Client' },
];

const emptyForm = (role) => ({
  fullName: '', role, email: '', phone: '', status: 'Active', password: '', confirmPassword: ''
});

const Team = () => {
  const [activeTab, setActiveTab] = useState('team'); // 'team' | 'clients'

  // Team Members state
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);

  // Clients state
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('All Roles');

  // Shared modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  const [selectedMember, setSelectedMember] = useState(null);
  const [formData, setFormData] = useState(emptyForm('WORKER'));
  const [toast, setToast] = useState(null); // { message, type }

  // Permissions and Roles state
  const [allRoles, setAllRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [userPermissions, setUserPermissions] = useState({ rolePermissions: [], overrides: [] });
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  // ─── Data fetching ────────────────────────────────────────────────────────────
  const fetchRolesAndPermissions = async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/roles'),
        api.get('/roles/permissions')
      ]);
      setAllRoles(rolesRes.data);
      setAllPermissions(permsRes.data);
    } catch (error) {
      console.error('Error fetching roles/permissions:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      setMembersLoading(true);
      const response = await api.get('/auth/users');
      setMembers(response.data);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setMembersLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      setClientsLoading(true);
      const response = await api.get('/auth/users?role=CLIENT');
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setClientsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchClients();
    fetchRolesAndPermissions();
  }, []);

  const handleManagePermissions = async (user) => {
    setSelectedMember(user);
    setIsPermissionsOpen(true);
    setPermissionsLoading(true);
    try {
      const response = await api.get(`/roles/user/${user._id}`);
      setUserPermissions(response.data);
    } catch (error) {
      console.error('Error fetching user permissions:', error);
    } finally {
      setPermissionsLoading(false);
    }
  };

  const handleToggleOverride = (permKey, currentOverride) => {
    const newOverrides = [...userPermissions.overrides];
    const index = newOverrides.findIndex(o => o.key === permKey);

    // If currentOverride is null, it means it's currently following Role
    // We want to force it to be allowed or denied
    if (index === -1) {
      const isCurrentlyAllowedByRole = userPermissions.rolePermissions.includes(permKey);
      newOverrides.push({ key: permKey, isAllowed: !isCurrentlyAllowedByRole });
    } else {
      // If it was already overridden, we can either flip it or remove override
      // For simplicity, let's flip it
      newOverrides[index].isAllowed = !newOverrides[index].isAllowed;
    }
    setUserPermissions({ ...userPermissions, overrides: newOverrides });
  };

  const handleResetOverride = (permKey) => {
    const newOverrides = userPermissions.overrides.filter(o => o.key !== permKey);
    setUserPermissions({ ...userPermissions, overrides: newOverrides });
  };

  const handleSavePermissions = async () => {
    try {
      setIsSubmitting(true);
      await api.post(`/roles/user/${selectedMember._id}/overrides`, {
        overrides: userPermissions.overrides
      });
      setIsPermissionsOpen(false);
    } catch (error) {
      alert('Failed to save permissions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = (member) => {
    setSelectedMember(member);
    setFormData({ password: '', confirmPassword: '' });
    setIsPasswordOpen(true);
  };

  const handleSavePassword = async () => {
    if (!formData.password) {
      alert('Please enter a new password');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    try {
      setIsSubmitting(true);
      await api.patch(`/auth/users/${selectedMember._id}`, { password: formData.password });
      setIsPasswordOpen(false);
      setToast({ message: 'Password updated successfully', type: 'success' });
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Derived lists ─────────────────────────────────────────────────────────
  const isTeamTab = activeTab === 'team';

  const filteredMembers = members.filter(m => {
    if (m.role === 'COMPANY_OWNER' || m.role === 'CLIENT' || m.role === 'SUBCONTRACTOR') return false;
    const matchSearch = m.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = filterRole === 'All Roles' || m.role === filterRole;
    return matchSearch && matchRole;
  });

  const filteredSubcontractors = members.filter(m => {
    if (m.role !== 'SUBCONTRACTOR') return false;
    const matchSearch = m.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  const filteredClients = clients.filter(c =>
    c.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleAddClick = () => {
    let defaultRole = 'WORKER';
    if (activeTab === 'clients') defaultRole = 'CLIENT';
    if (activeTab === 'subcontractors') defaultRole = 'SUBCONTRACTOR';
    
    setFormData(emptyForm(defaultRole));
    setIsAddOpen(true);
  };

  const handleSaveAdd = async () => {
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    if (!formData.fullName || !formData.email || !formData.password) {
      alert('Full Name, Email, and Password are required.');
      return;
    }
    try {
      setIsSubmitting(true);
      await api.post('/auth/users', { ...formData });
      if (activeTab === 'clients') fetchClients(); else fetchMembers();
      setIsAddOpen(false);
      setToast({ message: 'User added successfully!', type: 'success' });
    } catch (error) {
      console.error('Error adding user:', error);
      if (error.response?.status === 403) {
        setToast({ 
          message: error.response?.data?.message || 'User limit reached for your plan. Please upgrade your plan to add more team members.', 
          type: 'error' 
        });
      } else {
        setToast({ 
          message: error.response?.data?.message || 'Failed to create user.', 
          type: 'error' 
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleView = (member) => {
    setSelectedMember(member);
    setIsViewOpen(true);
  };

  const handleEdit = (member) => {
    const target = member?._id ? member : selectedMember;
    setSelectedMember(target);
    setFormData({ ...target, password: '', confirmPassword: '' });
    setIsEditOpen(true);
    setIsViewOpen(false);
  };

  const handleSaveEdit = async () => {
    try {
      setIsSubmitting(true);
      await api.patch(`/auth/users/${selectedMember._id}`, formData);
      if (activeTab === 'clients') fetchClients(); else fetchMembers();
      setIsEditOpen(false);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update user.');
      console.error('Error updating user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (member) => {
    const target = member?._id ? member : selectedMember;
    setSelectedMember(target);
    setIsDeleteOpen(true);
    setIsViewOpen(false);
  };

  const confirmDelete = async () => {
    try {
      setIsSubmitting(true);
      await api.delete(`/auth/users/${selectedMember._id}`);
      if (activeTab === 'clients') fetchClients(); else fetchMembers();
      setIsDeleteOpen(false);
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentRoleOptions = activeTab === 'clients' ? CLIENT_ROLE_OPTIONS : TEAM_ROLE_OPTIONS;
  const currentLoading = activeTab === 'clients' ? clientsLoading : membersLoading;
  const currentList = activeTab === 'team' ? filteredMembers : (activeTab === 'subcontractors' ? filteredSubcontractors : filteredClients);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Role Management</h1>
          <p className="text-slate-500 text-sm">Manage team members and clients.</p>
        </div>
        <button
          onClick={handleAddClick}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-lg shadow-blue-200 transition"
        >
          <Plus size={18} /> {isTeamTab ? 'Add Member' : 'Add Client'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => { setActiveTab('team'); setSearchQuery(''); setFilterRole('All Roles'); }}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'team' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Users size={16} /> Team Members
          <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'team' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
            {members.filter(m => m.role !== 'COMPANY_OWNER' && m.role !== 'CLIENT' && m.role !== 'SUBCONTRACTOR').length}
          </span>
        </button>
        <button
          onClick={() => { setActiveTab('subcontractors'); setSearchQuery(''); setFilterRole('All Roles'); }}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'subcontractors' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Shield size={16} /> Subcontractors
          <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'subcontractors' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
            {members.filter(m => m.role === 'SUBCONTRACTOR').length}
          </span>
        </button>
        <button
          onClick={() => { setActiveTab('clients'); setSearchQuery(''); setFilterRole('All Roles'); }}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'clients' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Briefcase size={16} /> Clients
          <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'clients' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
            {clients.length}
          </span>
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
            <input
              type="text"
              placeholder={activeTab === 'team' ? 'Search team members...' : (activeTab === 'subcontractors' ? 'Search subcontractors...' : 'Search clients...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition"
            />
          </div>
          {(activeTab === 'team' || activeTab === 'subcontractors') && (
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 outline-none cursor-pointer hover:border-blue-500 transition"
            >
              <option>All Roles</option>
              {activeTab === 'team' ? (
                <>
                  <option value="PM">Project Manager</option>
                  <option value="FOREMAN">Site Foreman</option>
                  <option value="WORKER">Worker</option>
                </>
              ) : (
                <option value="SUBCONTRACTOR">Subcontractor</option>
              )}
            </select>
          )}
        </div>

        {currentLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader className="animate-spin text-blue-500" size={32} />
          </div>
        ) : (
          <UserTable
            users={currentList}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onManagePermissions={handleManagePermissions}
            onChangePassword={handleChangePassword}
            emptyMessage={activeTab === 'team' ? 'No team members found.' : (activeTab === 'subcontractors' ? 'No subcontractors found.' : 'No clients found.')}
          />
        )}
      </div>

      {/* ─── Modals ─────────────────────────────────────────────── */}

      {/* Add Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title={isTeamTab ? 'Add Team Member' : 'Add Client'}>
        <UserForm
          data={formData}
          setData={setFormData}
          onSubmit={handleSaveAdd}
          submitLabel={isSubmitting ? 'Saving...' : (isTeamTab ? 'Add Member' : 'Add Client')}
          roleOptions={allRoles.length > 0 ? (isTeamTab ? allRoles.filter(r => ['PM', 'FOREMAN', 'WORKER', 'SUBCONTRACTOR'].includes(r.name)) : allRoles.filter(r => r.name === 'CLIENT')) : currentRoleOptions}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Details">
        <UserForm
          data={formData}
          setData={setFormData}
          onSubmit={handleSaveEdit}
          submitLabel={isSubmitting ? 'Saving...' : 'Save Changes'}
          isEdit={true}
          roleOptions={allRoles.length > 0 ? (isTeamTab ? allRoles.filter(r => ['PM', 'FOREMAN', 'WORKER', 'SUBCONTRACTOR'].includes(r.name)) : allRoles.filter(r => r.name === 'CLIENT')) : currentRoleOptions}
        />
      </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Profile">
        {selectedMember && (
          <div className="text-center space-y-6">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-3xl font-bold border-4 border-slate-100 shadow-md mb-3">
                {selectedMember.fullName?.charAt(0)}
              </div>
              <h3 className="text-xl font-bold text-slate-800">{selectedMember.fullName}</h3>
              <p className="text-slate-500 text-sm uppercase font-bold">{selectedMember.role}</p>
              <StatusBadge status={selectedMember.status} />
            </div>
            <div className="grid grid-cols-2 gap-4 text-left bg-slate-50 p-4 rounded-xl">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Email</p>
                <p className="text-sm font-medium text-slate-800 break-all">{selectedMember.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Phone</p>
                <p className="text-sm font-medium text-slate-800">{selectedMember.phone || '---'}</p>
              </div>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button onClick={() => handleEdit(selectedMember)} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium flex justify-center items-center gap-2">
                <Edit size={16} /> Edit Profile
              </button>
              <button onClick={() => handleDelete(selectedMember)} className="flex-1 bg-white border border-red-200 text-red-600 py-2 rounded-lg hover:bg-red-50 transition font-medium flex justify-center items-center gap-2">
                <Trash2 size={16} /> Remove
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Permissions Modal */}
      <Modal isOpen={isPermissionsOpen} onClose={() => setIsPermissionsOpen(false)} title="Permission Matrix">
        {permissionsLoading ? (
          <div className="flex justify-center py-10">
            <Loader className="animate-spin text-blue-500" size={24} />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-slate-50 p-3 rounded-lg flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                {selectedMember?.fullName?.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{selectedMember?.fullName}</p>
                <p className="text-xs text-slate-500">Role: {selectedMember?.role}</p>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4">
              {Object.entries(
                allPermissions.reduce((acc, p) => {
                  if (!acc[p.module]) acc[p.module] = [];
                  acc[p.module].push(p);
                  return acc;
                }, {})
              ).map(([module, perms]) => (
                <div key={module} className="border border-slate-100 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 uppercase">
                    {module}
                  </div>
                  <div className="p-3 space-y-2">
                    {perms.map(p => {
                      const override = userPermissions.overrides.find(o => o.key === p.key);
                      const isAllowedByRole = userPermissions.rolePermissions.includes(p.key);
                      const isFinalAllowed = override ? override.isAllowed : isAllowedByRole;
                      const isOverridden = !!override;

                      return (
                        <div key={p.key} className="flex items-center justify-between group">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-700">{p.description || p.key}</span>
                            {isOverridden && (
                              <span className="text-[10px] text-orange-500 font-bold uppercase">
                                Overridden
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isOverridden && (
                              <button
                                onClick={() => handleResetOverride(p.key)}
                                className="text-[10px] text-slate-400 hover:text-slate-600 underline"
                              >
                                Reset
                              </button>
                            )}
                            <div
                              onClick={() => handleToggleOverride(p.key, override)}
                              className={`w-10 h-5 rounded-full transition-colors cursor-pointer relative ${isFinalAllowed ? 'bg-emerald-500' : 'bg-slate-200'}`}
                            >
                              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isFinalAllowed ? 'left-6' : 'left-1'}`} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setIsPermissionsOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePermissions}
                disabled={isSubmitting}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-200"
              >
                {isSubmitting ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Remove User">
        <div className="text-center space-y-4">
          <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="text-red-600" size={32} />
          </div>
          <div>
            <p className="font-medium text-slate-800">Remove from system?</p>
            <p className="text-sm text-slate-500 mt-1">
              Are you sure you want to remove <b>{selectedMember?.fullName}</b>?<br />
              Their access to the platform will be revoked immediately.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button onClick={() => setIsDeleteOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition font-medium">
              Cancel
            </button>
            <button onClick={confirmDelete} disabled={isSubmitting} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition font-medium shadow-lg shadow-red-200 disabled:opacity-50 flex items-center gap-2">
              {isSubmitting && <Loader size={14} className="animate-spin" />}
              Remove Access
            </button>
          </div>
        </div>
      </Modal>

      {/* Password Reset Modal */}
      <Modal isOpen={isPasswordOpen} onClose={() => setIsPasswordOpen(false)} title="Change User Password">
        <div className="space-y-4">
          <div className="bg-emerald-50 p-4 rounded-xl flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
              {selectedMember?.fullName?.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{selectedMember?.fullName}</p>
              <p className="text-xs text-slate-500">Resetting access credentials</p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">New Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="password"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-500 transition font-mono"
                placeholder="••••••••"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Confirm New Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-500 transition font-mono"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => setIsPasswordOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePassword}
              disabled={isSubmitting}
              className="px-6 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-100 flex items-center gap-2"
            >
              <Save size={18} />
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Team;
