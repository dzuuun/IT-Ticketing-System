import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import SlaCountdown from "../components/SlaCountdown";

const PAGE_SIZE = 10;
const statusOptions = [
  { value: "all", label: "All requests" },
  { value: "new", label: "New" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In progress" },
  { value: "pending_user", label: "Needs my reply" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const formatDate = (value) =>
  new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));

export default function MyTickets() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [overviewTickets, setOverviewTickets] = useState([]);
  const [overviewTotal, setOverviewTotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    api
      .get("/tickets", { params: { requested_by: "me", limit: 500 } })
      .then((response) => {
        if (!active || !response.data.success) return;
        setOverviewTickets(response.data.tickets || []);
        setOverviewTotal(response.data.total || 0);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setLoadError("");
    api
      .get("/tickets", {
        params: {
          requested_by: "me",
          status: statusFilter !== "all" ? statusFilter : undefined,
          search: search || undefined,
          page,
          limit: PAGE_SIZE,
        },
      })
      .then((response) => {
        if (!active || !response.data.success) return;
        setTickets(response.data.tickets || []);
        setTotal(response.data.total || 0);
      })
      .catch(() => {
        if (active)
          setLoadError("Your requests could not be loaded. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, statusFilter, search, page, reloadKey]);

  const summary = useMemo(
    () => ({
      active: overviewTickets.filter(
        (ticket) => !["resolved", "closed"].includes(ticket.status),
      ).length,
      pending: overviewTickets.filter(
        (ticket) => ticket.status === "pending_user",
      ).length,
      resolved: overviewTickets.filter((ticket) =>
        ["resolved", "closed"].includes(ticket.status),
      ).length,
    }),
    [overviewTickets],
  );

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageStart = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const pageEnd = Math.min(page * PAGE_SIZE, total);

  const chooseStatus = (status) => {
    setStatusFilter(status);
    setPage(1);
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  return (
    <main className="min-h-full bg-[#f4f7f5]">
      <section className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ndmu-green-700">
              Requestor portal
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              My service requests
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Follow updates, reply to ICT-MIS, and review your previous support
              requests.
            </p>
          </div>
          <Link
            to="/submit"
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-ndmu-green-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-ndmu-green-600 hover:shadow-md"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            New request
          </Link>
        </div>
      </section>

      <div className="space-y-5 p-4 sm:p-5 lg:p-6">
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <SummaryCard
            label="Total requests"
            value={overviewTotal}
            icon="confirmation_number"
            tone="emerald"
          />
          <SummaryCard
            label="Active"
            value={summary.active}
            icon="pending_actions"
            tone="blue"
          />
          <SummaryCard
            label="Needs my reply"
            value={summary.pending}
            icon="mark_chat_unread"
            tone="amber"
            highlight={summary.pending > 0}
          />
          <SummaryCard
            label="Completed"
            value={summary.resolved}
            icon="task_alt"
            tone="slate"
          />
        </section>

        {summary.pending > 0 && (
          <button
            type="button"
            onClick={() => chooseStatus("pending_user")}
            className="flex w-full items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left transition hover:border-amber-300"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-100 text-amber-700">
                <span className="material-symbols-outlined text-xl">
                  notification_important
                </span>
              </span>
              <span>
                <span className="block text-xs font-extrabold text-amber-900">
                  ICT-MIS is waiting for your response
                </span>
                <span className="mt-0.5 block text-[11px] text-amber-700">
                  Open{" "}
                  {summary.pending === 1
                    ? "the request"
                    : `${summary.pending} requests`}{" "}
                  to provide the requested information.
                </span>
              </span>
            </span>
            <span className="material-symbols-outlined text-lg text-amber-700">
              arrow_forward
            </span>
          </button>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1">
              {statusOptions.map((status) => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => chooseStatus(status.value)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold transition ${statusFilter === status.value ? "bg-ndmu-green-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"}`}
                >
                  {status.label}
                </button>
              ))}
            </div>
            <div className="relative w-full xl:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">
                search
              </span>
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search ticket number or subject"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-xs outline-none transition focus:border-ndmu-green-500 focus:bg-white focus:ring-2 focus:ring-ndmu-green-100"
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

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                {
                  statusOptions.find((status) => status.value === statusFilter)
                    ?.label
                }
              </h2>
              <p className="mt-0.5 text-[10px] text-slate-400">
                {loading
                  ? "Loading requests..."
                  : `${total} matching ${total === 1 ? "request" : "requests"}`}
              </p>
            </div>
            {(statusFilter !== "all" || search) && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-[11px] font-bold text-ndmu-green-700 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="divide-y divide-slate-100">
              {[1, 2, 3, 4].map((item) => (
                <TicketSkeleton key={item} />
              ))}
            </div>
          ) : loadError ? (
            <div className="px-6 py-14 text-center">
              <span className="material-symbols-outlined text-4xl text-rose-300">
                cloud_off
              </span>
              <h3 className="mt-2 text-sm font-extrabold text-slate-700">
                {loadError}
              </h3>
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                className="mt-3 text-xs font-bold text-ndmu-green-700"
              >
                Try again
              </button>
            </div>
          ) : tickets.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300">
                inbox
              </span>
              <h3 className="mt-2 text-sm font-extrabold text-slate-700">
                No requests found
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                {statusFilter !== "all" || search
                  ? "No requests match the selected filters."
                  : "You have not submitted a service request yet."}
              </p>
              {statusFilter !== "all" || search ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 text-xs font-bold text-ndmu-green-700"
                >
                  Clear filters
                </button>
              ) : (
                <Link
                  to="/submit"
                  className="mt-4 inline-flex rounded-lg bg-ndmu-green-700 px-4 py-2 text-xs font-bold text-white"
                >
                  Submit your first request
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tickets.map((ticket) => (
                <RequestRow key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}

          {!loading && !loadError && total > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-3 sm:flex-row">
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
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:border-ndmu-green-300 hover:text-ndmu-green-700 disabled:cursor-not-allowed disabled:opacity-40"
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
                  disabled={page >= pageCount}
                  onClick={() =>
                    setPage((current) => Math.min(pageCount, current + 1))
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:border-ndmu-green-300 hover:text-ndmu-green-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <span className="material-symbols-outlined text-[15px]">
                    chevron_right
                  </span>
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const tones = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  slate: "border-slate-200 bg-slate-100 text-slate-600",
};

function SummaryCard({ label, value, icon, tone, highlight }) {
  return (
    <div
      className={`rounded-xl border bg-white p-3.5 shadow-sm ${highlight ? "border-amber-300 ring-2 ring-amber-100" : "border-slate-200"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
        </div>
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${tones[tone]}`}
        >
          <span className="material-symbols-outlined text-[19px]">{icon}</span>
        </span>
      </div>
    </div>
  );
}

function RequestRow({ ticket }) {
  const completed = ["resolved", "closed"].includes(ticket.status);
  const needsReply = ticket.status === "pending_user";
  return (
    <Link
      to={`/tickets/${ticket.ticket_number}`}
      className={`group block p-4 transition hover:bg-emerald-50/40 sm:px-5 ${needsReply ? "border-l-4 border-l-amber-400 bg-amber-50/30" : "border-l-4 border-l-transparent"}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-black text-ndmu-green-800">
              {ticket.ticket_number}
            </span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            {needsReply && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-extrabold text-amber-800">
                <span className="material-symbols-outlined text-xs">reply</span>
                Reply requested
              </span>
            )}
          </div>
          <h3 className="mt-2 truncate text-sm font-extrabold text-slate-900 transition group-hover:text-ndmu-green-800">
            {ticket.title}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-slate-400">
                category
              </span>
              {ticket.subcategory_name ||
                ticket.category_name ||
                "General support"}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-slate-400">
                calendar_today
              </span>
              Submitted {formatDate(ticket.created_at)}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-slate-400">
                engineering
              </span>
              {ticket.assigned_technician_name || "Awaiting assignment"}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-100 pt-3 lg:min-w-56 lg:justify-end lg:border-0 lg:pt-0">
          <SlaCountdown
            targetDate={ticket.sla_due_resolution}
            isCompleted={completed}
          />
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-500 transition group-hover:bg-ndmu-green-700 group-hover:text-white">
            <span className="material-symbols-outlined text-lg">
              arrow_forward
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}

function TicketSkeleton() {
  return (
    <div className="animate-pulse p-5">
      <div className="flex gap-2">
        <div className="h-5 w-28 rounded bg-slate-100" />
        <div className="h-5 w-20 rounded bg-slate-100" />
      </div>
      <div className="mt-3 h-4 w-2/3 rounded bg-slate-100" />
      <div className="mt-3 h-3 w-1/2 rounded bg-slate-100" />
    </div>
  );
}
