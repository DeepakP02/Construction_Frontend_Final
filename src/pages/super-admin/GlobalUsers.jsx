import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Shield, Building, Mail, Calendar, RefreshCw, MoreVertical, CheckCircle, XCircle } from 'lucide-react';
import api from '../../utils/api';

const GlobalUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/super-admin/users');
            setUsers(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching users:', err);
            setError('Failed to load global user directory.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const filteredUsers = users.filter(user =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.companyId?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && users.length === 0) {
        return (
            <div className="flex h-96 items-center justify-center">
                <RefreshCw className="animate-spin text-blue-600" size={48} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Global Users</h1>
                    <p className="text-slate-500 text-sm">Monitor and manage all users across the entire KAAL network.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchUsers} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                        <RefreshCw size={20} />
                    </button>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search name, email, or company..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-80 shadow-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-500">
                        <thead className="bg-slate-50 text-slate-700">
                            <tr>
                                <th className="px-6 py-4 font-bold border-b border-slate-100">User</th>
                                <th className="px-6 py-4 font-bold border-b border-slate-100">Role</th>
                                <th className="px-6 py-4 font-bold border-b border-slate-100">Company</th>
                                <th className="px-6 py-4 font-bold border-b border-slate-100">Joined</th>
                                <th className="px-6 py-4 font-bold border-b border-slate-100">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map((user) => (
                                <tr key={user._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200 shadow-sm">
                                                {user.fullName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{user.fullName}</div>
                                                <div className="text-xs text-slate-400 flex items-center gap-1">
                                                    <Mail size={12} /> {user.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${user.role === 'SUPER_ADMIN' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                                            user.role === 'COMPANY_OWNER' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                'bg-slate-100 text-slate-600 border border-slate-200'
                                            }`}>
                                            {user.role.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-600">
                                        <div className="flex items-center gap-1.5">
                                            <Building size={14} className="text-slate-400" />
                                            {user.companyId?.name || 'ConstructOS Admin'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`flex items-center gap-1.5 font-bold text-[10px] uppercase ${user.isActive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {user.isActive ? (
                                                <><CheckCircle size={14} /> Active</>
                                            ) : (
                                                <><XCircle size={14} /> Inactive</>
                                            )}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center text-slate-400">
                                        <Users size={40} className="mx-auto mb-3 opacity-20" />
                                        <p className="text-lg font-medium">No users found</p>
                                        <p className="text-sm">Try adjusting your search terms.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GlobalUsers;
