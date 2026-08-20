import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Calendar, Download, RefreshCw, ArrowUp, ArrowDown, Clock, Search } from 'lucide-react';
import api from '../../utils/api';

const Revenue = () => {
  const [stats, setStats] = useState({
    netRevenueYTD: 0,
    totalRefunds: 0,
    pendingInvoices: 0,
    currentMRR: 0,
    growthTrend: ''
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, transRes] = await Promise.all([
        api.get('/super-admin/billing/stats'),
        api.get('/super-admin/billing/transactions?limit=20')
      ]);
      setStats(statsRes.data);
      setTransactions(transRes.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching revenue data:', err);
      setError('Failed to load financial data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDownload = (id) => {
    const tx = transactions.find(t => t._id === id);
    if (!tx) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to download the invoice.');
      return;
    }

    const date = new Date(tx.createdAt).toLocaleDateString();

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${tx._id}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
            .invoice-details { text-align: right; }
            .invoice-details h1 { margin: 0 0 10px 0; color: #333; }
            .content { margin-bottom: 40px; }
            .bill-to { margin-bottom: 20px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
            .table th { background-color: #f8fafc; font-weight: 600; color: #64748b; }
            .total { text-align: right; margin-top: 20px; font-size: 18px; font-weight: bold; }
            .footer { margin-top: 60px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Construction SaaS</div>
            <div class="invoice-details">
              <h1>INVOICE</h1>
              <p><strong>ID:</strong> ${tx._id}</p>
              <p><strong>Date:</strong> ${date}</p>
              <p><strong>Status:</strong> ${tx.status.toUpperCase()}</p>
            </div>
          </div>
          
          <div class="content">
            <div class="bill-to">
              <h3>Bill To:</h3>
              <p><strong>${tx.companyId?.name || 'Company Name'}</strong></p>
            </div>
            
            <table class="table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>SaaS Subscription Fee</td>
                  <td>$${tx.amount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            
            <div class="total">
              Total: $${tx.amount.toFixed(2)}
            </div>
          </div>
          
          <div class="footer">
            <p>Thank you for your business!</p>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-100 p-8 rounded-2xl text-center">
        <p className="text-rose-600 font-bold">{error}</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-lg">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Financial Overview</h1>
          <p className="text-slate-500 text-sm">Track Monthly Recurring Revenue (MRR) and transaction history.</p>
        </div>
        <button onClick={fetchData} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <h3 className="text-slate-500 text-sm font-medium">Net Revenue (YTD)</h3>
          <p className="text-3xl font-bold text-slate-900 mt-2">${stats.netRevenueYTD?.toLocaleString()}</p>
          <div className="mt-4 flex items-center text-emerald-500 text-sm font-medium bg-emerald-50 px-2 py-1 rounded w-fit">
            <ArrowUp size={16} className="mr-1" /> {stats.growthTrend}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <h3 className="text-slate-500 text-sm font-medium">Monthly Recurring Revenue</h3>
          <p className="text-3xl font-bold text-slate-900 mt-2">${stats.currentMRR?.toLocaleString()}</p>
          <div className="mt-4 flex items-center text-blue-500 text-sm font-medium bg-blue-50 px-2 py-1 rounded w-fit">
            <TrendingUp size={16} className="mr-1" /> Active Billing
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <h3 className="text-slate-500 text-sm font-medium">Yearly Revenue</h3>
          <p className="text-3xl font-bold text-slate-900 mt-2">${stats.yearlyRevenue?.toLocaleString()}</p>
          <div className="mt-4 flex items-center text-purple-500 text-sm font-medium bg-purple-50 px-2 py-1 rounded w-fit">
            <Calendar size={16} className="mr-1" /> Current Year
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <h3 className="text-slate-500 text-sm font-medium">Pending Invoices</h3>
          <p className="text-3xl font-bold text-slate-900 mt-2">${stats.pendingInvoices?.toLocaleString()}</p>
          <div className="mt-4 flex items-center text-slate-400 text-sm font-medium bg-slate-50 px-2 py-1 rounded w-fit">
            <Clock size={16} className="mr-1" /> Automated Retries
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Revenue Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-600" /> Monthly Revenue Trend
          </h3>
          <div className="h-64 flex items-end justify-between px-2 gap-2">
            {stats.monthlyRevenueTrend && stats.monthlyRevenueTrend.map((val, i) => {
              const maxVal = Math.max(...stats.monthlyRevenueTrend, 1);
              const heightPercentage = Math.max((val / maxVal) * 100, 5);

              return (
                <div key={i} className="w-full bg-slate-100 rounded-t-lg relative group h-full flex items-end">
                  <div
                    className="w-full bg-blue-500 rounded-t-lg hover:bg-blue-600 transition-all"
                    style={{ height: `${heightPercentage}%` }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap">
                      ${val.toLocaleString()}
                    </div>
                  </div>
                </div>
              )
            })}
            {!stats.monthlyRevenueTrend && <p className="text-center w-full text-slate-400">Loading monthly data...</p>}
          </div>
          <div className="flex justify-between mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
            <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Nov</span>
          </div>
        </div>

        {/* Yearly Revenue Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Calendar size={20} className="text-emerald-600" /> Yearly Performance
          </h3>
          <div className="h-64 flex items-end justify-between px-8 gap-8">
            {stats.yearlyRevenueTrend && stats.yearlyRevenueTrend.map((item) => {
              // Calculate max for normalization
              const maxVal = Math.max(...stats.yearlyRevenueTrend.map(i => i.total), 1);
              const heightPercentage = Math.max((item.total / maxVal) * 100, 5); // Min 5% height

              return (
                <div key={item.year} className="w-full flex flex-col items-center group">
                  <div className="w-16 bg-emerald-100 rounded-t-lg relative h-64 flex items-end">
                    <div className="w-full bg-emerald-500 rounded-t-lg transition-all hover:bg-emerald-600" style={{ height: `${heightPercentage}%` }}></div>
                    <div className="opacity-0 group-hover:opacity-100 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-bold text-lg drop-shadow-md pointer-events-none">
                      ${item.total.toLocaleString()}
                    </div>
                  </div>
                  <span className="mt-2 text-sm font-bold text-slate-600">{item.year}</span>
                </div>
              )
            })}
            {!stats.yearlyRevenueTrend && <p className="text-center w-full text-slate-400">Loading yearly data...</p>}
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Transaction History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-500">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">ID</th>
                <th className="px-6 py-4 whitespace-nowrap">Company</th>
                <th className="px-6 py-4 whitespace-nowrap">Amount</th>
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 whitespace-nowrap">Date</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <tr key={tx._id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-mono text-sm text-slate-600">{tx.displayCompanyId || tx._id.substring(0, 10)}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{tx.companyId?.name || 'N/A'}</td>
                  <td className="px-6 py-4 font-bold text-slate-800">${tx.amount.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border uppercase ${tx.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      tx.status === 'refunded' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        'bg-red-50 text-red-600 border-red-100'
                      }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">{new Date(tx.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDownload(tx._id)}
                      className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition"
                      title="Download Invoice"
                    >
                      <Download size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Revenue;
