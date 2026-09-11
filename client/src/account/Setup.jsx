import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function Setup() {
  const { user, completeSetup } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/staff/dashboard", { replace: true });
      return;
    }
    axios
      .get("/auth/setup/status")
      .then(({ data }) => setAllowed(Boolean(data.setup_required)))
      .catch(() => setError("Unable to check setup status."))
      .finally(() => setReady(true));
  }, [user, navigate]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      await completeSetup(form);
      navigate("/staff/dashboard", { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to complete setup.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!ready)
    return (
      <div className="grid min-h-[calc(100vh-4rem)] place-items-center text-sm text-slate-500">
        Preparing secure setup…
      </div>
    );
  if (!allowed)
    return (
      <div className="grid min-h-[calc(100vh-4rem)] place-items-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Setup is already complete
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in with an administrator account to manage the service desk.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="mt-5 rounded-xl bg-ndmu-green-700 px-5 py-3 text-sm font-bold text-white"
          >
            Go to sign in
          </button>
        </div>
      </div>
    );
  return (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center bg-slate-100 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8"
      >
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ndmu-green-700">
          Initial configuration
        </p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">
          Create the first administrator
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          This one-time step creates the account that manages ICT-MIS Service
          Desk settings, users, and service records.
        </p>
        {error && (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            {error}
          </p>
        )}
        <div className="mt-6 space-y-3">
          {[
            ["first_name", "First name", true],
            ["middle_name", "Middle name", false],
            ["last_name", "Last name", true],
          ].map(([key, label, required]) => (
            <label key={key} className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">
                {label}
                {required && <span className="text-rose-500"> *</span>}
              </span>
              <input
                required={required}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ndmu-green-600 focus:ring-4 focus:ring-ndmu-green-100"
              />
            </label>
          ))}
        </div>
        <label className="mt-3 block">
          <span className="mb-1.5 block text-xs font-bold text-slate-700">
            Institutional email <span className="text-rose-500">*</span>
          </span>
          <input
            required
            type="email"
            placeholder="name@ndmu.edu.ph"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-ndmu-green-600 focus:ring-4 focus:ring-ndmu-green-100"
          />
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            ["password", "Password"],
            ["confirm_password", "Confirm password"],
          ].map(([key, label]) => (
            <label key={key}>
              <span className="mb-1.5 block text-xs font-bold text-slate-700">
                {label} <span className="text-rose-500">*</span>
              </span>
              <div className="relative">
                <input
                  required
                  minLength="8"
                  type={showPasswords ? "text" : "password"}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 pr-11 text-sm outline-none focus:border-ndmu-green-600 focus:ring-4 focus:ring-ndmu-green-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((visible) => !visible)}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-slate-400 hover:text-ndmu-green-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ndmu-green-600"
                  aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
                  aria-pressed={showPasswords}
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPasswords ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </label>
          ))}
        </div>
        <button
          disabled={saving}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ndmu-green-700 text-sm font-bold text-white shadow-sm transition hover:bg-ndmu-green-600 disabled:opacity-60"
        >
          {saving ? "Creating administrator…" : "Complete setup"}
        </button>
      </form>
    </main>
  );
}
