import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { getAccessToken, setAccessToken, setStoredUser } from "../services/api";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-ndmu-green-600 focus:ring-4 focus:ring-ndmu-green-100";

export default function UpdatePassword() {
  const { user, loading } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (newPassword !== confirmPassword) {
      setError("Your new password and confirmation do not match.");
      return;
    }
    setSaving(true);
    try {
      const response = await axios.post(
        "/auth/change-password",
        {
          current_password: currentPassword,
          new_password: newPassword,
        },
        { headers: { Authorization: `Bearer ${getAccessToken()}` } },
      );
      if (response.data.accessToken) {
        const persistent = Boolean(localStorage.getItem("ndmu_access_token"));
        setAccessToken(response.data.accessToken, persistent);
        if (response.data.user) setStoredUser(response.data.user, persistent);
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice(response.data.message || "Password updated successfully.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to update your password. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-full bg-[#f4f7f5] p-4 sm:p-6 lg:p-8">
      <section className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-ndmu-green-950 px-5 py-6 text-white sm:px-7">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ndmu-gold-300">
            Account security
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">
            Update password
          </h1>
          <p className="mt-2 text-xs leading-5 text-emerald-100/75">
            Update the password for {user.email}. You will remain signed in on
            this device; other refresh sessions are revoked.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-5 p-5 sm:p-7">
          {notice && (
            <div className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs font-semibold text-emerald-800">
              <span className="material-symbols-outlined text-base">
                check_circle
              </span>
              {notice}
            </div>
          )}
          {error && (
            <div className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs font-semibold text-rose-800">
              <span className="material-symbols-outlined text-base">error</span>
              {error}
            </div>
          )}
          <Field label="Current password">
            <input
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="New password" hint="Use at least 8 characters.">
            <input
              type="password"
              autoComplete="new-password"
              minLength="8"
              required
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Confirm new password">
            <input
              type="password"
              autoComplete="new-password"
              minLength="8"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="rounded-xl bg-slate-50 p-3.5 text-[11px] leading-5 text-slate-500">
            Never share your password. ICT-MIS staff will not ask for it in a
            ticket or email.
          </div>
          <div className="flex justify-end border-t border-slate-100 pt-5">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-ndmu-green-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-ndmu-green-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span
                className={`material-symbols-outlined text-base ${saving ? "animate-spin" : ""}`}
              >
                {saving ? "progress_activity" : "key"}
              </span>
              {saving ? "Updating password..." : "Update password"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-slate-700">{label}</span>
      {hint && (
        <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>
      )}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
