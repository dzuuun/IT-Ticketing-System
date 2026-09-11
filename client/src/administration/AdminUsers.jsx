import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Modal from "../components/Modal";
import ConfirmForm from "../components/ConfirmForm";

const PAGE_SIZE = 15;
const roles = [
  { value: "admin", label: "Administrator" },
  { value: "team_leader", label: "Team Leader" },
  { value: "technician", label: "Technician" },
  { value: "encoder", label: "Encoder" },
  { value: "requestor", label: "Requestor" },
];
const emptyAccount = {
  first_name: "",
  middle_name: "",
  last_name: "",
  email: "",
  password: "",
  role: "",
  location_id: "",
  is_active: true,
};

export default function AdminUsers() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [newAccount, setNewAccount] = useState(emptyAccount);
  const [editingAccount, setEditingAccount] = useState(null);
  const [saving, setSaving] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkErrors, setBulkErrors] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const fetchUsers = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [usersResponse, departmentsResponse] = await Promise.all([
        api.get("/users"),
        api.get("/departments"),
      ]);
      if (usersResponse.data.success) setUsers(usersResponse.data.users || []);
      if (departmentsResponse.data.success)
        setDepartments(departmentsResponse.data.departments || []);
    } catch {
      setLoadError("User accounts could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/login");
      return;
    }
    if (user && isAdmin) fetchUsers();
  }, [user, isAdmin, authLoading, navigate]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((account) => {
      const roleMatches = roleFilter === "all" || account.role === roleFilter;
      const statusMatches =
        statusFilter === "all" ||
        (statusFilter === "active"
          ? Boolean(account.is_active)
          : !account.is_active);
      const searchMatches =
        !term ||
        [account.full_name, account.email, account.location_name].some(
          (value) =>
            String(value || "")
              .toLowerCase()
              .includes(term),
        );
      return roleMatches && statusMatches && searchMatches;
    });
  }, [users, roleFilter, statusFilter, search]);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, statusFilter, search]);

  const summary = useMemo(
    () => ({
      total: users.length,
      active: users.filter((account) => Boolean(account.is_active)).length,
      staff: users.filter((account) =>
        ["admin", "team_leader", "technician", "encoder"].includes(
          account.role,
        ),
      ).length,
      requestors: users.filter((account) => account.role === "requestor")
        .length,
    }),
    [users],
  );

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const visibleUsers = filteredUsers.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const pageStart = filteredUsers.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const pageEnd = Math.min(page * PAGE_SIZE, filteredUsers.length);

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post("/users", {
        ...newAccount,
        location_id: newAccount.location_id || null,
      });
      setCreateOpen(false);
      setNewAccount(emptyAccount);
      await fetchUsers();
    } catch (error) {
      alert(error.response?.data?.message || "Unable to create the account.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/users/${editingAccount.id}/role`, {
        first_name: editingAccount.first_name,
        middle_name: editingAccount.middle_name,
        last_name: editingAccount.last_name,
        email: editingAccount.email,
        password: editingAccount.password,
        role: editingAccount.role,
        location_id: editingAccount.location_id || null,
        is_active: editingAccount.is_active,
      });
      setEditingAccount(null);
      await fetchUsers();
    } catch (error) {
      alert(error.response?.data?.message || "Unable to update the account.");
    } finally {
      setSaving(false);
    }
  };

  const openEditor = (account) =>
    setEditingAccount({
      ...account,
      first_name: account.first_name || "",
      middle_name: account.middle_name || "",
      last_name: account.last_name || "",
      password: "",
      location_id: account.location_id || "",
      is_active: Boolean(account.is_active),
    });

  const clearFilters = () => {
    setRoleFilter("all");
    setStatusFilter("all");
    setSearch("");
  };

  const resetBulkImport = () => {
    setBulkFileName("");
    setBulkRows([]);
    setBulkErrors([]);
    setImportedCount(0);
  };

  const downloadImportTemplate = async () => {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Users", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    worksheet.columns = [
      { header: "first_name", key: "first_name", width: 20 },
      { header: "middle_name", key: "middle_name", width: 20 },
      { header: "last_name", key: "last_name", width: 20 },
      { header: "email", key: "email", width: 32 },
      { header: "role", key: "role", width: 18 },
      { header: "password", key: "password", width: 22 },
    ];
    const header = worksheet.getRow(1);
    header.height = 24;
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF075C3B" },
    };
    header.alignment = { vertical: "middle" };
    worksheet.autoFilter = { from: "A1", to: "F1" };
    worksheet.dataValidations.add("E2:E201", {
      type: "list",
      allowBlank: false,
      formulae: ['"requestor,technician,team_leader,admin"'],
    });
    const example = workbook.addWorksheet("Example - Do Not Import");
    example.columns = worksheet.columns.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width,
    }));
    example.addRow({
      first_name: "Juan",
      middle_name: "Dela",
      last_name: "Cruz",
      email: "juan.cruz@ndmu.edu.ph",
      role: "requestor",
      password: "ChangeMe123!",
    });
    example.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    example.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF075C3B" },
    };
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "ICT-MIS_User_Import_Template.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const parseImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    resetBulkImport();
    setBulkFileName(file.name);
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setBulkErrors([
        {
          row: 1,
          field: "file",
          message: "Select an .xlsx workbook created from the import template.",
        },
      ]);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setBulkErrors([
        {
          row: 1,
          field: "file",
          message: "The workbook must be 5 MB or smaller.",
        },
      ]);
      return;
    }
    setBulkBusy(true);
    try {
      const { default: ExcelJS } = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const worksheet = workbook.worksheets[0];
      if (!worksheet)
        throw new Error("The workbook does not contain a worksheet.");
      const headers = {};
      worksheet.getRow(1).eachCell((cell, column) => {
        headers[cell.text.trim().toLowerCase()] = column;
      });
      const requiredHeaders = [
        "first_name",
        "middle_name",
        "last_name",
        "email",
        "role",
        "password",
      ];
      const missing = requiredHeaders.filter(
        (headerName) => !headers[headerName],
      );
      if (missing.length) {
        setBulkErrors(
          missing.map((headerName) => ({
            row: 1,
            field: headerName,
            message: `Missing column: ${headerName}`,
          })),
        );
        return;
      }
      const rows = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const values = Object.fromEntries(
          requiredHeaders.map((headerName) => [
            headerName,
            row.getCell(headers[headerName]).text.trim(),
          ]),
        );
        if (Object.values(values).some(Boolean)) rows.push(values);
      });
      if (rows.length === 0)
        setBulkErrors([
          {
            row: 2,
            field: "file",
            message: "The workbook does not contain any user rows.",
          },
        ]);
      else setBulkRows(rows);
    } catch (error) {
      setBulkErrors([
        {
          row: 1,
          field: "file",
          message: error.message || "The workbook could not be read.",
        },
      ]);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkImport = async () => {
    setBulkBusy(true);
    setBulkErrors([]);
    try {
      const response = await api.post("/users/bulk-import", { rows: bulkRows });
      setImportedCount(response.data.imported || bulkRows.length);
      setBulkRows([]);
      await fetchUsers();
    } catch (error) {
      setBulkErrors(
        error.response?.data?.errors || [
          {
            row: 1,
            field: "file",
            message:
              error.response?.data?.message ||
              "The import could not be completed.",
          },
        ],
      );
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <main className="min-h-full bg-[#f4f7f5]">
      <section className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ndmu-green-700">
              Users & access
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Technicians and users
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Manage account details, access roles, location affiliations, and
              login status.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                resetBulkImport();
                setBulkOpen(true);
              }}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-ndmu-green-400 hover:text-ndmu-green-700"
            >
              <span className="material-symbols-outlined text-lg">
                upload_file
              </span>
              Bulk import
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-ndmu-green-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-ndmu-green-600 hover:shadow-md"
            >
              <span className="material-symbols-outlined text-lg">
                person_add
              </span>
              Create account
            </button>
          </div>
        </div>
      </section>

      <div className="space-y-5 p-4 sm:p-5 lg:p-6">
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <UserStat
            label="Total accounts"
            value={summary.total}
            icon="group"
            tone="emerald"
            loading={loading}
          />
          <UserStat
            label="Active accounts"
            value={summary.active}
            icon="verified_user"
            tone="blue"
            loading={loading}
          />
          <UserStat
            label="ICT-MIS staff"
            value={summary.staff}
            icon="engineering"
            tone="violet"
            loading={loading}
          />
          <UserStat
            label="Requestors"
            value={summary.requestors}
            icon="person"
            tone="slate"
            loading={loading}
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1">
              {["all", ...roles.map((role) => role.value)].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setRoleFilter(role)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold capitalize transition ${roleFilter === role ? "bg-ndmu-green-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {role === "all" ? "All roles" : role.replace("_", " ")}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-600 outline-none focus:border-ndmu-green-500 focus:ring-2 focus:ring-ndmu-green-100"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <div className="relative w-full sm:w-72">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">
                  search
                </span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name, email, or location"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-xs outline-none focus:border-ndmu-green-500 focus:bg-white focus:ring-2 focus:ring-ndmu-green-100"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <span className="material-symbols-outlined text-base">
                      close
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                Account directory
              </h2>
              <p className="mt-0.5 text-[10px] text-slate-400">
                {loading
                  ? "Loading accounts..."
                  : `${filteredUsers.length} matching ${filteredUsers.length === 1 ? "account" : "accounts"}`}
              </p>
            </div>
            {(roleFilter !== "all" || statusFilter !== "all" || search) && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-[11px] font-bold text-ndmu-green-700 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] table-fixed text-left text-xs">
              <colgroup>
                <col className="w-[34%]" />
                <col className="w-[26%]" />
                <col className="w-[16%]" />
                <col className="w-[14%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead className="border-b border-slate-200 bg-slate-50 text-[9px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3">Account</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <UserLoadingRows />
                ) : loadError ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-14 text-center">
                      <span className="material-symbols-outlined text-4xl text-rose-300">
                        cloud_off
                      </span>
                      <p className="mt-2 text-sm font-bold text-slate-700">
                        {loadError}
                      </p>
                      <button
                        type="button"
                        onClick={fetchUsers}
                        className="mt-3 text-xs font-bold text-ndmu-green-700"
                      >
                        Try again
                      </button>
                    </td>
                  </tr>
                ) : visibleUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-14 text-center">
                      <span className="material-symbols-outlined text-4xl text-slate-300">
                        person_search
                      </span>
                      <p className="mt-2 text-sm font-bold text-slate-700">
                        No matching accounts
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Try another role, status, or search term.
                      </p>
                    </td>
                  </tr>
                ) : (
                  visibleUsers.map((account) => (
                    <tr
                      key={account.id}
                      className="transition hover:bg-emerald-50/30"
                    >
                      <td className="px-5 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <UserAvatar name={account.full_name} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p
                                className="truncate font-extrabold text-slate-900"
                                title={account.full_name}
                              >
                                {account.full_name}
                              </p>
                              {account.id === user?.id && (
                                <span className="rounded bg-ndmu-gold-50 px-1.5 py-0.5 text-[9px] font-black uppercase text-ndmu-gold-800">
                                  You
                                </span>
                              )}
                            </div>
                            <p
                              className="mt-0.5 truncate text-[10px] text-slate-500"
                              title={account.email}
                            >
                              {account.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p
                          className="truncate font-semibold text-slate-600"
                          title={account.location_name || "NDMU Community"}
                        >
                          {account.location_name || "NDMU Community"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={account.role} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusIndicator active={Boolean(account.is_active)} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEditor(account)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-ndmu-green-700 transition hover:border-ndmu-green-400 hover:bg-ndmu-green-50"
                        >
                          <span className="material-symbols-outlined text-sm">
                            edit
                          </span>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!loading && !loadError && filteredUsers.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-3 sm:flex-row">
              <p className="text-[11px] font-semibold text-slate-500">
                Showing{" "}
                <span className="font-black text-slate-700">
                  {pageStart}–{pageEnd}
                </span>{" "}
                of{" "}
                <span className="font-black text-slate-700">
                  {filteredUsers.length}
                </span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-sm">
                    chevron_left
                  </span>
                  Previous
                </button>
                <span className="min-w-14 text-center text-[11px] font-bold text-slate-500">
                  {page} / {pageCount}
                </span>
                <button
                  type="button"
                  disabled={page >= pageCount}
                  onClick={() =>
                    setPage((current) => Math.min(pageCount, current + 1))
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <span className="material-symbols-outlined text-sm">
                    chevron_right
                  </span>
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <Modal
        isOpen={bulkOpen}
        onClose={() => !bulkBusy && setBulkOpen(false)}
        title="Bulk Import User Accounts"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-5 text-xs">
          <div className="flex flex-col justify-between gap-4 rounded-xl border border-ndmu-green-200 bg-ndmu-green-50 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-extrabold text-ndmu-green-900">
                Use the ICT-MIS import template
              </p>
              <p className="mt-1 max-w-xl text-[11px] leading-5 text-ndmu-green-800/75">
                Keep the column names unchanged. Department values use Service
                Catalog department codes, no ID number is required, and
                requestor accounts must use an @ndmu.edu.ph email address.
              </p>
            </div>
            <button
              type="button"
              onClick={downloadImportTemplate}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-ndmu-green-300 bg-white px-3 py-2.5 font-bold text-ndmu-green-800 hover:bg-ndmu-green-100"
            >
              <span className="material-symbols-outlined text-base">
                download
              </span>
              Download template
            </button>
          </div>

          {!importedCount && (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-ndmu-green-500 hover:bg-ndmu-green-50/40">
              <span
                className={`material-symbols-outlined text-4xl ${bulkBusy ? "animate-spin text-ndmu-green-600" : "text-ndmu-green-700"}`}
              >
                {bulkBusy ? "progress_activity" : "upload_file"}
              </span>
              <span className="mt-2 text-sm font-extrabold text-slate-700">
                {bulkBusy ? "Reading workbook..." : "Choose an XLSX workbook"}
              </span>
              <span className="mt-1 text-[11px] text-slate-400">
                Any number of accounts may be imported
              </span>
              {bulkFileName && (
                <span className="mt-2 rounded-md bg-white px-2 py-1 font-semibold text-slate-600 shadow-sm">
                  {bulkFileName}
                </span>
              )}
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                disabled={bulkBusy}
                onChange={parseImportFile}
                className="sr-only"
              />
            </label>
          )}

          {importedCount > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-7 text-center">
              <span className="material-symbols-outlined text-4xl text-emerald-600">
                check_circle
              </span>
              <h3 className="mt-2 text-base font-black text-emerald-900">
                Import completed
              </h3>
              <p className="mt-1 text-xs text-emerald-700">
                {importedCount}{" "}
                {importedCount === 1 ? "account was" : "accounts were"} created
                successfully.
              </p>
            </div>
          )}

          {bulkErrors.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-center gap-2 font-extrabold text-rose-800">
                <span className="material-symbols-outlined text-lg">error</span>
                {bulkErrors.length} validation{" "}
                {bulkErrors.length === 1 ? "error" : "errors"} found
              </div>
              <div className="mt-3 max-h-40 space-y-1.5 overflow-y-auto">
                {bulkErrors.map((error, index) => (
                  <div
                    key={`${error.row}-${error.field}-${index}`}
                    className="rounded-lg bg-white/70 px-3 py-2 text-[11px] text-rose-700"
                  >
                    <span className="font-black">Row {error.row}</span> ·{" "}
                    <span className="font-mono">{error.field}</span> —{" "}
                    {error.message}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10px] text-rose-600">
                No accounts were imported. Correct the workbook and upload it
                again.
              </p>
            </div>
          )}

          {bulkRows.length > 0 && !importedCount && (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <p className="font-extrabold text-slate-800">
                    Import preview
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {bulkRows.length} accounts ready for server validation
                  </p>
                </div>
                <button
                  type="button"
                  disabled={bulkBusy}
                  onClick={resetBulkImport}
                  className="text-[11px] font-bold text-slate-500 hover:text-rose-600"
                >
                  Remove file
                </button>
              </div>
              <div className="max-h-64 overflow-auto">
                <table className="w-full min-w-[700px] table-fixed text-left">
                  <colgroup>
                    <col className="w-[30%]" />
                    <col className="w-[34%]" />
                    <col className="w-[18%]" />
                  </colgroup>
                  <thead className="sticky top-0 bg-white text-[9px] font-black uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-2.5">Name</th>
                      <th className="px-4 py-2.5">Email</th>
                      <th className="px-4 py-2.5">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bulkRows.slice(0, 10).map((row, index) => (
                      <tr key={`${row.email}-${index}`}>
                        <td className="truncate px-4 py-2.5 font-bold text-slate-700">
                          {[row.first_name, row.middle_name, row.last_name]
                            .filter(Boolean)
                            .join(" ")}
                        </td>
                        <td className="truncate px-4 py-2.5 text-slate-600">
                          {row.email}
                        </td>
                        <td className="px-4 py-2.5">
                          <RoleBadge role={row.role} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {bulkRows.length > 10 && (
                <p className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-center text-[10px] text-slate-400">
                  Previewing 10 of {bulkRows.length} rows
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => setBulkOpen(false)}
              className="rounded-xl bg-slate-100 px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
            >
              {importedCount ? "Done" : "Cancel"}
            </button>
            {bulkRows.length > 0 && !importedCount && (
              <button
                type="button"
                disabled={bulkBusy}
                onClick={handleBulkImport}
                className="inline-flex items-center gap-2 rounded-xl bg-ndmu-green-700 px-5 py-2.5 font-bold text-white hover:bg-ndmu-green-600 disabled:opacity-60"
              >
                <span
                  className={`material-symbols-outlined text-base ${bulkBusy ? "animate-spin" : ""}`}
                >
                  {bulkBusy ? "progress_activity" : "group_add"}
                </span>
                {bulkBusy
                  ? "Importing..."
                  : `Import ${bulkRows.length} accounts`}
              </button>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        title="Create User Account"
        maxWidth="max-w-3xl"
      >
        <ConfirmForm
          onConfirm={handleCreate}
          title="Create user account?"
          description="Create this user account with the selected access and department details."
          confirmLabel="Create user"
          className="space-y-5 text-xs"
        >
          <AccountFields
            account={newAccount}
            setAccount={setNewAccount}
            departments={departments}
            passwordRequired
          />
          <ActiveToggle
            active={newAccount.is_active}
            onChange={(is_active) =>
              setNewAccount({ ...newAccount, is_active })
            }
            description="Inactive accounts are created for recordkeeping but cannot sign in."
          />
          <ModalActions
            saving={saving}
            onCancel={() => setCreateOpen(false)}
            submitLabel="Create account"
            savingLabel="Creating..."
            icon="person_add"
          />
        </ConfirmForm>
      </Modal>

      <Modal
        isOpen={Boolean(editingAccount)}
        onClose={() => !saving && setEditingAccount(null)}
        title="Edit Technician / User"
        maxWidth="max-w-3xl"
      >
        {editingAccount && (
          <ConfirmForm
            onConfirm={handleSave}
            title="Save user changes?"
            description="Apply these changes to this user account."
            confirmLabel="Save changes"
            className="space-y-5 text-xs"
          >
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <UserAvatar name={editingAccount.full_name} large />
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-slate-900">
                  {editingAccount.full_name}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {editingAccount.email}
                </p>
              </div>
            </div>
            <AccountFields
              account={editingAccount}
              setAccount={setEditingAccount}
              departments={departments}
            />
            <ActiveToggle
              active={editingAccount.is_active}
              onChange={(is_active) =>
                setEditingAccount({ ...editingAccount, is_active })
              }
              description="Inactive users cannot sign in; their ticket and activity history remains preserved."
            />
            <ModalActions
              saving={saving}
              onCancel={() => setEditingAccount(null)}
              submitLabel="Save changes"
              savingLabel="Saving..."
              icon="save"
            />
          </ConfirmForm>
        )}
      </Modal>
    </main>
  );
}

function AccountFields({
  account,
  setAccount,
  departments,
  passwordRequired = false,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-ndmu-green-600 focus:ring-4 focus:ring-ndmu-green-100";
  return (
    <>
      <section>
        <SectionTitle icon="badge" title="Legal name" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="First name" required>
            <input
              required
              autoComplete="given-name"
              value={account.first_name}
              onChange={(event) =>
                setAccount({ ...account, first_name: event.target.value })
              }
              className={inputClass}
            />
          </Field>
          <Field label="Middle name" optional>
            <input
              autoComplete="additional-name"
              value={account.middle_name}
              onChange={(event) =>
                setAccount({ ...account, middle_name: event.target.value })
              }
              className={inputClass}
            />
          </Field>
          <Field label="Last name" required>
            <input
              required
              autoComplete="family-name"
              value={account.last_name}
              onChange={(event) =>
                setAccount({ ...account, last_name: event.target.value })
              }
              className={inputClass}
            />
          </Field>
        </div>
      </section>
      <section>
        <SectionTitle icon="contact_mail" title="Contact information" />
        <div className="grid grid-cols-1 gap-3">
          <Field label="Institutional email" required>
            <input
              required
              type="email"
              autoComplete="email"
              value={account.email}
              onChange={(event) =>
                setAccount({ ...account, email: event.target.value })
              }
              placeholder="name@ndmu.edu.ph"
              className={inputClass}
            />
          </Field>
        </div>
      </section>
      <section>
        <SectionTitle icon="admin_panel_settings" title="Access assignment" />
        <div className="grid grid-cols-1 gap-3">
          <Field label="Role" required>
            <SearchableSelect
              value={account.role}
              onChange={(role) => setAccount({ ...account, role })}
              options={roles}
              placeholder="Select a role"
              required
            />
          </Field>
        </div>
      </section>
      <section>
        <SectionTitle
          icon="password"
          title={passwordRequired ? "Initial password" : "Password reset"}
        />
        <Field
          label={passwordRequired ? "Temporary password" : "New password"}
          required={passwordRequired}
          optional={!passwordRequired}
        >
          <div className="relative">
            <input
              required={passwordRequired}
              minLength={8}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={account.password}
              onChange={(event) =>
                setAccount({ ...account, password: event.target.value })
              }
              placeholder={
                passwordRequired
                  ? "At least 8 characters"
                  : "Leave blank to keep the current password"
              }
              className={`${inputClass} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-ndmu-green-700 focus:outline-none focus:ring-2 focus:ring-ndmu-green-500"
            >
              <span className="material-symbols-outlined text-xl">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
        </Field>
      </section>
    </>
  );
}

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  emptyLabel,
  required = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find((option) => String(option.value) === value);
  const visibleOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const choose = (nextValue) => {
    onChange(nextValue);
    setSearch("");
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex w-full items-center justify-between rounded-xl border bg-white px-3.5 py-2.5 text-left text-sm outline-none transition focus:border-ndmu-green-600 focus:ring-4 focus:ring-ndmu-green-100 ${isOpen ? "border-ndmu-green-600 ring-4 ring-ndmu-green-100" : "border-slate-300"}`}
      >
        <span className={selected ? "text-slate-800" : "text-slate-400"}>
          {selected?.label || placeholder}
        </span>
        <span className="material-symbols-outlined text-lg text-slate-500">
          {isOpen ? "expand_less" : "expand_more"}
        </span>
      </button>
      {required && (
        <input
          tabIndex={-1}
          required
          value={value}
          onChange={() => {}}
          className="sr-only"
        />
      )}
      {isOpen && (
        <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          <div className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-400">
              search
            </span>
            <input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search options..."
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-ndmu-green-600"
            />
          </div>
          <div className="mt-1 max-h-48 overflow-y-auto" role="listbox">
            {emptyLabel && (
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose("")}
                className={`w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition hover:bg-slate-100 ${!value ? "bg-ndmu-green-50 text-ndmu-green-800" : "text-slate-600"}`}
              >
                {emptyLabel}
              </button>
            )}
            {visibleOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={String(option.value) === value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(String(option.value))}
                className={`w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition hover:bg-ndmu-green-50 ${String(option.value) === value ? "bg-ndmu-green-50 text-ndmu-green-800" : "text-slate-700"}`}
              >
                {option.label}
              </button>
            ))}
            {!visibleOptions.length && (
              <p className="px-3 py-3 text-center text-xs text-slate-400">
                No matching options.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
      <span className="material-symbols-outlined text-lg text-ndmu-green-700">
        {icon}
      </span>
      <h3 className="font-extrabold text-slate-800">{title}</h3>
    </div>
  );
}

function Field({ label, required, optional, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-bold text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}{" "}
        {optional && (
          <span className="font-normal text-slate-400">(optional)</span>
        )}
      </span>
      {children}
    </label>
  );
}

function ActiveToggle({ active, onChange, description }) {
  return (
    <div className="flex items-center justify-between gap-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <p className="font-extrabold text-slate-800">Active status</p>
        <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        onClick={() => onChange(!active)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${active ? "bg-ndmu-green-700" : "bg-slate-300"}`}
      >
        <span
          className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${active ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
    </div>
  );
}

function ModalActions({ saving, onCancel, submitLabel, savingLabel, icon }) {
  return (
    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
      <button
        type="button"
        disabled={saving}
        onClick={onCancel}
        className="rounded-xl bg-slate-100 px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl bg-ndmu-green-700 px-5 py-2.5 font-bold text-white hover:bg-ndmu-green-600 disabled:opacity-60"
      >
        <span
          className={`material-symbols-outlined text-base ${saving ? "animate-spin" : ""}`}
        >
          {saving ? "progress_activity" : icon}
        </span>
        {saving ? savingLabel : submitLabel}
      </button>
    </div>
  );
}

const statTones = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  slate: "border-slate-200 bg-slate-100 text-slate-600",
};

function UserStat({ label, value, icon, tone, loading }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900">
            {loading ? "—" : value}
          </p>
        </div>
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${statTones[tone]}`}
        >
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </span>
      </div>
    </div>
  );
}

function UserAvatar({ name = "", large = false }) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?";
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full border border-emerald-200 bg-ndmu-green-50 font-black text-ndmu-green-800 ${large ? "h-11 w-11 text-sm" : "h-9 w-9 text-xs"}`}
    >
      {initials}
    </span>
  );
}

function RoleBadge({ role }) {
  const tones = {
    admin: "bg-violet-100 text-violet-700",
    team_leader: "bg-amber-100 text-amber-700",
    technician: "bg-blue-100 text-blue-700",
    encoder: "bg-cyan-100 text-cyan-700",
    requestor: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide ${tones[role] || tones.requestor}`}
    >
      {role?.replace("_", " ")}
    </span>
  );
}

function StatusIndicator({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${active ? "text-emerald-700" : "text-slate-400"}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-300"}`}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function UserLoadingRows() {
  return [1, 2, 3, 4, 5].map((row) => (
    <tr key={row}>
      {[1, 2, 3, 4, 5].map((cell) => (
        <td key={cell} className="px-4 py-3">
          <div className="h-5 animate-pulse rounded bg-slate-100" />
        </td>
      ))}
    </tr>
  ));
}
