import { Save, Lock, Camera, Briefcase, RefreshCw, UserCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const Profile = () => {
    const { user, updateUserData } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [profile, setProfile] = useState({
        fullName: '',
        email: '',
        role: '',
        avatar: null,
        phone: ''
    });

    const [password, setPassword] = useState({
        current: '',
        new: '',
        confirm: ''
    });

    // Sync with auth user if available
    useEffect(() => {
        if (user) {
            setProfile({
                fullName: user.fullName || '',
                email: user.email || '',
                role: user.role || '',
                avatar: user.avatar || null,
                phone: user.phone || ''
            });
        }
    }, [user]);

    const handleProfileSave = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const data = new FormData();
            data.append('fullName', profile.fullName);
            data.append('email', profile.email);
            data.append('phone', profile.phone);
            if (profile.avatarFile) {
                data.append('avatar', profile.avatarFile);
            }

            const res = await api.patch('/auth/profile', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            updateUserData(res.data);
            toast.success("Profile details updated successfully.");
        } catch (err) {
            console.error('Failed to update profile:', err);
            toast.error(err.response?.data?.message || "Failed to update profile");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (password.new !== password.confirm) {
            toast.error("New passwords do not match.");
            return;
        }
        setIsSubmitting(true);
        try {
            await api.patch('/auth/updatepassword', {
                currentPassword: password.current,
                newPassword: password.new
            });
            toast.success("Password reset successfully.");
            setPassword({ current: '', new: '', confirm: '' });
        } catch (err) {
            console.error('Failed to reset password:', err);
            toast.error(err.response?.data?.message || "Failed to reset password");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfile({ ...profile, avatarFile: file, avatarPreview: URL.createObjectURL(file) });
        }
    };

    const tabs = [
        { id: 'profile', label: 'Profile Settings', icon: UserCircle },
    ];

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <div>
                <h1 className="text-3xl font-bold text-slate-800">My Profile</h1>
                <p className="text-slate-500 text-sm">Manage your account settings, view work history, and check sync status.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 space-y-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-sm
                                ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
                                }
                            `}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="flex-1">
                    {activeTab === 'profile' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Personal Details</h3>
                                <form onSubmit={handleProfileSave} className="space-y-4">
                                    <div className="flex items-center gap-6 mb-6">
                                        <div className="relative group">
                                            <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-600 overflow-hidden border-4 border-slate-50">
                                                {profile.avatarPreview || profile.avatar ? (
                                                    <img src={profile.avatarPreview || profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                                                ) : (
                                                    (profile.fullName || 'User').split(' ').map(n => n[0]).join('')
                                                )}
                                            </div>
                                            <label className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md border border-slate-100 text-blue-600 hover:scale-110 transition cursor-pointer">
                                                <Camera size={16} />
                                                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                            </label>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-lg">{profile.fullName || 'Not Set'}</h4>
                                            <p className="text-slate-500 text-sm tracking-widest uppercase font-black text-[10px]">{profile.role}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
                                            <input
                                                type="text"
                                                value={profile.fullName}
                                                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 transition"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                            <input
                                                type="text"
                                                value={profile.role}
                                                disabled
                                                className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 text-slate-500 cursor-not-allowed uppercase font-black text-xs"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                                        <input
                                            type="email"
                                            value={profile.email}
                                            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 transition"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                                        <input
                                            type="text"
                                            value={profile.phone}
                                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 transition"
                                        />
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <button 
                                            type="submit" 
                                            disabled={isSubmitting}
                                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition shadow-lg shadow-blue-200 disabled:opacity-50"
                                        >
                                            {isSubmitting ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />} Update Details
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4 flex items-center gap-2">
                                    <Lock size={20} className="text-blue-600" /> Security
                                </h3>
                                <form onSubmit={handlePasswordReset} className="space-y-4">
                                    {user?.role !== 'CLIENT' && (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                                            <input
                                                type="password"
                                                value={password.current}
                                                onChange={(e) => setPassword({ ...password, current: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 transition"
                                                required
                                            />
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                                            <input
                                                type="password"
                                                value={password.new}
                                                onChange={(e) => setPassword({ ...password, new: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 transition"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                                            <input
                                                type="password"
                                                value={password.confirm}
                                                onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-blue-500 transition"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <button 
                                            type="submit" 
                                            disabled={isSubmitting}
                                            className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-lg font-medium transition shadow-lg disabled:opacity-50"
                                        >
                                            {isSubmitting ? 'Changing...' : 'Change Password'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
