import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Modal from '../components/Modal';

export default function AdminDepartments() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !isAdmin) {
      navigate('/login');
      return;
    }

    const fetchDepts = async () => {
      setLoading(true);
      try {
        const res = await api.get('/departments');
        if (res.data.success) {
          setDepartments(res.data.departments);
        }
      } catch (err) {
        console.error('Failed to load departments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDepts();
  }, [user, isAdmin, navigate]);

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/departments/${editingDepartment.id}`, editingDepartment);
      setDepartments((items) => items.map((item) => item.id === editingDepartment.id ? editingDepartment : item));
      setEditingDepartment(null);
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to update department.');
    } finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
      <main className="flex-1 bg-slate-50 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">University Departments & Colleges</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              NDMU Academic Colleges, Administrative Offices, and Institutional Units
            </p>
          </div>

          <div className="text-xs font-semibold text-slate-600 bg-white px-3.5 py-2 rounded-xl border border-slate-200">
            Total Units: <strong className="text-ndmu-green-800">{departments.length}</strong>
          </div>
        </div>

        {/* Departments Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <tr>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Department / College Name</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-ndmu-green-700"></div>
                    </td>
                  </tr>
                ) : (
                  departments.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-extrabold text-ndmu-green-800 whitespace-nowrap">
                        <span className="bg-ndmu-green-50 px-2.5 py-1 rounded-md border border-ndmu-green-200">
                          {d.code}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-bold text-slate-900">{d.name}</td>
                      <td className="px-5 py-3 capitalize">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          d.type === 'college' ? 'bg-emerald-100 text-emerald-800' :
                          d.type === 'office' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {d.type}
                        </span>
                      </td>
                      <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${d.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>{d.is_active ? 'Active' : 'Inactive'}</span></td>
                      <td className="px-5 py-3 text-right"><button onClick={() => setEditingDepartment({ ...d, is_active: Boolean(d.is_active) })} className="inline-flex items-center gap-1 text-xs font-bold text-ndmu-green-800 hover:underline"><span className="material-symbols-outlined text-sm">edit</span>Edit</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Modal isOpen={Boolean(editingDepartment)} onClose={() => setEditingDepartment(null)} title="Edit Department / College">
        {editingDepartment && <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <div><label className="mb-1 block font-semibold text-slate-700">Code</label><input required maxLength={50} value={editingDepartment.code || ''} onChange={(e) => setEditingDepartment({ ...editingDepartment, code: e.target.value.toUpperCase() })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-bold text-ndmu-green-800" /></div>
            <div><label className="mb-1 block font-semibold text-slate-700">Department / College Name</label><input required value={editingDepartment.name || ''} onChange={(e) => setEditingDepartment({ ...editingDepartment, name: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></div>
          </div>
          <div><label className="mb-1 block font-semibold text-slate-700">Type</label><select value={editingDepartment.type || 'office'} onChange={(e) => setEditingDepartment({ ...editingDepartment, type: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="college">College</option><option value="office">Office</option><option value="unit">Unit</option><option value="other">Other</option></select></div>
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3"><span><span className="block font-bold text-slate-800">Active status</span><span className="mt-0.5 block text-[11px] text-slate-500">Inactive departments remain in historical records and are hidden from new selections.</span></span><button type="button" role="switch" aria-checked={editingDepartment.is_active} onClick={() => setEditingDepartment({ ...editingDepartment, is_active: !editingDepartment.is_active })} className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${editingDepartment.is_active ? 'justify-end bg-ndmu-green-700' : 'justify-start bg-slate-300'}`}><span className="h-5 w-5 rounded-full bg-white shadow" /></button></label>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={() => setEditingDepartment(null)} className="rounded-lg bg-slate-100 px-4 py-2 font-semibold text-slate-700">Cancel</button><button disabled={saving} type="submit" className="rounded-lg bg-ndmu-green-800 px-4 py-2 font-bold text-white disabled:opacity-60">{saving ? 'Saving...' : 'Save changes'}</button></div>
        </form>}
      </Modal>
    </div>
  );
}
