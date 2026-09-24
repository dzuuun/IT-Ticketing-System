import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Modal from "../components/Modal";
import ConfirmForm from "../components/ConfirmForm";

const emptyDepartment = { name: "", code: "", type: "office", is_active: true };
const types = ["college", "office", "unit", "other"];
const PAGE_SIZE = 10;
const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-ndmu-green-600 focus:ring-4 focus:ring-ndmu-green-100";

export default function AdminDepartments() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [modalDepartment, setModalDepartment] = useState(null);
  const [saving, setSaving] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState([]);
  const [bulkErrors, setBulkErrors] = useState([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  const loadDepartments = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await api.get("/departments");
      setDepartments(response.data.departments || []);
    } catch {
      setLoadError("Departments could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/login");
      return;
    }
    if (user && isAdmin) loadDepartments();
  }, [user, isAdmin, authLoading, navigate]);

  const visibleDepartments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return departments.filter((department) => {
      const typeMatches =
        typeFilter === "all" || department.type === typeFilter;
      const statusMatches =
        statusFilter === "all" ||
        (statusFilter === "active"
          ? Boolean(department.is_active)
          : !department.is_active);
      const searchMatches =
        !term ||
        [department.name, department.code, department.type].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(term),
        );
      return typeMatches && statusMatches && searchMatches;
    });
  }, [departments, search, typeFilter, statusFilter]);
  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, statusFilter]);
  const pageCount = Math.max(
    1,
    Math.ceil(visibleDepartments.length / PAGE_SIZE),
  );
  const currentPage = Math.min(page, pageCount);
  const paginatedDepartments = visibleDepartments.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const rangeStart = visibleDepartments.length
    ? (currentPage - 1) * PAGE_SIZE + 1
    : 0;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, visibleDepartments.length);
  const stats = useMemo(
    () => ({
      total: departments.length,
      active: departments.filter((item) => item.is_active).length,
      colleges: departments.filter((item) => item.type === "college").length,
      offices: departments.filter((item) => item.type === "office").length,
    }),
    [departments],
  );
  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
  };

  const saveDepartment = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (modalDepartment.id)
        await api.patch(`/departments/${modalDepartment.id}`, modalDepartment);
      else await api.post("/departments", modalDepartment);
      setModalDepartment(null);
      await loadDepartments();
    } catch (error) {
      alert(error.response?.data?.message || "Unable to save the department.");
    } finally {
      setSaving(false);
    }
  };
  const resetBulkImport = () => {
    setBulkRows([]);
    setBulkErrors([]);
    setBulkFileName("");
  };
  const downloadTemplate = async () => {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Departments");
    sheet.columns = [
      { header: "name", key: "name", width: 42 },
      { header: "code", key: "code", width: 16 },
      { header: "type", key: "type", width: 16 },
    ];
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF075C3B" },
    };
    sheet.autoFilter = "A1:C1";
    sheet.dataValidations.add("C2:C1048576", {
      type: "list",
      formulae: ['"college,office,unit,other"'],
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "ICT-MIS_Department_Import_Template.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  };
  const parseBulkFile = async (event) => {
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
    setBulkBusy(true);
    try {
      const { default: ExcelJS } = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new Error("The workbook does not contain a worksheet.");
      const headers = {};
      sheet.getRow(1).eachCell((cell, column) => {
        headers[cell.text.trim().toLowerCase()] = column;
      });
      const required = ["name", "code", "type"];
      const missing = required.filter((header) => !headers[header]);
      if (missing.length) {
        setBulkErrors(
          missing.map((field) => ({
            row: 1,
            field,
            message: `Missing column: ${field}`,
          })),
        );
        return;
      }
      const rows = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          const values = Object.fromEntries(
            required.map((field) => [
              field,
              row.getCell(headers[field]).text.trim(),
            ]),
          );
          if (Object.values(values).some(Boolean)) rows.push(values);
        }
      });
      if (!rows.length)
        setBulkErrors([
          {
            row: 2,
            field: "file",
            message: "The workbook does not contain any department rows.",
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
  const importDepartments = async () => {
    setBulkBusy(true);
    setBulkErrors([]);
    try {
      await api.post("/departments/bulk-import", { rows: bulkRows });
      setBulkOpen(false);
      resetBulkImport();
      await loadDepartments();
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
              University structure
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Departments and colleges
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Maintain NDMU colleges, offices, and institutional units available
              across ICT-MIS workflows.
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
              onClick={() => setModalDepartment({ ...emptyDepartment })}
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-ndmu-green-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-ndmu-green-600 hover:shadow-md"
            >
              <span className="material-symbols-outlined text-lg">
                add_business
              </span>
              Create department
            </button>
          </div>
        </div>
      </section>
      <div className="space-y-5 p-4 sm:p-5 lg:p-6">
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Stat
            label="Total units"
            value={stats.total}
            icon="domain"
            tone="slate"
          />
          <Stat
            label="Active units"
            value={stats.active}
            icon="verified"
            tone="emerald"
          />
          <Stat
            label="Colleges"
            value={stats.colleges}
            icon="school"
            tone="blue"
          />
          <Stat
            label="Offices"
            value={stats.offices}
            icon="business_center"
            tone="violet"
          />
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1">
              {["all", ...types].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTypeFilter(type)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold capitalize transition ${typeFilter === type ? "bg-ndmu-green-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {type === "all" ? "All types" : type}
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
                  placeholder="Name, code, or type"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-xs outline-none focus:border-ndmu-green-500 focus:bg-white focus:ring-2 focus:ring-ndmu-green-100"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
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
                Unit directory
              </h2>
              <p className="mt-0.5 text-[10px] text-slate-400">
                {loading
                  ? "Loading departments..."
                  : `${visibleDepartments.length} matching ${visibleDepartments.length === 1 ? "unit" : "units"}`}
              </p>
            </div>
            {(typeFilter !== "all" || statusFilter !== "all" || search) && (
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
            <table className="w-full min-w-[720px] table-fixed text-left text-xs">
              <colgroup>
                <col className="w-[15%]" />
                <col className="w-[41%]" />
                <col className="w-[16%]" />
                <col className="w-[16%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead className="border-b border-slate-200 bg-slate-50 text-[9px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-4 py-3">Department / college</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <LoadingRows />
                ) : loadError ? (
                  <MessageRow
                    icon="cloud_off"
                    title={loadError}
                    action="Try again"
                    onAction={loadDepartments}
                  />
                ) : visibleDepartments.length ? (
                  paginatedDepartments.map((department) => (
                    <tr
                      key={department.id}
                      className="transition hover:bg-emerald-50/30"
                    >
                      <td className="px-5 py-3">
                        <span className="inline-flex rounded-md border border-ndmu-green-200 bg-ndmu-green-50 px-2 py-1 text-[10px] font-black text-ndmu-green-800">
                          {department.code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p
                          className="truncate font-extrabold text-slate-900"
                          title={department.name}
                        >
                          {department.name}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          NDMU institutional unit
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <TypeBadge type={department.type} />
                      </td>
                      <td className="px-4 py-3">
                        <Status active={Boolean(department.is_active)} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setModalDepartment({
                              ...department,
                              is_active: Boolean(department.is_active),
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-ndmu-green-700 transition hover:bg-ndmu-green-50"
                        >
                          <span className="material-symbols-outlined text-base">
                            edit
                          </span>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <MessageRow
                    icon="domain_disabled"
                    title="No matching units"
                    description="Try another type, status, or search term."
                  />
                )}
              </tbody>
            </table>
          </div>
          {!loading && !loadError && visibleDepartments.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-slate-500">
                Showing{" "}
                <span className="font-bold text-slate-700">
                  {rangeStart}-{rangeEnd}
                </span>{" "}
                of {visibleDepartments.length} units
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[10px] font-bold text-slate-600 transition hover:border-ndmu-green-300 hover:text-ndmu-green-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-sm">
                    chevron_left
                  </span>
                  Previous
                </button>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map(
                  (pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      className={`grid h-8 min-w-8 place-items-center rounded-lg px-2 text-[10px] font-extrabold transition ${pageNumber === currentPage ? "bg-ndmu-green-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}
                    >
                      {pageNumber}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage === pageCount}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[10px] font-bold text-slate-600 transition hover:border-ndmu-green-300 hover:text-ndmu-green-700 disabled:cursor-not-allowed disabled:opacity-40"
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
        isOpen={Boolean(modalDepartment)}
        onClose={() => !saving && setModalDepartment(null)}
        title={
          modalDepartment?.id
            ? "Edit department / college"
            : "Create department / college"
        }
        maxWidth="max-w-xl"
      >
        {modalDepartment && (
          <ConfirmForm
            onConfirm={saveDepartment}
            title={
              modalDepartment.id
                ? "Save department changes?"
                : "Add department?"
            }
            description={
              modalDepartment.id
                ? "Apply changes to this department."
                : "Add this department to the directory."
            }
            confirmLabel={
              modalDepartment.id ? "Save changes" : "Add department"
            }
            className="space-y-5 text-xs"
          >
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-3 text-emerald-900">
              <p className="font-extrabold">University unit details</p>
              <p className="mt-0.5 text-[11px] leading-5">
                Use a short, unique code so the unit is recognizable in accounts
                and reports.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[130px_1fr]">
              <Label label="Unit code" required>
                <input
                  required
                  maxLength={50}
                  value={modalDepartment.code || ""}
                  onChange={(event) =>
                    setModalDepartment({
                      ...modalDepartment,
                      code: event.target.value.toUpperCase(),
                    })
                  }
                  placeholder="e.g. CCS"
                  className={`${inputClass} font-bold text-ndmu-green-800`}
                />
              </Label>
              <Label label="Department / college name" required>
                <input
                  required
                  value={modalDepartment.name || ""}
                  onChange={(event) =>
                    setModalDepartment({
                      ...modalDepartment,
                      name: event.target.value,
                    })
                  }
                  placeholder="e.g. College of Computer Studies"
                  className={inputClass}
                />
              </Label>
            </div>
            <Label label="Unit type">
              <select
                value={modalDepartment.type || "office"}
                onChange={(event) =>
                  setModalDepartment({
                    ...modalDepartment,
                    type: event.target.value,
                  })
                }
                className={inputClass}
              >
                {types.map((type) => (
                  <option key={type} value={type}>
                    {type[0].toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </Label>
            <ActiveToggle
              active={Boolean(modalDepartment.is_active)}
              onChange={(is_active) =>
                setModalDepartment({ ...modalDepartment, is_active })
              }
            />
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={saving}
                onClick={() => setModalDepartment(null)}
                className="rounded-xl bg-slate-100 px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-ndmu-green-700 px-5 py-2.5 font-bold text-white hover:bg-ndmu-green-600 disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-base">
                  {saving ? "progress_activity" : "save"}
                </span>
                {saving
                  ? "Saving..."
                  : modalDepartment.id
                    ? "Save changes"
                    : "Create unit"}
              </button>
            </div>
          </ConfirmForm>
        )}
      </Modal>
      <Modal
        isOpen={bulkOpen}
        onClose={() => !bulkBusy && setBulkOpen(false)}
        title="Import departments and colleges"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-5 text-xs">
          <div className="flex flex-col justify-between gap-4 rounded-xl border border-ndmu-green-200 bg-ndmu-green-50 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-extrabold text-ndmu-green-900">
                Use the ICT-MIS import template
              </p>
              <p className="mt-1 max-w-xl text-[11px] leading-5 text-ndmu-green-800/75">
                Keep the column names unchanged. Each code must be unique;
                imported units can be colleges, offices, units, or other.
              </p>
            </div>
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-ndmu-green-300 bg-white px-3 py-2.5 font-bold text-ndmu-green-800 hover:bg-ndmu-green-100"
            >
              <span className="material-symbols-outlined text-base">
                download
              </span>
              Download template
            </button>
          </div>
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
              Any number of units may be imported
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
              className="sr-only"
              onChange={parseBulkFile}
            />
          </label>
          {bulkRows.length > 0 && (
            <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 font-semibold text-blue-800">
              Ready to import {bulkRows.length} units.
            </p>
          )}
          {bulkErrors.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-700">
              {bulkErrors.map((error, index) => (
                <p key={`${error.row}-${error.field}-${index}`}>
                  Row {error.row} · {error.field}: {error.message}
                </p>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => setBulkOpen(false)}
              className="rounded-xl bg-slate-100 px-4 py-2.5 font-bold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={bulkBusy || !bulkRows.length}
              onClick={importDepartments}
              className="inline-flex items-center gap-2 rounded-xl bg-ndmu-green-700 px-4 py-2.5 font-bold text-white disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">
                upload
              </span>
              {bulkBusy ? "Importing..." : `Import ${bulkRows.length} units`}
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
}

const statTones = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  slate: "border-slate-200 bg-slate-100 text-slate-600",
};
function Stat({ label, value, icon, tone }) {
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
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${statTones[tone]}`}
        >
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </span>
      </div>
    </div>
  );
}
function TypeBadge({ type }) {
  const tones = {
    college: "bg-emerald-100 text-emerald-700",
    office: "bg-blue-100 text-blue-700",
    unit: "bg-violet-100 text-violet-700",
    other: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide ${tones[type] || tones.other}`}
    >
      {type}
    </span>
  );
}
function Status({ active }) {
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
function Label({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-bold text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}
function ActiveToggle({ active, onChange }) {
  return (
    <div className="flex items-center justify-between gap-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <p className="font-extrabold text-slate-800">Active status</p>
        <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
          Inactive units remain in ticket history but cannot be selected for new
          requests.
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
function LoadingRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <tr key={index}>
          <td colSpan={5} className="px-5 py-4">
            <div className="h-5 animate-pulse rounded bg-slate-100" />
          </td>
        </tr>
      ))}
    </>
  );
}
function MessageRow({ icon, title, description, action, onAction }) {
  return (
    <tr>
      <td colSpan={5} className="px-5 py-14 text-center">
        <span className="material-symbols-outlined text-4xl text-slate-300">
          {icon}
        </span>
        <p className="mt-2 text-sm font-bold text-slate-700">{title}</p>
        {description && (
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        )}
        {action && (
          <button
            type="button"
            onClick={onAction}
            className="mt-3 text-xs font-bold text-ndmu-green-700"
          >
            {action}
          </button>
        )}
      </td>
    </tr>
  );
}
