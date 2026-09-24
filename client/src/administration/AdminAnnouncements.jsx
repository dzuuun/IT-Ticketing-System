import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Modal from "../components/Modal";
import ConfirmForm from "../components/ConfirmForm";

const emptyAnnouncement = {
  title: "",
  content: "",
  severity: "info",
  expires_at: "",
  is_active: true,
};
const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-ndmu-green-600 focus:ring-4 focus:ring-ndmu-green-100";

export default function AdminAnnouncements() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get("/announcements/manage");
      setItems(response.data.announcements || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/login");
      return;
    }
    if (user && isAdmin) load();
  }, [user, isAdmin, authLoading, navigate]);
  const filtered = useMemo(
    () =>
      items.filter((item) =>
        `${item.title} ${item.content} ${item.severity}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [items, search],
  );
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (modal.id) await api.patch(`/announcements/${modal.id}`, modal);
      else await api.post("/announcements", modal);
      setModal(null);
      await load();
    } catch (error) {
      alert(error.response?.data?.message || "Unable to save announcement.");
    } finally {
      setSaving(false);
    }
  };
  const stats = {
    total: items.length,
    active: items.filter((item) => item.is_active).length,
    urgent: items.filter((item) => item.severity === "urgent" && item.is_active)
      .length,
  };
  return (
    <main className="min-h-full bg-[#f4f7f5]">
      <section className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-ndmu-green-700">
              Portal content
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Announcements
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Publish service notices and important ICT-MIS updates on the
              requestor portal.
            </p>
          </div>
          <button
            onClick={() => setModal({ ...emptyAnnouncement })}
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-ndmu-green-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-ndmu-green-600"
          >
            <span className="material-symbols-outlined text-lg">campaign</span>
            New announcement
          </button>
        </div>
      </section>
      <div className="space-y-5 p-4 sm:p-5 lg:p-6">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat
            label="All announcements"
            value={stats.total}
            icon="campaign"
            tone="slate"
          />
          <Stat
            label="Currently active"
            value={stats.active}
            icon="visibility"
            tone="emerald"
          />
          <Stat
            label="Urgent notices"
            value={stats.urgent}
            icon="priority_high"
            tone="rose"
          />
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="relative max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">
              search
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search announcements"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-ndmu-green-500 focus:ring-2 focus:ring-ndmu-green-100"
            />
          </div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-extrabold text-slate-900">
              Announcement directory
            </h2>
            <p className="mt-0.5 text-[10px] text-slate-400">
              {filtered.length} announcements
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              <p className="p-10 text-center text-xs text-slate-400">
                Loading announcements...
              </p>
            ) : (
              filtered.map((item) => (
                <article
                  key={item.id}
                  className="flex gap-4 p-5 transition hover:bg-emerald-50/30"
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.severity === "urgent" ? "bg-rose-100 text-rose-700" : item.severity === "warning" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}
                  >
                    <span className="material-symbols-outlined">
                      {item.severity === "urgent"
                        ? "priority_high"
                        : "campaign"}
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-extrabold text-slate-900">
                        {item.title}
                      </h3>
                      <Badge value={item.severity} />
                      <Status active={item.is_active} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                      {item.content}
                    </p>
                    <p className="mt-2 text-[10px] text-slate-400">
                      {item.expires_at
                        ? `Expires ${new Date(item.expires_at).toLocaleDateString()}`
                        : "No expiration date"}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setModal({
                        ...item,
                        expires_at: item.expires_at
                          ? String(item.expires_at).slice(0, 10)
                          : "",
                        is_active: Boolean(item.is_active),
                      })
                    }
                    className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11px] font-bold text-ndmu-green-700 hover:bg-ndmu-green-50"
                  >
                    <span className="material-symbols-outlined text-base">
                      edit
                    </span>
                    Edit
                  </button>
                </article>
              ))
            )}
            {!loading && !filtered.length && (
              <p className="p-12 text-center text-xs text-slate-400">
                No announcements found.
              </p>
            )}
          </div>
        </section>
      </div>
      <Modal
        isOpen={Boolean(modal)}
        onClose={() => !saving && setModal(null)}
        title={modal?.id ? "Edit announcement" : "Publish announcement"}
        maxWidth="max-w-2xl"
      >
        {modal && (
          <ConfirmForm
            onConfirm={save}
            title={
              modal.id ? "Save announcement changes?" : "Publish announcement?"
            }
            description={
              modal.id
                ? "Apply these announcement changes now."
                : "Publish this announcement to the service desk."
            }
            confirmLabel={modal.id ? "Save changes" : "Publish announcement"}
            className="space-y-4 text-xs"
          >
            <Label label="Announcement title" required>
              <input
                required
                value={modal.title}
                onChange={(event) =>
                  setModal({ ...modal, title: event.target.value })
                }
                className={inputClass}
              />
            </Label>
            <Label label="Message" required>
              <textarea
                required
                rows="5"
                value={modal.content}
                onChange={(event) =>
                  setModal({ ...modal, content: event.target.value })
                }
                className={inputClass}
              />
            </Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Label label="Notice level">
                <select
                  value={modal.severity}
                  onChange={(event) =>
                    setModal({ ...modal, severity: event.target.value })
                  }
                  className={inputClass}
                >
                  <option value="info">Information</option>
                  <option value="warning">Warning</option>
                  <option value="urgent">Urgent</option>
                </select>
              </Label>
              <Label label="Expiration date (optional)">
                <input
                  type="date"
                  value={modal.expires_at || ""}
                  onChange={(event) =>
                    setModal({ ...modal, expires_at: event.target.value })
                  }
                  className={inputClass}
                />
              </Label>
            </div>
            <Toggle
              active={modal.is_active}
              onChange={(is_active) => setModal({ ...modal, is_active })}
            />
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-xl bg-slate-100 px-4 py-2.5 font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-ndmu-green-700 px-5 py-2.5 font-bold text-white disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">
                  {saving ? "progress_activity" : "publish"}
                </span>
                {saving
                  ? "Saving..."
                  : modal.id
                    ? "Save changes"
                    : "Publish announcement"}
              </button>
            </div>
          </ConfirmForm>
        )}
      </Modal>
    </main>
  );
}
function Stat({ label, value, icon, tone }) {
  const colors = {
    slate: "border-slate-200 bg-slate-100 text-slate-600",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
        </div>
        <span
          className={`grid h-10 w-10 place-items-center rounded-xl border ${colors[tone]}`}
        >
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </span>
      </div>
    </div>
  );
}
function Badge({ value }) {
  return (
    <span
      className={`rounded-md px-2 py-1 text-[9px] font-extrabold uppercase ${value === "urgent" ? "bg-rose-100 text-rose-700" : value === "warning" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}
    >
      {value}
    </span>
  );
}
function Status({ active }) {
  return (
    <span
      className={`text-[10px] font-bold ${active ? "text-emerald-700" : "text-slate-400"}`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}
function Label({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-bold text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}
function Toggle({ active, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <p className="font-extrabold text-slate-800">Active status</p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Inactive announcements remain available for editing but are hidden
          from the portal.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        onClick={() => onChange(!active)}
        className={`relative h-7 w-12 rounded-full ${active ? "bg-ndmu-green-700" : "bg-slate-300"}`}
      >
        <span
          className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition ${active ? "translate-x-5" : ""}`}
        />
      </button>
    </div>
  );
}
