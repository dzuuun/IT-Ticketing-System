import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, register, loginWithGoogle, completeGoogleLogin } = useAuth();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        await register({
          email,
          password,
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
          department_name: department,
          phone,
        });
        navigate('/my-tickets');
      } else {
        const loggedUser = await login(email, password);
        if (loggedUser.role === 'admin' || loggedUser.role === 'technician' || loggedUser.role === 'team_leader') {
          navigate('/staff/dashboard');
        } else {
          navigate('/my-tickets');
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setLoading(true);
    setError('');
    try {
      const loggedUser = await login(demoEmail, demoPassword);
      if (loggedUser.role === 'admin' || loggedUser.role === 'technician' || loggedUser.role === 'team_leader') {
        navigate('/staff/dashboard');
      } else {
        navigate('/my-tickets');
      }
    } catch (err) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('access_token');
    if (!token) return;
    completeGoogleLogin(token).then(() => navigate('/my-tickets', { replace: true })).catch(() => setError('Google sign-in could not be completed.'));
  }, [completeGoogleLogin, navigate]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 py-12 bg-slate-100">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Card Header */}
        <div className="bg-ndmu-green-900 text-white p-6 text-center relative">
          <div className="w-12 h-12 rounded-2xl bg-ndmu-gold-400 text-slate-900 flex items-center justify-center font-bold text-xl mx-auto mb-2 shadow-md">
            <span className="material-symbols-outlined text-2xl font-bold">shield_person</span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">NDMU ICT-MIS Service Desk</h2>
          <p className="text-xs text-emerald-200/80 mt-0.5">Notre Dame of Marbel University</p>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            className={`flex-1 py-3 transition-colors ${!isRegister ? 'bg-white text-ndmu-green-900 border-b-2 border-ndmu-green-700' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            className={`flex-1 py-3 transition-colors ${isRegister ? 'bg-white text-ndmu-green-900 border-b-2 border-ndmu-green-700' : 'text-slate-500 hover:text-slate-900'}`}
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
              <button
                type="button"
                onClick={loginWithGoogle}
                className="w-full py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 shadow-sm flex items-center justify-center gap-3 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Sign in with NDMU Google Account
              </button>
              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                <span className="relative px-3 bg-white text-[11px] text-slate-400 font-semibold uppercase">Or with credentials</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {isRegister && (
              <>
                <div className="grid grid-cols-2 gap-3"><div><label className="block font-semibold text-slate-700 mb-1">Last Name</label><input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-ndmu-green-500 focus:outline-none" /></div><div><label className="block font-semibold text-slate-700 mb-1">First Name</label><input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-ndmu-green-500 focus:outline-none" /></div></div>
                <div><label className="block font-semibold text-slate-700 mb-1">Middle Name <span className="font-normal text-slate-400">(optional)</span></label><input type="text" value={middleName} onChange={(e) => setMiddleName(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-ndmu-green-500 focus:outline-none" /></div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">College / Department</label>
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
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
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
              <label className="block font-semibold text-slate-700 mb-1">Password</label>
              <input
                type="password"
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
                <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">login</span>
              )}
              {isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          {!isRegister && (
            <div className="pt-4 border-t border-slate-100">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Quick Demo Role Switcher:
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleDemoLogin('admin@ndmu.edu.ph', 'admin123')}
                  className="px-2 py-1.5 bg-purple-50 text-purple-900 border border-purple-200 rounded-lg font-semibold hover:bg-purple-100 text-left truncate"
                >
                  👑 Admin (ICT-MIS Director)
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin('lead.network@ndmu.edu.ph', 'lead123')}
                  className="px-2 py-1.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg font-semibold hover:bg-amber-100 text-left truncate"
                >
                  ⚡ Team Leader
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin('tech1@ndmu.edu.ph', 'tech123')}
                  className="px-2 py-1.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-lg font-semibold hover:bg-blue-100 text-left truncate"
                >
                  🛠️ Technician 1
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin('faculty@ndmu.edu.ph', 'user123')}
                  className="px-2 py-1.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-lg font-semibold hover:bg-emerald-100 text-left truncate"
                >
                  🎓 Faculty Requestor
                </button>
              </div>
            </div>
          )}

          <div className="text-center pt-2">
            <Link to="/submit?guest=true" className="text-xs text-ndmu-green-700 font-semibold hover:underline">
              Continue as Guest &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
