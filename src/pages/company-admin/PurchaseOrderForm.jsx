import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
    ChevronLeft, Plus, Trash2, Save, FileText,
    Truck, Calendar, DollarSign, Briefcase, Info, Mail
} from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import '../../styles/PurchaseOrders.css';

const PurchaseOrderForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const isEdit = !!id;

    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [formData, setFormData] = useState({
        projectId: location.state?.projectId || '',
        jobId: '',
        vendorName: '',
        vendorEmail: '',
        poDate: new Date().toISOString().split('T')[0],
        expectedDeliveryDate: '',
        notesToVendor: '',
        items: [
            { itemName: '', description: '', quantity: 1, unitPrice: 0, total: 0 }
        ],
        subtotal: 0,
        tax: 0,
        totalAmount: 0
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const projectsRes = await api.get('/projects');
                setProjects(projectsRes.data);

                if (isEdit) {
                    setLoading(true);
                    const poRes = await api.get(`/purchase-orders/${id}`);
                    const po = poRes.data;
                    setFormData({
                        ...po,
                        projectId: po.projectId?._id || po.projectId || '',
                        jobId: po.jobId?._id || po.jobId || '',
                        vendorId: po.vendorId?._id || po.vendorId || '',
                        poDate: new Date(po.createdAt).toISOString().split('T')[0],
                        expectedDeliveryDate: po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toISOString().split('T')[0] : ''
                    });
                }
            } catch (error) {
                console.error('Error fetching PO data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, isEdit]);

    // Fetch jobs when projectId changes
    useEffect(() => {
        const fetchJobs = async () => {
            if (formData.projectId) {
                try {
                    const res = await api.get(`/jobs?projectId=${formData.projectId}`);
                    setJobs(res.data);
                } catch (err) {
                    console.error('Error fetching jobs:', err);
                }
            } else {
                setJobs([]);
            }
        };
        fetchJobs();
    }, [formData.projectId]);

    // Auto-calculate totals whenever items change
    useEffect(() => {
        const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const tax = subtotal * 0.15; // Assuming 15% tax for now, could be dynamic
        setFormData(prev => ({
            ...prev,
            subtotal,
            tax,
            totalAmount: subtotal + tax
        }));
    }, [formData.items]);

    const handleAddItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { itemName: '', description: '', quantity: 1, unitPrice: 0, total: 0 }]
        });
    };

    const handleRemoveItem = (index) => {
        if (formData.items.length === 1) return;
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = field === 'quantity' || field === 'unitPrice' ? Number(value) : value;
        newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
        setFormData({ ...formData, items: newItems });
    };

    const handleSubmit = async (statusOverride = null) => {
        // Validate items
        const validItems = formData.items.filter(item => item.itemName.trim() !== '');
        
        if (validItems.length === 0) {
            toast.error('Please add at least one item with a name.');
            return;
        }

        try {
            setLoading(true);
            const status = statusOverride || formData.status || (user.role === 'FOREMAN' ? 'Draft' : 'Pending Approval');
            const payload = { 
                ...formData, 
                items: validItems,
                status,
                vendorId: formData.vendorId || null,
                jobId: formData.jobId || null
            };

            if (isEdit) {
                await api.patch(`/purchase-orders/${id}`, payload);
                toast.success('Purchase Order updated');
            } else {
                await api.post('/purchase-orders', payload);
                toast.success('Purchase Order created');
            }
            navigate('/company-admin/purchase-orders');
        } catch (error) {
            console.error('Error saving PO:', error);
            const errorMessage = error.response?.data?.message || 'Failed to save Purchase Order';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEdit) return <div className="flex h-96 items-center justify-center">Loading...</div>;

    return (
        <div className="pb-20 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tighter">
                            {isEdit ? 'Edit Purchase Order' : 'Create Purchase Order'}
                        </h1>
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                            <Info size={14} className="text-blue-600" />
                            {['FOREMAN', 'PM', 'COMPANY_OWNER'].includes(user.role) ? 'Submitting PO Requisition' : 'Project Material Procurement'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Form Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Details & Items */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Details */}
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200/60 space-y-6">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Basic Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Briefcase size={14} className="text-blue-600" /> Project
                                </label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all appearance-none"
                                    value={formData.projectId}
                                    onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                                >
                                    <option value="">Select Project</option>
                                    {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Briefcase size={14} className="text-blue-600" /> Job (Optional)
                                </label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all appearance-none"
                                    value={formData.jobId}
                                    onChange={e => setFormData({ ...formData, jobId: e.target.value })}
                                >
                                    <option value="">Select Job</option>
                                    {jobs.map(j => <option key={j._id} value={j._id}>{j.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Truck size={14} className="text-blue-600" /> Vendor Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter Vendor Name"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all"
                                    value={formData.vendorName}
                                    onChange={e => setFormData({ ...formData, vendorName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Mail size={14} className="text-blue-600" /> Vendor Email
                                </label>
                                <input
                                    type="email"
                                    placeholder="Enter Vendor Email"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all"
                                    value={formData.vendorEmail}
                                    onChange={e => setFormData({ ...formData, vendorEmail: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Calendar size={14} className="text-blue-600" /> Date
                                </label>
                                <input
                                    type="date"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all"
                                    value={formData.poDate}
                                    onChange={e => setFormData({ ...formData, poDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Calendar size={14} className="text-blue-600" /> Expected Delivery
                                </label>
                                <input
                                    type="date"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-800 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all"
                                    value={formData.expectedDeliveryDate}
                                    onChange={e => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200/60 space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Line Items</h3>
                            <button
                                onClick={handleAddItem}
                                className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:text-blue-700"
                            >
                                <Plus size={14} /> Add Item
                            </button>
                        </div>

                        <div className="space-y-3">
                            {formData.items.map((item, index) => (
                                <div key={index} className="group relative bg-slate-50/50 hover:bg-white p-5 rounded-[28px] border border-slate-100 hover:border-blue-200/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
                                    <div className="flex flex-col md:flex-row gap-6">
                                        {/* Item Identification */}
                                        <div className="flex-1 space-y-3">
                                            <div className="space-y-1">
                                                <input
                                                    type="text"
                                                    placeholder="Item Name (e.g. Concrete mix)"
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 font-black text-slate-800 text-sm outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all"
                                                    value={item.itemName}
                                                    onChange={e => handleItemChange(index, 'itemName', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <input
                                                    type="text"
                                                    placeholder="Detailed description or SKU..."
                                                    className="w-full bg-white/50 border border-slate-100 rounded-xl px-4 py-2 font-bold text-slate-500 text-[10px] outline-none focus:border-blue-400/30 focus:ring-4 focus:ring-blue-400/5 transition-all"
                                                    value={item.description}
                                                    onChange={e => handleItemChange(index, 'description', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {/* Pricing & Math */}
                                        <div className="flex items-start gap-4 md:w-auto w-full">
                                            <div className="w-24">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Qty</label>
                                                <input
                                                    type="number"
                                                    placeholder="0"
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 font-black text-slate-800 text-sm text-center outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all"
                                                    value={item.quantity}
                                                    onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                                />
                                            </div>
                                            {/* Price fields commented out as per client request */}
                                            {/* <div className="w-32">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Unit Price</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                                                    <input
                                                        type="number"
                                                        placeholder="0.00"
                                                        className="w-full bg-white border border-slate-200 rounded-xl pl-6 pr-3 py-2.5 font-black text-slate-800 text-sm text-right outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all"
                                                        value={item.unitPrice}
                                                        onChange={e => handleItemChange(index, 'unitPrice', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="min-w-[100px]">
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 text-right mr-1">Total</label>
                                                <div className="py-2.5 px-3 bg-blue-50/50 border border-blue-100/50 rounded-xl text-right font-black text-blue-600 text-sm">
                                                    ${item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </div>
                                            </div> */}
                                            <div className="pt-8">
                                                <button
                                                    onClick={() => handleRemoveItem(index)}
                                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Remove Item"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Side: Summary & Actions */}
                <div className="space-y-6">
                    <div className="bg-slate-900 p-8 rounded-[40px] shadow-2xl text-white space-y-8 sticky top-6">
                        {/* Summary section commented out as per client request */}
                        {/* <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">PO Summary</h3>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-bold text-slate-400">Subtotal</span>
                                <span className="font-black text-slate-200">${formData.subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-bold text-slate-400">Tax (15%)</span>
                                <span className="font-black text-slate-200">${formData.tax.toLocaleString()}</span>
                            </div>
                            <div className="h-px bg-slate-800 my-4" />
                            <div className="flex justify-between items-center">
                                <span className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Total Amount</span>
                                <span className="text-2xl font-black text-blue-400 tracking-tighter">${formData.totalAmount.toLocaleString()}</span>
                            </div>
                        </div> */}

                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Quick Notes</h3>
                            <textarea
                                rows="3"
                                className="w-full bg-slate-800 border-none rounded-2xl p-4 text-xs font-bold text-slate-300 placeholder:text-slate-600 focus:ring-0 resize-none"
                                placeholder="Notes for vendor..."
                                value={formData.notesToVendor}
                                onChange={e => setFormData({ ...formData, notesToVendor: e.target.value })}
                            />
                        </div>

                        <div className="space-y-3 pt-4">
                            <button
                                onClick={() => handleSubmit()}
                                // disabled={loading || !formData.projectId || !formData.vendorName || !formData.items.some(item => item.itemName.trim() !== '')}

                                disabled={loading || !formData.projectId}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-900/40 transition-all flex items-center justify-center gap-3 uppercase text-xs tracking-widest"
                            >
                                <Save size={18} />
                                {['FOREMAN', 'PM', 'COMPANY_OWNER'].includes(user.role) ? 'Submit Request' : 'Submit for Approval'}
                            </button>
                            <button
                                onClick={() => navigate(-1)}
                                className="w-full bg-transparent hover:bg-slate-800 text-slate-400 font-black py-4 rounded-2xl transition-all uppercase text-[10px] tracking-widest"
                            >
                                Discard Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PurchaseOrderForm;
