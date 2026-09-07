import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2, CircleHelp, FilePlus2, GraduationCap, Laptop, LogIn, MessageSquareText, Network, Printer, ReceiptText, Search, ShieldCheck, UserRoundCheck, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const categoryIcons = { 'Accounts & Access': UserRoundCheck, 'Network & Internet': Network, Hardware: Laptop, Software: Wrench, Printing: Printer, 'University Systems': GraduationCap };
const fallbackServices = [
  { id: 'access', name: 'Accounts & Access', description: 'Email, passwords, permissions, and account activation.' },
  { id: 'network', name: 'Network & Internet', description: 'Wi-Fi, LAN, internet connection, and network ports.' },
  { id: 'hardware', name: 'Hardware Support', description: 'Desktop, laptop, monitor, printer, and scanner concerns.' },
  { id: 'systems', name: 'University Systems', description: 'Schoology, EIS, SATP, and internal applications.' },
];

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.get('/announcements').then((res) => { if (res.data.success) setAnnouncements(res.data.announcements || []); }).catch(() => {});
    api.get('/categories').then((res) => { if (res.data.success) setCategories(res.data.categories || []); }).catch(() => {});
  }, []);

  const services = categories.length ? categories.slice(0, 4) : fallbackServices;
  const actionClass = 'focus:outline-none focus:ring-2 focus:ring-ndmu-green-600 focus:ring-offset-2';

  return (
    <main>
      <section className="px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[28px] border border-ndmu-green-900/10 bg-white shadow-[0_30px_80px_rgba(25,56,43,0.14)] lg:grid-cols-[1.08fr_.92fr]">
          <div className="relative isolate min-h-[510px] bg-cover bg-center p-8 text-white sm:p-12 lg:p-16" style={{ backgroundImage: "linear-gradient(130deg, rgba(4,59,42,.95), rgba(7,92,59,.72)), url('/images/ndmu-campus.png')" }}>
            <div className="relative max-w-2xl">
            <img src="/images/ndmu-logo.png" alt="Notre Dame of Marbel University" className="mb-10 h-20 w-20 object-contain sm:h-24 sm:w-24" />
            <div className="mb-6 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.15em] text-ndmu-gold-400"><span className="h-2 w-2 rounded-full bg-ndmu-gold-400" />Management Information Systems</div>
            <h1 className="max-w-xl font-display text-4xl font-medium leading-[.98] tracking-[-.045em] text-white sm:text-6xl">Technology support that keeps NDMU moving.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/80 sm:text-lg">Submit an IT request, monitor its progress, or find a quick answer from the NDMU ICT-MIS Service Desk.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/submit" className={`inline-flex items-center justify-center gap-2 rounded-xl bg-ndmu-gold-400 px-5 py-3.5 text-sm font-bold text-ndmu-green-950 shadow-sm transition hover:bg-ndmu-gold-300 ${actionClass}`}><FilePlus2 size={18} />Submit a request <ArrowRight size={17} /></Link>
              <Link to={user ? '/my-tickets' : '/login'} className={`inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-white/20 ${actionClass}`}>{user ? <ReceiptText size={18} /> : <LogIn size={18} />}{user ? 'View my requests' : 'Sign in with Google'}</Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium text-white/90"><span className="inline-flex items-center gap-2"><CheckCircle2 size={17} className="text-ndmu-gold-400" />No ID number required</span><span className="inline-flex items-center gap-2"><CheckCircle2 size={17} className="text-ndmu-gold-400" />Guest requests welcome</span></div>
            </div>
          </div>
          <div className="bg-white p-7 sm:p-10 lg:p-14">
            <div className="flex items-center justify-between border-b border-slate-200 pb-5"><div><p className="text-xs font-extrabold uppercase tracking-[0.15em] text-ndmu-green-700">ICT-MIS Service Desk</p><h2 className="mt-3 font-display text-4xl font-medium tracking-[-.035em] text-slate-900">How can we help?</h2><p className="mt-3 text-sm leading-6 text-slate-500">Choose the option that best fits your situation.</p></div><div className="rounded-2xl bg-ndmu-green-100 p-3 text-ndmu-green-800"><CircleHelp size={22} /></div></div>
            <div className="mt-3 divide-y divide-slate-200">
              <QuickLink to="/submit?guest=true" icon={<FilePlus2 size={19} />} title="Submit as a guest" description="No sign-in required for a new request." />
              <QuickLink to="/track" icon={<Search size={19} />} title="Track a guest request" description="Use the secure link from your confirmation email." />
              <QuickLink to="/kb" icon={<BookOpen size={19} />} title="Browse the knowledge base" description="Find guides, FAQs, and self-service answers." />
            </div>
          </div>
        </div>
      </section>
      {announcements.length > 0 && <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8"><div className="space-y-3">{announcements.map((ann) => <div key={ann.id} className={`flex gap-3 rounded-xl border p-4 text-sm ${ann.severity === 'urgent' ? 'border-rose-200 bg-rose-50 text-rose-900' : ann.severity === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-blue-200 bg-blue-50 text-blue-900'}`}><MessageSquareText size={18} className="mt-0.5 shrink-0" /><div><p className="font-bold">{ann.title}</p><p className="mt-1 text-xs leading-5 opacity-90">{ann.content}</p></div></div>)}</div></section>}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-bold uppercase tracking-wider text-ndmu-green-700">Service catalog</p><h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">What can we help with?</h2><p className="mt-2 text-sm text-slate-600">Start with a service area to create a more focused request.</p></div><Link to="/submit" className="inline-flex items-center gap-1 text-sm font-bold text-ndmu-green-800 hover:text-ndmu-green-950">View all services <ArrowRight size={16} /></Link></div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{services.map((service) => { const Icon = categoryIcons[service.name] || Wrench; return <button key={service.id} onClick={() => navigate(`/submit${categories.length ? `?cat=${service.id}` : ''}`)} className={`group rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-ndmu-green-400 hover:shadow-md ${actionClass}`}><span className="inline-flex rounded-lg bg-ndmu-green-50 p-2.5 text-ndmu-green-800 transition group-hover:bg-ndmu-green-800 group-hover:text-white"><Icon size={20} /></span><h3 className="mt-4 text-sm font-bold text-slate-900">{service.name}</h3><p className="mt-2 min-h-10 text-xs leading-5 text-slate-500">{service.description || 'Get assistance from the ICT-MIS Service Desk.'}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-ndmu-green-800">Request support <ArrowRight size={14} /></span></button>; })}</div>
      </section>
      <section className="border-y border-slate-200 bg-white"><div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6 lg:px-8"><Feature icon={<ShieldCheck />} title="Clear updates" text="Follow your request from submission to resolution." /><Feature icon={<MessageSquareText />} title="One conversation" text="Keep replies and supporting details with your ticket." /><Feature icon={<BookOpen />} title="Helpful resources" text="Use our guides for common technology concerns." /></div></section>
      <footer className="bg-slate-950 py-8 text-xs text-slate-400"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-4 sm:flex-row sm:px-6 lg:px-8"><div><p className="font-bold text-slate-200">NDMU ICT-MIS Service Desk</p><p className="mt-1">Notre Dame of Marbel University · Koronadal City, South Cotabato</p></div><p>For critical classroom AV emergencies, contact ICT-MIS Local Ext. 108.</p></div></footer>
    </main>
  );
}

function QuickLink({ to, icon, title, description }) { return <Link to={to} className="group flex items-center gap-4 py-4 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ndmu-green-600"><span className="rounded-lg bg-white p-2.5 text-ndmu-green-800 shadow-sm">{icon}</span><span className="flex-1"><span className="block text-sm font-bold text-slate-800">{title}</span><span className="mt-0.5 block text-xs text-slate-500">{description}</span></span><ArrowRight size={17} className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-ndmu-green-800" /></Link>; }
function Feature({ icon, title, text }) { return <div className="flex gap-3"><span className="shrink-0 text-ndmu-green-700">{React.cloneElement(icon, { size: 22 })}</span><div><h3 className="text-sm font-bold text-slate-900">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{text}</p></div></div>; }
