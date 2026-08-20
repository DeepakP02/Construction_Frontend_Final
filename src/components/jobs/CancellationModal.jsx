import { useState } from 'react';
import { X, AlertTriangle, Send } from 'lucide-react';

const CancellationModal = ({ isOpen, onClose, onConfirm, loading }) => {
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!reason.trim()) return;
        onConfirm(reason);
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="bg-red-500 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                            <AlertTriangle size={22} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black tracking-tight">Cancel Task</h2>
                            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-0.5">Reason Required</p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                            Why are you cancelling this task?
                        </label>
                        <textarea
                            required
                            autoFocus
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Missing materials, site inaccessible, or assigned by mistake..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 font-bold text-slate-800 outline-none focus:border-red-500/50 focus:ring-4 focus:ring-red-500/5 transition-all placeholder:text-slate-300 resize-none"
                            rows="4"
                        ></textarea>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-[20px] font-black text-xs uppercase tracking-widest transition-all"
                        >
                            Back
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !reason.trim()}
                            className="flex-1 px-6 py-4 bg-red-500 hover:bg-red-600 text-white rounded-[20px] font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-red-200 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <><Send size={16} /> Confirm Cancellation</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CancellationModal;
