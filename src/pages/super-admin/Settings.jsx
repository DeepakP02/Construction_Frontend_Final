import { Save, Lock, Camera, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import api, { getServerUrl } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';

const SuperAdminSettings = () => {
  const { user, updateUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    role: '',
    avatar: null
  });
  const [password, setPassword] = useState({
    new: '',
    confirm: ''
  });

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.fullName || 'Super Admin',
        email: user.email || 'admin@kaal.ca',
        role: user.role || 'SUPER_ADMIN',
        avatar: user.avatar || null
      });
    }
  }, [user]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.patch('/auth/profile', {
        fullName: profile.name,
        email: profile.email
      });
      updateUserData({
        fullName: response.data.fullName,
        email: response.data.email
      });
      toast.success("Profile details updated successfully.");
    } catch (error) {
      console.error("Profile update failed:", error);
      toast.error(error.response?.data?.message || "Failed to update profile details.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!password.new) {
      toast.error("Please enter a new password.");
      return;
    }
    if (password.new !== password.confirm) {
      toast.error("New passwords do not match.");
      return;
    }
    
    setLoading(true);
    try {
      await api.patch('/auth/updatepassword', { 
        newPassword: password.new 
      });
      toast.success("Password reset successfully.");
      setPassword({ new: '', confirm: '' });
    } catch (error) {
      console.error("Password update failed:", error);
      toast.error(error.response?.data?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('avatar', file);
      
      setLoading(true);
      try {
        const response = await api.patch('/auth/profile', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setProfile(prev => ({ ...prev, avatar: response.data.avatar }));
        updateUserData({ avatar: response.data.avatar });
        toast.success("Avatar updated successfully.");
      } catch (error) {
        console.error("Avatar upload failed:", error);
        toast.error("Failed to upload avatar.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Profile Settings</h1>
        <p className="text-slate-500 text-sm">Update your personal information and security credentials.</p>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Personal Details</h3>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="flex items-center gap-6 mb-6">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-600 overflow-hidden border-4 border-slate-50">
                  {profile.avatar ? (
                    <img src={getServerUrl(profile.avatar)} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    profile.name ? profile.name.split(' ').map(n => n[0]).join('') : 'SA'
                  )}
                </div>
                <label className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md border border-slate-100 text-blue-600 hover:scale-110 transition cursor-pointer">
                  <Camera size={16} />
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-lg">{profile.name}</h4>
                <p className="text-slate-500 text-sm capitalize">{profile.role.replace('_', ' ').toLowerCase()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <input
                  type="text"
                  value={profile.role}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 transition"
                required
              />
            </div>
            <div className="flex justify-end pt-2">
              <button 
                type="submit" 
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition shadow-lg shadow-blue-200 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} 
                Update Details
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4 flex items-center gap-2">
            <Lock size={20} className="text-blue-600" /> Security
          </h3>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={password.new}
                  onChange={(e) => setPassword({ ...password, new: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 transition"
                  placeholder="Enter new password"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={password.confirm}
                  onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:border-blue-500 transition"
                  placeholder="Confirm new password"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button 
                type="submit" 
                disabled={loading}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-lg font-medium transition shadow-lg disabled:opacity-50"
              >
                {loading && <Loader2 className="animate-spin" size={18} />}
                Change Password
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminSettings;
