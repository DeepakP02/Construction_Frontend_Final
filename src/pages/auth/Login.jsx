import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Loader } from 'lucide-react';
import Logo from '../../assets/images/Logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setSubmitting(true); setError('');
    try {
      const user = await login(email, password);
      if (user.role === 'SUPER_ADMIN') navigate('/super-admin');
      else if (['COMPANY_OWNER', 'PM', 'FOREMAN', 'WORKER', 'SUBCONTRACTOR'].includes(user.role)) navigate('/company-admin');
      else if (user.role === 'CLIENT') navigate('/client-portal');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: "'DM Sans', sans-serif", 
      background: '#0f172a',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }

        /* ── background elements ── */
        .bg-grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image: linear-gradient(rgba(21,93,255,0.07) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(21,93,255,0.07) 1px, transparent 1px);
          background-size: 50px 50px;
          z-index: 0;
        }

        .bg-glow {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at 50% 50%, rgba(21,93,255,0.15) 0%, transparent 60%);
          z-index: 1;
        }

        .bg-glow-top {
          position: absolute;
          top: -10%;
          right: -10%;
          width: 50%;
          height: 50%;
          background: radial-gradient(circle at center, rgba(21,93,255,0.1) 0%, transparent 70%);
          filter: blur(80px);
          z-index: 1;
        }

        /* ── inputs ── */
        .li {
          width: 100%;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 14px 14px 14px 46px;
          color: #fff;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(4px);
        }
        .li::placeholder { color: rgba(255, 255, 255, 0.3); }
        .li:focus {
          border-color: #155dff;
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 0 0 4px rgba(21,93,255,0.15);
        }

        /* ── login button ── */
        .btn-login {
          width: 100%; 
          background: linear-gradient(135deg, #155dff 0%, #004ecc 100%);
          color: #fff; 
          border: none;
          border-radius: 12px; 
          padding: 15px;
          font-size: 15px; 
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer; 
          display: flex; 
          align-items: center;
          justify-content: center; 
          gap: 10px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
          letter-spacing: 0.01em;
          box-shadow: 0 4px 15px rgba(21,93,255,0.3);
        }
        .btn-login:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(21,93,255,0.5);
          filter: brightness(1.1);
        }
        .btn-login:active:not(:disabled) {
          transform: translateY(0);
        }
        .btn-login:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── animations ── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .fade-up { animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .shake { animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both; }

        @keyframes spin { to { transform: rotate(360deg); } }

        .glass-card {
          background: rgba(30, 41, 59, 0.4);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 48px 40px;
          width: 100%;
          max-width: 440px;
          z-index: 10;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
      `}</style>

      {/* Background decoration */}
      <div className="bg-grid" />
      <div className="bg-glow" />
      <div className="bg-glow-top" />

      <div className="glass-card fade-up">
        {/* Logo + heading */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ 
            width: 100, height: 100, 
            background: 'rgba(255,255,255,0.03)', 
            borderRadius: '24px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 24px',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <img src={Logo} alt="KAAL" style={{ height: 64, width: 'auto' }} />
          </div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 40, color: '#fff', letterSpacing: '0.05em' }}>SIGN IN</div>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>Access your construction dashboard</p>
        </div>

        {/* Error */}
        {error && (
          <div className="shake" style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.2)', 
            borderRadius: 12, 
            padding: '14px 16px', 
            marginBottom: 24, 
            fontSize: 13, 
            color: '#f87171', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10 
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: 11, 
              fontWeight: 700, 
              letterSpacing: '0.1em', 
              textTransform: 'uppercase', 
              color: 'rgba(255,255,255,0.4)', 
              marginBottom: 10,
              paddingLeft: 4
            }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input type="email" className="li" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" required />
            </div>
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              fontSize: 11, 
              fontWeight: 700, 
              letterSpacing: '0.1em', 
              textTransform: 'uppercase', 
              color: 'rgba(255,255,255,0.4)', 
              marginBottom: 10,
              paddingLeft: 4
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input type="password" className="li" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
          </div>

          <button type="submit" className="btn-login" disabled={isSubmitting} style={{ marginTop: 8 }}>
            {isSubmitting
              ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Authenticating...</>
              : <>Sign In to Dashboard <ArrowRight size={18} /></>
            }
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 40 }}>
          © {new Date().getFullYear()} KAAL Construction Enterprise. <br/>All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;