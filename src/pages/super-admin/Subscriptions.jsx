import { CheckCircle, XCircle, AlertTriangle, CreditCard, Plus, Loader, Users, Briefcase } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import Modal from '../../components/Modal';

const Subscriptions = () => {
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState({
    active: 0,
    pending: 0,
    canceled: 0,
    past_due: 0
  });
  const [loading, setLoading] = useState(true);
  const [failures, setFailures] = useState([
    { id: 1, company: 'Urban Architects', amount: '$899.00', date: 'Feb 10, 2026', reason: 'Insufficient Funds' },
    { id: 2, company: 'Miller Homes', amount: '$299.00', date: 'Feb 08, 2026', reason: 'Card Expired' },
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansRes, companiesRes, failuresRes] = await Promise.all([
        api.get('/plans'),
        api.get('/companies'),
        api.get('/super-admin/billing/transactions?status=failed')
      ]);

      setPlans(plansRes.data);
      setFailures(failuresRes.data);

      // Calculate stats from companies
      const companies = companiesRes.data;
      const newStats = {
        active: companies.filter(c => c.subscriptionStatus === 'active').length,
        pending: companies.filter(c => c.subscriptionStatus === 'pending').length,
        canceled: companies.filter(c => c.subscriptionStatus === 'canceled').length,
        past_due: companies.filter(c => c.subscriptionStatus === 'past_due').length,
      };
      setStats(newStats);

    } catch (error) {
      console.error('Error fetching subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: '',
    price: '',
    stripeId: '',
    features: ''
  });

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      const planData = {
        name: newPlan.name,
        price: newPlan.price,
        features: newPlan.features.split('\n').filter(f => f.trim() !== ''),
        period: 'month'
      };
      await api.post('/plans', planData);
      fetchData();
      setIsModalOpen(false);
      setNewPlan({ name: '', price: '', stripeId: '', features: '' });
    } catch (error) {
      console.error('Error creating plan:', error);
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Subscriptions Management</h1>
          <p className="text-slate-500 text-sm">Manage pricing plans, Stripe integration, and billing issues.</p>
        </div>
      </div>

      {/* Subscription Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
          <div className="flex justify-between items-start">
            <CheckCircle className="text-emerald-600" size={20} />
            <span className="text-xs font-bold text-emerald-600 uppercase">Active</span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.active}</p>
          <p className="text-xs text-slate-500 font-medium">Monthly Subscribers</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
          <div className="flex justify-between items-start">
            <AlertTriangle className="text-amber-600" size={20} />
            <span className="text-xs font-bold text-amber-600 uppercase">Pending</span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.pending}</p>
          <p className="text-xs text-slate-500 font-medium">Needs Approval</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl">
          <div className="flex justify-between items-start">
            <XCircle className="text-orange-600" size={20} />
            <span className="text-xs font-bold text-orange-600 uppercase">Past Due</span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.past_due}</p>
          <p className="text-xs text-slate-500 font-medium">Payment Issues</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
          <div className="flex justify-between items-start">
            <Briefcase className="text-slate-600" size={20} />
            <span className="text-xs font-bold text-slate-600 uppercase">Total</span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.active + stats.pending + stats.canceled + stats.past_due}</p>
          <p className="text-xs text-slate-500 font-medium">All Companies</p>
        </div>
      </div>

      {/* Pricing Plans */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Pricing Plans & Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <div key={index} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-slate-800">{plan.name}</h3>
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">${plan.price}/{plan.period}</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle size={14} className="text-emerald-500 shrink-0" /> {feature}
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-4">
                <span className="truncate max-w-[120px]" title={plan._id}>ID: {plan._id}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Failures */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="text-red-500" size={20} /> Payment Failures (Last 30 Days)
            </h3>
            <p className="text-sm text-slate-500">Failed charges that require attention.</p>
          </div>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium p-2 hover:bg-blue-50 rounded-lg transition">View All Failed</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Company</th>
                <th className="px-6 py-4 whitespace-nowrap">Amount</th>
                <th className="px-6 py-4 whitespace-nowrap">Date</th>
                <th className="px-6 py-4 whitespace-nowrap">Failure Reason</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {failures.map((fail) => (
                <tr key={fail._id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-medium text-slate-900">{fail.companyId?.name || 'Unknown'}</td>
                  <td className="px-6 py-4">${fail.amount?.toFixed(2)}</td>
                  <td className="px-6 py-4">{new Date(fail.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-red-600 flex items-center gap-1 font-medium">
                    <XCircle size={14} /> {fail.failureReason || 'General Failure'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-blue-600 hover:underline">Retry Charge</button>
                  </td>
                </tr>
              ))}
              {failures.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-slate-400">
                    No failed payments found in the last 30 days.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Subscriptions;
