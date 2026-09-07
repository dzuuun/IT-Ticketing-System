import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function AdminSettings() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Settings State
  const [criticalSla, setCriticalSla] = useState('4');
  const [highSla, setHighSla] = useState('12');
  const [mediumSla, setMediumSla] = useState('24');
  const [lowSla, setLowSla] = useState('72');
  const [autoCloseDays, setAutoCloseDays] = useState('3');
  const [schoolName, setSchoolName] = useState('Notre Dame of Marbel University');
  const [misEmail, setMisEmail] = useState('mis@ndmu.edu.ph');
  const [saved, setSaved] = useState(false);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await api.put('/settings', { sla_critical_hours: criticalSla, sla_high_hours: highSla, sla_medium_hours: mediumSla, sla_low_hours: lowSla, auto_close_days: autoCloseDays, school_name: schoolName, mis_email: misEmail });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch { alert('Unable to save settings.'); }
  };

  if (!user || !isAdmin) {
    navigate('/login');
    return null;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
      <main className="flex-1 bg-slate-50 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Settings & SLA Policies</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure institutional settings, SLA resolution deadlines, and auto-close thresholds
          </p>
        </div>

        {saved && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            Settings saved successfully!
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-3xl">
          {/* Section 1: SLA Resolution Deadlines */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="material-symbols-outlined text-ndmu-green-700 text-xl">schedule</span>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                SLA Target Resolution Policies (Hours)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-rose-700 mb-1">
                  Critical Priority Incident SLA (Hours)
                </label>
                <input
                  type="number"
                  value={criticalSla}
                  onChange={(e) => setCriticalSla(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-ndmu-green-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400">Campus-wide outages, Schoology/EIS crash</span>
              </div>

              <div>
                <label className="block font-semibold text-orange-700 mb-1">
                  High Priority SLA (Hours)
                </label>
                <input
                  type="number"
                  value={highSla}
                  onChange={(e) => setHighSla(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-ndmu-green-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400">Department offline, Wi-Fi access point down</span>
              </div>

              <div>
                <label className="block font-semibold text-blue-700 mb-1">
                  Medium / Normal Priority SLA (Hours)
                </label>
                <input
                  type="number"
                  value={mediumSla}
                  onChange={(e) => setMediumSla(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-ndmu-green-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400">Account provisioning, printer setup</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Low Priority Request SLA (Hours)
                </label>
                <input
                  type="number"
                  value={lowSla}
                  onChange={(e) => setLowSla(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-ndmu-green-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400">General inquiry, software install</span>
              </div>
            </div>
          </div>

          {/* Section 2: Ticket Auto-Close & Lifecycle */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="material-symbols-outlined text-ndmu-green-700 text-xl">auto_mode</span>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Resolution & Auto-Close Threshold
              </h2>
            </div>

            <div className="text-xs space-y-2">
              <label className="block font-semibold text-slate-700">
                Auto-Close Resolved Tickets After (Days)
              </label>
              <input
                type="number"
                value={autoCloseDays}
                onChange={(e) => setAutoCloseDays(e.target.value)}
                className="w-48 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-ndmu-green-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400">
                When a technician marks a ticket as resolved, the system will automatically close it after this number of days if the requestor does not reopen or dispute it.
              </p>
            </div>
          </div>

          {/* Section 3: Institution Info */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="material-symbols-outlined text-ndmu-green-700 text-xl">account_balance</span>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Institution Information
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Institution Name</label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official ICT-MIS Contact Email</label>
                <input
                  type="email"
                  value={misEmail}
                  onChange={(e) => setMisEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="px-6 py-2.5 bg-ndmu-green-800 hover:bg-ndmu-green-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              Save All Configuration
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
