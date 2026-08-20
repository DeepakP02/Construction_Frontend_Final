import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    DollarSign, Clock, Download, Send, Search, Filter,
    Eye, Printer, ArrowUpRight, MoreHorizontal, CheckCircle,
    AlertCircle, ChevronRight, Banknote, Wallet, FileText, X,
    Calendar, Briefcase, Loader2, ShieldCheck, User
} from 'lucide-react';
import api from '../../utils/api';

const StatCard = ({ title, value, sub, icon: Icon, color, trend }) => (
    <div className="bg-white p-6 rounded-[28px] shadow-sm border border-slate-200/60 flex items-center gap-5 hover:shadow-lg transition-all duration-300 group">
        <div className={`p-4 rounded-2xl ${color} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
            <Icon size={26} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">{title}</p>
            <p className="text-2xl font-black text-slate-900 leading-tight tracking-tighter">{value}</p>
            {sub && <p className="text-[11px] font-bold text-slate-400 mt-0.5">{sub}</p>}
        </div>
        {trend && (
            <div className="flex items-center gap-1 text-xs font-black px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600">
                <ArrowUpRight size={14} />{trend}
            </div>
        )}
    </div>
);

const StatusBadge = ({ status }) => {
    const map = {
        paid: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        pending: 'bg-orange-50  text-orange-700  border-orange-100',
        processing: 'bg-blue-50    text-blue-700    border-blue-100',
        held: 'bg-red-50     text-red-700     border-red-100',
    };
    return (
        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border shadow-sm ${map[status] || map.pending}`}>
            {status || 'preview'}
        </span>
    );
};

const Payroll = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [period, setPeriod] = useState('this-week');
    const [modal, setModal] = useState(false);
    const [step, setStep] = useState(1);
    const [selected, setSelected] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');

    // Detail Modal state
    const [detailModal, setDetailModal] = useState(false);
    const [detailRecord, setDetailRecord] = useState(null);
    const [detailLogs, setDetailLogs] = useState([]);
    const [detailLoading, setDetailLoading] = useState(false);

    const slipRef = useRef(null);

    const getDates = (p) => {
        const now = new Date();
        let start, end;
        
        // Use a copy to avoid modifying 'now'
        const d = new Date(now);

        if (p === 'this-week') {
            // Sunday as start of week
            const day = d.getDay();
            const diff = d.getDate() - day;
            start = new Date(d.setDate(diff));
            start.setHours(0, 0, 0, 0);
            end = new Date(); // Up to now
        } else if (p === 'last-week') {
            const day = d.getDay();
            const diff = d.getDate() - day - 7;
            start = new Date(d.setDate(diff));
            start.setHours(0, 0, 0, 0);
            
            const e = new Date(start);
            e.setDate(start.getDate() + 6);
            e.setHours(23, 59, 59, 999);
            end = e;
        } else if (p === 'this-month') {
            start = new Date(d.getFullYear(), d.getMonth(), 1);
            end = new Date();
        } else if (p === 'last-month') {
            start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
            end = new Date(d.getFullYear(), d.getMonth(), 0);
            end.setHours(23, 59, 59, 999);
        }
        
        return { 
            start: start.toISOString().split('T')[0], 
            end: end.toISOString().split('T')[0],
            display: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        };
    };

    const fetchPayroll = async () => {
        setLoading(true);
        try {
            const { start, end } = getDates(period);
            const r = await api.get(`/payroll/preview?startDate=${start}&endDate=${end}`);
            setRows(r.data || []);
        } catch (e) {
            console.error(e);
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayroll();
    }, [period]);

    // ── Action: View Detail Modal ──────────────────────────────────────────────
    const handleView = async (row) => {
        setDetailRecord(row);
        setDetailLogs([]);
        setDetailModal(true);
        setDetailLoading(true);
        try {
            const { start, end } = getDates(period);
            const res = await api.get(`/payroll/details?userId=${row.userId}&startDate=${start}&endDate=${end}`);
            setDetailLogs(res.data || []);
        } catch (e) {
            console.error('Failed to load payroll details', e);
        } finally {
            setDetailLoading(false);
        }
    };

    // ── Action: Download / Print Payslip ───────────────────────────────────────
    const handleDownload = (row) => {
        const { start, end } = getDates(period);
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Payslip – ${row.name}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 680px; margin: 40px auto; color: #1e293b; }
    h1 { font-size: 26px; font-weight: 900; letter-spacing: -1px; margin: 0 0 4px; }
    .sub { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .1em; margin-bottom: 32px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 32px; }
    .info-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; }
    .info-item small { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: .1em; color: #94a3b8; margin-bottom: 2px; font-weight: 700; }
    .info-item strong { font-size: 15px; font-weight: 900; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th { background: #f1f5f9; font-size: 9px; text-transform: uppercase; letter-spacing: .1em; color: #64748b; font-weight: 900; padding: 10px 12px; text-align: left; }
    td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .total-row { background: #0f172a; color: white; font-weight: 900; font-size: 15px; }
    .total-row td { padding: 14px 12px; border: none; }
    .deductions { color: #ef4444; }
    .positive { color: #10b981; }
    footer { margin-top: 40px; font-size: 10px; color: #94a3b8; text-align: center; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>PAYSLIP</h1>
  <div class="sub">Pay Period: ${start} → ${end}</div>
  <div class="info-grid">
    <div class="info-item"><small>Employee</small><strong>${row.name}</strong></div>
    <div class="info-item"><small>Role</small><strong>${row.role}</strong></div>
    <div class="info-item"><small>Total Hours</small><strong>${row.totalHours?.toFixed(2)}h</strong></div>
    <div class="info-item"><small>Hourly Rate</small><strong>$${row.rate}/hr</strong></div>
  </div>
  <table>
    <thead><tr><th>Description</th><th>Amount</th></tr></thead>
    <tbody>
      <tr><td>Gross Pay</td><td>$${row.grossPay?.toFixed(2)}</td></tr>
      <tr class="deductions"><td>CPP Deduction</td><td>−$${row.cpp?.toFixed(2)}</td></tr>
      <tr class="deductions"><td>EI Deduction</td><td>−$${row.ei?.toFixed(2)}</td></tr>
      <tr class="deductions"><td>Federal Tax</td><td>−$${row.federalTax?.toFixed(2)}</td></tr>
      <tr><td>WCB (Employer)</td><td>$${row.wcb?.toFixed(2)}*</td></tr>
      <tr class="total-row"><td>NET PAY</td><td class="positive">$${row.netPay?.toFixed(2)}</td></tr>
    </tbody>
  </table>
  <p style="font-size:11px;color:#94a3b8;">* WCB is an employer contribution and is not deducted from your pay.</p>
  <footer>Generated on ${new Date().toLocaleDateString()} · Ref: PAY-${Date.now().toString().slice(-8)}</footer>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const win = window.open(url);
        if (win) {
            win.addEventListener('load', () => {
                win.focus();
                win.print();
            });
        }
    };

    // ── Payroll Run ────────────────────────────────────────────────────────────
    const handleRunPayroll = async () => {
        setSubmitting(true);
        try {
            const { start, end } = getDates(period);
            const targetIds = selected.length > 0 ? selected : rows.map(r => r.userId);
            const targetRows = rows.filter(r => targetIds.includes(r.userId));
            await api.post('/payroll/run', {
                records: targetRows,
                startDate: start,
                endDate: end
            });
            // Immediately update status in local state so table reflects 'paid'
            setRows(prev => prev.map(r =>
                targetIds.includes(r.userId) ? { ...r, status: 'paid' } : r
            ));
            setStep(3);
        } catch (e) {
            alert('Failed to run payroll. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const filtered = rows.filter(r => {
        const matchesSearch = (r.name || '').toLowerCase().includes(search.toLowerCase()) ||
                            (r.role || '').toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || (r.status || 'pending') === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const toggleRow = uid => setSelected(p => p.includes(uid) ? p.filter(x => x !== uid) : [...p, uid]);
    const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map(r => r.userId));

    // Calculate totals for the modal based on selection
    const modalTargetRows = selected.length > 0 ? rows.filter(r => selected.includes(r.userId)) : rows;
    const mGross = modalTargetRows.reduce((s, r) => s + (r.grossPay || 0), 0);
    const mNet = modalTargetRows.reduce((s, r) => s + (r.netPay || 0), 0);
    const mTax = modalTargetRows.reduce((s, r) => s + (r.cpp || 0) + (r.ei || 0) + (r.federalTax || 0), 0);
    const mHours = modalTargetRows.reduce((s, r) => s + (r.totalHours || 0), 0);

    const totGross = rows.reduce((s, r) => s + (r.grossPay || 0), 0);
    const totNet = rows.reduce((s, r) => s + (r.netPay || 0), 0);
    const totCPP = rows.reduce((s, r) => s + (r.cpp || 0), 0);
    const totEI = rows.reduce((s, r) => s + (r.ei || 0), 0);
    const totTax = rows.reduce((s, r) => s + (r.federalTax || 0), 0);
    const totWCB = rows.reduce((s, r) => s + (r.wcb || 0), 0);
    const totHours = rows.reduce((s, r) => s + (r.totalHours || 0), 0);

    const periods = [
        { v: 'this-week', l: 'This Week' }, { v: 'last-week', l: 'Last Week' },
        { v: 'this-month', l: 'This Month' }, { v: 'last-month', l: 'Last Month' },
    ];

    return (
        <div className="space-y-8 animate-fade-in pb-12">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Payroll</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-slate-500 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                            <Banknote size={14} className="text-blue-600" /> Crew compensation
                        </p>
                        <span className="text-slate-300">•</span>
                        <p className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100 shadow-sm">
                            {getDates(period).display}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        title="Print payroll summary"
                        onClick={() => window.print()}
                        className="p-2.5 bg-white rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 hover:shadow-sm transition-all"
                    >
                        <Printer size={20} />
                    </button>
                    <button onClick={() => { setStep(1); setModal(true); }}
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-200 font-black text-sm uppercase tracking-tight">
                        <Send size={18} /> Run Payroll
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard title="Total Gross" value={`$${totGross.toLocaleString()}`} sub="this pay period" icon={DollarSign} color="bg-blue-600" />
                <StatCard title="Total Net Pay" value={`$${totNet.toLocaleString()}`} sub="after deductions" icon={Wallet} color="bg-emerald-500" />
                <StatCard title="Deductions" value={`$${(totCPP + totEI + totTax + totWCB).toLocaleString()}`} sub="CPP, EI, Tax, WCB" icon={FileText} color="bg-orange-400" />
                <StatCard title="Total Hours" value={`${totHours.toFixed(1)}h`} sub={`${rows.length} employees`} icon={Clock} color="bg-indigo-500" />
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col md:flex-row gap-4 items-center">
                <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
                    {periods.map(p => (
                        <button key={p.v} onClick={() => setPeriod(p.v)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${period === p.v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                            {p.l}
                        </button>
                    ))}
                </div>
                <div className="flex-1 relative w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Search employee or role..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 text-sm font-bold text-slate-700 placeholder:text-slate-400" />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="flex-1 md:flex-none px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 text-sm font-bold text-slate-700 appearance-none cursor-pointer hover:border-slate-300 transition-all"
                    >
                        <option value="all">All Status</option>
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                    </select>
                    <button className="flex-1 md:flex-none px-5 py-3 border border-slate-200 rounded-2xl hover:bg-slate-50 text-slate-600 font-bold text-sm flex items-center justify-center gap-2 transition-all">
                        <Filter size={16} /> Filter
                    </button>
                    {selected.length > 0 && (
                        <button
                            onClick={() => { setStep(1); setModal(true); }}
                            className="flex-1 md:flex-none px-5 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-100">
                            <Send size={16} /> Pay {selected.length}
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[40px] shadow-sm border border-slate-200/60 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-5">
                                    <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0}
                                        onChange={toggleAll} className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                                </th>
                                {['Employee', 'Role', 'Hours', 'Rate/hr', 'Gross', 'CPP', 'EI', 'Fed Tax', 'WCB', 'Net Pay', 'Status', 'ACTION'].map(h => (
                                    <th key={h} className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? [...Array(5)].map((_, i) => (
                                <tr key={i}>{[...Array(13)].map((_, j) => (
                                    <td key={j} className="px-6 py-5"><div className="h-4 bg-slate-100 rounded-lg animate-pulse" /></td>
                                ))}</tr>
                            )) : filtered.length === 0 ? (
                                <tr><td colSpan="13" className="px-8 py-24 text-center">
                                    <div className="flex flex-col items-center gap-4 text-slate-300">
                                        <DollarSign size={48} className="opacity-30" />
                                        <p className="font-bold uppercase tracking-widest text-[11px]">No payroll records found</p>
                                        <p className="text-[11px] text-slate-400">No approved time logs found for this period.</p>
                                    </div>
                                </td></tr>
                            ) : filtered.map(row => (
                                <tr key={row.userId} className={`hover:bg-slate-50/50 transition-colors group ${selected.includes(row.userId) ? 'bg-blue-50/30' : ''}`}>
                                    <td className="px-8 py-5">
                                        <input type="checkbox" checked={selected.includes(row.userId)} onChange={() => toggleRow(row.userId)}
                                            className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-white text-sm shadow-sm group-hover:scale-110 transition-transform">
                                                {(row.name || '?').charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 leading-tight">{row.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400">{(row.totalHours || 0).toFixed(1)}h worked</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-tight">{row.role}</span>
                                    </td>
                                    <td className="px-6 py-5 font-black text-slate-900">{(row.totalHours || 0).toFixed(1)}h</td>
                                    <td className="px-6 py-5 font-bold text-slate-500">${row.rate}</td>
                                    <td className="px-6 py-5 font-black text-slate-900">${(row.grossPay || 0).toLocaleString()}</td>
                                    <td className="px-6 py-5 text-red-400 font-bold">-${(row.cpp || 0).toFixed(2)}</td>
                                    <td className="px-6 py-5 text-red-400 font-bold">-${(row.ei || 0).toFixed(2)}</td>
                                    <td className="px-6 py-5 text-red-400 font-bold">-${(row.federalTax || 0).toFixed(2)}</td>
                                    <td className="px-6 py-5 text-orange-400 font-bold">${(row.wcb || 0).toFixed(2)}*</td>
                                    <td className="px-6 py-5"><span className="font-black text-emerald-600 text-base">${(row.netPay || 0).toLocaleString()}</span></td>
                                    <td className="px-6 py-5"><StatusBadge status={row.status || 'pending'} /></td>
                                    {/* ── ACTION Column ── */}
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-1">
                                            {/* View detail */}
                                            <button
                                                title="View time log breakdown"
                                                onClick={() => handleView(row)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            {/* Download slip */}
                                            <button
                                                title="Download / Print payslip"
                                                onClick={() => handleDownload(row)}
                                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                            >
                                                <Download size={16} />
                                            </button>
                                            {/* Quick pay single */}
                                            <button
                                                title="Mark as paid"
                                                onClick={() => { setSelected([row.userId]); setStep(1); setModal(true); }}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                            >
                                                <MoreHorizontal size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {!loading && filtered.length > 0 && (
                            <tfoot>
                                <tr className="bg-slate-900 text-white">
                                    <td className="px-8 py-5" colSpan="5">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pay Period Totals</span>
                                    </td>
                                    <td className="px-6 py-5 font-black">${totGross.toLocaleString()}</td>
                                    <td className="px-6 py-5 font-black text-red-400">-${totCPP.toFixed(2)}</td>
                                    <td className="px-6 py-5 font-black text-red-400">-${totEI.toFixed(2)}</td>
                                    <td className="px-6 py-5 font-black text-red-400">-${totTax.toFixed(2)}</td>
                                    <td className="px-6 py-5 font-black text-orange-400">${totWCB.toFixed(2)}</td>
                                    <td className="px-6 py-5 font-black text-emerald-400 text-base">${totNet.toLocaleString()}</td>
                                    <td colSpan="2" />
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────────── */}
            {/* Detail Modal (Portaled)                                            */}
            {/* ─────────────────────────────────────────────────────────────────── */}
            {detailModal && detailRecord && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[12px] z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[42px] shadow-[0_32px_120px_-12px_rgba(0,0,0,0.5)] w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 cubic-bezier(0.16, 1, 0.3, 1)">
                        {/* Modal header */}
                        <div className="bg-[#0F172A] p-8 text-white flex items-start justify-between relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-2xl shadow-xl shadow-blue-500/20 border border-white/10">
                                        {(detailRecord.name || '?').charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black tracking-tight leading-tight">{detailRecord.name}</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="px-2 py-0.5 bg-white/10 rounded text-[10px] font-black uppercase tracking-widest text-blue-300 border border-white/5">{detailRecord.role}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-500"></span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Employee ID: EMP-{(detailRecord.userId || '').slice(-4)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setDetailModal(false)} className="relative z-10 p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 group">
                                <X size={20} className="text-slate-400 group-hover:text-white transition-colors" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {/* Summary Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-8 pt-8">
                                {[
                                    { label: 'Gross Pay', value: `$${(detailRecord.grossPay || 0).toFixed(2)}`, icon: DollarSign, color: 'text-slate-900', bg: 'bg-slate-50' },
                                    { label: 'Net Pay', value: `$${(detailRecord.netPay || 0).toFixed(2)}`, icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50/50', border: 'border-emerald-100/50' },
                                    { label: 'Total Hours', value: `${(detailRecord.totalHours || 0).toFixed(2)}h`, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50/50', border: 'border-blue-100/50' },
                                    { label: 'Hourly Rate', value: `$${detailRecord.rate}/hr`, icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-50/50', border: 'border-indigo-100/50' },
                                ].map(c => (
                                    <div key={c.label} className={`rounded-[24px] p-5 border border-transparent ${c.bg} ${c.border || ''} transition-all hover:shadow-md group`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <c.icon size={12} className="text-slate-400" />
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{c.label}</p>
                                        </div>
                                        <p className={`font-black text-xl tracking-tighter ${c.color}`}>{c.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Deductions Section */}
                            <div className="px-8 mt-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Statutory Deductions</h3>
                                    <div className="h-px flex-1 bg-slate-100 ml-4"></div>
                                </div>
                                <div className="grid grid-cols-4 gap-3">
                                    {[
                                        { label: 'CPP', value: detailRecord.cpp, sub: 'Pension Plan' },
                                        { label: 'EI', value: detailRecord.ei, sub: 'Employment Ins.' },
                                        { label: 'Fed Tax', value: detailRecord.federalTax, sub: 'Income Tax' },
                                        { label: 'WCB*', value: detailRecord.wcb, sub: 'Comp. Board', orange: true },
                                    ].map(d => (
                                        <div key={d.label} className={`rounded-[24px] p-4 text-center border transition-all hover:scale-[1.02] ${d.orange ? 'bg-orange-50/30 border-orange-100' : 'bg-red-50/30 border-red-100'}`}>
                                            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${d.orange ? 'text-orange-400' : 'text-red-400'}`}>{d.label}</p>
                                            <p className={`font-black text-lg tracking-tighter ${d.orange ? 'text-orange-600' : 'text-red-600'}`}>-${(d.value || 0).toFixed(2)}</p>
                                            <p className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">{d.sub}</p>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[9px] font-medium text-slate-400 mt-3 italic">* WCB is employer-paid and not deducted from net pay.</p>
                            </div>

                            {/* Logs Section */}
                            <div className="px-8 py-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Timesheet Breakdown</h3>
                                    <div className="h-px flex-1 bg-slate-100 ml-4"></div>
                                </div>
                                
                                {detailLoading ? (
                                    <div className="space-y-3">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-16 bg-slate-50 rounded-2xl animate-pulse border border-slate-100" />
                                        ))}
                                    </div>
                                ) : detailLogs.length === 0 ? (
                                    <div className="text-center py-12 bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100">
                                            <Clock size={20} className="text-slate-300" />
                                        </div>
                                        <p className="font-bold text-slate-400 text-sm">No contributing logs found</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {detailLogs.map((log, idx) => (
                                            <div key={log._id || idx} className="flex items-center justify-between bg-white rounded-[24px] px-6 py-4 border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                                        <Calendar size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 text-sm tracking-tight">{new Date(log.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                            <span>{new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            <span className="text-slate-300">→</span>
                                                            <span>{new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right hidden sm:block">
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 mb-0.5">Job / Site</p>
                                                        <p className="text-[11px] font-bold text-slate-500 flex items-center justify-end gap-1.5 uppercase">
                                                            <Briefcase size={12} className="text-slate-300" /> {log.job}
                                                        </p>
                                                    </div>
                                                    <div className="text-right min-w-[70px]">
                                                        <p className="font-black text-slate-900 text-base tracking-tighter">{log.hours}h</p>
                                                        <p className="text-[11px] font-bold text-emerald-600 tracking-tight">${log.amount.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer actions */}
                        <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
                            <button onClick={() => setDetailModal(false)}
                                className="flex-1 py-4 bg-white hover:bg-slate-50 text-slate-600 rounded-[20px] font-black text-sm uppercase tracking-widest transition-all border border-slate-200 shadow-sm active:scale-95">
                                Close
                            </button>
                            <button onClick={() => { setDetailModal(false); handleDownload(detailRecord); }}
                                className="flex-[1.5] py-4 bg-[#0F172A] hover:bg-slate-800 text-white rounded-[20px] font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200 active:scale-95 group">
                                <Download size={18} className="group-hover:translate-y-0.5 transition-transform" /> Download Payslip
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ─────────────────────────────────────────────────────────────────── */}
            {/* Run Payroll Modal (Portaled)                                       */}
            {/* ─────────────────────────────────────────────────────────────────── */}
            {modal && createPortal(
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[12px] z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[42px] shadow-[0_32px_120px_-12px_rgba(0,0,0,0.5)] w-full max-w-lg overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 cubic-bezier(0.16, 1, 0.3, 1)">
                        <div className="bg-[#0F172A] p-10 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-5 mb-6">
                                    <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/20 border border-white/10">
                                        <Send size={26} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black tracking-tight leading-none mb-1">Run Payroll</h2>
                                        <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">Step {step} of 3 • Configuration</p>
                                    </div>
                                </div>
                                <div className="flex gap-2.5">
                                    {[1, 2, 3].map(s => (
                                        <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${step >= s ? 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]' : 'bg-white/10'}`} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-10 space-y-8">
                            {step === 1 && (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                    <h3 className="font-black text-slate-900 text-xl tracking-tight mb-6">Verify Pay Period Summary</h3>
                                    <div className="space-y-3">
                                        {[
                                            { l: 'Selected Crew', v: `${modalTargetRows.length} Members`, icon: User },
                                            { l: 'Billable Hours', v: `${mHours.toFixed(1)}h Total`, icon: Clock },
                                            { l: 'Gross Amount', v: `$${mGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: DollarSign },
                                            { l: 'Statutory Taxes', v: `-$${mTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: FileText, red: true },
                                            { l: 'Final Disbursal', v: `$${mNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, hi: true, icon: Wallet },
                                        ].map(item => (
                                            <div key={item.l} className={`flex justify-between items-center p-5 rounded-[24px] border transition-all ${item.hi ? 'bg-emerald-50/50 border-emerald-100 shadow-sm' : 'bg-slate-50/50 border-slate-100'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-xl ${item.hi ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400 shadow-sm'}`}>
                                                        <item.icon size={16} />
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-500">{item.l}</span>
                                                </div>
                                                <span className={`font-black ${item.hi ? 'text-emerald-600 text-xl tracking-tighter' : item.red ? 'text-red-500' : 'text-slate-900 tracking-tight'}`}>{item.v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {step === 2 && (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                                    <h3 className="font-black text-slate-900 text-xl tracking-tight mb-6">Authorize Disbursal</h3>
                                    <div className="bg-orange-50 border border-orange-100 rounded-[28px] p-6 flex gap-5 mb-6 shadow-sm shadow-orange-100/50">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0">
                                            <AlertCircle size={24} className="text-orange-500" />
                                        </div>
                                        <div>
                                            <p className="font-black text-orange-900 text-sm">Security Confirmation Required</p>
                                            <p className="text-orange-700/70 text-xs font-bold mt-1 leading-relaxed">Funds will be disbursed to {modalTargetRows.length} crew members. Total Net: <strong className="text-orange-900">${mNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>. This action cannot be reversed.</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                        {(selected.length > 0 ? rows.filter(r => selected.includes(r.userId)) : rows).map(r => (
                                            <div key={r.userId} className="flex justify-between items-center bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-4 hover:border-slate-200 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-900 text-sm font-black shadow-sm">{(r.name || '?').charAt(0)}</div>
                                                    <div>
                                                        <p className="font-black text-slate-900 text-sm">{r.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.role}</p>
                                                    </div>
                                                </div>
                                                <span className="font-black text-emerald-600 tracking-tight">${(r.netPay || 0).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {step === 3 && (
                                <div className="text-center py-4 animate-in zoom-in-95 duration-500">
                                    <div className="w-24 h-24 bg-emerald-50 rounded-[32px] flex items-center justify-center mx-auto mb-6 border-2 border-emerald-100 shadow-xl shadow-emerald-100/20 relative">
                                        <div className="absolute inset-0 bg-emerald-400/20 rounded-[32px] animate-ping opacity-20"></div>
                                        <CheckCircle size={48} className="text-emerald-500 relative z-10" />
                                    </div>
                                    <h3 className="font-black text-slate-900 text-2xl tracking-tight mb-2">Payroll Authorized</h3>
                                    <p className="text-slate-500 font-bold text-sm mb-8">Funds have been disbursed and records updated to <span className="text-emerald-600 font-black">PAID</span> for {selected.length > 0 ? selected.length : rows.length} members.</p>
                                    
                                    <div className="bg-slate-50 rounded-[32px] p-6 text-left space-y-3 border border-slate-100">
                                        <div className="flex justify-between text-xs">
                                            <span className="font-black text-slate-400 uppercase tracking-widest">Transaction ID</span>
                                            <span className="font-black text-slate-900">PAY-{Date.now().toString().slice(-8)}</span>
                                        </div>
                                        <div className="h-px bg-slate-200/50"></div>
                                        <div className="flex justify-between text-xs">
                                            <span className="font-black text-slate-400 uppercase tracking-widest">Completion Timestamp</span>
                                            <span className="font-black text-slate-900">{new Date().toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                {step < 3 ? (
                                    <>
                                        <button onClick={() => step > 1 ? setStep(s => s - 1) : setModal(false)}
                                            className="flex-1 px-8 py-4 bg-white hover:bg-slate-50 text-slate-600 rounded-[22px] font-black text-sm uppercase tracking-widest transition-all border border-slate-200 shadow-sm active:scale-95">
                                            {step > 1 ? 'Back' : 'Cancel'}
                                        </button>
                                        <button
                                            onClick={() => step === 1 ? setStep(2) : handleRunPayroll()}
                                            disabled={submitting}
                                            className="flex-[1.5] px-8 py-4 bg-[#0F172A] hover:bg-slate-800 text-white rounded-[22px] font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95">
                                            {submitting ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : step === 2 ? (
                                                <><ShieldCheck size={18} /> Authorize Disbursal</>
                                            ) : (
                                                <><ChevronRight size={18} /> Review Next</>
                                            )}
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={() => { setModal(false); setStep(1); setSelected([]); }}
                                        className="w-full px-8 py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-[22px] font-black text-sm uppercase tracking-widest transition-all shadow-xl active:scale-95">
                                        Done &amp; Close Portal
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Payroll;
