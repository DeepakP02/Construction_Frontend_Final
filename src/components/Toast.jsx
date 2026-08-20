import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

const Toast = ({ message, type = 'info', onClose, duration = 5000 }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        if (duration) {
            const timer = setTimeout(() => {
                handleClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [onClose, duration]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for fade out animation
    };

    const icons = {
        success: <CheckCircle className="text-emerald-500" size={20} />,
        error: <AlertCircle className="text-red-500" size={20} />,
        warning: <AlertTriangle className="text-amber-500" size={20} />,
        info: <Info className="text-blue-500" size={20} />,
    };

    const bgColors = {
        success: 'bg-white border-emerald-100 shadow-emerald-100/50',
        error: 'bg-white border-red-100 shadow-red-100/50',
        warning: 'bg-white border-amber-100 shadow-amber-100/50',
        info: 'bg-white border-blue-100 shadow-blue-100/50',
    };

    return createPortal(
        <div
            className={`fixed bottom-8 right-8 z-[999999] flex items-center gap-4 px-6 py-5 rounded-[24px] border border-slate-200/60 shadow-2xl transition-all duration-300 transform ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'} min-w-[320px] max-w-md ${bgColors[type]}`}
        >
            <div className="shrink-0 w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center shadow-inner">
                {icons[type]}
            </div>
            <div className="flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-1">
                    {type === 'error' ? 'Action Required' : type === 'success' ? 'Success' : 'Notification'}
                </p>
                <p className="text-[13px] font-bold text-slate-800 leading-snug">
                    {message}
                </p>
            </div>
            <button
                onClick={handleClose}
                className="shrink-0 w-8 h-8 flex items-center justify-center hover:bg-slate-50 rounded-xl transition-all text-slate-300 hover:text-slate-600 border border-transparent hover:border-slate-100"
            >
                <X size={16} />
            </button>
        </div>,
        document.body
    );
};

export default Toast;
