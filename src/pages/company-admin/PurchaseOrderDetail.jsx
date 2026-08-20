import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    ChevronLeft, Printer, Mail, Truck,
    CheckCircle, XCircle, Clock, Package,
    FileText, User, Calendar, DollarSign,
    MoreVertical, Trash2, Send, Archive, Download
} from 'lucide-react';
import api, { getServerUrl } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import emailjs from '@emailjs/browser';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import poLogo from '../../assets/images/POLogo.png';
import '../../styles/PurchaseOrders.css';
import Modal from '../../components/Modal';

const PurchaseOrderDetail = ({ isPublic = false }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [po, setPo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [downloaded, setDownloaded] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [pendingStatus, setPendingStatus] = useState(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const isAdmin = !isPublic && (user?.role === 'COMPANY_OWNER');
    const isPM = !isPublic && (user?.role === 'PM');

    useEffect(() => {
        const fetchPO = async () => {
            try {
                // Determine API path (Public vs Auth)
                const apiPath = isPublic ? `/purchase-orders/public/${id}` : `/purchase-orders/${id}`;
                const res = await api.get(apiPath);
                setPo(res.data);
                
                // --- NEW: Auto-download if coming from email link ---
                const params = new URLSearchParams(window.location.search);
                if (params.get('action') === 'download') {
                    // Give a small delay for DOM to settle, but use res.data directly
                    setTimeout(() => {
                        handleDownloadPDF(res.data);
                    }, 500);
                }
            } catch (error) {
                console.error('Error fetching PO:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPO();
    }, [id]);

    const handleStatusUpdate = (newStatus) => {
        setPendingStatus(newStatus);
        setIsStatusModalOpen(true);
    };

    const confirmStatusUpdate = async () => {
        if (!pendingStatus) return;
        try {
            setIsUpdatingStatus(true);
            await api.patch(`/purchase-orders/${id}`, { status: pendingStatus });
            setPo({ ...po, status: pendingStatus });
            toast.success(`Status updated to ${pendingStatus}`);
            setIsStatusModalOpen(false);
            setPendingStatus(null);
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update status');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleDownloadPDF = async (poData = null) => {
        try {
            // Robust check: If an event has been passed, reset to null
            if (poData && (poData.nativeEvent || poData.target)) poData = null;
            
            const data = poData || po;
            if (!data) return;
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;

            // Robust data for Public View
            const companyName = data.companyId?.name || data.projectId?.companyId?.name || user?.companyName || "Kaal Construction";
            const companyEmail = data.companyId?.email || data.projectId?.companyId?.email || user?.email || "procurement@kaal.ca";
            const companyPhone = data.companyId?.phone || data.projectId?.companyId?.phone || user?.phone || "+1 (555) 000-0000";
            const companyAddress = data.companyId?.address || data.projectId?.companyId?.address || user?.companyAddress || "123 Construction Road";

            // 1. Header Section
            // Logo (Left)
            const logoReady = new Promise((resolve) => {
                const img = new Image();
                img.src = poLogo;
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
            });
            const img = await logoReady;
            if (img) {
                doc.addImage(img, 'PNG', 15, 12, 45, 28); // Increased height
            }

            // Vertical Separator
            doc.setDrawColor(200);
            doc.setLineWidth(0.4);
            doc.line(65, 12, 65, 45); // Extended line

            // Company Info with Vector Icons (Center-Left)
            const iconX = 70;
            const textX = 76;
            
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(71, 85, 105);
            
            // Location Icon (Direct Drawing)
            doc.setFillColor(21, 45, 78);
            doc.circle(iconX + 1.5, 24, 1.2, 'F'); // Pin head
            doc.triangle(iconX + 0.5, 25, iconX + 2.5, 25, iconX + 1.5, 27, 'F'); // Pin bottom
            doc.setTextColor(30, 41, 59);
            doc.setFont('helvetica', 'normal');
            doc.text(companyAddress, textX, 26);
            
            // Phone Icon (Direct Drawing)
            doc.roundedRect(iconX + 0.5, 31, 2, 3, 0.5, 0.5, 'F');
            doc.setFillColor(255);
            doc.circle(iconX + 1.5, 32, 0.4, 'F'); // "Screen" dot
            doc.text(companyPhone, textX, 33.5);
            
            // Email Icon (Direct Drawing)
            doc.setFillColor(21, 45, 78);
            doc.rect(iconX, 39, 3.5, 2.5, 'F');
            doc.setDrawColor(255);
            doc.setLineWidth(0.2);
            doc.line(iconX, 39, iconX + 1.75, 40.5); // Flap left
            doc.line(iconX + 3.5, 39, iconX + 1.75, 40.5); // Flap right
            doc.text(companyEmail, textX, 41);

            // PO Title & Info (Right Area)
            doc.setFontSize(32);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(21, 45, 78);
            doc.text('PURCHASE ORDER', pageWidth - 15, 22, { align: 'right' });

            // Date & PO Number Boxes
            doc.setDrawColor(148, 163, 184);
            doc.setLineWidth(0.1);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            
            // Date Box
            doc.text('DATE', pageWidth - 70, 36);
            doc.rect(pageWidth - 55, 30, 40, 8);
            doc.setFont('helvetica', 'normal');
            doc.text(new Date().toLocaleDateString(), pageWidth - 35, 35.5, { align: 'center' });
            
            // PO # Box
            doc.setFont('helvetica', 'bold');
            doc.text('PO #', pageWidth - 70, 46);
            doc.rect(pageWidth - 55, 40, 40, 8);
            doc.setFont('helvetica', 'normal');
            doc.text(data.poNumber || '', pageWidth - 35, 45.5, { align: 'center' });

            // Horizontal Separator
            doc.setDrawColor(21, 45, 78);
            doc.setLineWidth(1);
            doc.line(15, 50, pageWidth - 15, 50);

            // 2. Vendor & Shipping Section
            const boxY = 60;
            const boxWidth = (pageWidth - 45) / 2;
            
            // Vendor Box
            doc.setFillColor(21, 45, 78);
            doc.rect(15, boxY, boxWidth, 7, 'F');
            doc.setTextColor(255);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('VENDOR', 20, boxY + 5);
            
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(10);
            const vendorLines = [
                data.vendorName || data.vendorId?.name || '',
                data.vendorEmail || '',
                data.vendorPhone || '',
                data.vendorAddress || ''
            ].filter(line => line);
            doc.setFont('helvetica', 'bold');
            doc.text(vendorLines[0] || '', 15, boxY + 15);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(vendorLines.slice(1), 15, boxY + 20);

            // Ship To Box
            doc.setFillColor(21, 45, 78);
            doc.rect(pageWidth / 2 + 7.5, boxY, boxWidth, 7, 'F');
            doc.setTextColor(255);
            doc.setFont('helvetica', 'bold');
            doc.text('SHIP TO', pageWidth / 2 + 12.5, boxY + 5);

            doc.setTextColor(30, 41, 59);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(data.projectId?.name || 'Project Site', pageWidth / 2 + 7.5, boxY + 15);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text([
                data.projectId?.location || '',
                `Delivery: ${data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate).toLocaleDateString() : 'N/A'}`
            ], pageWidth / 2 + 7.5, boxY + 20);

            // 3. Items Table Section
            const tableColumn = ["ITEM #", "DESCRIPTION", "QTY"];
            const tableRows = (data.items || []).map((item, index) => [
                index + 1,
                { content: `${item.itemName || ''}${item.description ? '\n' + item.description : ''}`, styles: { halign: 'left' } },
                item.quantity || 0
            ]);

            // Fill remaining space with empty rows to match look
            while (tableRows.length < 8) {
                tableRows.push(['', '', '']);
            }

            autoTable(doc, {
                startY: 105,
                margin: { left: 15, right: 15 },
                head: [tableColumn],
                body: tableRows,
                theme: 'grid',
                headStyles: {
                    fillColor: [21, 45, 78],
                    textColor: [255, 255, 255],
                    fontSize: 8,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                columnStyles: {
                    0: { cellWidth: 25, halign: 'center' },
                    1: { cellWidth: 'auto' },
                    2: { cellWidth: 40, halign: 'center' }
                },
                styles: {
                    fontSize: 8,
                    cellPadding: 4,
                    lineColor: [200, 200, 200],
                    lineWidth: 0.1
                },
            });

            // 4. Comments Section
            let finalY = doc.lastAutoTable.finalY + 10;
            
            // Comments Box (Full Width)
            doc.setFillColor(230, 230, 230);
            doc.rect(15, finalY, pageWidth - 30, 6, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            doc.text('Comments or Special Instructions', 18, finalY + 4.5);
            doc.rect(15, finalY, pageWidth - 30, 35);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            const notes = data.notesToVendor || "No special instructions.";
            doc.text(doc.splitTextToSize(notes, pageWidth - 40), 18, finalY + 12);

            // 5. Footer Text
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            const footerText = `If you have any questions about this purchase order, please contact ${companyName}, ${companyPhone}, ${companyEmail}`;
            doc.text(footerText, pageWidth / 2, 280, { align: 'center' });

            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text("Generated by Kaal Construction Software", pageWidth / 2, 285, { align: 'center' });

            doc.save(`PO_${data.poNumber}.pdf`);
            if (isDirectDownload) {
                setDownloaded(true);
            }
        } catch (error) {
            console.error('PDF Generation Error:', error);
            if (isDirectDownload) {
                toast.error('Generation failed. Please refresh the page.');
            }
        }
    };

    const handleSendPO = async () => {
        const vendorEmail = po.vendorEmail || po.vendorId?.email;
        if (!vendorEmail) {
            toast.error("Vendor email is missing! Please update the vendor's email before sending.");
            return;
        }

        const formatEmailDate = (value) => {
            if (!value) return 'N/A';
            const dateValue = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;
            if (!dateValue || Number.isNaN(dateValue.getTime())) return 'N/A';
            return dateValue.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
        };

        setSendingEmail(true);
        try {
            // Robust company name retrieval
            const fetchedCompany = po?.companyId || po?.projectId?.companyId || user?.companyId;
            const finalCompanyName = (typeof fetchedCompany === 'object' ? fetchedCompany?.name : null) || user?.companyName || "Kaal Construction";
            const finalCompanyAddress = (typeof fetchedCompany === 'object' ? fetchedCompany?.address : null) || user?.companyAddress || "123 Construction Road";
            
            // Public Logo URL (Swap the link below with your hosted Kaal Logo)
            const publicLogoUrl = (typeof fetchedCompany === 'object' && fetchedCompany?.logo) 
                ? getServerUrl(fetchedCompany.logo) 
                : "https://img.icons8.com/color/96/ring.png"; // Colorful ring fallback

            const formattedTotalAmount = po.totalAmount !== undefined && po.totalAmount !== null
                ? Number(po.totalAmount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })
                : '0.00';

            // EmailJS Integration
            const templateParams = {
                to_email: vendorEmail,
                vendorName: po.vendorName || po.vendorId?.name || "Vendor",
                poNumber: po.poNumber,
                projectName: po.projectId?.name || "N/A",
                totalAmount: formattedTotalAmount,
                deliveryDate: formatEmailDate(po.expectedDeliveryDate),
                issueDate: formatEmailDate(po.createdAt),
                date: formatEmailDate(po.createdAt),
                companyName: finalCompanyName,
                companyAddress: finalCompanyAddress,
                logoUrl: publicLogoUrl,
                // USE PUBLIC LINK
                viewPoLink: `${window.location.origin}/public/purchase-order/${id}?action=download`,
                items_summary: po.items?.map(item => `${item.itemName} (Qty: ${item.quantity})`).join('\n'),
                currency: "$"
            };

            await emailjs.send(
                'service_nwnykea', 
                'template_0edtxvt', 
                templateParams, 
                'Vr5-H0-BgfNboKu2q'
            );

            // If email sent successfully, update status to "Sent"
            const success = await handleStatusUpdate('Sent');
            if (success) {
                toast.success('Purchase Order sent successfully to vendor!');
            }
        } catch (error) {
            console.error('FAILED to send PO email:', error);
            toast.error('Failed to send email. Please check your EmailJS configuration.');
        } finally {
            setSendingEmail(false);
        }
    };

    const isDirectDownload = isPublic && new URLSearchParams(window.location.search).get('action') === 'download';

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
            <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Preparing Purchase Order...</p>
            </div>
        </div>
    );

    if (isDirectDownload && po) {
        return (
            <div className="flex h-screen items-center justify-center bg-white">
                <div className="text-center animate-fade-up">
                    <div className={`w-24 h-24 ${downloaded ? 'bg-green-50' : 'bg-blue-50'} rounded-3xl flex items-center justify-center mx-auto mb-8 transition-colors duration-500`}>
                        {downloaded ? (
                            <CheckCircle size={48} className="text-green-600" />
                        ) : (
                            <Download size={48} className="text-blue-600 animate-bounce" />
                        )}
                    </div>
                    
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">
                        {downloaded ? "Download Started!" : "Preparing your PO..."}
                    </h1>
                    
                    <p className="text-slate-500 font-bold mt-3 text-lg">
                        {downloaded 
                            ? "Your file is downloading. You can close this tab now." 
                            : `Generating Purchase Order ${po.poNumber}`}
                    </p>
                    
                    {!downloaded && (
                        <div className="mt-8 w-64 h-1.5 bg-slate-100 rounded-full mx-auto overflow-hidden">
                            <div className="h-full bg-blue-600 animate-progress origin-left"></div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (!po) return (
        <div className="text-center py-20 flex flex-col items-center justify-center gap-4">
            <XCircle size={48} className="text-red-500" />
            <h2 className="text-2xl font-black text-slate-800">Purchase Order not found</h2>
            <p className="text-slate-500">This link may have expired or is incorrect.</p>
        </div>
    );

    const getStatusColor = (status) => {
        const colors = {
            'Draft': 'bg-slate-100 text-slate-600 border-slate-200',
            'Pending Approval': 'bg-orange-50 text-orange-600 border-orange-100',
            'Approved': 'bg-blue-50 text-blue-600 border-blue-100',
            'Sent': 'bg-indigo-50 text-indigo-600 border-indigo-100',
            'Delivered': 'bg-emerald-50 text-emerald-600 border-emerald-100',
            'Closed': 'bg-slate-800 text-slate-200 border-slate-700',
            'Cancelled': 'bg-red-50 text-red-600 border-red-100'
        };
        return colors[status] || colors['Draft'];
    };

    return (
        <div className="pb-20 space-y-8 animate-fade-in">
            {/* Header / Actions Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    {!isPublic && (
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <ChevronLeft size={24} />
                        </button>
                    )}
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black text-slate-800 tracking-tighter">{po.poNumber}</h1>
                            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${getStatusColor(po.status)}`}>
                                {po.status}
                            </span>
                        </div>
                        <p className="text-slate-500 font-bold text-sm">{po.projectId?.name || 'Project Name'}</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button 
                        onClick={() => handleDownloadPDF()}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-200"
                    >
                        <Download size={18} /> Download Purchase Order (PDF)
                    </button>
                    {(isAdmin || isPM) && po.status === 'Pending Approval' && (
                        <>
                            <button
                                onClick={() => handleStatusUpdate('Approved')}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200"
                            >
                                <CheckCircle size={16} /> Approve PO
                            </button>
                            <button
                                onClick={() => handleStatusUpdate('Cancelled')}
                                className="flex items-center gap-2 px-6 py-2 bg-white border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition font-black text-xs uppercase tracking-widest"
                            >
                                <XCircle size={16} /> Reject PO
                            </button>
                        </>
                    )}
                    {(isAdmin || isPM) && po.status === 'Approved' && (
                        <button
                            onClick={handleSendPO}
                            disabled={sendingEmail}
                            className={`flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl transition font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 ${sendingEmail ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'}`}
                        >
                            <Send size={16} /> {sendingEmail ? 'Sending...' : 'Send to Vendor'}
                        </button>
                    )}
                    {(isAdmin || isPM) && po.status === 'Sent' && (
                        <button
                            onClick={() => handleStatusUpdate('Delivered')}
                            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-200"
                        >
                            <Truck size={16} /> Mark Delivered
                        </button>
                    )}
                    {po.status === 'Draft' && (
                        <button
                            onClick={() => handleStatusUpdate('Pending Approval')}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200"
                        >
                            <Send size={16} /> Submit for Approval
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Main Details */}
                <div className="lg:col-span-3 space-y-8">
                    {/* Info Grid */}
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200/60 grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Truck size={12} className="text-blue-600" /> Vendor
                            </p>
                            <p className="font-black text-slate-800">{po.vendorName || po.vendorId?.name || '---'}</p>
                            <p className="text-xs font-bold text-slate-400">{po.vendorEmail || 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Calendar size={12} className="text-blue-600" /> Key Dates
                            </p>
                            <div className="flex flex-col gap-1">
                                <p className="text-xs font-bold text-slate-700">Created: <span className="text-slate-400 ml-1">{new Date(po.createdAt).toLocaleDateString()}</span></p>
                                <p className="text-xs font-bold text-slate-700">Expected: <span className="text-slate-400 ml-1">{po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : 'N/A'}</span></p>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <User size={12} className="text-blue-600" /> Created By
                            </p>
                            <p className="font-black text-slate-800">{po.createdBy?.fullName || 'John Doe'}</p>
                            <p className="text-xs font-bold text-slate-400">{po.createdBy?.role || 'Project Manager'}</p>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="bg-white rounded-[40px] shadow-sm border border-slate-200/60 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Description</th>
                                    <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                                    {/* <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Price</th>
                                    <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th> */}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {Array.isArray(po.items) ? po.items.map((item, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-6">
                                            <p className="font-black text-slate-800 text-sm">{item.itemName || 'Material'}</p>
                                            <p className="text-xs font-bold text-slate-400">{item.description}</p>
                                        </td>
                                        <td className="px-8 py-6 text-center font-black text-slate-700">{item.quantity}</td>
                                        {/* <td className="px-8 py-6 text-right font-black text-slate-700">${(item.unitPrice || 0).toLocaleString()}</td>
                                        <td className="px-8 py-6 text-right font-black text-slate-900">${(item.total || 0).toLocaleString()}</td> */}
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="px-8 py-6 text-center text-slate-400">No items available</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Totals Summary */}
                        {/* Totals Summary commented out as per client request */}
                        {/* <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                            <div className="w-64 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold text-slate-400">Subtotal</span>
                                    <span className="font-black text-slate-700">${(po.subtotal || po.totalAmount || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold text-slate-400">Estimated Tax</span>
                                    <span className="font-black text-slate-700">${(po.tax || 0).toLocaleString()}</span>
                                </div>
                                <div className="h-px bg-slate-200 my-2" />
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grand Total</span>
                                    <span className="text-xl font-black text-blue-600">${(po.totalAmount || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div> */}
                    </div>

                    {/* Notes Section */}
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200/60 space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes to Vendor</h3>
                        <p className="text-sm font-bold text-slate-600 italic">
                            "{po.notesToVendor || 'No specific notes provided.'}"
                        </p>
                    </div>
                </div>

                {/* Status Timeline Bar */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200/60 space-y-6 sticky top-6">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tracking Timeline</h3>

                        <div className="space-y-8 relative">
                            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-100" />

                            <TimelineStep
                                active={['Draft', 'Pending Approval', 'Approved', 'Sent', 'Delivered'].includes(po.status)}
                                completed={['Pending Approval', 'Approved', 'Sent', 'Delivered', 'Closed'].includes(po.status)}
                                label="Created / Requested"
                                date={new Date(po.createdAt).toLocaleDateString()}
                            />
                            <TimelineStep
                                active={['Pending Approval', 'Approved', 'Sent', 'Delivered'].includes(po.status)}
                                completed={['Approved', 'Sent', 'Delivered', 'Closed'].includes(po.status)}
                                label="Manager Approval"
                            />
                            <TimelineStep
                                active={['Sent', 'Delivered'].includes(po.status)}
                                completed={['Delivered', 'Closed'].includes(po.status)}
                                label="Sent to Vendor"
                            />
                            <TimelineStep
                                active={['Delivered'].includes(po.status)}
                                completed={['Closed'].includes(po.status)}
                                label="Material Delivered"
                            />
                        </div>

                        <div className="pt-6 border-t border-slate-50 space-y-2">
                            {(isAdmin || isPM) && po.status !== 'Closed' && po.status !== 'Cancelled' && (
                                <button
                                    onClick={() => handleStatusUpdate('Closed')}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition"
                                >
                                    <Archive size={14} /> Close Purchase Order
                                </button>
                            )}
                            <button
                                onClick={() => navigate(`/company-admin/purchase-orders/edit/${id}`)}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition"
                            >
                                Edit PO Details
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Status Confirmation Modal ── */}
            <Modal
                isOpen={isStatusModalOpen}
                onClose={() => setIsStatusModalOpen(false)}
                title="Update PO Status"
            >
                <div className="p-2 space-y-6">
                    <div className="bg-blue-50 rounded-3xl p-6 border border-blue-100 flex flex-col items-center justify-center text-center">
                        <div className={`w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-blue-100 mb-4 transition-transform hover:scale-110 ${
                            (pendingStatus === 'Approved' || pendingStatus === 'Delivered') ? 'text-emerald-500' : 
                            pendingStatus === 'Cancelled' ? 'text-red-500' : 
                            pendingStatus === 'Sent' ? 'text-indigo-500' : 'text-blue-500'
                        }`}>
                            {(pendingStatus === 'Approved' || pendingStatus === 'Delivered') ? <CheckCircle size={32} /> : 
                             pendingStatus === 'Cancelled' ? <XCircle size={32} /> : 
                             pendingStatus === 'Sent' ? <Send size={32} /> : <FileText size={32} />}
                        </div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Confirm Status Change</h3>
                        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-2 px-6 leading-relaxed">
                            Are you sure you want to change the status of <span className="text-blue-600">PO #{po?.poNumber}</span> to <span className="font-black text-slate-800">"{pendingStatus}"</span>?
                        </p>
                    </div>

                    <div className="flex gap-3 px-2 pb-2">
                        <button
                            onClick={() => setIsStatusModalOpen(false)}
                            className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmStatusUpdate}
                            disabled={isUpdatingStatus}
                            className={`flex-1 px-6 py-4 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition shadow-lg active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2 ${
                                (pendingStatus === 'Approved' || pendingStatus === 'Delivered') ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 
                                pendingStatus === 'Cancelled' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 
                                pendingStatus === 'Sent' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                            }`}
                        >
                            {isUpdatingStatus ? <Clock size={16} className="animate-spin" /> : 
                             (pendingStatus === 'Approved' || pendingStatus === 'Delivered') ? <CheckCircle size={16} /> : 
                             pendingStatus === 'Sent' ? <Send size={16} /> : <FileText size={16} />}
                            Confirm {pendingStatus}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const TimelineStep = ({ active, completed, label, date }) => (
    <div className="flex items-start gap-4 relative z-10">
        <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center transition-all ${completed ? 'bg-emerald-500 border-emerald-50 border-emerald-50 text-white' :
            active ? 'bg-blue-600 border-blue-50 text-white' :
                'bg-white border-slate-100 text-slate-300'
            }`}>
            {completed ? <CheckCircle size={14} /> : active ? <Clock size={14} /> : <div className="w-2 h-2 rounded-full bg-slate-100" />}
        </div>
        <div className="space-y-1 pt-1">
            <p className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-slate-900' : 'text-slate-300'}`}>
                {label}
            </p>
            {date && <p className="text-[9px] font-bold text-slate-400">{date}</p>}
        </div>
    </div>
);

export default PurchaseOrderDetail;
