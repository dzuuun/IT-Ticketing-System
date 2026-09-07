import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Modal from '../components/Modal';

export default function AdminUsers() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Add user modal
  const [newUserModalOpen, setNewUserModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newMiddleName, setNewMiddleName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newRole, setNewRole] = useState('technician');
  const [newDept, setNewDept] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newActive, setNewActive] = useState(true);
  const [creatingUser, setCreatingUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [savingUser, setSavingUser] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [uRes, dRes] = await Promise.all([
        api.get('/users'),
        api.get('/departments'),
      ]);
      if (uRes.data.success) setUsers(uRes.data.users);
      if (dRes.data.success) setDepartments(dRes.data.departments);
    } catch (err) {
      console.error('Failed to load users:', err);
      setLoadError('User accounts could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/login');
      return;
    }
    if (user && isAdmin) fetchUsers();
  }, [user, isAdmin, authLoading, navigate]);

  const handleSaveUser = async (event) => {
    event.preventDefault(); setSavingUser(true);
    try { await api.patch(`/users/${editingUser.id}/role`, editingUser); const fullName = [editingUser.first_name, editingUser.middle_name, editingUser.last_name].filter(Boolean).join(' '); setUsers((items) => items.map((item) => item.id === editingUser.id ? { ...item, ...editingUser, full_name: fullName || item.full_name } : item)); setEditingUser(null); }
    catch (error) { alert(error.response?.data?.message || 'Unable to update user.'); } finally { setSavingUser(false); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      await api.post('/users', {
        email: newEmail,
        password: newPassword,
        first_name: newFirstName,
        middle_name: newMiddleName,
        last_name: newLastName,
        role: newRole,
        department_id: newDept || null,
        phone: newPhone,
        is_active: newActive,
      });
      setNewUserModalOpen(false);
      setNewEmail('');
      setNewPassword('');
      setNewFirstName('');
      setNewMiddleName('');
      setNewLastName('');
      setNewRole('technician');
      setNewDept('');
      setNewPhone('');
      setNewActive(true);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create user account.');
    } finally { setCreatingUser(false); }
  };

  const filteredUsers = useMemo(() => users.filter((u) => {
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? Boolean(u.is_active) : !u.is_active);
    const matchSearch =
      !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.department_name?.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchStatus && matchSearch;
  }), [users, roleFilter, statusFilter, search]);

  const summary = useMemo(() => ({
    total: users.length,
    active: users.filter((item) => Boolean(item.is_active)).length,
    staff: users.filter((item) => ['admin', 'team_leader', 'technician'].includes(item.role)).length,
    requestors: users.filter((item) => item.role === 'requestor').length,
  }), [users]);

  const pageSize = 15;
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const visibleUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [roleFilter, statusFilter, search]);

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
      <main className="flex-1 bg-slate-50 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Users Management</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage accounts, role assignments (RBAC), and technician permissions
            </p>
          </div>

          <button
            onClick={() => setNewUserModalOpen(true)}
            className="px-4 py-2 bg-ndmu-green-800 hover:bg-ndmu-green-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">person_add</span>
            Create User / Staff
          </button>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {['all', 'admin', 'team_leader', 'technician', 'requestor'].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  roleFilter === r ? 'bg-ndmu-green-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {r === 'all' ? 'All Roles' : r.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
            <input
              type="text"
              placeholder="Search user name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ndmu-green-500"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <tr>
                  <th className="px-5 py-3">Full Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-ndmu-green-700"></div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      No matching user accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                            {u.full_name?.charAt(0)}
                          </div>
                          <span>{u.full_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="text-slate-900 font-semibold">{u.email}</div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-slate-600">
                        {u.department_name || 'NDMU Community'}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          u.role === 'team_leader' ? 'bg-amber-100 text-amber-800' :
                          u.role === 'technician' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {u.role?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-right">
                        <button onClick={() => setEditingUser({ ...u, first_name: u.first_name || '', middle_name: u.middle_name || '', last_name: u.last_name || '', phone: u.phone || '', is_active: Boolean(u.is_active), password: '' })} className="inline-flex items-center gap-1 text-xs font-bold text-ndmu-green-800 hover:underline"><span className="material-symbols-outlined text-sm">edit</span>Edit</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add User Modal */}
      <Modal isOpen={newUserModalOpen} onClose={() => setNewUserModalOpen(false)} title="Create User / Staff Account">
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-semibold text-slate-700 mb-1">Last Name</label><input type="text" required value={newLastName} onChange={(e) => setNewLastName(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg" /></div>
            <div><label className="block font-semibold text-slate-700 mb-1">First Name</label><input type="text" required value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg" /></div>
          </div>
          <div><label className="block font-semibold text-slate-700 mb-1">Middle Name <span className="font-normal text-slate-400">(optional)</span></label><input type="text" value={newMiddleName} onChange={(e) => setNewMiddleName(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg" /></div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Institutional Email</label>
            <input
              type="email"
              required
              placeholder="alex.santos@ndmu.edu.ph"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <div>
              <label className="block font-semibold text-slate-700 mb-1">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
              >
                <option value="technician">Technician</option>
                <option value="team_leader">Team Leader</option>
                <option value="admin">Administrator</option>
                <option value="requestor">Requestor</option>
              </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Department</label>
            <select
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
            >
              <option value="">NDMU Community</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>
          <div className="pt-3 border-t flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setNewUserModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-ndmu-green-800 text-white font-bold rounded-lg">
              Create Account
            </button>
          </div>
        </form>
      </Modal>
      <Modal isOpen={Boolean(editingUser)} onClose={() => setEditingUser(null)} title="Edit Technician / User">
        {editingUser && <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block font-semibold text-slate-700">Last Name</label><input required value={editingUser.last_name} onChange={(e) => setEditingUser({ ...editingUser, last_name: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div><div><label className="mb-1 block font-semibold text-slate-700">First Name</label><input required value={editingUser.first_name} onChange={(e) => setEditingUser({ ...editingUser, first_name: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div></div>
          <div><label className="mb-1 block font-semibold text-slate-700">Middle Name <span className="font-normal text-slate-400">(optional)</span></label><input value={editingUser.middle_name} onChange={(e) => setEditingUser({ ...editingUser, middle_name: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
          <div><label className="mb-1 block font-semibold text-slate-700">Email Address</label><input required type="email" value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block font-semibold text-slate-700">Department</label><select value={editingUser.department_id || ''} onChange={(e) => setEditingUser({ ...editingUser, department_id: e.target.value || null })} className="w-full rounded-lg border border-slate-300 px-3 py-2"><option value="">NDMU Community</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div><div><label className="mb-1 block font-semibold text-slate-700">Contact Number</label><input value={editingUser.phone} onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div></div>
          <div><label className="mb-1 block font-semibold text-slate-700">Reset Password <span className="font-normal text-slate-400">(optional)</span></label><input type="password" value={editingUser.password} onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2" /></div>
          <div><label className="mb-1 block font-semibold text-slate-700">Role</label><select value={editingUser.role} onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="requestor">Requestor</option><option value="technician">Technician</option><option value="team_leader">Team Leader</option><option value="admin">Administrator</option></select></div>
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3"><span><span className="block font-bold text-slate-800">Active status</span><span className="mt-0.5 block text-[11px] text-slate-500">Inactive users cannot sign in; their history remains preserved.</span></span><button type="button" role="switch" aria-checked={editingUser.is_active} onClick={() => setEditingUser({ ...editingUser, is_active: !editingUser.is_active })} className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${editingUser.is_active ? 'justify-end bg-ndmu-green-700' : 'justify-start bg-slate-300'}`}><span className="h-5 w-5 rounded-full bg-white shadow" /></button></label>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={() => setEditingUser(null)} className="rounded-lg bg-slate-100 px-4 py-2 font-semibold text-slate-700">Cancel</button><button disabled={savingUser} type="submit" className="rounded-lg bg-ndmu-green-800 px-4 py-2 font-bold text-white disabled:opacity-60">{savingUser ? 'Saving...' : 'Save changes'}</button></div>
        </form>}
      </Modal>
    </div>
  );
}
