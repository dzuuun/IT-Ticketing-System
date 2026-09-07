import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function AdminTeams() {
  const { user, isAdmin, isTeamLeader } = useAuth();
  const navigate = useNavigate();

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || (!isAdmin && !isTeamLeader)) {
      navigate('/login');
      return;
    }

    const fetchTeams = async () => {
      setLoading(true);
      try {
        const res = await api.get('/teams');
        if (res.data.success) {
          setTeams(res.data.teams);
        }
      } catch (err) {
        console.error('Failed to load teams:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [user, isAdmin, isTeamLeader, navigate]);

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
      <main className="flex-1 bg-slate-50 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">ICT-MIS Operational Teams</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage functional teams, responsibilities, and allocated technical staff
            </p>
          </div>
        </div>

        {/* Teams Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ndmu-green-700"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {teams.map((t) => (
              <div key={t.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg">groups</span>
                      </div>
                      <div>
                        <h2 className="font-bold text-slate-900 text-sm">{t.name}</h2>
                        <span className="text-[10px] text-slate-400">Team ID #{t.id}</span>
                      </div>
                    </div>
                    <div className="text-right"><span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${t.is_active ? 'bg-ndmu-green-50 text-ndmu-green-800 border border-ndmu-green-200' : 'bg-slate-100 text-slate-600'}`}>{t.is_active ? 'Active' : 'Inactive'}</span><button onClick={async () => { await api.patch(`/teams/${t.id}`, { is_active: !t.is_active }); setTeams((items) => items.map((item) => item.id === t.id ? { ...item, is_active: !t.is_active } : item)); }} className="mt-1 block text-[10px] font-bold text-ndmu-green-800 hover:underline">{t.is_active ? 'Deactivate' : 'Activate'}</button></div>
                  </div>

                  <p className="text-xs text-slate-600 mb-4">{t.description}</p>

                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Assigned Technicians & Leads:
                  </div>

                  <div className="space-y-1.5">
                    {t.members && t.members.length > 0 ? (
                      t.members.map((m) => (
                        <div key={m.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-400 text-sm">person</span>
                            <span className="font-semibold text-slate-800">{m.full_name}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            m.role === 'team_leader' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {m.role?.replace('_', ' ')}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-400 italic p-2">No members allocated to this team yet.</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
