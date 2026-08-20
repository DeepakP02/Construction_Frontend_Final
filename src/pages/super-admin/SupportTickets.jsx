import React, { useState, useEffect } from 'react';
import { MessageSquare, Clock, Filter, CheckCircle, AlertTriangle, ArrowRight, Send, User, Building, Search, RefreshCw } from 'lucide-react';
import api from '../../utils/api';

const SupportTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/super-admin/support/tickets');
      setTickets(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError('Failed to load support tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleStatusChange = async (status) => {
    if (!selectedTicket) return;
    try {
      const response = await api.patch(`/super-admin/support/tickets/${selectedTicket._id}`, { status });
      const updatedTicket = response.data;
      setTickets(tickets.map(t => t._id === updatedTicket._id ? updatedTicket : t));
      setSelectedTicket(updatedTicket);
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update ticket status.');
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;

    try {
      const response = await api.patch(`/super-admin/support/tickets/${selectedTicket._id}`, { message: replyText });
      const updatedTicket = response.data;

      // Update local state
      setTickets(tickets.map(t => t._id === updatedTicket._id ? updatedTicket : t));
      setSelectedTicket(updatedTicket);
      setReplyText('');
    } catch (err) {
      console.error('Error sending reply:', err);
      alert('Failed to send reply.');
    }
  };

  const filteredTickets = tickets.filter(t => activeTab === 'All' || t.status === activeTab.toLowerCase());

  if (loading && tickets.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Support Tickets</h1>
          <p className="text-slate-500 text-sm">Manage incoming support requests from across the platform.</p>
        </div>
        <div className="flex gap-4 text-sm font-medium">
          <button onClick={fetchTickets} className="p-2 text-slate-400 hover:text-blue-600 transition-colors mr-2">
            <RefreshCw size={20} />
          </button>
          {['Open', 'In-Progress', 'Resolved', 'All'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg border transition shadow-sm ${activeTab === tab ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden">
        {/* Ticket List */}
        <div className={`${selectedTicket ? 'hidden lg:block' : 'block'} flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col shadow-sm max-w-sm`}>
          <div className="p-4 border-b border-slate-100 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input type="text" placeholder="Search tickets..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
          <div className="divide-y divide-slate-100 overflow-y-auto">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket._id}
                onClick={() => setSelectedTicket(ticket)}
                className={`p-4 hover:bg-slate-50 transition cursor-pointer group border-l-4 ${selectedTicket?._id === ticket._id ? 'border-l-blue-500 bg-blue-50' : 'border-l-transparent'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition truncate">{ticket.subject}</h3>
                  <span className="text-[10px] text-slate-400 shrink-0">{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-slate-500 font-medium">{ticket.companyId?.name}</span>
                  <span className="text-slate-300">•</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-bold ${ticket.priority === 'high' || ticket.priority === 'critical' ? 'border-red-200 text-red-600 bg-red-50' : 'border-blue-200 text-blue-600 bg-blue-50'
                    }`}>
                    {ticket.priority}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`flex items-center gap-1 text-[10px] font-bold uppercase
                    ${ticket.status === 'open' ? 'text-amber-600' : ticket.status === 'resolved' || ticket.status === 'closed' ? 'text-emerald-600' : 'text-blue-600'}`}>
                    {ticket.status === 'open' && <AlertTriangle size={10} />}
                    {ticket.status === 'resolved' && <CheckCircle size={10} />}
                    {ticket.status}
                  </span>
                </div>
              </div>
            ))}
            {filteredTickets.length === 0 && (
              <div className="p-10 text-center text-slate-400">
                <MessageSquare size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">No tickets found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Ticket Detail View */}
        <div className={`${selectedTicket ? 'block' : 'hidden lg:block'} flex-[2] bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden shadow-sm`}>
          {selectedTicket ? (
            <>
              <div className="p-6 border-b border-slate-100 bg-white">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold text-slate-800">{selectedTicket.subject}</h2>
                  <button onClick={() => setSelectedTicket(null)} className="lg:hidden text-slate-400">Back</button>
                </div>
                <div className="flex items-center gap-6 text-sm text-slate-500 mb-4">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700"><Building size={16} className="text-slate-400" /> {selectedTicket.companyId?.name}</span>
                  <span className="flex items-center gap-1.5"><User size={16} className="text-slate-400" /> {selectedTicket.userId?.fullName}</span>
                  <span className="flex items-center gap-1.5"><Clock size={16} className="text-slate-400" /> {new Date(selectedTicket.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
                  >
                    <option value="open">Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <span className={`text-[10px] px-2 py-1 rounded-lg font-bold uppercase ${selectedTicket.priority === 'critical' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                      selectedTicket.priority === 'high' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                        'bg-slate-100 text-slate-600'
                    }`}>
                    {selectedTicket.priority} Priority
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                {/* Original Message */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                    <User size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-bold text-slate-800">{selectedTicket.userId?.fullName}</span>
                      <span className="text-[10px] text-slate-400 font-medium">Customer Request</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm">
                      <p className="text-slate-700 text-sm leading-relaxed">
                        {selectedTicket.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Thread */}
                {selectedTicket.messages?.map((msg, i) => (
                  <div key={i} className={`flex gap-4 ${msg.senderRole === 'SUPER_ADMIN' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${msg.senderRole === 'SUPER_ADMIN' ? 'bg-slate-800 border-slate-700' : 'bg-blue-50 border-blue-100'}`}>
                      {msg.senderRole === 'SUPER_ADMIN' ? <CheckCircle size={20} className="text-white" /> : <User size={20} className="text-blue-600" />}
                    </div>
                    <div className={`flex flex-col ${msg.senderRole === 'SUPER_ADMIN' ? 'items-end' : ''} flex-1`}>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-sm font-bold text-slate-800">{msg.senderRole === 'SUPER_ADMIN' ? 'Platform Support' : 'Customer'}</span>
                        <span className="text-[10px] text-slate-400">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <div className={`p-4 rounded-2xl border shadow-sm max-w-[85%]
                         ${msg.senderRole === 'SUPER_ADMIN'
                          ? 'bg-blue-600 border-blue-500 text-white rounded-tr-none'
                          : 'bg-white border-slate-100 text-slate-700 rounded-tl-none'}`}>
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-white border-t border-slate-100">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                  />
                  <button onClick={handleSendReply} className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl transition shadow-md shadow-blue-200">
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <MessageSquare size={48} className="opacity-10 text-slate-900" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">No Ticket Selected</h3>
              <p className="text-sm mt-1 max-w-xs text-slate-500">Select a ticket from the left sidebar to view details and respond to the customer.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportTickets;
