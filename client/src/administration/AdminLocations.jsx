import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Modal from "../components/Modal";
import ConfirmForm from "../components/ConfirmForm";

const blankLocation = { name: "", is_active: true };
const inputClass =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none transition focus:border-ndmu-green-600 focus:ring-4 focus:ring-ndmu-green-100";

export default function AdminLocations() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [modalLocation, setModalLocation] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadLocations = async () => {
    setLoading(true);
    try {
      const response = await api.get("/assets/locations/manage");
      setLocations(response.data.locations || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) return navigate("/login");
    if (user && isAdmin) loadLocations();
  }, [user, isAdmin, authLoading, navigate]);

  const visibleLocations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return locations.filter(
      (location) =>
        (!term || location.name.toLowerCase().includes(term)) &&
        (status === "all" ||
          (status === "active" ? Boolean(location.is_active) : !location.is_active)),
    );
  }, [locations, search, status]);
  const stats = useMemo(
    () => ({
      total: locations.length,
      active: locations.filter((location) => location.is_active).length,
      inactive: locations.filter((location) => !location.is_active).length,
    }),
    [locations],
  );

  const saveLocation = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (modalLocation.id)
        await api.patch(`/assets/locations/${modalLocation.id}`, modalLocation);
      else await api.post("/assets/locations", modalLocation);
      setModalLocation(null);
      await loadLocations();
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-full bg-[#f4f7f5]">
      <section className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ndmu-green-700">Service locations</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Locations</h1>
            <p className="mt-1 text-xs text-slate-500">Manage buildings, offices, rooms, and other locations available in requests and assets.</p>
          </div>
          <button type="button" onClick={() => setModalLocation({ ...blankLocation })} className="inline-flex w-fit items-center gap-2 rounded-xl bg-ndmu-green-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-ndmu-green-600">
            <span className="material-symbols-outlined text-lg">add_location_alt</span>Add location
          </button>
        </div>
      </section>
      <div className="space-y-5 p-4 sm:p-5 lg:p-6">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Total locations" value={stats.total} icon="location_on" tone="slate" />
          <Stat label="Active locations" value={stats.active} icon="verified" tone="emerald" />
          <Stat label="Inactive locations" value={stats.inactive} icon="location_off" tone="rose" />
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              {["active", "inactive", "all"].map((value) => <button key={value} type="button" onClick={() => setStatus(value)} className={`rounded-md px-3 py-2 text-[11px] font-bold capitalize ${status === value ? "bg-white text-ndmu-green-800 shadow-sm" : "text-slate-500"}`}>{value}</button>)}
            </div>
            <div className="relative w-full sm:w-80"><span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">search</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search locations" className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-ndmu-green-500" /></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] table-fixed text-left text-xs"><colgroup><col className="w-[12%]" /><col className="w-[58%]" /><col className="w-[15%]" /><col className="w-[15%]" /></colgroup><thead className="bg-slate-50 text-[9px] font-black uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">#</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan="4" className="px-5 py-12 text-center text-slate-400">Loading locations…</td></tr> : visibleLocations.length ? visibleLocations.map((location, index) => <tr key={location.id} className="transition hover:bg-emerald-50/30"><td className="px-5 py-3 font-bold text-slate-400">{index + 1}</td><td className="px-4 py-3"><p className="font-extrabold text-slate-900">{location.name}</p><p className="mt-0.5 text-[10px] text-slate-400">Available for assets and service requests</p></td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${location.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{location.is_active ? "Active" : "Inactive"}</span></td><td className="px-5 py-3 text-right"><button type="button" onClick={() => setModalLocation({ ...location, is_active: Boolean(location.is_active) })} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-ndmu-green-700 hover:bg-ndmu-green-50"><span className="material-symbols-outlined text-base">edit</span>Edit</button></td></tr>) : <tr><td colSpan="4" className="px-5 py-12 text-center text-slate-400">No matching locations.</td></tr>}
            </tbody></table>
          </div>
        </section>
      </div>
      <Modal isOpen={Boolean(modalLocation)} onClose={() => !saving && setModalLocation(null)} title={modalLocation?.id ? "Edit location" : "Add location"} maxWidth="max-w-lg">
        {modalLocation && <ConfirmForm onConfirm={saveLocation} title={modalLocation.id ? "Save location changes?" : "Add location?"} description="This location becomes available for both asset records and service requests." confirmLabel={modalLocation.id ? "Save changes" : "Add location"} className="space-y-5 text-xs"><label className="block font-semibold text-slate-700">Location name<input required value={modalLocation.name} onChange={(event) => setModalLocation({ ...modalLocation, name: event.target.value })} placeholder="e.g. CCS Building, Room 204" className={`${inputClass} mt-1.5`} /></label><label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3"><span><span className="block font-bold text-slate-800">Active status</span><span className="mt-0.5 block text-[11px] text-slate-500">Inactive locations remain in history but cannot be selected.</span></span><input type="checkbox" checked={Boolean(modalLocation.is_active)} onChange={(event) => setModalLocation({ ...modalLocation, is_active: event.target.checked })} className="h-5 w-5 accent-emerald-700" /></label><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setModalLocation(null)} className="rounded-xl bg-slate-100 px-4 py-2.5 font-bold text-slate-600">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-ndmu-green-700 px-5 py-2.5 font-bold text-white disabled:opacity-60">{saving ? "Saving…" : modalLocation.id ? "Save changes" : "Add location"}</button></div></ConfirmForm>}
      </Modal>
    </main>
  );
}

function Stat({ label, value, icon, tone }) {
  const tones = { slate: "bg-slate-100 text-slate-600", emerald: "bg-emerald-100 text-emerald-700", rose: "bg-rose-100 text-rose-700" };
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-2xl font-black text-slate-900">{value}</p></div><span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><span className="material-symbols-outlined text-xl">{icon}</span></span></div></div>;
}
