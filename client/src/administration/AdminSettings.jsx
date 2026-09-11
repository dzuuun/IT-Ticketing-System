import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import ConfirmForm from "../components/ConfirmForm";

const defaults = {
  sla_critical_hours: "4",
  sla_high_hours: "12",
  sla_medium_hours: "24",
  sla_low_hours: "72",
  auto_close_days: "3",
  school_name: "Notre Dame of Marbel University",
  mis_email: "mis@ndmu.edu.ph",
};
const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-ndmu-green-600 focus:ring-4 focus:ring-ndmu-green-100";

export default function AdminSettings() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/login");
      return;
    }
    if (!user || !isAdmin) return;
    api
      .get("/settings")
      .then((response) => {
        setSettings({ ...defaults, ...(response.data.settings || {}) });
        setEmailNotifications(response.data.email_notifications || null);
      })
      .catch(() =>
        setError(
          "Settings could not be loaded. You can retry or save a new configuration.",
        ),
      )
      .finally(() => setLoading(false));
  }, [user, isAdmin, authLoading, navigate]);
  const update = (key, value) => setSettings({ ...settings, [key]: value });
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.put("/settings", settings);
      setNotice("Configuration saved successfully.");
      setTimeout(() => setNotice(""), 3500);
    } catch {
      setError("Unable to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  const slaCards = [
    {
      key: "sla_critical_hours",
      label: "Critical",
      hint: "Campus-wide outage or major system failure",
      icon: "priority_high",
      tone: "rose",
    },
    {
      key: "sla_high_hours",
      label: "High",
      hint: "Department disruption or access-point failure",
      icon: "arrow_upward",
      tone: "amber",
    },
    {
      key: "sla_medium_hours",
      label: "Normal",
      hint: "Account provisioning and standard support",
      icon: "remove",
      tone: "blue",
    },
    {
      key: "sla_low_hours",
      label: "Low",
      hint: "General inquiry or planned software request",
      icon: "arrow_downward",
      tone: "slate",
    },
  ];

  return (
    <main className="min-h-full bg-[#f4f7f5]">
      <section className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ndmu-green-700">
              Administration module
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              System settings and SLA
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Configure service targets, ticket lifecycle rules, and
              institutional details.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSettings(defaults)}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-ndmu-green-400 hover:text-ndmu-green-700"
          >
            <span className="material-symbols-outlined text-lg">
              restart_alt
            </span>
            Restore defaults
          </button>
        </div>
      </section>
      <ConfirmForm
        onConfirm={save}
        title="Save system settings?"
        description="Apply these service desk configuration changes."
        confirmLabel="Save settings"
        className="space-y-5 p-4 sm:p-5 lg:p-6"
      >
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Stat
            icon="schedule"
            label="Critical target"
            value={`${settings.sla_critical_hours || "–"}h`}
            tone="rose"
          />
          <Stat
            icon="timer"
            label="Normal target"
            value={`${settings.sla_medium_hours || "–"}h`}
            tone="blue"
          />
          <Stat
            icon="event_available"
            label="Auto-close"
            value={`${settings.auto_close_days || "–"}d`}
            tone="emerald"
          />
          <Stat icon="domain" label="Institution" value="NDMU" tone="violet" />
        </section>
        {notice && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
            <span className="material-symbols-outlined text-lg">
              check_circle
            </span>
            {notice}
          </div>
        )}
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="shrink-0 underline"
            >
              Retry
            </button>
          </div>
        )}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-ndmu-green-700">
                schedule
              </span>
              <h2 className="text-sm font-extrabold text-slate-900">
                SLA resolution targets
              </h2>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Set the maximum time to resolve each priority level. Values are
              measured in hours.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
            {slaCards.map((item) => (
              <SlaField
                key={item.key}
                item={item}
                value={settings[item.key]}
                onChange={(value) => update(item.key, value)}
                disabled={loading}
              />
            ))}
          </div>
        </section>
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-ndmu-green-700">
                  autorenew
                </span>
                <h2 className="text-sm font-extrabold text-slate-900">
                  Ticket lifecycle
                </h2>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Control how long resolved tickets remain open for requestor
                confirmation.
              </p>
            </div>
            <div className="p-5">
              <Label label="Auto-close resolved tickets after">
                <div className="relative max-w-xs">
                  <input
                    type="number"
                    min="1"
                    required
                    disabled={loading}
                    value={settings.auto_close_days}
                    onChange={(event) =>
                      update("auto_close_days", event.target.value)
                    }
                    className={`${inputClass} pr-14`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    days
                  </span>
                </div>
              </Label>
              <p className="mt-3 rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-500">
                A resolved ticket is automatically closed when the requestor
                does not reopen or dispute it within this period.
              </p>
            </div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-ndmu-green-700">
                  account_balance
                </span>
                <h2 className="text-sm font-extrabold text-slate-900">
                  Institution information
                </h2>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Used in ICT-MIS portal branding and outbound service
                communication.
              </p>
            </div>
            <div className="space-y-4 p-5">
              <Label label="Institution name">
                <input
                  required
                  disabled={loading}
                  value={settings.school_name}
                  onChange={(event) =>
                    update("school_name", event.target.value)
                  }
                  className={inputClass}
                />
              </Label>
              <Label label="Official ICT-MIS contact email">
                <input
                  required
                  type="email"
                  disabled={loading}
                  value={settings.mis_email}
                  onChange={(event) => update("mis_email", event.target.value)}
                  className={inputClass}
                />
              </Label>
            </div>
          </section>
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-ndmu-green-700">
                  outgoing_mail
                </span>
                <h2 className="text-sm font-extrabold text-slate-900">
                  Ticket email notifications
                </h2>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Notifications are sent for ticket creation, assignment, public
                replies, status changes, and resolutions. Internal notes are
                never emailed.
              </p>
            </div>
            <EmailStatus status={emailNotifications} />
          </div>
          <div className="grid gap-4 p-5 text-xs sm:grid-cols-3">
            <InfoBlock
              label="Delivery"
              value={
                emailNotifications?.enabled
                  ? "Enabled"
                  : "Disabled by environment"
              }
            />
            <InfoBlock
              label="SMTP server"
              value={emailNotifications?.host || "Not configured"}
            />
            <InfoBlock
              label="Sender address"
              value={emailNotifications?.from || "Not configured"}
            />
          </div>
          <div className="mx-5 mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] leading-5 text-amber-900">
            Configure SMTP securely in the server&apos;s <code>.env</code> file:
            <code className="ml-1 font-bold">EMAIL_NOTIFICATIONS_ENABLED</code>,
            <code className="ml-1 font-bold">SMTP_HOST</code>,
            <code className="ml-1 font-bold">SMTP_PORT</code>,
            <code className="ml-1 font-bold">SMTP_USER</code>,
            <code className="ml-1 font-bold">SMTP_PASS</code>, and
            <code className="ml-1 font-bold">SMTP_FROM</code>. Restart the API
            after changing them. Credentials are intentionally not stored in
            system settings.
          </div>
        </section>
        <div className="flex justify-end border-t border-slate-200 pt-5">
          <button
            type="submit"
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-ndmu-green-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-ndmu-green-600 disabled:opacity-50"
          >
            <span
              className={`material-symbols-outlined text-base ${saving ? "animate-spin" : ""}`}
            >
              {saving ? "progress_activity" : "save"}
            </span>
            {saving ? "Saving configuration..." : "Save all configuration"}
          </button>
        </div>
      </ConfirmForm>
    </main>
  );
}
function EmailStatus({ status }) {
  const ready = status?.enabled && status?.configured;
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide ${ready ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
    >
      <span className="material-symbols-outlined text-sm">
        {ready ? "check_circle" : "info"}
      </span>
      {ready ? "SMTP ready" : "Configuration required"}
    </span>
  );
}
function InfoBlock({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
      <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate font-bold text-slate-800" title={value}>
        {value}
      </p>
    </div>
  );
}
function SlaField({ item, value, onChange, disabled }) {
  const tones = {
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="flex items-center justify-between">
        <span
          className={`grid h-8 w-8 place-items-center rounded-lg border ${tones[item.tone]}`}
        >
          <span className="material-symbols-outlined text-base">
            {item.icon}
          </span>
        </span>
        <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">
          {item.label}
        </span>
      </div>
      <div className="relative mt-3">
        <input
          type="number"
          min="1"
          required
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${inputClass} pr-14 font-black text-slate-900`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
          hours
        </span>
      </div>
      <p className="mt-2 min-h-8 text-[10px] leading-4 text-slate-500">
        {item.hint}
      </p>
    </div>
  );
}
function Stat({ label, value, icon, tone }) {
  const tones = {
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
        </div>
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${tones[tone]}`}
        >
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </span>
      </div>
    </div>
  );
}
function Label({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}
