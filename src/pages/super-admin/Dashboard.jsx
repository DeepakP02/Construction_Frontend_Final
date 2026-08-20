import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Building, CreditCard, Users, TrendingUp, AlertCircle, Clock, ArrowUpRight, ArrowRight, Database, Briefcase, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../utils/api';

const SuperAdminStatCard = ({ title, value, subtext, icon: Icon, color, growth }) => (
  <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200/60 flex items-center gap-5 hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 group">
    <div className={`w-16 h-16 rounded-[1.5rem] ${color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
      <Icon size={30} className="text-white" />
    </div>
    <div className="flex-1">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{value}</h3>
        {growth && (
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${growth.startsWith('+') ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
            {growth}
          </span>
        )}
      </div>
      <p className="text-xs font-bold text-slate-500 mt-1">{subtext}</p>
    </div>
  </div>
);

const SuperAdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/super-admin/dashboard/stats');
      setData(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to load dashboard statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Fetching Platform Data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-100 p-12 rounded-[3rem] text-center space-y-6">
        <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-500">
          <AlertCircle size={40} />
        </div>
        <div>
          <h3 className="text-2xl font-black text-rose-900 tracking-tight">System Access Error</h3>
          <p className="text-rose-600 font-bold mt-2 max-w-md mx-auto">{error}</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-200"
        >
          Re-establish Connection
        </button>
      </div>
    );
  }

  const { stats, growth, revenueData, recentSignups } = data;

  return (
    <div className="space-y-10 animate-fade-in w-full pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Platform Command</h1>
          <p className="text-slate-500 font-bold text-sm mt-1 uppercase tracking-widest flex items-center gap-2">
            <Shield size={14} className="text-blue-600" />
            Global network monitoring & infrastructure
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchDashboardData}
            className="p-3 bg-white rounded-2xl border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-100 hover:bg-blue-50 transition-all group"
            title="Refresh Terminal"
          >
            <RefreshCw size={22} className="group-active:rotate-180 transition-transform duration-500" />
          </button>
          <div className="bg-slate-900 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-xl">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-black text-white uppercase tracking-widest">Root Active</span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SuperAdminStatCard
          title="Total Companies"
          value={stats.totalCompanies}
          subtext="Verified Tenants"
          icon={Building}
          color="bg-blue-600"
          growth={growth.companies}
        />
        <SuperAdminStatCard
          title="Subscribers"
          value={stats.activeSubscriptions}
          subtext="Revenue Generators"
          icon={CreditCard}
          color="bg-emerald-500"
          growth={growth.subscriptions}
        />
        <SuperAdminStatCard
          title="Monthly Revenue"
          value={`$${(stats.monthlyRevenue / 1000).toFixed(1)}k`}
          subtext="Net ARR Forecast"
          icon={TrendingUp}
          color="bg-indigo-600"
          growth={growth.revenue}
        />
        <SuperAdminStatCard
          title="Global Users"
          value={stats.totalUsers.toLocaleString()}
          subtext="Active Identites"
          icon={Users}
          color="bg-slate-800"
          growth={growth.users}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200/60 overflow-hidden relative group">
          <div className="flex justify-between items-center mb-8 relative z-10">
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                Financial Trajectory
              </h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">12-Month Performance Review</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 uppercase tracking-tight flex items-center gap-1">
                <ArrowUpRight size={12} /> {growth.revenue} Shift
              </span>
            </div>
          </div>

          <div className="h-[400px] w-full relative z-10 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: '800' }}
                  dy={15}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: '800' }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '20px',
                    border: 'none',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    padding: '12px 16px',
                    fontWeight: '900'
                  }}
                  formatter={(value) => [`$${value}k`, 'Monthly Rev']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#2563eb"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Companies Sidebar */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200/60 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Recent Onboarding</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Latest platform tenants</p>
            </div>
            <Link to="/super-admin/companies">
              <button className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center">
                <ArrowRight size={20} />
              </button>
            </Link>
          </div>
          <div className="space-y-5 flex-1 overflow-y-auto custom-scrollbar pr-1">
            {recentSignups.map((company, i) => {
              const planColors = {
                'enterprise': 'bg-blue-50 text-blue-600 border-blue-100',
                'business': 'bg-purple-50 text-purple-600 border-purple-100',
                'pro': 'bg-emerald-50 text-emerald-600 border-emerald-100',
                'starter': 'bg-orange-50 text-orange-600 border-orange-100',
                'basic': 'bg-slate-50 text-slate-600 border-slate-100'
              };
              const planName = typeof company.subscriptionPlanId === 'object' ? (company.subscriptionPlanId?.name || '') : (company.subscriptionPlanId || '');
              const colorClass = planColors[planName.toLowerCase()] || 'bg-slate-50 text-slate-600 border-slate-100';

              return (
                <div key={company._id || i} className="flex gap-4 items-center group cursor-pointer p-3 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 border ${colorClass} shadow-sm uppercase transform group-hover:-rotate-3 transition-transform`}>
                    {company.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="font-black text-slate-800 transition-colors group-hover:text-blue-600 text-sm truncate tracking-tight">{company.name}</p>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter ml-2 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                        {new Date(company.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${growth.companies.startsWith('+') ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{planName || 'Basic'} Subscription</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-8 border-t border-slate-50">
            <Link to="/super-admin/companies">
              <button className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-2 group">
                Provision New Entity <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
