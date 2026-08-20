import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Menu, X, ArrowRight, Building2, HardHat, Hammer,
    Ruler, Truck, DraftingCompass, CheckCircle, ChevronDown,
    Phone, Mail, MapPin, ArrowUpRight, Star, Shield, Zap
} from 'lucide-react';
import Logo from '../assets/images/Logo.png';

import api from '../utils/api';
/* ─── Animated Counter ──────────────────────────────────────────────────── */
const Counter = ({ end, suffix = '' }) => {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const started = useRef(false);
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !started.current) {
                started.current = true;
                let start = 0;
                const step = Math.ceil(end / (1800 / 16));
                const timer = setInterval(() => {
                    start += step;
                    if (start >= end) { setCount(end); clearInterval(timer); }
                    else setCount(start);
                }, 16);
            }
        }, { threshold: 0.4 });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [end]);
    return <span ref={ref}>{count}{suffix}</span>;
};

/* ─── Main ───────────────────────────────────────────────────────────────── */
const LandingPage = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [pricingPlans, setPricingPlans] = useState([]);
  const [projects, setProjects] = useState([]);

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        const handleScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'https://construction-production-b18f.up.railway.app/api';
                const [plansRes, projectsRes] = await Promise.all([
                    api.get('/plans'),
                    api.get('/projects')
                ]);
                const plansData = plansRes.data;
                const projectsData = projectsRes.data;
                if (plansData?.length > 0) setPricingPlans(plansData.map(p => ({
                    id: p._id, name: p.name, price: p.price,
                    period: p.period === 'custom' ? '' : `/${p.period}`,
                    features: p.features, highlight: p.isPopular,
                })));
                if (Array.isArray(projectsData)) setProjects(projectsData);
            } catch (e) { console.error(e); }
        })();
    }, []);

    const navLinks = ['Home', 'Services', 'Pricing', 'Company'];
    const services = [
        { icon: Building2, title: 'New Construction', desc: 'Full-cycle construction from groundbreaking to handover, built to last generations.' },
        { icon: HardHat, title: 'Reconstructions', desc: 'Breathing new life into existing structures with minimal disruption and maximum impact.' },
        { icon: Hammer, title: 'Restorations', desc: 'Reviving heritage properties with period-accurate craftsmanship and modern safety.' },
        { icon: Ruler, title: 'Capital Repair', desc: 'Comprehensive repair programs that extend asset life and improve performance.' },
        { icon: Truck, title: 'Re-equipment', desc: 'Modern MEP upgrades and industrial re-tooling for operational excellence.' },
        { icon: DraftingCompass, title: 'Individual Planning', desc: 'Bespoke architectural planning tailored to your vision and budget.' },
    ];

    return (
        <div style={{ minHeight: '100vh', background: '#ffffff', overflowX: 'hidden', fontFamily: "'DM Sans', sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                .fd { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.02em; }
                .fb { font-family: 'DM Sans', sans-serif; }

                .nav-scrolled {
                    background: rgba(255,255,255,0.97) !important;
                    backdrop-filter: blur(20px);
                    border-bottom: 1px solid #e8ecf0 !important;
                    box-shadow: 0 1px 12px rgba(0,0,0,0.06);
                }

                .btn-blue {
                    background: #155dff; color: #fff; border: none;
                    padding: 12px 26px; border-radius: 8px;
                    font-weight: 600; font-size: 14px; cursor: pointer;
                    display: inline-flex; align-items: center; gap: 8px;
                    font-family: 'DM Sans', sans-serif; transition: all 0.22s;
                }
                .btn-blue:hover { background: #1a6fff; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(21,93,255,0.35); }

                .btn-outline {
                    background: transparent; color: #334155;
                    border: 1px solid #cbd5e1; padding: 12px 26px; border-radius: 8px;
                    font-weight: 600; font-size: 14px; cursor: pointer;
                    display: inline-flex; align-items: center; gap: 8px;
                    font-family: 'DM Sans', sans-serif; transition: all 0.22s;
                }
                .btn-outline:hover { border-color: #155dff; color: #155dff; background: #f0f5ff; }

                .btn-outline-hero {
                    background: transparent; color: rgba(255,255,255,0.85);
                    border: 1px solid rgba(255,255,255,0.3); padding: 12px 26px; border-radius: 8px;
                    font-weight: 600; font-size: 14px; cursor: pointer;
                    display: inline-flex; align-items: center; gap: 8px;
                    font-family: 'DM Sans', sans-serif; transition: all 0.22s;
                }
                .btn-outline-hero:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.6); color: #fff; }

                .btn-white {
                    background: #fff; color: #155dff; border: none;
                    padding: 12px 26px; border-radius: 8px;
                    font-weight: 700; font-size: 14px; cursor: pointer;
                    display: inline-flex; align-items: center; gap: 8px;
                    font-family: 'DM Sans', sans-serif; transition: all 0.22s;
                }
                .btn-white:hover { background: #f0f5ff; transform: translateY(-1px); }

                .btn-outline-white {
                    background: transparent; color: #fff;
                    border: 1px solid rgba(255,255,255,0.35); padding: 12px 26px; border-radius: 8px;
                    font-weight: 600; font-size: 14px; cursor: pointer;
                    display: inline-flex; align-items: center; gap: 8px;
                    font-family: 'DM Sans', sans-serif; transition: all 0.22s;
                }
                .btn-outline-white:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.65); }

                .svc-card {
                    background: #fff; border: 1px solid #e2e8f0;
                    border-radius: 16px; padding: 28px 24px; transition: all 0.25s;
                }
                .svc-card:hover {
                    border-color: #155dff;
                    box-shadow: 0 8px 32px rgba(21,93,255,0.1);
                    transform: translateY(-3px);
                }
                .svc-icon {
                    width: 48px; height: 48px; background: #eff4ff;
                    border: 1px solid #c7d9ff; border-radius: 12px;
                    display: flex; align-items: center; justify-content: center;
                    margin-bottom: 18px; transition: all 0.25s;
                }
                .svc-card:hover .svc-icon { background: #155dff; border-color: #155dff; }
                .svc-card:hover .svc-icon svg { color: #fff !important; stroke: #fff !important; }

                .pricing-card {
                    background: #f8fafc; border: 1px solid #e2e8f0;
                    border-radius: 20px; padding: 32px;
                    transition: all 0.25s; position: relative;
                }
                .pricing-card:hover { box-shadow: 0 12px 40px rgba(0,0,0,0.09); transform: translateY(-4px); }

                .img-ov { position: relative; overflow: hidden; border-radius: 16px; }
                .img-ov img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.7s; }
                .img-ov:hover img { transform: scale(1.04); }
                .img-ov::after {
                    content: ''; position: absolute; inset: 0;
                    background: linear-gradient(180deg, transparent 45%, rgba(0,0,0,0.58) 100%);
                    border-radius: 16px;
                }

                .blue-bar { width: 40px; height: 3px; background: #155dff; border-radius: 2px; margin-bottom: 14px; }
                .badge-lbl {
                    font-size: 11px; font-weight: 700; letter-spacing: 0.12em;
                    text-transform: uppercase; color: #155dff; margin-bottom: 10px;
                    display: flex; align-items: center; gap: 6px;
                }

                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .au { animation: fadeUp 0.65s ease forwards; }
                .d1 { animation-delay: 0.08s; opacity: 0; }
                .d2 { animation-delay: 0.2s; opacity: 0; }
                .d3 { animation-delay: 0.34s; opacity: 0; }
                .d4 { animation-delay: 0.48s; opacity: 0; }

                .container-custom {
                    max-width: 1800px;
                    margin: 0 auto;
                    padding-left: 20px;
                    padding-right: 20px;
                    width: 100%;
                }
                @media (min-width: 768px) {
                    .container-custom { padding-left: 40px; padding-right: 40px; }
                }
                @media (min-width: 1280px) {
                    .container-custom { padding-left: 60px; padding-right: 60px; }
                }
                @media (min-width: 1600px) {
                    .container-custom { padding-left: 100px; padding-right: 100px; }
                }

                @media (min-width: 769px) { .mob-only { display: none !important; } }
                @media (max-width: 768px) {
                    .desk-only { display: none !important; }
                    .mob-only { display: flex !important; }
                    .hero-img-panel { width: 100% !important; left: 0 !important; }
                    .hero-img-panel img { opacity: 0.2 !important; }
                    .hero-img-panel > div {
                        background: linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.9) 100%) !important;
                    }
                    .hero-wrap { padding: 108px 20px 64px !important; }
                    .hero-block { max-width: 100% !important; }
                    
                    /* Force solid nav on mobile at top if preferred, or at least when menu open */
                    .nav-mobile-active {
                        background: rgba(255,255,255,0.98) !important;
                        backdrop-filter: blur(20px);
                        border-bottom: 1px solid #e8ecf0 !important;
                    }
                }
            `}</style>

            {/* ══ NAVBAR ══════════════════════════════════════════════════════ */}
            <nav style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
                transition: 'all 0.3s',
                background: (scrolled || isMenuOpen) ? 'rgba(255,255,255,0.98)' : 'transparent',
                borderBottom: (scrolled || isMenuOpen) ? '1px solid #e8ecf0' : '1px solid transparent',
            }} className={`${scrolled ? 'nav-scrolled' : ''}`}>
                <div className="container-custom" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>

                    <div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ cursor: 'pointer' }}>
                        <img src={Logo} alt="KAAL" style={{
                            height: isMobile ? 42 : 48, width: 'auto',
                            filter: 'none',
                            transition: 'all 0.3s',
                        }} />
                    </div>

                    <div className="desk-only" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                        {navLinks.map(item => (
                            <a key={item} href={`#${item.toLowerCase()}`} className="fb" style={{
                                fontSize: 13, fontWeight: 500, letterSpacing: '0.05em',
                                textTransform: 'uppercase', textDecoration: 'none',
                                color: scrolled ? '#475569' : 'rgba(255,255,255,0.75)',
                                transition: 'color 0.2s',
                            }}
                                onMouseEnter={e => e.target.style.color = scrolled ? '#155dff' : '#fff'}
                                onMouseLeave={e => e.target.style.color = scrolled ? '#475569' : 'rgba(255,255,255,0.75)'}
                            >{item}</a>
                        ))}
                    </div>

                    <div className="desk-only" style={{ display: 'flex', gap: 10 }}>
                        <button
                            onClick={() => navigate('/login')}
                            className="fb"
                            style={{
                                background: 'transparent',
                                color: scrolled ? '#475569' : 'rgba(255,255,255,0.8)',
                                border: scrolled ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.3)',
                                padding: '9px 20px', borderRadius: 8,
                                fontWeight: 600, fontSize: 14, cursor: 'pointer',
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                transition: 'all 0.22s',
                            }}
                        >Login</button>
                        <button className="btn-blue fb" onClick={() => navigate('/register?type=quote')} style={{ padding: '9px 20px' }}>
                            Get a Quote
                        </button>
                    </div>

                    <button className="mob-only" onClick={() => setIsMenuOpen(!isMenuOpen)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: (scrolled || isMenuOpen) ? '#0f172a' : '#fff' }}>
                        {isMenuOpen ? <X size={26} /> : <Menu size={26} />}
                    </button>
                </div>

                {isMenuOpen && (
                    <div style={{ background: '#fff', borderTop: '1px solid #f1f5f9', padding: '12px 24px 20px' }}>
                        {navLinks.map(item => (
                            <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setIsMenuOpen(false)} className="fb"
                                style={{ display: 'block', padding: '12px 0', color: '#475569', textDecoration: 'none', fontSize: 15, fontWeight: 500, borderBottom: '1px solid #f1f5f9' }}>
                                {item}
                            </a>
                        ))}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                            <button className="btn-outline fb" onClick={() => navigate('/login')} style={{ justifyContent: 'center' }}>Login</button>
                            <button className="btn-blue fb" onClick={() => navigate('/register?type=quote')} style={{ justifyContent: 'center' }}>Get a Quote</button>
                        </div>
                    </div>
                )}
            </nav>

            {/* ══ HERO (dark — stays impactful) ══════════════════════════════ */}
            <section id="home" style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', background: '#0f172a', overflow: 'hidden' }}>
                {/* Background Decorations (Full Width) */}
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'linear-gradient(rgba(21,93,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(21,93,255,0.06) 1px, transparent 1px)',
                    backgroundSize: '56px 56px',
                }} />
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 55% 40%, rgba(21,93,255,0.16) 0%, transparent 70%)' }} />

                <div className="container-custom" style={{ position: 'relative', zIndex: 1, paddingTop: 100 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr', gap: isMobile ? 32 : 64, alignItems: 'center' }}>
                        <div className="hero-block">
                            <div className="au badge-lbl fb">
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#155dff', display: 'inline-block' }} />
                                Award-winning since 1992
                            </div>

                            <h1 className="au d1 fd" style={{ fontSize: 'clamp(48px, 8vw, 100px)', lineHeight: 0.95, marginBottom: 24, color: '#fff' }}>
                                WE BUILD<br />
                                <span style={{ color: '#155dff' }}>WHAT</span><br />
                                MATTERS
                            </h1>

                            <p className="au d2 fb" style={{ fontSize: 16, lineHeight: 1.8, color: 'rgba(255,255,255,0.6)', maxWidth: 500, marginBottom: 40 }}>
                                Over 30 years of precision construction — from groundwork to skyline. Trusted by 300+ clients across residential, commercial, and industrial projects.
                            </p>

                            <div className="au d3" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                <button className="btn-blue fb" onClick={() => navigate('/register?type=quote')}>
                                    Get a Quote <ArrowRight size={15} />
                                </button>
                                <button className="btn-outline-hero fb"
                                    onClick={() => document.getElementById('company')?.scrollIntoView({ behavior: 'smooth' })}>
                                    Our Story
                                </button>
                            </div>

                            <div className="au d4" style={{ display: 'flex', gap: 48, marginTop: 60, flexWrap: 'wrap', paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                {[['32+', 'Years'], ['379+', 'Projects'], ['100+', 'Workers']].map(([n, l]) => (
                                    <div key={l}>
                                        <div className="fd" style={{ fontSize: 40, color: '#fff', lineHeight: 1 }}>{n}</div>
                                        <div className="fb" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 6 }}>{l}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="desk-only au d3" style={{ position: 'relative' }}>
                            <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', boxShadow: '0 32px 64px -16px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <img src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop" alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.8), transparent)' }} />
                            </div>
                            {/* Floating Card */}
                            <div style={{ position: 'absolute', bottom: -20, left: -20, background: 'rgba(21,93,255,0.95)', backdropFilter: 'blur(12px)', padding: '20px 24px', borderRadius: 16, color: '#fff', boxShadow: '0 20px 40px rgba(21,93,255,0.3)' }}>
                                <div className="fb" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8 }}>Current Status</div>
                                <div className="fd" style={{ fontSize: 24, marginTop: 4 }}>32 Active Sites</div>
                            </div>
                        </div>
                    </div>
                </div>


            </section>

            {/* ══ ABOUT (white) ═══════════════════════════════════════════════ */}
            <section id="company" style={{ padding: '96px 0', background: '#fff' }}>
                <div className="container-custom">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 64, alignItems: 'center' }}>
                        <div className="img-ov" style={{ height: 460 }}>
                            <img src="https://images.unsplash.com/photo-1503708928676-1cb796a0891e?q=80&w=1974&auto=format&fit=crop" alt="Construction" />
                        </div>
                        <div>
                            <div className="badge-lbl fb">About Us</div>
                            <div className="blue-bar" />
                            <h2 className="fd" style={{ fontSize: 'clamp(34px, 4.5vw, 56px)', lineHeight: 1.02, marginBottom: 18, color: '#0f172a' }}>
                                WE DELIVER UNIQUE CONSTRUCTION SOLUTIONS
                            </h2>
                            <p className="fb" style={{ color: '#64748b', lineHeight: 1.8, marginBottom: 14, fontSize: 15 }}>
                                We have built our reputation as true local area experts, gaining unmatched knowledge about buyer interests, neighborhoods, and markets — because we live locally and work for local people.
                            </p>
                            <p className="fb" style={{ color: '#64748b', lineHeight: 1.8, marginBottom: 28, fontSize: 15 }}>
                                Our commitment to quality and innovation has made us a trusted partner for residential and commercial projects alike.
                            </p>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 32 }}>
                                {[{ icon: Shield, text: 'Licensed & Insured' }, { icon: Star, text: '5-Star Rated' }, { icon: Zap, text: 'On-Time Delivery' }].map(({ icon: Icon, text }) => (
                                    <div key={text} className="fb" style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#475569', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '7px 14px', borderRadius: 8 }}>
                                        <Icon size={13} color="#155dff" /> {text}
                                    </div>
                                ))}
                            </div>
                            <button className="btn-blue fb" onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}>
                                Explore Services <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginTop: 72, border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', background: '#f8fafc' }}>
                        {[{ n: 32, s: '+', label: 'Years Experience' }, { n: 379, s: '+', label: 'Projects Completed' }, { n: 84, s: '+', label: 'Engineers' }, { n: 100, s: '+', label: 'Skilled Workers' }].map(({ n, s, label }, i, arr) => (
                            <div key={label} style={{ padding: '32px 20px', textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                                <div className="fd" style={{ fontSize: 48, color: '#155dff', lineHeight: 1 }}><Counter end={n} suffix={s} /></div>
                                <div className="fb" style={{ fontSize: 12, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 8 }}>{label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ SERVICES (light grey) ════════════════════════════════════════ */}
            <section id="services" style={{ padding: '96px 0', background: '#f8fafc' }}>
                <div className="container-custom">
                    <div style={{ textAlign: 'center', marginBottom: 60 }}>
                        <div className="badge-lbl fb" style={{ justifyContent: 'center' }}>What We Do</div>
                        <div className="blue-bar" style={{ margin: '0 auto 16px' }} />
                        <h2 className="fd" style={{ fontSize: 'clamp(36px, 6vw, 72px)', lineHeight: 1, color: '#0f172a', marginBottom: 20 }}>
                            OUR CORE SERVICES
                        </h2>
                        <p className="fb" style={{ maxWidth: 640, margin: '0 auto', color: '#64748b', fontSize: 16, lineHeight: 1.8 }}>
                            From planning to final handover — we cover every phase of your project with precision and accountability.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                        {services.map(({ icon: Icon, title, desc }) => (
                            <div key={title} className="svc-card">
                                <div className="svc-icon"><Icon size={20} color="#155dff" /></div>
                                <h3 className="fb" style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>{title}</h3>
                                <p className="fb" style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.7 }}>{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ CTA STRIP (blue) ════════════════════════════════════════════ */}
            {/* ══ CTA SPLIT — image left, text right ══════════════════════════ */}
            <section style={{ background: '#0f172a', position: 'relative', overflow: 'hidden' }}>
                <div className="container-custom" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', minHeight: 480 }}>

                    {/* Left — image */}
                    <div style={{ position: 'relative', minHeight: 300, overflow: 'hidden' }}>
                        <img
                            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop"
                            alt="Building"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                        {/* right-side fade into dark bg */}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(15,23,42,0.1) 0%, rgba(15,23,42,0.7) 100%)' }} />
                        {/* bottom tint */}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(15,23,42,0.5) 100%)' }} />

                        {/* floating badge */}
                        <div style={{
                            position: 'absolute', bottom: 28, left: 28,
                            background: 'rgba(21,93,255,0.92)',
                            backdropFilter: 'blur(8px)',
                            borderRadius: 12, padding: '12px 20px',
                            display: 'flex', alignItems: 'center', gap: 12,
                        }}>
                            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 28, color: '#fff', lineHeight: 1 }}>50</div>
                            <div>
                                <div className="fb" style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Years of</div>
                                <div className="fb" style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Excellence</div>
                            </div>
                        </div>
                    </div>

                    {/* Right — text */}
                    <div style={{ padding: '60px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
                        {/* subtle grid */}
                        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(21,93,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(21,93,255,0.04) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#155dff', marginBottom: 14 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#155dff', display: 'inline-block' }} />
                                Our Legacy
                            </div>
                            <div style={{ width: 36, height: 2, background: '#155dff', borderRadius: 2, marginBottom: 20 }} />

                            <h2 className="fd" style={{ fontSize: 'clamp(32px, 4vw, 54px)', lineHeight: 1, color: '#fff', marginBottom: 20 }}>
                                A FAMILY BUSINESS<br />FOR THE LAST<br /><span style={{ color: '#155dff' }}>50 YEARS</span>
                            </h2>

                            <p className="fb" style={{ color: '#64748b', fontSize: 15, lineHeight: 1.8, marginBottom: 12, maxWidth: 400 }}>
                                Three generations of craft, commitment, and community — rooted in the belief that great construction is built on trust, not just concrete.
                            </p>
                            <p className="fb" style={{ color: '#475569', fontSize: 14, lineHeight: 1.75, marginBottom: 36, maxWidth: 400 }}>
                                We don't just build structures. We build legacies that stand the test of time for the families and communities we serve.
                            </p>

                            {/* mini stats row */}
                            <div style={{ display: 'flex', gap: 28, marginBottom: 36, flexWrap: 'wrap' }}>
                                {[['500+', 'Projects Done'], ['98%', 'Client Satisfaction'], ['30+', 'Awards Won']].map(([n, l]) => (
                                    <div key={l}>
                                        <div className="fd" style={{ fontSize: 26, color: '#fff', lineHeight: 1 }}>{n}</div>
                                        <div className="fb" style={{ fontSize: 11, color: '#475569', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l}</div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                <button className="btn-blue fb"
                                    onClick={() => document.getElementById('company')?.scrollIntoView({ behavior: 'smooth' })}>
                                    Learn More <ArrowRight size={15} />
                                </button>
                                <button
                                    className="fb"
                                    onClick={() => navigate('/register?type=quote')}
                                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.12)', padding: '12px 24px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
                                >
                                    Start a Project
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ PRICING (white) ════════════════════════════════════════════ */}
            <section id="pricing" style={{ padding: '96px 0', background: '#fff' }}>
                <div className="container-custom">
                    <div style={{ textAlign: 'center', marginBottom: 52 }}>
                        <div className="badge-lbl fb" style={{ justifyContent: 'center' }}>Plans & Pricing</div>
                        <div className="blue-bar" style={{ margin: '0 auto 14px' }} />
                        <h2 className="fd" style={{ fontSize: 'clamp(34px, 4.5vw, 60px)', color: '#0f172a', lineHeight: 1 }}>CHOOSE YOUR PLAN</h2>
                        <p className="fb" style={{ color: '#64748b', fontSize: 15, marginTop: 10 }}>Transparent pricing. No hidden fees. Cancel anytime.</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                        {pricingPlans.map((plan, i) => (
                            <div key={i} className="pricing-card" style={plan.highlight ? { background: '#0f172a', border: '1px solid #0f172a' } : {}}>
                                {plan.highlight && (
                                    <div style={{ position: 'absolute', top: 20, right: 20, background: '#155dff', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 20 }}>
                                        Most Popular
                                    </div>
                                )}
                                <div className="fb" style={{ fontSize: 12, fontWeight: 700, color: plan.highlight ? 'rgba(255,255,255,0.4)' : '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
                                    {plan.name}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 26 }}>
                                    <span className="fd" style={{ fontSize: 50, color: plan.highlight ? '#155dff' : '#0f172a' }}>${plan.price}</span>
                                    <span className="fb" style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.3)' : '#94a3b8' }}>{plan.period}</span>
                                </div>
                                <ul style={{ listStyle: 'none', marginBottom: 26, display: 'flex', flexDirection: 'column', gap: 11 }}>
                                    {plan.features.map((f, fi) => (
                                        <li key={fi} className="fb" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5, color: plan.highlight ? 'rgba(255,255,255,0.6)' : '#475569', lineHeight: 1.5 }}>
                                            <CheckCircle size={15} color="#155dff" style={{ marginTop: 1, flexShrink: 0 }} />{f}
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    className={plan.highlight ? 'btn-blue fb' : 'btn-outline fb'}
                                    onClick={() => navigate(`/register?plan=${plan.name.toLowerCase()}`)}
                                    style={{ width: '100%', justifyContent: 'center' }}
                                >Choose Plan</button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ PROJECTS (light grey) ══════════════════════════════════════ */}
            <section id="projects" style={{ padding: '96px 0', background: '#f8fafc' }}>
                <div className="container-custom">
                    <div style={{ textAlign: 'center', marginBottom: 52 }}>
                        <div className="badge-lbl fb" style={{ justifyContent: 'center' }}>Portfolio</div>
                        <div className="blue-bar" style={{ margin: '0 auto 16px' }} />
                        <h2 className="fd" style={{ fontSize: 'clamp(36px, 6vw, 72px)', color: '#0f172a', lineHeight: 1, marginBottom: 20 }}>RECENT PROJECTS</h2>
                        <p className="fb" style={{ maxWidth: 640, margin: '0 auto 28px', color: '#64748b', fontSize: 16, lineHeight: 1.8 }}>A showcase of our precision, craftsmanship, and commitment to excellence.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                        {projects.map(project => (
                            <div key={project._id} className="img-ov" style={{ height: 300, cursor: 'pointer' }}>
                                <img src={project.image?.url || project.image || 'https://via.placeholder.com/400'} alt={project.name} />
                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1, padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <div>
                                        <div className="fb" style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{new Date(project.createdAt).getFullYear()}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ FOOTER ══════════════════════════════════════════════════════ */}
            <footer style={{ background: '#0f172a', borderTop: '1px solid #1e293b', padding: '60px 0 28px' }}>
                <div className="container-custom">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 36, marginBottom: 48 }}>
                        <div>
                            <img src={Logo} alt="KAAL" style={{ height: 42, marginBottom: 20 }} />
                            <p className="fb" style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, maxWidth: 210 }}>
                                Building the future with precision and passion. Your trusted partner in construction excellence.
                            </p>
                        </div>
                        {[
                            { title: 'Company', links: ['Home', 'Services', 'Pricing', 'Company'] },
                            { title: 'Resources', links: ['Pricing', 'Our Team', 'Blog', 'Case Studies'] },
                        ].map(col => (
                            <div key={col.title}>
                                <h4 className="fb" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569', marginBottom: 18 }}>{col.title}</h4>
                                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {col.links.map(l => (
                                        <li key={l}><a href="#" className="fb" style={{ fontSize: 13.5, color: '#64748b', textDecoration: 'none', transition: 'color 0.2s' }}
                                            onMouseEnter={e => e.target.style.color = '#fff'}
                                            onMouseLeave={e => e.target.style.color = '#64748b'}
                                        >{l}</a></li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                        <div>
                            <h4 className="fb" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569', marginBottom: 18 }}>Contact</h4>
                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {[{ icon: MapPin, text: '123 Construction Blvd, Building City, ST 12345' }, { icon: Phone, text: '+1 (123) 456-7890' }, { icon: Mail, text: 'info@constructos.com' }].map(({ icon: Icon, text }) => (
                                    <li key={text} className="fb" style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                                        <Icon size={13} color="#155dff" style={{ marginTop: 1, flexShrink: 0 }} />{text}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div style={{ borderTop: '1px solid #1e293b', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
                        <p className="fb" style={{ fontSize: 12, color: '#475569' }}>© {new Date().getFullYear()} KAAL Constructions. All rights reserved.</p>
                        <div style={{ display: 'flex', gap: 20 }}>
                            {['Privacy Policy', 'Terms of Service', 'Cookies'].map(l => (
                                <a key={l} href="#" className="fb" style={{ fontSize: 12, color: '#475569', textDecoration: 'none', transition: 'color 0.2s' }}
                                    onMouseEnter={e => e.target.style.color = '#94a3b8'}
                                    onMouseLeave={e => e.target.style.color = '#475569'}
                                >{l}</a>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;