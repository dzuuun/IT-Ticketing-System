import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import SlaCountdown from '../components/SlaCountdown';

const PAGE_SIZE = 25;
const statusOptions = [
  { value: 'all', label: 'All' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'pending_user', label: 'Pending requestor' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export default function StaffMyTickets() {
  const { user, isStaff } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user || !isStaff) navigate('/login');
  }, [user, isStaff, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!user || !isStaff) return;
    let active = true;
    setLoading(true);
    api.get('/tickets', {
      params: {
        assigned_to: 'me',
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search || undefined,
        page,
        limit: PAGE_SIZE,
      },
    }).then((response) => {
      if (!active || !response.data.success) return;
      setTickets(response.data.tickets || []);
      setTotal(response.data.total || response.data.tickets?.length || 0);
    }).catch((error) => {
      console.error('Failed to load my tickets:', error);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [user, isStaff, statusFilter, search, page]);

  const summary = useMemo(() => {
    const now = new Date();
    return {
      active: tickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).length,
      overdue: tickets.filter((ticket) => ticket.sla_due_resolution && new Date(ticket.sla_due_resolution) < now && !['resolved', 'closed'].includes(ticket.status)).length,
      pending: tickets.filter((ticket) => ticket.status === 'pending_user').length,
      completed: tickets.filter((ticket) => ['resolved', 'closed'].includes(ticket.status)).length,
    };
  }, [tickets]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageStart = total === 0 ? 0 : ((page - 1) * PAGE_SIZE) + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, total);

  const chooseStatus = (status) => {
    setStatusFilter(status);
    setPage(1);
  };

  return (
    <main className="min-h-full bg-[#f4f7f5]">
      <section className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ndmu-green-700">Personal work queue</p>
            <h1 className="mt-1 font-display text-3xl font-medium tracking-[-0.035em] text-slate-900">My assigned tickets</h1>
            <p className="mt-1 text-xs text-slate-500">Requests assigned to <span className="font-bold text-slate-700">{user?.full_name}</span> for active resolution.</p>
          </div>
          <div className="inline-flex w-fit items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-ndmu-green-100 text-ndmu-green-800"><span className="material-symbols-outlined text-[18px]">assignment_ind</span></span>
            <div><p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Assigned records</p><p className="text-lg font-black leading-none text-slate-900">{loading ? '—' : total}</p></div>
          </div>
        </div>
      </section>

      <div className="space-y-4 p-4 sm:p-5 lg:p-6">
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <SummaryCard label="Active on page" value={summary.active} icon="bolt" tone="emerald" loading={loading} />
          <SummaryCard label="Overdue SLA" value={summary.overdue} icon="timer_off" tone="rose" loading={loading} />
          <SummaryCard label="Pending requestor" value={summary.pending} icon="forum" tone="violet" loading={loading} />
          <SummaryCard label="Completed on page" value={summary.completed} icon="task_alt" tone="blue" loading={loading} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {statusOptions.map((status) => (
                <button key={status.value} type="button" onClick={() => chooseStatus(status.value)} className={`rounded-lg px-3 py-2 text-[11px] font-bold transition ${statusFilter === status.value ? 'bg-ndmu-green-700 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'}`}>
                  {status.label}
                </button>
              ))}
            </div>
            <div className="relative w-full xl:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
              <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Ticket number, requestor, or subject" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-xs outline-none transition focus:border-ndmu-green-500 focus:bg-white focus:ring-2 focus:ring-ndmu-green-100" />
              {searchInput && <button type="button" onClick={() => setSearchInput('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><span className="material-symbols-outlined text-[17px]">close</span></button>}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-400">
                <tr><th className="px-4 py-3">Ticket</th><th className="px-4 py-3">Requestor</th><th className="px-4 py-3">Request details</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">SLA target</th><th className="px-4 py-3 text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? <LoadingRows /> : tickets.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-14 text-center"><span className="material-symbols-outlined text-4xl text-emerald-300">task_alt</span><p className="mt-2 text-sm font-bold text-slate-700">No assigned tickets found</p><p className="mt-1 text-xs text-slate-400">There are no tickets under this status or search.</p>{(statusFilter !== 'all' || searchInput) && <button type="button" onClick={() => { chooseStatus('all'); setSearchInput(''); }} className="mt-3 text-xs font-bold text-ndmu-green-700">Clear filters</button>}</td></tr>
                ) : tickets.map((ticket) => (
                  <tr key={ticket.id} onClick={() => navigate(`/tickets/${ticket.ticket_number}`)} className="cursor-pointer text-slate-600 transition hover:bg-emerald-50/40">
                    <td className="whitespace-nowrap px-4 py-3"><p className="font-black text-ndmu-green-800">{ticket.ticket_number}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">{ticket.ticket_type?.replace('_', ' ')}</p></td>
                    <td className="whitespace-nowrap px-4 py-3"><p className="font-bold text-slate-900">{ticket.requestor_name}</p><p className="mt-1 max-w-[180px] truncate text-[10px] text-slate-400">{ticket.requestor_department || ticket.requestor_email}</p></td>
                    <td className="max-w-[300px] px-4 py-3"><p className="truncate font-bold text-slate-800">{ticket.title}</p><p className="mt-1 truncate text-[10px] font-semibold text-ndmu-green-700">{ticket.category_name || 'General'}</p></td>
                    <td className="whitespace-nowrap px-4 py-3"><PriorityBadge priority={ticket.priority} /></td>
                    <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={ticket.status} /></td>
                    <td className="whitespace-nowrap px-4 py-3"><SlaCountdown targetDate={ticket.sla_due_resolution} isCompleted={ticket.status === 'resolved' || ticket.status === 'closed'} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}><Link to={`/tickets/${ticket.ticket_number}`} className="inline-flex items-center gap-1.5 rounded-lg bg-ndmu-green-700 px-3 py-2 text-[11px] font-bold text-white shadow-sm transition hover:bg-ndmu-green-800">Open ticket<span className="material-symbols-outlined text-[15px]">arrow_forward</span></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row">
            <p className="text-[11px] font-semibold text-slate-500">Showing <span className="font-black text-slate-700">{pageStart}–{pageEnd}</span> of <span className="font-black text-slate-700">{total}</span></p>
            <div className="flex items-center gap-2">
              <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-ndmu-green-300 hover:text-ndmu-green-700 disabled:cursor-not-allowed disabled:opacity-40"><span className="material-symbols-outlined text-[15px]">chevron_left</span>Previous</button>
              <span className="min-w-16 text-center text-[11px] font-bold text-slate-500">{page} / {pageCount}</span>
              <button type="button" disabled={page >= pageCount || loading} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-ndmu-green-300 hover:text-ndmu-green-700 disabled:cursor-not-allowed disabled:opacity-40">Next<span className="material-symbols-outlined text-[15px]">chevron_right</span></button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

const summaryTone = {
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rose: 'border-rose-200 bg-rose-50 text-rose-600',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
};

function SummaryCard({ label, value, icon, tone, loading }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-2xl font-black text-slate-900">{loading ? '—' : value}</p></div><span className={`grid h-9 w-9 place-items-center rounded-lg border ${summaryTone[tone]}`}><span className="material-symbols-outlined text-[19px]">{icon}</span></span></div></div>;
}

function LoadingRows() {
  return [1, 2, 3, 4].map((row) => <tr key={row}>{[1, 2, 3, 4, 5, 6, 7].map((cell) => <td key={cell} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-slate-100" /></td>)}</tr>);
}
