import { useState } from 'react';

const Approvals = () => {
  const [approvals, setApprovals] = useState([
    {
      id: 1,
      title: 'Exterior Paint Color',
      description: 'Please review and approve the selected exterior Sherwin Williams "Agreeable Gray".',
      date: 'Due Feb 28, 2026',
      status: 'Pending',
      priority: 'High',
      options: ['Approve', 'Request Change', 'Decline'],
    },
    {
      id: 2,
      title: 'Kitchen Cabinet Finish',
      description: 'Confirmation required for "Modern White" shaker cabinets from vendor.',
      date: 'Due Mar 05, 2026',
      status: 'Pending',
      priority: 'Medium',
      options: ['Approve', 'View Sample', 'Decline'],
    },
    {
      id: 3,
      title: 'Initial Concept Layout',
      description: 'Approval of the revised floor plan layout for the master suite.',
      date: 'Approved on Jan 20, 2026',
      status: 'Approved',
      priority: 'Completed',
      options: ['View Approved Doc'],
    }
  ]);

  const handleAction = (id, newStatus) => {
    setApprovals(approvals.map(app =>
      app.id === id ? { ...app, status: newStatus } : app
    ));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Pending Approvals</h1>
        <p className="text-slate-500 text-sm">Review items requiring your sign-off to keep the project moving.</p>
      </div>

      <div className="space-y-4">
        {approvals.map((approval) => (
          <div key={approval.id} className={`p-6 bg-white rounded-xl shadow-sm border ${['Approved', 'Changes Requested'].includes(approval.status) ? 'border-emerald-100 bg-emerald-50/10' : 'border-slate-200'} transition-all hover:shadow-md`}>
            <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-slate-800">{approval.title}</h3>
                  {approval.priority === 'High' && <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">Urgent</span>}
                </div>
                <p className="text-slate-600 text-sm">{approval.description}</p>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full w-fit ${approval.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : approval.status === 'Changes Requested' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                {approval.status}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-4 gap-4">
              <span className="text-xs text-slate-400 font-medium">{approval.date}</span>
              <div className="flex gap-2 w-full sm:w-auto">
                {approval.status === 'Pending' ? (
                  <>
                    <button onClick={() => handleAction(approval.id, 'Changes Requested')} className="flex-1 sm:flex-none px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 rounded-lg text-sm font-medium transition">
                      Request Change
                    </button>
                    <button onClick={() => handleAction(approval.id, 'Approved')} className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm">
                      Approve
                    </button>
                  </>
                ) : (
                  <button disabled className="px-4 py-2 text-emerald-600 bg-emerald-50 rounded-lg text-sm font-medium cursor-not-allowed flex items-center gap-1">
                    Action Completed
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Approvals;
