import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import SlaCountdown from "../components/SlaCountdown";

const PAGE_SIZE = 25;

const selectClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-ndmu-green-500 focus:ring-2 focus:ring-ndmu-green-100";

export default function StaffAllTickets() {
  const { user, isStaff } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(searchParams.get("status") || "all");
  const [priority, setPriority] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [ticketType, setTicketType] = useState("all");
  const [assignedTo, setAssignedTo] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

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
    Promise.all([api.get("/categories"), api.get("/users/technicians")])
      .then(([categoryResponse, technicianResponse]) => {
        if (!active) return;
        if (categoryResponse.data.success)
          setCategories(categoryResponse.data.categories || []);
        if (technicianResponse.data.success)
          setTechnicians(technicianResponse.data.technicians || []);
      })
      .catch((error) => console.error("Failed to load ticket filters:", error));
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
          status: status !== "all" ? status : undefined,
          priority: priority !== "all" ? priority : undefined,
          category_id: categoryId !== "all" ? categoryId : undefined,
          ticket_type: ticketType !== "all" ? ticketType : undefined,
          assigned_to: assignedTo !== "all" ? assignedTo : undefined,
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
        console.error("Failed to load tickets registry:", error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    user,
    isStaff,
    status,
    priority,
    categoryId,
    ticketType,
    assignedTo,
    search,
    page,
  ]);

  const activeFilterCount =
    [status, priority, categoryId, ticketType, assignedTo].filter(
      (value) => value !== "all",
    ).length + (search ? 1 : 0);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, total);
  const pageSummary = useMemo(
    () => ({
      unassigned: tickets.filter(
        (ticket) =>
          !ticket.assigned_technician_name && !ticket.assigned_team_name,
      ).length,
      urgent: tickets.filter((ticket) =>
        ["critical", "urgent"].includes(ticket.priority),
      ).length,
      overdue: tickets.filter(
        (ticket) =>
          ticket.sla_due_resolution &&
          new Date(ticket.sla_due_resolution) < new Date() &&
          !["resolved", "closed"].includes(ticket.status),
      ).length,
    }),
    [tickets],
  );

  const clearFilters = () => {
    setStatus("all");
    setPriority("all");
    setCategoryId("all");
    setTicketType("all");
    setAssignedTo("all");
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  const updateFilter = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  return (
    <main className="min-h-full bg-[#f4f7f5]">
      <section className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ndmu-green-700">
              Service operations
            </p>
            <h1 className="mt-1 font-display text-3xl font-medium tracking-[-0.035em] text-slate-900">
              Ticket registry
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Search, review, and manage every ICT-MIS request from one
              workspace.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-ndmu-green-100 text-ndmu-green-800">
              <span className="material-symbols-outlined text-[18px]">
                confirmation_number
              </span>
            </span>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                Matching records
              </p>
              <p className="text-lg font-black leading-none text-slate-900">
                {loading ? "—" : total}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-4 p-4 sm:p-5 lg:p-6">
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                  On this page
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900">
                  {loading ? "—" : tickets.length}
                </p>
              </div>
              <span className="material-symbols-outlined text-2xl text-ndmu-green-600">
                view_list
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setAssignedTo("unassigned");
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-emerald-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                  Unassigned shown
                </p>
                <p className="mt-1 text-2xl font-black text-emerald-700">
                  {loading ? "—" : pageSummary.unassigned}
                </p>
              </div>
              <span className="material-symbols-outlined text-2xl text-emerald-600">
                move_to_inbox
              </span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              setPriority("urgent");
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-rose-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                  Urgent or overdue shown
                </p>
                <p className="mt-1 text-2xl font-black text-rose-600">
                  {loading ? "—" : pageSummary.urgent + pageSummary.overdue}
                </p>
              </div>
              <span className="material-symbols-outlined text-2xl text-rose-500">
                priority_high
              </span>
            </div>
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="ticket-search"
                className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-400"
              >
                Search registry
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[19px] text-slate-400">
                  search
                </span>
                <input
                  id="ticket-search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Ticket number, requestor, email, or subject"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-9 text-xs outline-none transition focus:border-ndmu-green-500 focus:bg-white focus:ring-2 focus:ring-ndmu-green-100"
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
            <div className="grid flex-[2] grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
              <Filter
                label="Status"
                value={status}
                onChange={updateFilter(setStatus)}
              >
                <option value="all">All statuses</option>
                <option value="new">New</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In progress</option>
                <option value="pending_user">Pending requestor</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </Filter>
              <Filter
                label="Priority"
                value={priority}
                onChange={updateFilter(setPriority)}
              >
                <option value="all">All priorities</option>
                <option value="critical">Critical</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Filter>
              <Filter
                label="Category"
                value={categoryId}
                onChange={updateFilter(setCategoryId)}
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Filter>
              <Filter
                label="Type"
                value={ticketType}
                onChange={updateFilter(setTicketType)}
              >
                <option value="all">All types</option>
                <option value="service_request">Service request</option>
                <option value="incident">Incident</option>
              </Filter>
              <Filter
                label="Assigned individual"
                value={assignedTo}
                onChange={updateFilter(setAssignedTo)}
              >
                <option value="all">All technicians</option>
                <option value="unassigned">Unassigned</option>
                {technicians.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {technician.full_name}
                  </option>
                ))}
              </Filter>
            </div>
          </div>
          {activeFilterCount > 0 && (
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <p className="text-[11px] font-semibold text-slate-500">
                <span className="mr-1.5 rounded-full bg-ndmu-green-100 px-2 py-0.5 font-black text-ndmu-green-800">
                  {activeFilterCount}
                </span>{" "}
                active {activeFilterCount === 1 ? "filter" : "filters"}
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="text-[11px] font-bold text-ndmu-green-700 hover:text-ndmu-green-900"
              >
                Reset all filters
              </button>
            </div>
          )}
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
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assignment</th>
                  <th className="px-4 py-3">SLA / Created</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <LoadingRows />
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-14 text-center">
                      <span className="material-symbols-outlined text-4xl text-slate-300">
                        search_off
                      </span>
                      <p className="mt-2 text-sm font-bold text-slate-700">
                        No tickets match these filters
                      </p>
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="mt-2 text-xs font-bold text-ndmu-green-700"
                      >
                        Clear filters
                      </button>
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
                      <td className="max-w-[280px] px-4 py-3">
                        <p className="truncate font-bold text-slate-800">
                          {ticket.title}
                        </p>
                        <p className="mt-1 truncate text-[10px] font-semibold text-ndmu-green-700">
                          {ticket.category_name || "Uncategorized"}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <PriorityBadge priority={ticket.priority} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {ticket.assigned_technician_name || ticket.assigned_team_name ? (
                          <span className="font-semibold text-slate-700">
                            {ticket.assigned_technician_name || ticket.assigned_team_name}
                          </span>
                        ) : (
                          <span className="rounded-md bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-600">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <SlaCountdown targetDate={ticket.sla_due_resolution} />
                        <p className="mt-1 text-[10px] text-slate-400">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-ndmu-green-50 text-ndmu-green-700 transition hover:bg-ndmu-green-700 hover:text-white">
                          <span className="material-symbols-outlined text-[17px]">
                            arrow_forward
                          </span>
                        </span>
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

function Filter({ label, children, ...props }) {
  return (
    <label>
      <span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <select className={selectClass} {...props}>
        {children}
      </select>
    </label>
  );
}

function LoadingRows() {
  return [1, 2, 3, 4, 5].map((row) => (
    <tr key={row}>
      {[1, 2, 3, 4, 5, 6, 7, 8].map((cell) => (
        <td key={cell} className="px-4 py-3">
          <div className="h-4 animate-pulse rounded bg-slate-100" />
        </td>
      ))}
    </tr>
  ));
}
