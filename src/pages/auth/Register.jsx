import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building, Mail, Lock, User, Phone, ArrowRight, Loader, CheckCircle } from 'lucide-react';
import Logo from '../../assets/images/Logo.png';
import api from '../../utils/api';

const FEATURES = [
    'Centralized Project Dashboard',
    'Real-time GPS Tracking',
    'Team Collaboration Tools',
    'Smart Analytics & Reporting',
];

const Register = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const selectedPlan = searchParams.get('plan') || 'starter';

    const [formData, setFormData] = useState({
        companyName: '', fullName: '', email: '', password: '', phone: '', plan: selectedPlan,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [planDetails, setPlanDetails] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'https://construction-production-b18f.up.railway.app/api';
                const res = await fetch(`${apiUrl}/plans`);
                const data = await res.json();
                const found = data.find(p => p.name.toLowerCase() === selectedPlan.toLowerCase());
                if (found) setPlanDetails(found);
            } catch (e) { console.error(e); }
        })();
    }, [selectedPlan]);

    const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async e => {
        e.preventDefault(); setError(''); setLoading(true);
        try {
            await api.post('/auth/register-company', formData);
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally { setLoading(false); }
    };

    /* ══ SUCCESS ══════════════════════════════════════════════════════════════ */
    if (success) {
        return (
            <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
                <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
          @keyframes progress { from { width: 0% } to { width: 100% } }
        `}</style>
                <div style={{ textAlign: 'center', maxWidth: 420, width: '100%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: '48px 36px', boxShadow: '0 8px 40px rgba(0,0,0,0.06)' }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <CheckCircle size={32} color="#10b981" />
                    </div>
                    <div style={{ fontFamily: "'Bebas Neue'", fontSize: 30, color: '#0f172a', marginBottom: 10 }}>REQUEST SUBMITTED</div>
                    <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, marginBottom: 28 }}>
                        Your account is pending Super Admin approval. You'll be notified once it's activated.
                    </p>
                    <div style={{ height: 3, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: '#155dff', borderRadius: 2, animation: 'progress 3s ease-in-out forwards' }} />
                    </div>
                    <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 12 }}>Redirecting to login...</p>
                </div>
            </div>
        );
    }

    /* ══ MAIN ═════════════════════════════════════════════════════════════════ */
    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: "'DM Sans', sans-serif", position: 'relative' }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }

        .ri {
          width: 100%;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px 14px 12px 44px;
          color: #0f172a;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: all 0.2s;
        }
        .ri::placeholder { color: #94a3b8; }
        .ri:focus { border-color: #155dff; box-shadow: 0 0 0 3px rgba(21,93,255,0.1); }

        .btn-reg {
          width: 100%; background: #155dff; color: #fff; border: none;
          border-radius: 10px; padding: 14px;
          font-size: 14px; font-weight: 600;
          font-family: 'DM Sans', sans-serif; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.22s; letter-spacing: 0.02em;
        }
        .btn-reg:hover:not(:disabled) { background: #1a6fff; transform: translateY(-1px); box-shadow: 0 8px 28px rgba(21,93,255,0.35); }
        .btn-reg:disabled { opacity: 0.6; cursor: not-allowed; }

        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .fu { animation: fadeUp 0.5s ease forwards; }

        @keyframes shake { 0%,100%{transform:translateX(0);} 20%,60%{transform:translateX(-4px);} 40%,80%{transform:translateX(4px);} }
        .shake { animation: shake 0.38s ease; }

        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

            {/* Subtle bg decorations */}
            <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'rgba(21,93,255,0.05)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(21,93,255,0.04)', pointerEvents: 'none' }} />

            <div className="fu" style={{ width: '100%', maxWidth: 960, position: 'relative', zIndex: 1 }}>

                {/* Logo */}
                <div onClick={() => navigate('/')} style={{ display: 'flex', justifyContent: 'center', marginBottom: 28, cursor: 'pointer' }}>
                    <img src={Logo} alt="KAAL" style={{ height: 48, width: 'auto' }} />
                </div>

                {/* Card */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 20,
                    overflow: 'hidden',
                    boxShadow: '0 4px 32px rgba(0,0,0,0.06)',
                }}>

                    {/* ── LEFT — Brand panel (dark like login left) ── */}
                    <div style={{
                        background: '#0f172a',
                        borderRight: '1px solid #1e293b',
                        padding: '40px 32px',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                        position: 'relative', overflow: 'hidden',
                    }}>
                        {/* grid overlay */}
                        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(21,93,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(21,93,255,0.05) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
                        {/* glow blobs */}
                        <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(21,93,255,0.12)', filter: 'blur(48px)', pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', bottom: -60, left: -60, width: 180, height: 180, borderRadius: '50%', background: 'rgba(21,93,255,0.08)', filter: 'blur(40px)', pointerEvents: 'none' }} />

                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ width: 32, height: 2, background: '#155dff', borderRadius: 2, marginBottom: 16 }} />
                            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 34, color: '#fff', lineHeight: 1, marginBottom: 12 }}>
                                JOIN KAAL<br />CONSTRUCTIONS
                            </div>
                            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.4)', lineHeight: 1.75, marginBottom: 32 }}>
                                The all-in-one platform for modern construction management. Built for teams that build.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                                {FEATURES.map(f => (
                                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, background: 'rgba(21,93,255,0.2)', border: '1px solid rgba(21,93,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <CheckCircle size={13} color="#155dff" />
                                        </div>
                                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{f}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Plan box */}
                        <div style={{ position: 'relative', zIndex: 1, marginTop: 36 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', marginBottom: 10 }}>
                                Selected Plan
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: '#fff', letterSpacing: '0.03em' }}>
                                        {planDetails?.name || selectedPlan}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>14-day free trial included</div>
                                </div>
                                <div style={{ fontFamily: "'Bebas Neue'", fontSize: 20, color: '#155dff' }}>
                                    {planDetails ? `$${planDetails.price}/${planDetails.period}` : 'Custom'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT — Form (light) ── */}
                    <div style={{ padding: '40px 32px', background: '#fff' }}>
                        <div style={{ marginBottom: 26 }}>
                            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: '#0f172a', letterSpacing: '0.02em', marginBottom: 5 }}>
                                CREATE ACCOUNT
                            </div>
                            <p style={{ fontSize: 13, color: '#94a3b8' }}>Fill in your details to get started</p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="shake" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 18, fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                            {/* Company */}
                            <div>
                                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b', marginBottom: 7 }}>Company</label>
                                <div style={{ position: 'relative' }}>
                                    <Building size={15} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                    <input type="text" name="companyName" required placeholder="Your Company Name" className="ri" onChange={handleChange} />
                                </div>
                            </div>

                            {/* Full Name */}
                            <div>
                                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b', marginBottom: 7 }}>Full Name</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={15} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                    <input type="text" name="fullName" required placeholder="Your Full Name" className="ri" onChange={handleChange} />
                                </div>
                            </div>

                            {/* Email + Phone */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b', marginBottom: 7 }}>Email</label>
                                    <div style={{ position: 'relative' }}>
                                        <Mail size={15} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                        <input type="email" name="email" required placeholder="Work Email" className="ri" onChange={handleChange} />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b', marginBottom: 7 }}>Phone</label>
                                    <div style={{ position: 'relative' }}>
                                        <Phone size={15} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                        <input type="tel" name="phone" required placeholder="Phone Number" className="ri" onChange={handleChange} />
                                    </div>
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b', marginBottom: 7 }}>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={15} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                    <input type="password" name="password" required placeholder="Create a secure password" className="ri" onChange={handleChange} />
                                </div>
                            </div>

                            <button type="submit" className="btn-reg" disabled={loading} style={{ marginTop: 4 }}>
                                {loading
                                    ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creating Account...</>
                                    : <>Create My Account <ArrowRight size={16} /></>
                                }
                            </button>

                            <p style={{ textAlign: 'center', fontSize: 13, color: '#94a3b8', marginTop: 2 }}>
                                Already have an account?{' '}
                                <span onClick={() => navigate('/login')}
                                    style={{ color: '#155dff', fontWeight: 600, cursor: 'pointer' }}
                                    onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                                    onMouseLeave={e => e.target.style.textDecoration = 'none'}
                                >Sign In</span>
                            </p>
                        </form>
                    </div>
                </div>

                <p style={{ textAlign: 'center', fontSize: 11, color: '#cbd5e1', marginTop: 20 }}>
                    © {new Date().getFullYear()} KAAL Construction Enterprise. All rights reserved.
                </p>
            </div>
        </div>
    );
};

export default Register;