import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const FEATURES = [
  {
    icon: 'ri-file-list-3-line',
    title: 'Smart Invoicing',
    desc: 'Create professional invoices in seconds with live preview, line items, tax, and discount support.',
  },
  {
    icon: 'ri-group-line',
    title: 'Client Management',
    desc: 'Keep all your clients in one place with per-client hourly rates, tax configs, and invoice history.',
  },
  {
    icon: 'ri-bar-chart-2-line',
    title: 'Revenue Tracking',
    desc: 'Visual dashboard showing paid vs sent revenue, annual goals, and monthly trends at a glance.',
  },
  {
    icon: 'ri-send-plane-line',
    title: 'One-click Sending',
    desc: 'Mark invoices as sent, track overdue payments, and keep your cash flow visible and organized.',
  },
  {
    icon: 'ri-settings-3-line',
    title: 'Business Profile',
    desc: 'Set your logo, address, invoice prefix, default tax rate, and currency once — applied everywhere.',
  },
  {
    icon: 'ri-shield-check-line',
    title: 'Secure & Private',
    desc: 'Your data lives in your own Supabase instance. No third-party access, no data sharing.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Alex Rivera',
    role: 'Freelance Developer',
    avatar: 'AR',
    text: 'GiriLog replaced three different tools I was using. The invoice creator is incredibly fast and the live preview is a game changer.',
  },
  {
    name: 'Priya Nair',
    role: 'UI/UX Designer',
    avatar: 'PN',
    text: 'Finally an invoicing tool that doesn\'t look like it was built in 2008. Clean, fast, and everything I actually need.',
  },
  {
    name: 'Marcus Chen',
    role: 'Full-stack Consultant',
    avatar: 'MC',
    text: 'The per-client hourly rate feature alone saves me 20 minutes every time I create an invoice. Absolutely love it.',
  },
];

// ── Static demo chart matching the real RevenueLineChart style ──────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Demo cumulative data: sent grows steadily, pending spikes in recent months
const DEMO_SENT =    [2100, 4800, 7200, 10500, 13800, 17200, 20100, 23600, 26400, 29100, 31500, 31500];
const DEMO_PENDING = [   0,    0,    0,     0,     0,     0,     0,     0,  1200,  3800,  7200, 12400];

function DemoRevenueChart() {
  const W = 600;
  const H = 200;
  const PAD = { top: 16, right: 24, bottom: 32, left: 52 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const currentMonth = 10; // November (0-indexed) — demo is "as of Nov"
  const visibleMonths = currentMonth + 1;

  const maxVal = Math.max(...DEMO_SENT.map((s, i) => s + DEMO_PENDING[i])) * 1.12;

  const xStep = chartW / 11;
  const toX = (i: number) => PAD.left + i * xStep;
  const toY = (v: number) => PAD.top + chartH - (v / maxVal) * chartH;

  const buildPath = (pts: { x: number; y: number }[]) =>
    pts.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = pts[i - 1];
      const cpX = (prev.x + p.x) / 2;
      return `${acc} C ${cpX} ${prev.y} ${cpX} ${p.y} ${p.x} ${p.y}`;
    }, '');

  const sentPts = DEMO_SENT.slice(0, visibleMonths).map((v, i) => ({ x: toX(i), y: toY(v) }));
  const sentPath = buildPath(sentPts);
  const sentArea = `${sentPath} L ${sentPts[sentPts.length-1].x} ${PAD.top+chartH} L ${PAD.left} ${PAD.top+chartH} Z`;

  // Pending extension: amber line that starts at sent value and rises to sent+pending
  const pendingExtPts = DEMO_SENT.slice(0, visibleMonths).map((s, i) => ({
    x: toX(i),
    y: DEMO_PENDING[i] > 0 ? toY(s + DEMO_PENDING[i]) : toY(s),
  }));
  const pendingExtPath = buildPath(pendingExtPts);

  // Pending band fill
  const combinedPts = DEMO_SENT.slice(0, visibleMonths).map((s, i) => ({ x: toX(i), y: toY(s + DEMO_PENDING[i]) }));
  const combinedPath = buildPath(combinedPts);
  const pendingBand = `${combinedPath} L ${sentPts[sentPts.length-1].x} ${sentPts[sentPts.length-1].y} ${[...sentPts].reverse().map((p, i) => i === 0 ? '' : `L ${p.x} ${p.y}`).join(' ')} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({ val: maxVal * f, y: toY(maxVal * f) }));

  const formatShort = (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${Math.round(v)}`;

  return (
    <div className="bg-[#0D0F14] border border-[#1E2330] rounded-xl p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Revenue This Year</h3>
          <p className="text-xs text-secondary font-mono mt-0.5">Cumulative · {new Date().getFullYear()}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-primary font-mono font-semibold">$31,500</div>
            <div className="text-[10px] text-secondary font-mono">Paid</div>
          </div>
          <div className="w-px h-6 bg-[#1E2330]" />
          <div className="text-right">
            <div className="text-xs text-[#F59E0B] font-mono font-semibold">$12,400</div>
            <div className="text-[10px] text-secondary font-mono">Sent</div>
          </div>
          <div className="w-px h-6 bg-[#1E2330]" />
          <div className="text-right">
            <div className="text-xs text-white font-mono font-semibold">$43,900</div>
            <div className="text-[10px] text-secondary font-mono">Total</div>
          </div>
        </div>
      </div>

      {/* SVG chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 200 }}>
        <defs>
          <linearGradient id="demoSentGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary, #10B981)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--color-primary, #10B981)" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="demoPendingGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {/* Grid + Y labels */}
        {yTicks.map(t => (
          <g key={t.val}>
            <line x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y} stroke="#1E2330" strokeWidth="1" />
            <text x={PAD.left - 6} y={t.y + 4} textAnchor="end" fontSize="9" fill="#94A3B8" fontFamily="monospace">
              {formatShort(t.val)}
            </text>
          </g>
        ))}

        {/* X labels */}
        {MONTHS.map((m, i) => (
          <text key={m} x={toX(i)} y={H - 6} textAnchor="middle" fontSize="9"
            fill={i === currentMonth ? '#9CA3AF' : '#94A3B8'}
            fontWeight={i === currentMonth ? '600' : '400'}
            fontFamily="monospace">
            {m}
          </text>
        ))}

        {/* Sent area */}
        <path d={sentArea} fill="url(#demoSentGrad)" />
        {/* Pending band */}
        <path d={pendingBand} fill="url(#demoPendingGrad)" />
        {/* Sent line */}
        <path d={sentPath} fill="none" stroke="var(--color-primary, #10B981)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Pending extension line */}
        <path d={pendingExtPath} fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots on sent */}
        {sentPts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === currentMonth ? 4 : 2}
            fill="var(--color-primary, #10B981)" stroke="#0D0F14" strokeWidth="1.5" />
        ))}
        {/* Dots on pending extension (only where pending > 0) */}
        {pendingExtPts.map((p, i) => DEMO_PENDING[i] > 0 ? (
          <circle key={i} cx={p.x} cy={p.y} r={i === currentMonth ? 4 : 2}
            fill="#F59E0B" stroke="#0D0F14" strokeWidth="1.5" />
        ) : null)}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-3 pt-3 border-t border-[#1E2330]">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 bg-primary rounded" />
          <span className="text-xs text-[#6B7280] font-mono">Sent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 bg-[#F59E0B] rounded" />
          <span className="text-xs text-[#6B7280] font-mono">Pending</span>
        </div>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // If already logged in, redirect to dashboard
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/dashboard');
    });
  }, [navigate]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="min-h-screen bg-[#0D0F14] text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Nav */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0D0F14]/95 backdrop-blur-md border-b border-[#1E2330]' : ''}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="https://static.readdy.ai/image/9e0ec1f08df5eac0f8e6ee60a23adb36/f0b2bffe117229733d1297ec943beb71.png"
              alt="GiriLog"
              className="w-7 h-7 object-contain"
            />
            <span className="text-white font-bold text-lg tracking-tight font-mono">GiriLog</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-[#8B9AB0] hover:text-white transition-colors cursor-pointer">Features</a>
            <a href="#how-it-works" className="text-sm text-[#8B9AB0] hover:text-white transition-colors cursor-pointer">How it works</a>
            <a href="#about" className="text-sm text-[#8B9AB0] hover:text-white transition-colors cursor-pointer">About</a>
            <a href="#testimonials" className="text-sm text-[#8B9AB0] hover:text-white transition-colors cursor-pointer">Reviews</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm text-[#8B9AB0] hover:text-white transition-colors cursor-pointer whitespace-nowrap px-3 py-2"
            >
              Sign in
            </Link>
            <a
              href="#early-access"
              className="text-sm font-medium bg-primary hover:bg-[#059669] text-white px-4 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Get started
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center text-[#8B9AB0] hover:text-white cursor-pointer"
            onClick={() => setMobileMenuOpen(o => !o)}
          >
            <i className={mobileMenuOpen ? 'ri-close-line text-xl' : 'ri-menu-line text-xl'} />
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0A0C10] border-b border-[#1E2330] px-6 py-4 space-y-3">
            <a href="#features" className="block text-sm text-[#8B9AB0] hover:text-white py-1.5" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#how-it-works" className="block text-sm text-[#8B9AB0] hover:text-white py-1.5" onClick={() => setMobileMenuOpen(false)}>How it works</a>
            <a href="#about" className="block text-sm text-[#8B9AB0] hover:text-white py-1.5" onClick={() => setMobileMenuOpen(false)}>About</a>
            <a href="#testimonials" className="block text-sm text-[#8B9AB0] hover:text-white py-1.5" onClick={() => setMobileMenuOpen(false)}>Reviews</a>
            <div className="pt-2 border-t border-[#1E2330] flex flex-col gap-2">
              <Link to="/login" className="text-sm text-center text-[#8B9AB0] hover:text-white py-2 border border-[#1E2330] rounded-lg">Sign in</Link>
              <a href="#early-access" className="text-sm text-center font-medium bg-primary text-white py-2 rounded-lg" onClick={() => setMobileMenuOpen(false)}>Get started</a>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(var(--color-primary, #10B981) 1px, transparent 1px), linear-gradient(90deg, var(--color-primary, #10B981) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
        {/* Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-primary font-mono font-medium tracking-wide">Built for freelancers & developers</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            Invoicing that
            <br />
            <span className="text-primary">doesn't suck.</span>
          </h1>

          <p className="text-lg md:text-xl text-[#8B9AB0] max-w-2xl mx-auto leading-relaxed mb-10">
            GiriLog is a clean, fast invoice management tool for freelancers and developers.
            Create invoices, track clients, and monitor your revenue — all in one dark-mode workspace.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-[#059669] text-white font-semibold px-8 py-3.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap text-base"
            >
              <i className="ri-arrow-right-line" />
              Start invoicing free
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto flex items-center justify-center gap-2 border border-[#2A3040] hover:border-[#3A4050] text-[#8B9AB0] hover:text-white font-medium px-8 py-3.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap text-base"
            >
              See features
            </a>
          </div>

          {/* Hero stats */}
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[
              { val: '< 60s', label: 'Invoice creation' },
              { val: '100%', label: 'Data ownership' },
              { val: '0 fees', label: 'No transaction cuts' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold font-mono text-white">{s.val}</div>
                <div className="text-xs text-secondary mt-1 font-mono">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
          <span className="text-xs text-secondary font-mono">scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-secondary to-transparent" />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need, nothing you don't</h2>
            <p className="text-[#8B9AB0] text-lg max-w-xl mx-auto">No bloat. No subscriptions. Just a focused tool that helps you get paid.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="bg-[#0A0C10] border border-[#1E2330] rounded-2xl p-6 hover:border-primary/30 transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <i className={`${f.icon} text-primary text-lg`} />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-[#6B7280] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6 bg-[#0A0C10]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">From zero to invoice in 3 steps</h2>
            <p className="text-[#8B9AB0] text-lg">No onboarding calls. No tutorials. Just open and go.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-8 left-[calc(16.67%+16px)] right-[calc(16.67%+16px)] h-px bg-gradient-to-r from-primary/30 via-primary/60 to-primary/30" />

            {[
              {
                step: '01',
                title: 'Add your clients',
                desc: 'Set up client profiles with their billing info, default hourly rate, and tax config. One-time setup.',
                icon: 'ri-user-add-line',
              },
              {
                step: '02',
                title: 'Create an invoice',
                desc: 'Pick a client, add line items, and watch the live preview update in real time. Done in under a minute.',
                icon: 'ri-file-add-line',
              },
              {
                step: '03',
                title: 'Track & get paid',
                desc: 'Mark invoices as sent, monitor pending vs paid on the dashboard, and chase overdue ones.',
                icon: 'ri-money-dollar-circle-line',
              },
            ].map((s, i) => (
              <div key={i} className="relative flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 relative z-10">
                  <i className={`${s.icon} text-primary text-2xl`} />
                </div>
                <div className="text-xs font-mono text-primary mb-2 tracking-widest">{s.step}</div>
                <h3 className="text-lg font-semibold text-white mb-3">{s.title}</h3>
                <p className="text-sm text-[#6B7280] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard preview strip */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-[#0A0C10] border border-[#1E2330] rounded-2xl overflow-hidden">
            {/* Browser chrome */}
            <div className="px-6 py-4 border-b border-[#1E2330] flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#EF4444]/60" />
                <div className="w-3 h-3 rounded-full bg-[#F59E0B]/60" />
                <div className="w-3 h-3 rounded-full bg-primary/60" />
              </div>
              <span className="text-xs text-secondary font-mono">girilog.app/dashboard</span>
            </div>

            {/* Stat cards */}
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Invoiced', val: '$48,200', change: '+12%', color: 'text-white' },
                { label: 'Paid', val: '$31,500', change: '+8%', color: 'text-primary' },
                { label: 'Sent', val: '$12,400', change: '4 invoices', color: 'text-[#F59E0B]' },
                { label: 'Overdue', val: '$4,300', change: '2 invoices', color: 'text-[#EF4444]' },
              ].map(s => (
                <div key={s.label} className="bg-[#0D0F14] border border-[#1E2330] rounded-xl p-4">
                  <div className="text-xs text-secondary font-mono mb-2">{s.label}</div>
                  <div className={`text-xl font-bold font-mono ${s.color}`}>{s.val}</div>
                  <div className="text-xs text-secondary font-mono mt-1">{s.change}</div>
                </div>
              ))}
            </div>

            {/* Real-style line chart */}
            <div className="px-6 pb-6">
              <DemoRevenueChart />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-6 bg-[#0A0C10]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Loved by freelancers</h2>
            <p className="text-[#8B9AB0] text-lg">Real feedback from people who actually use it.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-[#0D0F14] border border-[#1E2330] rounded-2xl p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <i key={j} className="ri-star-fill text-[#F59E0B] text-xs" />
                  ))}
                </div>
                <p className="text-sm text-[#8B9AB0] leading-relaxed mb-5">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary font-mono">{t.avatar}</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    <div className="text-xs text-secondary font-mono">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-24 px-6 relative overflow-hidden">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#0A0C10] border border-[#1E2330] rounded-3xl p-8 md:p-12 relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6 text-white">The story behind the name</h2>
                <div className="space-y-4 text-[#8B9AB0] leading-relaxed">
                  <p>
                    GiriLog takes its name from the Italian financial term <span className="text-primary font-mono italic">giri di partita</span> — the 'turns of the ledger'.
                  </p>
                  <p>
                    It describes a system where value moves between accounts via record-keeping alone, no physical coins required.
                  </p>
                  <p className="text-white font-medium">
                    The app embodies this philosophy: a frictionless system for converting work performed into value recorded.
                  </p>
                </div>
              </div>
              <div className="bg-[#0D0F14] border border-[#1E2330] rounded-2xl p-6 relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-transparent blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                <div className="relative">
                  <h3 className="text-lg font-semibold mb-4 text-white">Why I built this</h3>
                  <p className="text-sm text-[#8B9AB0] leading-relaxed mb-4">
                    "I created GiriLog to make it simple and free for people who don't need something cumbersome to quickly invoice clients as they are starting out."
                  </p>
                  <p className="text-sm text-[#8B9AB0] leading-relaxed">
                    "I couldn't find anything I liked, so rather than continuing to look, I just built one."
                  </p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <i className="ri-user-smile-line text-primary" />
                    </div>
                    <span className="text-xs font-mono text-secondary">Creator of GiriLog</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA / Early Access */}
      <section id="early-access" className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-[#0A0C10] border border-primary/20 rounded-3xl p-10 md:p-14 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/3 pointer-events-none" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                <i className="ri-rocket-line text-primary text-2xl" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to get started?</h2>
              <p className="text-[#8B9AB0] mb-8 text-lg">
                Sign in and start creating invoices in under a minute.
                Or drop your email to stay in the loop.
              </p>

              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-primary hover:bg-[#059669] text-white font-semibold px-8 py-3.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap text-base"
              >
                <i className="ri-arrow-right-line" />
                Open GiriLog
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#080A0E] border-t border-[#1E2330] py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img
              src="https://static.readdy.ai/image/9e0ec1f08df5eac0f8e6ee60a23adb36/f0b2bffe117229733d1297ec943beb71.png"
              alt="GiriLog"
              className="w-6 h-6 object-contain"
            />
            <span className="text-white font-bold font-mono">GiriLog</span>
          </div>
          <p className="text-xs text-secondary font-mono">© {new Date().getFullYear()} GiriLog. Built for freelancers.</p>
          <Link to="/login" className="text-xs text-[#6B7280] hover:text-white font-mono transition-colors cursor-pointer">Sign in →</Link>
        </div>
      </footer>
    </div>
  );
}
