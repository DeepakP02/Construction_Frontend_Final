import { useState, useEffect } from 'react';
import { Download, CheckCircle, Clock, AlertTriangle, Loader } from 'lucide-react';
import api from '../../utils/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../../assets/images/Logo.png';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const res = await api.get('/invoices');
        setInvoices(res.data);
      } catch (error) {
        console.error('Error fetching invoices:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  const handleDownload = (inv) => {
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader size={48} className="animate-spin text-blue-600" />
      </div>
    );
  }

  const totalOutstanding = invoices
    .filter(i => i.status !== 'paid')
    .reduce((acc, i) => acc + (i.totalAmount || 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Invoices & Payments</h1>
          <p className="text-slate-500 text-sm">View and manage your project billing history.</p>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice ID</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Project</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
            {invoices.map((invoice) => (
              <tr key={invoice._id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => invoice.invoiceImage && window.open(invoice.invoiceImage, '_blank')}>
                <td className="px-6 py-4 font-medium text-slate-900">{invoice.invoiceNumber || invoice._id.slice(-8)}</td>
                <td className="px-6 py-4 hidden md:table-cell">{invoice.projectId?.name || '---'}</td>
                <td className="px-6 py-4 text-slate-500">{new Date(invoice.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${invoice.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                    {invoice.status === 'paid' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      if (invoice.invoiceImage) {
                        window.open(invoice.invoiceImage, '_blank');
                      } else {
                        handleDownload(invoice);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Download Invoice"
                  >
                    <Download size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            No invoices found.
          </div>
        )}
      </div>
    </div>
  );
};

export default Invoices;
