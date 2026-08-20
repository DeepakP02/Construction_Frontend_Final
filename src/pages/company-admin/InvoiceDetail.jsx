import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Printer, Mail, Download, DollarSign, FileText } from 'lucide-react';
import api from '../../utils/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../../assets/images/Logo.png';

const InvoiceDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const printRef = useRef();

    const sampleInvoice = {
        invoiceNumber: '1771334618340',
        createdAt: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        clientId: { fullName: 'Demo Client', address: 'Indore, India' },
        projectId: { name: 'Sample Project', address: 'Project Address 123' },
        items: [
            { description: 'Construction Materials', quantity: 2, unitPrice: 500, total: 1000 },
            { description: 'Labor Charges', quantity: 1, unitPrice: 1500, total: 1500 }
        ],
        totalAmount: 2500,
        status: 'unpaid'
    };

    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                setLoading(true);
                const { data } = await api.get(`/invoices/${id}`);
                setInvoice(data);
            } catch (error) {
                console.error('Error fetching invoice:', error);
                // Fallback to sample for preview
                setInvoice(sampleInvoice);
            } finally {
                setLoading(false);
            }
        };
        if (id === 'sample') {
            setInvoice(sampleInvoice);
            setLoading(false);
        } else {
            fetchInvoice();
        }
    }, [id]);

    useEffect(() => {
        if (!loading && invoice && new URLSearchParams(window.location.search).get('print') === 'true') {
            // Wait slightly for layout to settle
            setTimeout(() => {
                window.print();
            }, 500);
        }
    }, [loading, invoice]);

    const handleDownloadPDF = () => {
        try {
            if (!invoice) return;
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
            const statusColor = invoice.status === 'paid' ? [16, 185, 129] : [239, 68, 68]; // Emerald-500 : Red-500
            doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
            doc.text(invoice.status?.toUpperCase() || 'UNPAID', pageWidth - 20, 32, { align: 'right' });

            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100);
            doc.text(`Number: #${invoice.invoiceNumber}`, pageWidth - 20, 40, { align: 'right' });
            doc.text(`Issue: ${new Date(invoice.createdAt).toLocaleDateString()}`, pageWidth - 20, 45, { align: 'right' });
            doc.text(`Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}`, pageWidth - 20, 50, { align: 'right' });

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
            doc.text(invoice.clientId?.fullName || 'Client', 20, 93);
            doc.text(invoice.projectId?.address || 'address23', pageWidth - 20, 93, { align: 'right' });

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            doc.text(invoice.clientId?.address || 'indore', 20, 99);

            // 3. Table Section
            const tableColumn = ["ITEM / DESCRIPTION", "QTY", "RATE", "TOTAL"];
            const tableRows = (invoice.items || []).map(item => [
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
            doc.text(`£${(invoice.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, pageWidth - 20, finalY, { align: 'right' });

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
            doc.setTextColor(37, 99, 235);
            doc.text(`£${(invoice.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, pageWidth - 20, finalY + 25, { align: 'right' });

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

            doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
        } catch (error) {
            console.error('PDF Generation Error:', error);
            alert('Failed to generate PDF. Check console.');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-2xl font-bold text-slate-800">Invoice not found</h2>
                <button
                    onClick={() => navigate('/company-admin/invoices')}
                    className="mt-4 text-blue-600 hover:underline flex items-center gap-2 justify-center mx-auto"
                >
                    <ChevronLeft size={20} /> Back to Invoices
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Action Bar */}
            <div className="flex justify-between items-center print:hidden">
                <button
                    onClick={() => navigate('/company-admin/invoices')}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition shadow-sm font-semibold"
                >
                    <ChevronLeft size={18} />
                    Back to Invoices
                </button>
                <div className="flex gap-3">
                    <button
                        onClick={handleDownloadPDF}
                        className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition shadow-sm font-bold"
                    >
                        <Download size={18} />
                        Download
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-6 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition shadow-lg shadow-slate-200 font-bold"
                    >
                        <Printer size={18} />
                        Print
                    </button>
                </div>
            </div>

            {/* Invoice Card */}
            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
                <div className="p-12 space-y-12">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div className="space-y-4">
                            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center overflow-hidden">
                                {/* Mock Logo or Company Avatar */}
                                <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                                    <img
                                        src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=200"
                                        alt="Logo"
                                        className="w-full h-full object-cover opacity-80"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-xl font-black text-slate-900 leading-tight">Kaal Construction Ltd</h2>
                                <p className="text-sm text-slate-500 font-medium italic">company@gmail.com</p>
                                <p className="text-sm text-slate-500 font-medium">1234567890</p>
                                <p className="text-sm text-slate-500 font-medium">123 Business St</p>
                            </div>
                        </div>
                        <div className="text-right space-y-2">
                            <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase">Invoice</h1>
                            <div className="space-y-0.5">
                                <p className="text-sm font-bold text-slate-400">Number: <span className="text-slate-900 uppercase">#{invoice.invoiceNumber}</span></p>
                                <p className="text-sm font-bold text-slate-400">Issue: <span className="text-slate-900">{new Date(invoice.createdAt).toLocaleDateString()}</span></p>
                                <p className="text-sm font-bold text-slate-400">Due Date: <span className="text-slate-900">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}</span></p>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100" />

                    {/* Billing Info */}
                    <div className="grid grid-cols-2 gap-12">
                        <div className="space-y-3">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Bill To:</h3>
                            <div className="space-y-1">
                                <p className="text-lg font-bold text-slate-900">{invoice.clientId?.fullName || 'Client Name'}</p>
                                <p className="text-sm text-slate-500 font-medium">{invoice.clientId?.address || 'indore'}</p>
                            </div>
                        </div>
                        <div className="space-y-3 text-right">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Ship To:</h3>
                            <div className="space-y-1">
                                <p className="text-sm text-slate-500 font-medium">{invoice.projectId?.address || 'address23'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Invoice Image / Uploaded File Section */}
                    {invoice.invoiceImage && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Uploaded Invoice:</h3>
                                <a 
                                    href={invoice.invoiceImage} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                                >
                                    <FileText size={14} /> View Original
                                </a>
                            </div>
                            <div className="rounded-2xl border border-slate-100 overflow-hidden bg-slate-50 p-4 flex justify-center">
                                <img 
                                    src={invoice.invoiceImage} 
                                    alt="Invoice" 
                                    className="max-h-[600px] w-auto shadow-sm rounded-lg object-contain"
                                />
                            </div>
                        </div>
                    )}

                    {/* Line Items Table (Only show if items exist) */}
                    {invoice.items && invoice.items.length > 0 && (
                        <div className="overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Item / Description</th>
                                        <th className="py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center w-24">Qty</th>
                                        <th className="py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right w-32">Rate</th>
                                        <th className="py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right w-32">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {invoice.items.map((item, index) => (
                                        <tr key={index}>
                                            <td className="py-6 pr-4">
                                                <p className="text-sm font-bold text-slate-900">{item.description}</p>
                                                <p className="text-xs text-slate-400 mt-1">Professional Grade Construction Material</p>
                                            </td>
                                            <td className="py-6 text-center text-sm font-bold text-slate-600">{item.quantity}</td>
                                            <td className="py-6 text-right text-sm font-bold text-slate-600">£{(item.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="py-6 text-right text-sm font-black text-slate-900">£{(item.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Summary */}
                    <div className="flex justify-end pt-8">
                        <div className="w-64 space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-bold text-slate-400">Sub Total</span>
                                <span className="font-bold text-slate-800">£{(invoice.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-bold text-slate-400">Tax</span>
                                <span className="font-bold text-slate-800">£0.00</span>
                            </div>
                            <div className="h-px bg-slate-200" />
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-black text-slate-900 uppercase tracking-tight">Total</span>
                                <span className="text-2xl font-black text-blue-600">£{(invoice.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer - Notes */}
                    <div className="pt-12 border-t border-slate-100 space-y-4">
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Notes</h3>
                        <p className="text-[10px] leading-relaxed text-slate-400 font-medium">
                            This accounting software is designed to assist users in managing financial data such as invoices, expenses, payments, reports, and tax-related records.
                            All information and reports generated by the system depend on the data entered by the user, and users should verify details before final submission.
                            The software may receive updates, improvements, or feature changes to enhance performance, accuracy, and security.
                            Regular data backups are recommended to avoid potential data loss.
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
        @media print {
          body { background: white !important; }
          .max-w-5xl { max-width: 100% !important; margin: 0 !important; }
          header, aside, .print\\:hidden { display: none !important; }
          main { overflow: visible !important; padding: 0 !important; }
          .bg-white { box-shadow: none !important; border: none !important; }
          .shadow-xl { box-shadow: none !important; }
          .rounded-\\[2rem\\] { border-radius: 0 !important; }
        }
      `}</style>
        </div>
    );
};

export default InvoiceDetail;
