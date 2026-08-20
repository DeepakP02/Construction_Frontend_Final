import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText, Plus, Download, Search, Filter, DollarSign,
    Trash2, CreditCard, Send, MoreHorizontal, Save, Loader, Eye, Upload,
    CheckCircle, Clock, AlertTriangle
} from 'lucide-react';
import Modal from '../../components/Modal';
import api from '../../utils/api';
// ... (rest of imports)

const Invoices = () => {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState([]);
    const [projects, setProjects] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [formData, setFormData] = useState({ projectId: '', clientId: '', dueDate: '', invoiceNumber: '', status: 'unpaid', totalAmount: '' });
    const [file, setFile] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [invRes, projRes, clientRes] = await Promise.all([
                api.get('/invoices'),
                api.get('/projects'),
                api.get('/auth/users?role=CLIENT')
            ]);
            setInvoices(invRes.data);
            setProjects(projRes.data);
            setClients(clientRes.data);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            alert('Failed to load data: ' + (error.response?.data?.message || error.message) + '. Please try logging out and back in.');
        } finally {
            setLoading(false);
        }
    };

    const generateNextInvoiceNumber = (currentInvoices) => {
        const invList = currentInvoices || invoices;
        if (invList.length === 0) return 'INV-001';

        const numbers = invList
            .map(inv => {
                const numPart = inv.invoiceNumber?.split('-')[1];
                return numPart ? parseInt(numPart) : 0;
            })
            .filter(num => !isNaN(num));

        const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
        const nextNum = maxNum + 1;
        return `INV-${String(nextNum).padStart(3, '0')}`;
    };

    const openCreateModal = () => {
        const nextNumber = generateNextInvoiceNumber();
        setFormData({ projectId: '', clientId: '', dueDate: '', invoiceNumber: nextNumber, status: 'unpaid', totalAmount: '' });
        setFile(null);
        setIsModalOpen(true);
    };

    useEffect(() => {
        fetchData();
    }, [isModalOpen]);

    const handleSave = async () => {
        try {
            if (!formData.projectId || !formData.clientId) {
                alert('Please select both a Project and a Client.');
                return;
            }
            setIsSubmitting(true);

            const uploadFormData = new FormData();
            uploadFormData.append('projectId', formData.projectId);
            uploadFormData.append('clientId', formData.clientId);
            uploadFormData.append('dueDate', formData.dueDate);
            uploadFormData.append('invoiceNumber', formData.invoiceNumber);
            uploadFormData.append('status', formData.status);
            uploadFormData.append('totalAmount', 0); // Default to 0 since field is removed
            if (file) {
                uploadFormData.append('image', file);
            }

            await api.post('/invoices', uploadFormData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            await fetchData();
            setIsModalOpen(false);
            setFormData({ projectId: '', clientId: '', dueDate: '', invoiceNumber: '', status: 'unpaid', totalAmount: '' });
            setFile(null);
        } catch (error) {
            console.error('Error creating invoice:', error);
            alert('Error creating invoice');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDownloadPDF = (inv) => {
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;

            // 1. Header Section
            // Company Logo
            const img = new Image();
            img.src = logo;
            doc.addImage(img, 'PNG', 20, 15, 25, 25);

            // Company Info (Left)
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            doc.text('Kaal Construction Ltd', 20, 48);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            doc.text('company@gmail.com', 20, 54);
            doc.text('1234567890', 20, 59);
            doc.text('123 Business St', 20, 64);

            // Invoice Title & Info (Right)
            doc.setFontSize(28);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text('INVOICE', pageWidth - 20, 25, { align: 'right' });

            doc.setFontSize(10);
            const statusColor = inv.status === 'paid' ? [16, 185, 129] : [239, 68, 68]; // Emerald-500 : Red-500
            doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
            doc.text(inv.status?.toUpperCase() || 'UNPAID', pageWidth - 20, 32, { align: 'right' });

            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100);
            doc.text(`Number: #${inv.invoiceNumber}`, pageWidth - 20, 40, { align: 'right' });
            doc.text(`Issue: ${inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : 'N/A'}`, pageWidth - 20, 45, { align: 'right' });
            doc.text(`Due Date: ${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A'}`, pageWidth - 20, 50, { align: 'right' });

            doc.setDrawColor(241, 245, 249);
            doc.line(20, 75, pageWidth - 20, 75);

            // 2. Billing Section
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(148, 163, 184);
            doc.text('BILL TO:', 20, 85);
            doc.text('SHIP TO:', pageWidth - 20, 85, { align: 'right' });

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(inv.clientId?.fullName || 'Client', 20, 93);
            doc.text(inv.projectId?.address || 'address23', pageWidth - 20, 93, { align: 'right' });

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            doc.text(inv.clientId?.address || 'indore', 20, 99);

            // 3. Table Section
            const tableColumn = ["ITEM / DESCRIPTION", "QTY", "RATE", "TOTAL"];
            const tableRows = (inv.items || []).map(item => [
                { content: `${item.description || 'text'}\nProfessional Grade Construction Material`, styles: { fontStyle: 'bold' } },
                item.quantity || 1,
                `£${(item.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                `£${(item.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
            ]);

            autoTable(doc, {
                startY: 110,
                head: [tableColumn],
                body: tableRows,
                theme: 'grid',
                headStyles: {
                    fillColor: [30, 41, 59], // Slate-800
                    textColor: [255, 255, 255],
                    fontSize: 8,
                    fontStyle: 'bold',
                    halign: (index) => index > 0 ? 'center' : 'left'
                },
                columnStyles: {
                    0: { cellWidth: 'auto' },
                    1: { halign: 'center', fontStyle: 'bold' },
                    2: { halign: 'right', fontStyle: 'bold' },
                    3: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] }
                },
                styles: {
                    fontSize: 9,
                    cellPadding: 6,
                    lineColor: [226, 232, 240], // Slate-200
                    lineWidth: 0.1
                },
            });

            // 4. Summary Section
            const finalY = doc.lastAutoTable.finalY + 15;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(148, 163, 184);
            doc.text('Sub Total', pageWidth - 60, finalY);
            doc.setTextColor(15, 23, 42);
            doc.text(`£${(inv.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, pageWidth - 20, finalY, { align: 'right' });

            doc.setTextColor(148, 163, 184);
            doc.text('Tax', pageWidth - 60, finalY + 8);
            doc.setTextColor(15, 23, 42);
            doc.text('£0.00', pageWidth - 20, finalY + 8, { align: 'right' });

            doc.setDrawColor(241, 245, 249);
            doc.line(pageWidth - 65, finalY + 14, pageWidth - 20, finalY + 14);

            doc.setFontSize(12);
            doc.setTextColor(15, 23, 42);
            doc.text('TOTAL', pageWidth - 60, finalY + 25);
            doc.setFontSize(16);
            doc.setTextColor(37, 99, 235); // Blue-600
            doc.text(`£${(inv.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, pageWidth - 20, finalY + 25, { align: 'right' });

            // 5. Footer Notes
            const footerY = 240;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text('Notes', 20, footerY);

            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184);
            const notes = "This accounting software is designed to assist users in managing financial data such as invoices, expenses, payments, reports, and tax-related records. All information and reports generated by the system depend on the data entered by the user, and users should verify details before final submission. The software may receive updates, improvements, or feature changes to enhance performance, accuracy, and security. Regular data backups are recommended to avoid potential data loss.";
            const splitNotes = doc.splitTextToSize(notes, pageWidth - 40);
            doc.text(splitNotes, 20, footerY + 8);

            doc.save(`Invoice_${inv.invoiceNumber}.pdf`);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            alert('Failed to generate PDF. Please check the console for details.');
        }
    };

    const handleDelete = (inv) => {
        setInvoiceToDelete(inv);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!invoiceToDelete) return;
        try {
            setIsSubmitting(true);
            await api.delete(`/invoices/${invoiceToDelete._id}`);
            setInvoices(invoices.filter(inv => inv._id !== invoiceToDelete._id));
            setIsDeleteModalOpen(false);
            setInvoiceToDelete(null);
        } catch (error) {
            console.error('Error deleting invoice:', error);
            alert('Failed to delete invoice');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Derived Stats
    const stats = {
        total: invoices.length,
        paid: invoices.filter(i => i.status === 'paid').length,
        unpaid: invoices.filter(i => ['unpaid', 'partially_paid'].includes(i.status)).length,
        overdue: invoices.filter(i => i.status === 'overdue').length
    };

    const formatStatus = (status) => {
        if (!status) return '---';
        return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Invoices <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full ml-2">Digital Tracking</span></h1>
                    <p className="text-slate-500 text-sm">Create and manage client invoices.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200 font-medium"
                >
                    <Plus size={18} /> Create Invoice
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <FileText size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1">Total Invoice</p>
                        <p className="text-2xl font-black text-slate-800 leading-none">{stats.total}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <CheckCircle size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1">Total Paid</p>
                        <p className="text-2xl font-black text-slate-800 leading-none">{stats.paid}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <Clock size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1">Unpaid</p>
                        <p className="text-2xl font-black text-slate-800 leading-none">{stats.unpaid}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all">
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                        <AlertTriangle size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mb-1">Overdue</p>
                        <p className="text-2xl font-black text-slate-800 leading-none">{stats.overdue}</p>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4 justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search invoice #"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                </div>
                <div className="flex gap-2">
                    <button className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 flex items-center gap-2 text-sm">
                        <Filter size={18} /> Filter
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Invoice #</th>
                                <th className="px-6 py-4">Project</th>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Due Date</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {invoices.filter(i => i.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || i.projectId?.name?.toLowerCase().includes(searchTerm.toLowerCase())).map((inv) => (
                                <tr
                                    key={inv._id}
                                    className="hover:bg-slate-50 transition cursor-pointer group"
                                    onClick={() => inv.invoiceImage && window.open(inv.invoiceImage, '_blank')}
                                >
                                    <td className="px-6 py-4 font-bold text-slate-800 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{inv.invoiceNumber}</td>
                                    <td className="px-6 py-4">{inv.projectId?.name || '---'}</td>
                                    <td className="px-6 py-4">{inv.clientId?.fullName || '---'}</td>
                                    <td className="px-6 py-4">{new Date(inv.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '---'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold 
                            ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                                inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                                    ['unpaid', 'partially_paid'].includes(inv.status) ? 'bg-orange-100 text-orange-700' :
                                                        'bg-slate-100 text-slate-600'}`}>
                                            {formatStatus(inv.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (inv.invoiceImage) {
                                                    window.open(inv.invoiceImage, '_blank');
                                                } else {
                                                    alert('No file uploaded for this invoice.');
                                                }
                                            }}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                            title="Download File"
                                        >
                                            <Download size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(inv)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Invoice">
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
                            <select
                                required
                                value={formData.projectId}
                                onChange={e => {
                                    const selectedProjectId = e.target.value;
                                    const project = projects.find(p => p._id === selectedProjectId);

                                    // Automatically set client from project
                                    const associatedClientId = project?.clientId?._id || project?.clientId || '';

                                    setFormData(prev => ({
                                        ...prev,
                                        projectId: selectedProjectId,
                                        clientId: associatedClientId
                                    }));
                                }}

                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500"
                            >
                                <option value="">Select Project</option>
                                {projects.map(p => (
                                    <option key={p._id} value={p._id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
                            <input
                                type="text"
                                readOnly
                                value={formData.clientId ? (clients.find(c => c._id === formData.clientId)?.fullName || 'Loading...') : 'Select Project first'}
                                className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 outline-none text-slate-600 font-bold cursor-not-allowed"
                                placeholder="Select Project first"
                            />
                            {/* Hidden field to keep ID in form if needed, though we already have it in formData state */}
                        </div>

                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Number</label>
                            <input
                                type="text"
                                required
                                readOnly
                                value={formData.invoiceNumber}
                                className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 outline-none text-slate-500 cursor-not-allowed font-mono font-bold"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                            <input
                                type="date"
                                required
                                value={formData.dueDate}
                                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                        <select
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500"
                        >
                            <option value="unpaid">Unpaid</option>
                            <option value="partially_paid">Partially Paid</option>
                            <option value="paid">Paid</option>
                            <option value="overdue">Overdue</option>
                        </select>
                    </div>

                    <div className="pt-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Upload Invoice</label>
                        <div className="relative">
                            <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={e => setFile(e.target.files[0])}
                                className="hidden"
                                id="invoice-upload"
                            />
                            <label
                                htmlFor="invoice-upload"
                                className="flex items-center justify-center gap-3 w-full bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 cursor-pointer hover:bg-slate-100 transition text-slate-500 text-sm group"
                            >
                                <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition duration-300">
                                    <Upload size={24} className="text-blue-600" />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="font-bold text-slate-700">{file ? file.name : 'Select Invoice File'}</span>
                                    <span className="text-xs text-slate-400">Click to browse or drag and drop</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button
                            onClick={handleSave}
                            disabled={isSubmitting}
                            className="bg-blue-600 text-white px-8 py-2.5 rounded-xl hover:bg-blue-700 font-bold transition flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-200"
                        >
                            {isSubmitting ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
                            {isSubmitting ? 'Generating...' : 'Generate Invoice'}
                        </button>
                    </div>
                </div>
            </Modal>
            {/* Delete Confirmation Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Invoice">
                <div className="text-center space-y-6">
                    <div className="w-20 h-20 bg-red-50 rounded-[28px] flex items-center justify-center text-red-500 mx-auto border border-red-100 shadow-sm transform -rotate-6 transition-transform hover:rotate-0 duration-500">
                        <Trash2 size={40} />
                    </div>
                    
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Delete Invoice?</h3>
                        <p className="text-slate-500 font-bold text-sm mt-2 leading-relaxed px-4">
                            Are you sure you want to delete <span className="text-red-600 font-black underline italic">"{invoiceToDelete?.invoiceNumber}"</span>?<br/>
                            This data will be removed permanently.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2 font-black uppercase tracking-widest text-[10px]">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl transition active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={isSubmitting}
                            className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl transition shadow-lg shadow-red-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader size={16} className="animate-spin" /> : "Confirm Delete"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Invoices;
