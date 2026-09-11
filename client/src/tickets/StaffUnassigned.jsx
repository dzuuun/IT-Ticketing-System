import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import PriorityBadge from "../components/PriorityBadge";
import SlaCountdown from "../components/SlaCountdown";

const PAGE_SIZE = 25;
const priorities = ["all", "critical", "urgent", "high", "medium", "low"];

export default function StaffUnassigned() {
  const { user, isStaff } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [assigningId, setAssigningId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user || !isStaff) navigate("/login");
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
    api
      .get("/users/technicians")
      .then((response) => {
        if (active && response.data.success)
          setTechnicians(response.data.technicians || []);
      })
      .catch((error) => console.error("Failed to load technicians:", error));
    return () => {
      active = false;
    };
  }, [user, isStaff]);

  useEffect(() => {
    if (!user || !isStaff) return;
    let active = true;
    setLoading(true);
    api
      .get("/tickets", {
        params: {
          assigned_to: "unassigned",
          priority: priorityFilter !== "all" ? priorityFilter : undefined,
          search: search || undefined,
          page,
          limit: PAGE_SIZE,
        },
      })
      .then((response) => {
        if (!active || !response.data.success) return;
        setTickets(response.data.tickets || []);
        setTotal(response.data.total || response.data.tickets?.length || 0);
      })
      .catch((error) => {
        console.error("Failed to load unassigned tickets:", error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, isStaff, priorityFilter, search, page, refreshKey]);

  const summary = useMemo(() => {
    const now = new Date();
    return {
      critical: tickets.filter((ticket) =>
        ["critical", "urgent"].includes(ticket.priority),
      ).length,
      high: tickets.filter((ticket) => ticket.priority === "high").length,
      overdue: tickets.filter(
        (ticket) =>
          ticket.sla_due_resolution &&
          new Date(ticket.sla_due_resolution) < now,
      ).length,
    };
  }, [tickets]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, total);

  const refreshQueue = () => setRefreshKey((key) => key + 1);

  const handleClaim = async (ticketId, event) => {
    event.stopPropagation();
    setAssigningId(ticketId);
    try {
      await api.patch(`/tickets/${ticketId}/triage`, {
        assigned_technician_id: user.id,
      });
      refreshQueue();
    } catch (error) {
      alert("Failed to claim ticket.");
    } finally {
      setAssigningId(null);
    }
  };

  const handleQuickAssign = async (ticketId, technicianId, event) => {
    event.stopPropagation();
    if (!technicianId) return;
    setAssigningId(ticketId);
    try {
      await api.patch(`/tickets/${ticketId}/triage`, {
        assigned_technician_id: technicianId,
      });
      refreshQueue();
    } catch (error) {
      alert("Failed to assign ticket.");
    } finally {
      setAssigningId(null);
    }
  };

  const choosePriority = (priority) => {
    setPriorityFilter(priority);
    setPage(1);
  };

  return (
    <main className="min-h-full bg-[#f4f7f5]">
      <section className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ndmu-green-700">
              Incoming requests
            </p>
            <h1 className="mt-1 font-display text-3xl font-medium tracking-[-0.035em] text-slate-900">
              Unassigned triage queue
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Review urgency, claim work, or route new requests to the right
              ICT-MIS technician.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refreshQueue}
              className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-ndmu-green-300 hover:text-ndmu-green-700"
              title="Refresh queue"
            >
              <span className="material-symbols-outlined text-[19px]">
                refresh
              </span>
            </button>
            <div className="inline-flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
              </span>
              <div>
                <p className="text-[9px] font-black uppercase tracking-wide text-rose-500">
                  Awaiting triage
                </p>
                <p className="text-lg font-black leading-none text-rose-700">
                  {loading ? "—" : total}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-4 p-4 sm:p-5 lg:p-6">
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <QueueMetric
            label="Visible requests"
            value={tickets.length}
            icon="inbox"
            tone="emerald"
            loading={loading}
          />
          <QueueMetric
            label="Critical / urgent"
            value={summary.critical}
            icon="emergency_home"
            tone="rose"
            loading={loading}
          />
          <QueueMetric
            label="High priority"
            value={summary.high}
            icon="arrow_upward"
            tone="amber"
            loading={loading}
          />
          <QueueMetric
            label="Overdue SLA"
            value={summary.overdue}
            icon="timer_off"
            tone="violet"
            loading={loading}
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[9px] font-black uppercase tracking-wide text-slate-400">
                Priority
              </span>
              {priorities.map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => choosePriority(priority)}
                  className={`rounded-lg px-3 py-2 text-[11px] font-bold capitalize transition ${priorityFilter === priority ? "bg-ndmu-green-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"}`}
                >
                  {priority === "all" ? "All priorities" : priority}
                </button>
              ))}
            </div>
            <div className="relative w-full xl:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
                search
              </span>
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Ticket number, requestor, or subject"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-xs outline-none transition focus:border-ndmu-green-500 focus:bg-white focus:ring-2 focus:ring-ndmu-green-100"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <span className="material-symbols-outlined text-[17px]">
                    close
                  </span>
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Ticket</th>
                  <th className="px-4 py-3">Requestor</th>
                  <th className="px-4 py-3">Request details</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">SLA target</th>
                  <th className="px-4 py-3 text-right">Quick allocation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <LoadingRows />
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center">
                      <span className="material-symbols-outlined text-4xl text-emerald-300">
                        inbox_customize
                      </span>
                      <p className="mt-2 text-sm font-bold text-slate-700">
                        The triage queue is clear
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        No unassigned requests match the current filters.
                      </p>
                      {(priorityFilter !== "all" || searchInput) && (
                        <button
                          type="button"
                          onClick={() => {
                            choosePriority("all");
                            setSearchInput("");
                          }}
                          className="mt-3 text-xs font-bold text-ndmu-green-700"
                        >
                          Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      onClick={() =>
                        navigate(`/tickets/${ticket.ticket_number}`)
                      }
                      className="cursor-pointer text-slate-600 transition hover:bg-emerald-50/40"
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <p className="font-black text-ndmu-green-800">
                          {ticket.ticket_number}
                        </p>
                        <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                          {ticket.ticket_type?.replace("_", " ")}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <p className="font-bold text-slate-900">
                          {ticket.requestor_name}
                        </p>
                        <p className="mt-1 max-w-[180px] truncate text-[10px] text-slate-400">
                          {ticket.requestor_department ||
                            ticket.requestor_email}
                        </p>
                      </td>
                      <td className="max-w-[300px] px-4 py-3">
                        <p className="truncate font-bold text-slate-800">
                          {ticket.title}
                        </p>
                        <p className="mt-1 truncate text-[10px] font-semibold text-ndmu-green-700">
                          {ticket.category_name || "General"}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <PriorityBadge priority={ticket.priority} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <SlaCountdown targetDate={ticket.sla_due_resolution} />
                      </td>
                      <td
                        className="whitespace-nowrap px-4 py-3 text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={(event) => handleClaim(ticket.id, event)}
                            disabled={assigningId === ticket.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-ndmu-green-700 px-3 py-2 text-[11px] font-bold text-white shadow-sm transition hover:bg-ndmu-green-800 disabled:cursor-wait disabled:opacity-60"
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              person_add
                            </span>
                            {assigningId === ticket.id
                              ? "Claiming…"
                              : "Claim for me"}
                          </button>
                          <select
                            defaultValue=""
                            disabled={assigningId === ticket.id}
                            onChange={(event) =>
                              handleQuickAssign(
                                ticket.id,
                                event.target.value,
                                event,
                              )
                            }
                            className="max-w-48 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-600 outline-none focus:border-ndmu-green-500 focus:ring-2 focus:ring-ndmu-green-100"
                          >
                            <option value="">Assign technician…</option>
                            {technicians.map((technician) => (
                              <option key={technician.id} value={technician.id}>
                                {technician.full_name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row">
            <p className="text-[11px] font-semibold text-slate-500">
              Showing{" "}
              <span className="font-black text-slate-700">
                {pageStart}–{pageEnd}
              </span>{" "}
              of <span className="font-black text-slate-700">{total}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-ndmu-green-300 hover:text-ndmu-green-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[15px]">
                  chevron_left
                </span>
                Previous
              </button>
              <span className="min-w-16 text-center text-[11px] font-bold text-slate-500">
                {page} / {pageCount}
              </span>
              <button
                type="button"
                disabled={page >= pageCount || loading}
                onClick={() =>
                  setPage((current) => Math.min(pageCount, current + 1))
                }
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-ndmu-green-300 hover:text-ndmu-green-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <span className="material-symbols-outlined text-[15px]">
                  chevron_right
                </span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

const metricTones = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
};

function QueueMetric({ label, value, icon, tone, loading }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900">
            {loading ? "—" : value}
          </p>
        </div>
        <span
          className={`grid h-9 w-9 place-items-center rounded-lg border ${metricTones[tone]}`}
        >
          <span className="material-symbols-outlined text-[19px]">{icon}</span>
        </span>
      </div>
    </div>
  );
}

function LoadingRows() {
  return [1, 2, 3, 4].map((row) => (
    <tr key={row}>
      {[1, 2, 3, 4, 5, 6].map((cell) => (
        <td key={cell} className="px-4 py-3">
          <div className="h-4 animate-pulse rounded bg-slate-100" />
        </td>
      ))}
    </tr>
  ));
}
