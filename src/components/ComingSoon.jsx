import { Construction, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ComingSoon = ({ title, description }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] text-center p-8 animate-fade-in">
      <div className="bg-blue-50 p-6 rounded-full mb-6">
        <Construction size={48} className="text-blue-600" />
      </div>
      <h2 className="text-3xl font-bold text-slate-800 mb-3">{title || "Under Construction"}</h2>
      <p className="text-slate-500 max-w-md mb-8">
        {description || "We're currently building this module to help you manage your construction projects more efficiently. Check back soon!"}
      </p>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900 transition shadow-sm"
      >
        <ArrowLeft size={18} /> Go Back
      </button>
    </div>
  );
};

export default ComingSoon;
