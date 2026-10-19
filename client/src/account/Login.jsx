import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import GoogleSignInButton from "../components/GoogleSignInButton";
import PasswordInput from "../components/PasswordInput";

export default function Login() {
  const { login, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isRegister) {
        await register({
          email,
          password,
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
          location_name: department,
        });
        navigate("/my-tickets");
      } else {
        const loggedUser = await login(email, password);
        if (
          loggedUser.role === "admin" ||
          loggedUser.role === "technician" ||
          loggedUser.role === "team_leader"
        ) {
          navigate("/staff/dashboard");
        } else {
          navigate("/my-tickets");
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Authentication failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    setLoading(true);
    setError("");
    try {
      const loggedUser = await loginWithGoogle(credential);
      navigate(
        ["admin", "technician", "team_leader"].includes(loggedUser.role)
          ? "/staff/dashboard"
          : "/my-tickets",
        { replace: true },
      );
    } catch (error) {
      setError(
        error.response?.data?.message || "Google sign-in could not be completed.",
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 py-12 bg-slate-100">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Card Header */}
        <div className="bg-ndmu-green-900 text-white p-6 text-center relative">
          <div className="w-12 h-12 rounded-2xl bg-ndmu-gold-400 text-slate-900 flex items-center justify-center font-bold text-xl mx-auto mb-2 shadow-md">
            <span className="material-symbols-outlined text-2xl font-bold">
              shield_person
            </span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">
            NDMU ICT-MIS Service Desk
          </h2>
          <p className="text-xs text-emerald-200/80 mt-0.5">
            Notre Dame of Marbel University
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError("");
            }}
            className={`flex-1 py-3 transition-colors ${!isRegister ? "bg-white text-ndmu-green-900 border-b-2 border-ndmu-green-700" : "text-slate-500 hover:text-slate-900"}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError("");
            }}
            className={`flex-1 py-3 transition-colors ${isRegister ? "bg-white text-ndmu-green-900 border-b-2 border-ndmu-green-700" : "text-slate-500 hover:text-slate-900"}`}
          >
            Create Requestor Account
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </div>
          )}

          {/* Google Sign In Button */}
          {!isRegister && (
            <div>
              <GoogleSignInButton
                onCredential={handleGoogleCredential}
                disabled={loading}
              />
              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <span className="relative px-3 bg-white text-[11px] text-slate-400 font-semibold uppercase">
                  Or with credentials
                </span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {isRegister && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-ndmu-green-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Middle Name{" "}
                    <span className="font-normal text-slate-400">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-ndmu-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-ndmu-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    College / Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. College of Computer Studies"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-ndmu-green-500 focus:outline-none"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="name@ndmu.edu.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-ndmu-green-500 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block font-semibold text-slate-700 mb-1"
              >
                Password
              </label>
              <PasswordInput
                key={isRegister ? "register" : "login"}
                id="login-password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-ndmu-green-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-ndmu-green-800 hover:bg-ndmu-green-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="material-symbols-outlined text-[18px] animate-spin">
                  refresh
                </span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">
                  login
                </span>
              )}
              {isRegister ? "Create Account" : "Sign In"}
            </button>
          </form>

          <div className="text-center pt-2">
            <Link
              to="/submit?guest=true"
              className="text-xs text-ndmu-green-700 font-semibold hover:underline"
            >
              Continue as Guest &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
