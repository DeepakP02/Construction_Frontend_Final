import { useState, useEffect } from 'react';
import {
    Users, Search, Filter, Mail, Phone, MapPin,
    ExternalLink, Building, Plus, Trash2, Loader, Save,
    UserX, UserCheck, AlertTriangle, CheckCircle
} from 'lucide-react';
import Modal from '../../components/Modal';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/Toast';

const Clients = () => {
    const { user } = useAuth();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
    const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({ fullName: '', email: '', phone: '', address: '', company: '', password: '' });

    const canManage = user?.role === 'COMPANY_OWNER' || user?.role === 'SUPER_ADMIN';

    const fetchClients = async () => {
        try {
            setLoading(true);
            const res = await api.get('/auth/users?role=CLIENT');
            setClients(res.data);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    useEffect(() => {
        if (user?.companyId && isModalOpen) {
            setFormData(prev => ({ ...prev, company: user.companyId }));
        }
    }, [user, isModalOpen]);

    const handleCreate = async () => {
        if (!formData.password) {
            alert('Password is required');
            return;
        }
        try {
            await api.post('/auth/users', {
                ...formData,
                role: 'CLIENT'
            });
            fetchClients();
            setIsModalOpen(false);
            setFormData({ fullName: '', email: '', phone: '', address: '', company: user?.companyId || '', password: '' });
            setToast({ message: 'Client added successfully!', type: 'success' });
        } catch (error) {
            console.error('Error creating client:', error);
            setToast({ message: error.response?.data?.message || 'Failed to create client', type: 'error' });
        }
    };

    const handleOpenDeactivate = (client) => {
        setSelectedClient(client);
        setIsDeactivateModalOpen(true);
    };

    const handleOpenReactivate = (client) => {
        setSelectedClient(client);
        setIsReactivateModalOpen(true);
    };

    const confirmDeactivate = async () => {
        if (!selectedClient) return;
        try {
            setIsSubmitting(true);
            const res = await api.delete(`/auth/users/${selectedClient._id}`);
            await fetchClients();
            setIsDeactivateModalOpen(false);
            setToast({
                message: res.data?.message || `Client ${selectedClient.fullName} deactivated successfully. Historical records preserved.`,
                type: 'success'
            });
        } catch (error) {
            console.error('Error deactivating client:', error);
            setToast({
                message: error.response?.data?.message || 'Failed to deactivate client.',
                type: 'error'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmReactivate = async () => {
        if (!selectedClient) return;
        try {
            setIsSubmitting(true);
            const res = await api.patch(`/auth/users/${selectedClient._id}/reactivate`);
            await fetchClients();
            setIsReactivateModalOpen(false);
            setToast({
                message: res.data?.message || `Client ${selectedClient.fullName} reactivated successfully.`,
                type: 'success'
            });
        } catch (error) {
            console.error('Error reactivating client:', error);
            setToast({
                message: error.response?.data?.message || 'Failed to reactivate client.',
                type: 'error'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const stats = {
        total: clients.length,
        active: clients.filter(c => c.isActive !== false).length,
        inactive: clients.filter(c => c.isActive === false).length
    };


    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Client Management</h1>
                    <p className="text-slate-500 text-sm">Manage client relationships and contacts.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200 font-medium"
                >
                    <Plus size={18} /> Add Client
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-3.5 md:p-4 rounded-xl md:rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1">Total Clients</p>
                    <p className="text-xl font-black text-slate-800 leading-none">{stats.total}</p>
                </div>
                <div className="bg-white p-3.5 md:p-4 rounded-xl md:rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1">Active</p>
                    <p className="text-xl font-black text-emerald-600 leading-none">{stats.active}</p>
                </div>
                <div className="bg-white p-3.5 md:p-4 rounded-xl md:rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1">Deactivated</p>
                    <p className="text-xl font-black text-slate-400 leading-none">{stats.inactive}</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4 justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search clients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader size={48} className="animate-spin text-blue-600" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {clients.filter(c => c.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || c.email?.toLowerCase().includes(searchTerm.toLowerCase())).map(client => (
                        <div key={client._id} className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition group">
                            <div className="p-3.5 md:p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <Building size={18} />
                                    </div>
                                    {canManage && client._id !== user?._id && (
                                        client.isActive !== false ? (
                                            <button
                                                onClick={() => handleOpenDeactivate(client)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                title="Deactivate Client"
                                            >
                                                <UserX size={18} />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleOpenReactivate(client)}
                                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                                title="Reactivate Client"
                                            >
                                                <UserCheck size={18} />
                                            </button>
                                        )
                                    )}
                                </div>
                                <h3 className="text-base font-black text-slate-800 tracking-tight leading-none mb-1">{client.fullName}</h3>
                                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 mb-3">
                                    <MapPin size={12} className="text-slate-400" /> {client.address || 'No address'}
                                </div>

                                <div className="space-y-2.5 pt-3.5 border-t border-slate-50">
                                    {client.company && (
                                        <div className="flex items-center gap-2.5 text-xs font-bold text-slate-600">
                                            <Building size={14} className="text-slate-400" />
                                            <span className="truncate">{client.company}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2.5 text-xs font-bold">
                                        <Mail size={14} className="text-slate-400" />
                                        <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline truncate">{client.email}</a>
                                    </div>
                                    {client.phone && (
                                        <div className="flex items-center gap-2.5 text-xs font-bold text-slate-600">
                                            <Phone size={14} className="text-slate-400" />
                                            <span className="truncate">{client.phone}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="bg-slate-50/50 px-3.5 md:px-4 py-2 border-t border-slate-100 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 ${client.isActive !== false ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${client.isActive !== false ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                    {client.isActive !== false ? 'Active' : 'Deactivated'}
                                </span>
                            </div>
                        </div>
                    ))}

                    {clients.length === 0 && (
                        <div className="col-span-full text-center py-12 text-slate-400">
                            No clients found. Add your first client to get started.
                        </div>
                    )}
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Client">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            value={formData.fullName}
                            onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500"
                            placeholder="John Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500"
                            placeholder="john@example.com"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500"
                                placeholder="(555) 123-4567"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
                            <input
                                type="text"
                                value={formData.company}
                                onChange={e => setFormData({ ...formData, company: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500"
                                placeholder="Acme Corp"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                        <input
                            type="text"
                            value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500"
                            placeholder="123 Main St, City, State"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500"
                            placeholder="******"
                        />
                    </div>

                    <div className="flex justify-end pt-4">
                        <button onClick={handleCreate} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium transition flex items-center gap-2">
                            <Save size={18} /> Add Client
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Deactivate Client Modal */}
            <Modal
                isOpen={isDeactivateModalOpen}
                onClose={() => setIsDeactivateModalOpen(false)}
                title="Deactivate Client Account"
            >
                <div className="space-y-4 text-center">
                    <div className="bg-rose-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-rose-600">
                        <AlertTriangle size={32} />
                    </div>
                    <div>
                        <p className="font-semibold text-slate-800 text-base">Deactivate account for {selectedClient?.fullName}?</p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedClient?.email} • Client</p>

                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left text-xs text-amber-800 space-y-1.5">
                            <p className="font-semibold flex items-center gap-1.5 text-amber-900">
                                <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
                                Access Revocation Notice
                            </p>
                            <p>• Client portal and mobile access will be revoked immediately.</p>
                            <p>• <b>All historical records are safely preserved:</b> Associated projects, estimates, invoices, RFIs, and chat history remain intact.</p>
                            <p>• Access can be reactivated at any time by a Company Owner.</p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={() => setIsDeactivateModalOpen(false)}
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition font-medium text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDeactivate}
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition font-medium shadow-lg shadow-rose-200 disabled:opacity-50 flex items-center gap-2 text-sm"
                        >
                            {isSubmitting && <Loader size={14} className="animate-spin" />}
                            Deactivate Client
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Reactivate Client Modal */}
            <Modal
                isOpen={isReactivateModalOpen}
                onClose={() => setIsReactivateModalOpen(false)}
                title="Reactivate Client Account"
            >
                <div className="space-y-4 text-center">
                    <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                        <CheckCircle size={32} />
                    </div>
                    <div>
                        <p className="font-semibold text-slate-800 text-base">Reactivate account for {selectedClient?.fullName}?</p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedClient?.email} • Client</p>

                        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-left text-xs text-emerald-800 space-y-1.5">
                            <p className="font-semibold flex items-center gap-1.5 text-emerald-900">
                                <CheckCircle size={14} className="text-emerald-600 flex-shrink-0" />
                                Access Restoration Notice
                            </p>
                            <p>• Client portal and mobile login access will be restored immediately.</p>
                            <p>• They will be able to view their assigned projects, invoices, and message history again.</p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={() => setIsReactivateModalOpen(false)}
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition font-medium text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmReactivate}
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition font-medium shadow-lg shadow-emerald-200 disabled:opacity-50 flex items-center gap-2 text-sm"
                        >
                            {isSubmitting && <Loader size={14} className="animate-spin" />}
                            Reactivate Client
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

export default Clients;
