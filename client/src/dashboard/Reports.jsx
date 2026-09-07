import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const statusMeta = [
  { key: 'new', label: 'New', color: 'bg-emerald-500' },
  { key: 'assigned', label: 'Assigned', color: 'bg-blue-500' },
  { key: 'in_progress', label: 'In progress', color: 'bg-amber-500' },
  { key: 'pending_user', label: 'Pending requestor', color: 'bg-violet-500' },
  { key: 'resolved', label: 'Resolved', color: 'bg-teal-500' },
  { key: 'closed', label: 'Closed', color: 'bg-slate-400' },
];

export default function Reports() {
  const { user, isStaff } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => toDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [dateTo, setDateTo] = useState(() => toDateInput(new Date()));
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    if (!user || !isStaff) {
      navigate('/login');
      return;
    }

    let active = true;
    api.get('/stats/dashboard')
      .then((response) => {
        if (active && response.data.success) setStats(response.data);
      })
      .catch((error) => console.error('Failed to load reports:', error))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, isStaff, navigate]);

  const counts = stats?.statusCounts || {};
  const sla = stats?.slaStats || {};
  const typeBreakdown = stats?.typeBreakdown || [];
  const categoryBreakdown = stats?.categoryBreakdown || [];
  const techWorkload = stats?.techWorkload || [];

  const totals = useMemo(() => {
    const totalTickets = statusMeta.reduce((sum, status) => sum + (Number(counts[status.key]) || 0), 0);
    const activeTickets = ['new', 'assigned', 'in_progress', 'pending_user'].reduce((sum, key) => sum + (Number(counts[key]) || 0), 0);
    const completedTickets = (Number(counts.resolved) || 0) + (Number(counts.closed) || 0);
    return { totalTickets, activeTickets, completedTickets };
  }, [counts]);

  const maxStatus = Math.max(...statusMeta.map((status) => Number(counts[status.key]) || 0), 1);
  const maxCategory = Math.max(...categoryBreakdown.map((category) => Number(category.count) || 0), 1);
  const maxTechnicianLoad = Math.max(...techWorkload.map((technician) => Number(technician.active_tickets) || 0), 1);

  const exportTickets = async () => {
    if (!dateFrom || !dateTo) {
      setExportError('Select both a start date and an end date.');
      return;
    }
    if (dateFrom > dateTo) {
      setExportError('The start date cannot be after the end date.');
      return;
    }

    setExporting(true);
    setExportError('');
    try {
      const allTickets = [];
      let exportPage = 1;
      let exportTotal = 0;
      do {
        const response = await api.get('/tickets', {
          params: { date_from: dateFrom, date_to: dateTo, page: exportPage, limit: 500 },
        });
        if (!response.data.success) throw new Error('Ticket export request failed.');
        allTickets.push(...(response.data.tickets || []));
        exportTotal = Number(response.data.total) || 0;
        exportPage += 1;
      } while (allTickets.length < exportTotal);

      if (allTickets.length === 0) {
        setExportError('No tickets were created within the selected date range.');
        return;
      }

      const { default: ExcelJS } = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'NDMU ICT-MIS Service Desk';
      workbook.created = new Date();
      const worksheet = workbook.addWorksheet('Tickets', {
        views: [{ state: 'frozen', ySplit: 1 }],
        properties: { defaultRowHeight: 19 },
      });

      worksheet.columns = [
        { header: 'Ticket Number', key: 'ticketNumber', width: 21 },
        { header: 'Created Date', key: 'createdAt', width: 21 },
        { header: 'Ticket Type', key: 'ticketType', width: 18 },
        { header: 'Status', key: 'status', width: 18 },
        { header: 'Priority', key: 'priority', width: 14 },
        { header: 'Category', key: 'category', width: 24 },
        { header: 'Subcategory', key: 'subcategory', width: 24 },
        { header: 'Subject', key: 'subject', width: 42 },
        { header: 'Description', key: 'description', width: 55 },
        { header: 'Requestor Name', key: 'requestorName', width: 25 },
        { header: 'Requestor Email', key: 'requestorEmail', width: 31 },
        { header: 'Department', key: 'department', width: 31 },
        { header: 'Location', key: 'location', width: 27 },
        { header: 'Assigned Technician', key: 'technician', width: 27 },
        { header: 'Response SLA Target', key: 'responseSla', width: 22 },
        { header: 'Resolution SLA Target', key: 'resolutionSla', width: 22 },
        { header: 'Resolution Notes', key: 'resolutionNotes', width: 55 },
        { header: 'Tracking Code', key: 'trackingCode', width: 23 },
      ];

      worksheet.addRows(allTickets.map((ticket) => ({
        ticketNumber: ticket.ticket_number,
        createdAt: asExcelDate(ticket.created_at),
        ticketType: readable(ticket.ticket_type),
        status: readable(ticket.status),
        priority: readable(ticket.priority),
        category: ticket.category_name || '',
        subcategory: ticket.subcategory_name || '',
        subject: ticket.title || '',
        description: ticket.description || '',
        requestorName: ticket.requestor_name || '',
        requestorEmail: ticket.requestor_email || '',
        department: ticket.requestor_department || '',
        location: ticket.location_office || '',
        technician: ticket.assigned_technician_name || 'Unassigned',
        responseSla: asExcelDate(ticket.sla_due_response),
        resolutionSla: asExcelDate(ticket.sla_due_resolution),
        resolutionNotes: ticket.resolution_notes || '',
        trackingCode: ticket.tracking_code || '',
      })));

      const header = worksheet.getRow(1);
      header.height = 24;
      header.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF075C3B' } };
      header.alignment = { vertical: 'middle' };
      worksheet.autoFilter = { from: 'A1', to: 'R1' };
      ['B', 'O', 'P'].forEach((column) => { worksheet.getColumn(column).numFmt = 'mmm d, yyyy h:mm AM/PM'; });
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.alignment = { vertical: 'top', wrapText: true };
        if (rowNumber % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F7F5' } };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `ICT-MIS_Tickets_${dateFrom}_to_${dateTo}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Failed to export tickets:', error);
      setExportError(error.response?.data?.message || 'Unable to generate the ticket export.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <ReportsSkeleton />;

  return (
    <main className="min-h-full bg-[#f4f7f5]">
      <section className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ndmu-green-700">Performance intelligence</p>
            <h1 className="mt-1 font-display text-3xl font-medium tracking-[-0.035em] text-slate-900">Reports & SLA health</h1>
            <p className="mt-1 text-xs text-slate-500">A live operational view of ICT-MIS demand, service targets, and technician workload.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-500"><span className="material-symbols-outlined text-[16px] text-ndmu-green-700">schedule</span>Live snapshot · {new Date().toLocaleDateString()}</span>
            <Link to="/staff/all-tickets" className="inline-flex items-center gap-2 rounded-lg bg-ndmu-green-700 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-ndmu-green-800"><span className="material-symbols-outlined text-[17px]">table_view</span>Open ticket registry</Link>
          </div>
        </div>
      </section>

      <div className="space-y-4 p-4 sm:p-5 lg:p-6">
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricCard label="All tickets" value={totals.totalTickets} detail="Across every status" icon="confirmation_number" tone="emerald" />
          <MetricCard label="Active workload" value={totals.activeTickets} detail="Requires staff attention" icon="pending_actions" tone="blue" />
          <MetricCard label="Completed" value={totals.completedTickets} detail={`${sla.totalResolved || 0} marked resolved`} icon="task_alt" tone="teal" />
          <MetricCard label="Resolution breaches" value={sla.breachedResolution || 0} detail={`${sla.breachedResponse || 0} response breaches`} icon="timer_off" tone="rose" alert={(sla.breachedResolution || 0) > 0} />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-ndmu-green-700">Data export</p>
              <h2 className="mt-0.5 font-display text-lg font-medium text-slate-900">Export ticket register</h2>
              <p className="mt-1 text-[11px] text-slate-500">Download every ticket created within an inclusive date range as an Excel workbook.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label><span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-slate-400">From</span><input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => { setDateFrom(event.target.value); setExportError(''); }} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-ndmu-green-500 focus:ring-2 focus:ring-ndmu-green-100" /></label>
              <label><span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-slate-400">To</span><input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => { setDateTo(event.target.value); setExportError(''); }} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-ndmu-green-500 focus:ring-2 focus:ring-ndmu-green-100" /></label>
              <button type="button" onClick={exportTickets} disabled={exporting} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-ndmu-green-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-ndmu-green-800 disabled:cursor-wait disabled:opacity-60"><span className={`material-symbols-outlined text-[17px] ${exporting ? 'animate-spin' : ''}`}>{exporting ? 'progress_activity' : 'download'}</span>{exporting ? 'Preparing workbook…' : 'Export XLSX'}</button>
            </div>
          </div>
          {exportError && <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">{exportError}</p>}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-ndmu-green-700">Ticket lifecycle</p><h2 className="mt-0.5 font-display text-lg font-medium text-slate-900">Workload by status</h2></div>
              <span className="text-xs font-black text-slate-700">{totals.totalTickets} total</span>
            </div>
            <div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {statusMeta.map((status) => {
                const value = Number(counts[status.key]) || 0;
                const width = value === 0 ? 0 : Math.max(5, Math.round((value / maxStatus) * 100));
                return <Link key={status.key} to={`/staff/all-tickets?status=${status.key}`} className="group block"><div className="mb-1.5 flex items-center justify-between text-[11px]"><span className="font-bold text-slate-600 group-hover:text-ndmu-green-800">{status.label}</span><span className="font-black text-slate-900">{value}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full transition-all ${status.color}`} style={{ width: `${width}%` }} /></div></Link>;
              })}
            </div>
          </div>

          <div className="rounded-xl bg-ndmu-green-950 p-4 text-white shadow-sm">
            <div className="flex items-start justify-between"><div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-ndmu-gold-300">SLA control</p><h2 className="mt-0.5 font-display text-lg font-medium">Service target health</h2></div><span className="material-symbols-outlined text-2xl text-emerald-200/60">speed</span></div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white/[0.07] p-3"><p className="text-2xl font-black text-amber-300">{sla.breachedResponse || 0}</p><p className="mt-1 text-[9px] font-black uppercase tracking-wide text-emerald-100/50">Response overdue</p></div>
              <div className="rounded-lg bg-white/[0.07] p-3"><p className="text-2xl font-black text-rose-300">{sla.breachedResolution || 0}</p><p className="mt-1 text-[9px] font-black uppercase tracking-wide text-emerald-100/50">Resolution overdue</p></div>
            </div>
            <div className="mt-3 rounded-lg border border-white/10 p-3 text-[11px] leading-5 text-emerald-50/70">Prioritize overdue resolution targets first, then tickets still waiting for their initial technician response.</div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <ReportPanel eyebrow="Demand mix" title="Ticket types" icon="splitscreen">
            <div className="grid gap-3 sm:grid-cols-2">
              {typeBreakdown.length === 0 ? <EmptyData /> : typeBreakdown.map((type) => {
                const isIncident = type.ticket_type === 'incident';
                return <Link key={type.ticket_type} to={`/staff/all-tickets?type=${type.ticket_type}`} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 transition hover:border-ndmu-green-200"><div className="flex items-center gap-3"><span className={`grid h-9 w-9 place-items-center rounded-lg ${isIncident ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}><span className="material-symbols-outlined text-[19px]">{isIncident ? 'report' : 'support_agent'}</span></span><div><p className="text-xs font-bold capitalize text-slate-800">{type.ticket_type?.replace('_', ' ')}</p><p className="mt-0.5 text-[10px] text-slate-400">{isIncident ? 'Service interruption' : 'Fulfillment request'}</p></div></div><span className="text-xl font-black text-slate-900">{type.count}</span></Link>;
              })}
            </div>
          </ReportPanel>

          <ReportPanel eyebrow="Service demand" title="Volume by category" icon="donut_large">
            <div className="sidebar-scroll max-h-56 space-y-3 overflow-y-auto pr-1">
              {categoryBreakdown.length === 0 ? <EmptyData /> : categoryBreakdown.map((category) => {
                const count = Number(category.count) || 0;
                const width = count === 0 ? 0 : Math.max(5, Math.round((count / maxCategory) * 100));
                return <div key={category.name}><div className="mb-1 flex items-center justify-between gap-3 text-[11px]"><span className="truncate font-semibold text-slate-600">{category.name}</span><span className="font-black text-slate-900">{count}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-ndmu-green-600" style={{ width: `${width}%` }} /></div></div>;
              })}
            </div>
          </ReportPanel>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-ndmu-green-700">Team capacity</p><h2 className="mt-0.5 font-display text-lg font-medium text-slate-900">Technician workload</h2></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">{techWorkload.length} technicians</span></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-400"><tr><th className="px-4 py-3">Technician</th><th className="px-4 py-3">Active load</th><th className="px-4 py-3">Resolved</th><th className="px-4 py-3">Workload indicator</th><th className="px-4 py-3 text-right">Total handled</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {techWorkload.length === 0 ? <tr><td colSpan={5}><EmptyData /></td></tr> : techWorkload.map((technician) => {
                  const activeLoad = Number(technician.active_tickets) || 0;
                  const resolved = Number(technician.resolved_tickets) || 0;
                  const width = activeLoad === 0 ? 0 : Math.max(6, Math.round((activeLoad / maxTechnicianLoad) * 100));
                  return <tr key={technician.id} className="text-slate-600 transition hover:bg-slate-50"><td className="px-4 py-3 font-bold text-slate-800">{technician.full_name}</td><td className="px-4 py-3 font-black text-amber-600">{activeLoad}</td><td className="px-4 py-3 font-black text-teal-700">{resolved}</td><td className="w-64 px-4 py-3"><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${activeLoad >= maxTechnicianLoad && activeLoad > 0 ? 'bg-amber-500' : 'bg-ndmu-green-500'}`} style={{ width: `${width}%` }} /></div></td><td className="px-4 py-3 text-right font-black text-slate-800">{activeLoad + resolved}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

const metricTones = {
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  teal: 'border-teal-200 bg-teal-50 text-teal-700',
  rose: 'border-rose-200 bg-rose-50 text-rose-700',
};

function MetricCard({ label, value, detail, icon, tone, alert }) {
  return <div className={`rounded-xl border bg-white p-3.5 shadow-sm ${alert ? 'border-rose-200' : 'border-slate-200'}`}><div className="flex items-start justify-between"><div><p className="text-[9px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-1 text-2xl font-black ${alert ? 'text-rose-600' : 'text-slate-900'}`}>{value}</p></div><span className={`grid h-9 w-9 place-items-center rounded-lg border ${metricTones[tone]}`}><span className="material-symbols-outlined text-[19px]">{icon}</span></span></div><p className="mt-2 text-[10px] text-slate-400">{detail}</p></div>;
}

function ReportPanel({ eyebrow, title, icon, children }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3"><div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-ndmu-green-700">{eyebrow}</p><h2 className="mt-0.5 font-display text-lg font-medium text-slate-900">{title}</h2></div><span className="material-symbols-outlined text-xl text-slate-300">{icon}</span></div>{children}</div>;
}

function EmptyData() {
  return <div className="py-8 text-center text-xs text-slate-400"><span className="material-symbols-outlined mb-1 block text-3xl text-slate-300">analytics</span>No report data available.</div>;
}

function toDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function asExcelDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date;
}

function readable(value) {
  if (!value) return '';
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function ReportsSkeleton() {
  return <main className="min-h-full bg-[#f4f7f5] p-6"><div className="h-20 animate-pulse rounded-xl bg-white" /><div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-white" />)}</div><div className="mt-4 grid gap-4 xl:grid-cols-2"><div className="h-64 animate-pulse rounded-xl bg-white" /><div className="h-64 animate-pulse rounded-xl bg-white" /></div></main>;
}
