import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import SlaCountdown from '../components/SlaCountdown';

const fallbackCounts = {
  new: 0,
  assigned: 0,
  in_progress: 0,
  pending_user: 0,
  resolved: 0,
  closed: 0,
};

const kpiCards = [
  { key: 'new', label: 'New / Unassigned', detail: 'Awaiting triage', icon: 'inbox', to: '/staff/unassigned', accent: 'emerald' },
  { key: 'assigned', label: 'Assigned', detail: 'Allocated to a technician', icon: 'assignment_ind', to: '/staff/all-tickets?status=assigned', accent: 'blue' },
  { key: 'in_progress', label: 'In Progress', detail: 'Resolution underway', icon: 'pending_actions', to: '/staff/my-tickets', accent: 'amber' },
  { key: 'pending_user', label: 'Pending Requestor', detail: 'Waiting for a response', icon: 'forum', to: '/staff/all-tickets?status=pending_user', accent: 'violet' },
];

const accentClasses = {
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
};

export default function StaffDashboard() {
  const { user, isStaff } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);
  const [unassignedTickets, setUnassignedTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isStaff) {
      navigate('/login');
      return;
    }

    let active = true;
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [statRes, recentRes, unassignedRes] = await Promise.all([
          api.get('/stats/dashboard'),
          api.get('/tickets', { params: { limit: 6 } }),
          api.get('/tickets', { params: { assigned_to: 'unassigned', limit: 5 } }),
        ]);

        if (!active) return;
        if (statRes.data.success) setStats(statRes.data);
        if (recentRes.data.success) setRecentTickets(recentRes.data.tickets || []);
        if (unassignedRes.data.success) setUnassignedTickets(unassignedRes.data.tickets || []);
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDashboard();
    return () => { active = false; };
  }, [user, isStaff, navigate]);

  const counts = { ...fallbackCounts, ...(stats?.statusCounts || {}) };
  const overdueCount = stats?.slaStats?.breachedResolution || 0;
  const activeCount = Number(counts.new) + Number(counts.assigned) + Number(counts.in_progress) + Number(counts.pending_user);
  const resolvedCount = Number(counts.resolved) + Number(counts.closed);
  const categoryBreakdown = stats?.categoryBreakdown || [];
  const largestCategory = Math.max(...categoryBreakdown.map((category) => Number(category.count) || 0), 1);

  return (
    <main className="min-h-full bg-[#f4f7f5]">
      <section className="border-b border-slate-200 bg-white">
        <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ndmu-green-700">Service operations</p>
              <h1 className="mt-1 font-display text-3xl font-medium tracking-[-0.035em] text-slate-900">Operations dashboard</h1>
              <p className="mt-1 max-w-2xl text-xs text-slate-500">
                Welcome, <span className="font-semibold text-slate-700">{user?.full_name}</span>. Monitor ICT-MIS workload, triage requests, and keep service delivery moving.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Service desk live
              </div>
              <Link to="/staff/unassigned" className="inline-flex items-center gap-2 rounded-xl bg-ndmu-green-800 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-ndmu-green-700">
                <span className="material-symbols-outlined text-[17px]">move_to_inbox</span>
                Triage queue
                {counts.new > 0 && <span className="rounded-full bg-white/15 px-2 py-0.5">{counts.new}</span>}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-4 p-4 sm:p-5 lg:p-6">
        <section aria-label="Ticket status overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {kpiCards.map((card) => (
            <Link key={card.key} to={card.to} className="group rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ndmu-green-300 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <span className={`grid h-9 w-9 place-items-center rounded-lg border ${accentClasses[card.accent]}`}>
                  <span className="material-symbols-outlined text-[20px]">{card.icon}</span>
                </span>
                <span className="material-symbols-outlined text-[17px] text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-ndmu-green-700">arrow_forward</span>
              </div>
              <p className="mt-3 text-2xl font-black tracking-tight text-slate-900">{loading ? '—' : counts[card.key]}</p>
              <p className="mt-1 text-xs font-extrabold text-slate-800">{card.label}</p>
              <p className="mt-1 text-[10px] text-slate-400">{card.detail}</p>
            </Link>
          ))}

          <Link to="/staff/reports" className={`group rounded-xl border bg-white p-3.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${overdueCount > 0 ? 'border-rose-200' : 'border-slate-200'}`}>
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700">
                <span className="material-symbols-outlined text-[20px]">timer_off</span>
              </span>
              {overdueCount > 0 && <span className="rounded-full bg-rose-100 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-rose-700">Attention</span>}
            </div>
            <p className={`mt-3 text-2xl font-black tracking-tight ${overdueCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{loading ? '—' : overdueCount}</p>
            <p className="mt-1 text-xs font-extrabold text-slate-800">Overdue SLA</p>
            <p className="mt-1 text-[10px] text-slate-400">Past resolution target</p>
          </Link>
        </section>

        <section className="grid gap-4 2xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ndmu-green-700">Priority workspace</p>
                <h2 className="font-display text-lg font-medium text-slate-900">Unassigned requests</h2>
              </div>
              <Link to="/staff/unassigned" className="inline-flex items-center gap-1 text-xs font-bold text-ndmu-green-700 hover:text-ndmu-green-900">
                Open full queue <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>

            {loading ? (
              <div className="space-y-2 p-4">{[1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-lg bg-slate-100" />)}</div>
            ) : unassignedTickets.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <span className="material-symbols-outlined text-4xl text-emerald-500">task_alt</span>
                <h3 className="mt-2 text-sm font-bold text-slate-800">The triage queue is clear</h3>
                <p className="mt-1 text-xs text-slate-400">There are no unassigned requests right now.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {unassignedTickets.map((ticket) => (
                  <button key={ticket.id} type="button" onClick={() => navigate(`/tickets/${ticket.ticket_number}`)} className="flex w-full flex-col gap-2 px-4 py-3 text-left transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-ndmu-green-800">{ticket.ticket_number}</span>
                        <PriorityBadge priority={ticket.priority} />
                        {ticket.category_name && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{ticket.category_name}</span>}
                      </div>
                      <p className="mt-1.5 truncate text-xs font-bold text-slate-900">{ticket.title}</p>
                      <p className="mt-1 truncate text-[11px] text-slate-400">{ticket.requestor_name} · {ticket.requestor_department || ticket.requestor_email}</p>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                      <SlaCountdown targetDate={ticket.sla_due_resolution} />
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-ndmu-green-50 text-ndmu-green-700">
                        <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-xl bg-ndmu-green-950 p-4 text-white shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ndmu-gold-300">Current workload</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-white/[0.07] p-3">
                  <p className="text-2xl font-black">{loading ? '—' : activeCount}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-emerald-100/55">Active tickets</p>
                </div>
                <div className="rounded-lg bg-white/[0.07] p-3">
                  <p className="text-2xl font-black">{loading ? '—' : resolvedCount}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-emerald-100/55">Completed</p>
                </div>
              </div>
              <Link to="/staff/reports" className="mt-3 flex items-center justify-between rounded-lg border border-white/10 px-3 py-2.5 text-xs font-bold text-emerald-50 transition hover:bg-white/[0.07]">
                View service analytics <span className="material-symbols-outlined text-[17px]">monitoring</span>
              </Link>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ndmu-green-700">Request distribution</p>
                  <h2 className="mt-1 text-sm font-bold text-slate-900">Top categories</h2>
                </div>
                <span className="material-symbols-outlined text-xl text-slate-300">donut_large</span>
              </div>
              <div className="mt-3 space-y-3">
                {categoryBreakdown.length === 0 ? (
                  <p className="py-5 text-center text-xs text-slate-400">No category data available.</p>
                ) : categoryBreakdown.slice(0, 5).map((category) => {
                  const categoryCount = Number(category.count) || 0;
                  const percentage = categoryCount === 0
                    ? 0
                    : Math.max(5, Math.round((categoryCount / largestCategory) * 100));
                  return (
                    <div key={category.name}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px]">
                        <span className="truncate font-semibold text-slate-600">{category.name}</span>
                        <span className="font-black text-slate-800">{category.count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-ndmu-green-600" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-ndmu-green-700">Activity stream</p>
              <h2 className="font-display text-lg font-medium text-slate-900">Recently active tickets</h2>
            </div>
            <Link to="/staff/all-tickets" className="inline-flex items-center gap-1 text-xs font-bold text-ndmu-green-700 hover:text-ndmu-green-900">View ticket registry <span className="material-symbols-outlined text-[16px]">arrow_forward</span></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3">Ticket</th>
                  <th className="px-5 py-3">Requestor</th>
                  <th className="px-5 py-3">Subject</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Technician</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTickets.map((ticket) => (
                  <tr key={ticket.id} onClick={() => navigate(`/tickets/${ticket.ticket_number}`)} className="cursor-pointer text-slate-600 transition hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-3 font-black text-ndmu-green-800">{ticket.ticket_number}</td>
                    <td className="whitespace-nowrap px-5 py-3 font-bold text-slate-800">{ticket.requestor_name}</td>
                    <td className="max-w-[260px] truncate px-5 py-3">{ticket.title}</td>
                    <td className="whitespace-nowrap px-5 py-3"><PriorityBadge priority={ticket.priority} /></td>
                    <td className="whitespace-nowrap px-5 py-3"><StatusBadge status={ticket.status} /></td>
                    <td className="whitespace-nowrap px-5 py-3 font-semibold">{ticket.assigned_technician_name || 'Unassigned'}</td>
                    <td className="px-5 py-3 text-right"><span className="font-bold text-ndmu-green-700">View →</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && recentTickets.length === 0 && <div className="px-5 py-12 text-center text-xs text-slate-400">No recent ticket activity.</div>}
          </div>
        </section>
      </div>
    </main>
  );
}
