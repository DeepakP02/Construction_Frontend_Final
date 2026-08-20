
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CheckCircle, Zap, Shield, Loader, AlertTriangle, Package } from 'lucide-react';
import api from '../../utils/api';
import Modal from '../../components/Modal';

const Plans = () => {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [featureInput, setFeatureInput] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        price: '',
        period: 'month',
        features: [],
        maxUsers: 10,
        maxProjects: 5,
        isPopular: false
    });

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const response = await api.get('/plans');
            setPlans(response.data);
        } catch (error) {
            console.error('Error fetching plans:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAddModal = () => {
        setEditingPlan(null);
        setFormData({
            name: '',
            price: '',
            period: 'month',
            features: [],
            maxUsers: 10,
            maxProjects: 5,
            isPopular: false
        });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (plan) => {
        setEditingPlan(plan);
        setFormData({
            name: plan.name,
            price: plan.price,
            period: plan.period,
            features: plan.features || [],
            maxUsers: plan.maxUsers,
            maxProjects: plan.maxProjects,
            isPopular: plan.isPopular
        });
        setIsModalOpen(true);
    };

    const handleAddFeature = () => {
        if (featureInput.trim()) {
            setFormData({
                ...formData,
                features: [...formData.features, featureInput.trim()]
            });
            setFeatureInput('');
        }
    };

    const handleRemoveFeature = (index) => {
        const newFeatures = [...formData.features];
        newFeatures.splice(index, 1);
        setFormData({ ...formData, features: newFeatures });
    };

    const handleOpenDeleteModal = (id) => {
        setDeletingId(id);
        setIsDeleteModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            if (editingPlan) {
                await api.patch(`/plans/${editingPlan._id}`, formData);
            } else {
                await api.post('/plans', formData);
            }
            fetchPlans();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving plan:', error);
            alert(error.response?.data?.message || 'Error saving plan');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteClick = (id) => {
        setDeletingId(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        setActionLoading(true);
        try {
            await api.delete(`/plans/${deletingId}`);
            fetchPlans();
            setIsDeleteModalOpen(false);
        } catch (error) {
            console.error('Error deleting plan:', error);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader className="animate-spin text-blue-600" size={48} />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Plans & Pricing</h1>
                    <p className="text-slate-500 mt-1 text-sm uppercase font-bold tracking-wider">Manage Subscription Tiers</p>
                </div>
                <button
                    onClick={handleOpenAddModal}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                >
                    <Plus size={20} /> Create New Plan
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <div
                        key={plan._id}
                        className={`bg-white rounded-2xl p-8 border-2 transition-all relative overflow-hidden group hover:shadow-xl ${plan.isPopular ? 'border-blue-500 shadow-blue-500/10' : 'border-slate-100'}`}
                    >
                        {plan.isPopular && (
                            <div className="absolute top-4 right-4 bg-blue-500 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-lg">
                                Popular
                            </div>
                        )}

                        <div className="mb-6">
                            <h3 className="text-2xl font-bold text-slate-800">{plan.name}</h3>
                            <div className="flex items-baseline gap-1 mt-2">
                                <span className="text-4xl font-black text-slate-900">${plan.price}</span>
                                <span className="text-slate-500 font-medium">/{plan.period}</span>
                            </div>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div className="flex items-center gap-3 text-slate-600 font-medium">
                                <Zap size={18} className="text-blue-500" />
                                <span>{plan.maxUsers} Users Max</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600 font-medium">
                                <Shield size={18} className="text-emerald-500" />
                                <span>{plan.maxProjects} Projects Max</span>
                            </div>
                            <div className="pt-4 border-t border-slate-50 space-y-3">
                                {plan.features.map((feature, i) => (
                                    <div key={i} className="flex items-start gap-2 text-sm text-slate-600 italic">
                                        <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                        <span>{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2 pt-6 border-t border-slate-100">
                            <button
                                onClick={() => handleOpenEditModal(plan)}
                                className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 border border-slate-200"
                            >
                                <Edit size={16} /> Edit
                            </button>
                            <button
                                onClick={() => handleDeleteClick(plan._id)}
                                className="px-4 bg-red-50 hover:bg-red-100 text-red-600 py-2.5 rounded-xl font-bold transition flex items-center justify-center border border-red-100"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}

                {plans.length === 0 && (
                    <div className="col-span-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center">
                        <Package size={64} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="text-xl font-bold text-slate-800">No Plans Found</h3>
                        <p className="text-slate-500 mt-2">Start by creating your first subscription plan.</p>
                        <button
                            onClick={handleOpenAddModal}
                            className="mt-6 bg-white text-blue-600 border border-blue-200 px-6 py-2 rounded-lg font-bold hover:bg-blue-50 transition"
                        >
                            Create Plan
                        </button>
                    </div>
                )}
            </div>

            {/* Creation/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingPlan ? 'Edit Plan' : 'Create New Plan'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Plan Name</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                                placeholder="e.g., Enterprise"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Price ($)</label>
                            <input
                                type="number"
                                required
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                                placeholder="99"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Billing Period</label>
                            <select
                                value={formData.period}
                                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                            >
                                <option value="month">Monthly</option>
                                <option value="year">Yearly</option>
                            </select>
                        </div>
                        <div className="space-y-1.5 flex items-end">
                            <label className="flex items-center gap-3 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition">
                                <input
                                    type="checkbox"
                                    checked={formData.isPopular}
                                    onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-bold text-slate-700">Mark as Popular</span>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Max Users</label>
                            <input
                                type="number"
                                required
                                value={formData.maxUsers}
                                onChange={(e) => setFormData({ ...formData, maxUsers: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Max Projects</label>
                            <input
                                type="number"
                                required
                                value={formData.maxProjects}
                                onChange={(e) => setFormData({ ...formData, maxProjects: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Plan Features</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={featureInput}
                                onChange={(e) => setFeatureInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
                                placeholder="Add a feature..."
                                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                            />
                            <button
                                type="button"
                                onClick={handleAddFeature}
                                className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition"
                            >
                                Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {formData.features.map((feature, index) => (
                                <div key={index} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-100">
                                    {feature}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveFeature(index)}
                                        className="hover:text-red-500 transition"
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* No Role Permissions needed per user request */}

                    <button
                        type="submit"
                        disabled={actionLoading}
                        className="w-full py-4 bg-slate-900 text-white font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2 disabled:opacity-70 mt-4 shadow-xl"
                    >
                        {actionLoading ? <Loader size={20} className="animate-spin" /> : (editingPlan ? 'Update Plan' : 'Create Plan')}
                    </button>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirm Deletion"
            >
                <div className="p-4 text-center">
                    <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle size={40} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">Delete Plan?</h3>
                    <p className="text-slate-500 mb-8 font-medium">Are you sure you want to remove this plan? This will not affect existing subscribers but new users won't see it.</p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="flex-1 py-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={actionLoading}
                            className="flex-1 py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition flex items-center justify-center gap-2"
                        >
                            {actionLoading ? <Loader size={20} className="animate-spin" /> : 'Delete Plan'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Plans;
