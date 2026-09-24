import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Modal from "../components/Modal";
import ConfirmForm from "../components/ConfirmForm";

const PAGE_SIZE = 10;
const statuses = ["available", "assigned", "in_maintenance", "retired", "lost"];
const maintenanceTypes = [
  "inspection",
  "preventive",
  "repair",
  "upgrade",
  "other",
];
const emptyAsset = {
  asset_tag: "",
  name: "",
  category_id: "",
  brand: "",
  model: "",
  serial_number: "",
  status: "available",
  department_id: "",
  location_id: "",
  maintenance_template_id: "",
  purchase_date: "",
  warranty_end: "",
  notes: "",
  is_active: true,
};
const preventiveChecklist = [
  "Remove dust and other particles",
  "Inspect monitor and accessories for defects",
  "Inspect internal hardware components",
  "Inspect external hardware components",
  "Check power supply, fans, and cables",
  "Check POST and event logs for errors",
  "Clear old POST and event logs for baselining",
  "Check available disk space",
  "Perform disk integrity check",
  "Perform disk cleanup",
  "Perform system scanning",
  "Perform malware scanning",
  "Update operating system and applications",
  "Review five-year replacement policy",
];
const createMaintenanceLog = () => ({
  maintenance_type: "inspection",
  academic_year: "",
  maintenance_frequency: "annual",
  maintenance_template_id: "",
  description: "",
  performed_at: new Date().toISOString().slice(0, 10),
  performed_by_user_id: "",
  cost: "",
  next_due_date: "",
  activities: preventiveChecklist.map((activity_text) => ({
    activity_text,
    is_completed: false,
    remarks: "",
  })),
});
const createMaintenanceTemplate = () => ({
  name: "",
  category_id: "",
  description: "",
  is_active: true,
  activities: [{ activity_text: "" }],
});
const inputClass =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none transition focus:border-ndmu-green-600 focus:ring-4 focus:ring-ndmu-green-100";

export default function AdminAssets() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [assetModal, setAssetModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [templateModal, setTemplateModal] = useState(null);
  const [maintenance, setMaintenance] = useState(createMaintenanceLog);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [
        assetResponse,
        departmentResponse,
        staffResponse,
        categoryResponse,
        locationResponse,
        templateResponse,
      ] = await Promise.all([
        api.get("/assets"),
        api.get("/departments"),
        api.get("/users/technicians"),
        api.get("/assets/categories"),
        api.get("/assets/locations"),
        api.get("/assets/maintenance-templates"),
      ]);
      setAssets(assetResponse.data.assets || []);
      setDepartments(
        (departmentResponse.data.departments || []).filter(
          (item) => item.is_active,
        ),
      );
      setStaff(staffResponse.data.technicians || []);
      setCategories(categoryResponse.data.categories || []);
      setLocations(locationResponse.data.locations || []);
      setTemplates(templateResponse.data.templates || []);
    } catch {
      setError("Asset inventory could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/login");
      return;
    }
    if (user && isAdmin) load();
  }, [user, isAdmin, authLoading, navigate]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return assets.filter(
      (asset) =>
        (statusFilter === "all" || asset.status === statusFilter) &&
        (!term ||
          [
            asset.asset_tag,
            asset.name,
            asset.category_name,
            asset.serial_number,
            asset.department_name,
          ].some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(term),
          )),
    );
  }, [assets, search, statusFilter]);
  useEffect(() => setPage(1), [search, statusFilter]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const activePage = Math.min(page, pages);
  const visible = filtered.slice(
    (activePage - 1) * PAGE_SIZE,
    activePage * PAGE_SIZE,
  );
  const summary = useMemo(
    () => ({
      total: assets.length,
      active: assets.filter((item) => item.is_active).length,
      assigned: assets.filter((item) => item.status === "assigned").length,
      maintenance: assets.filter((item) => item.status === "in_maintenance")
        .length,
    }),
    [assets],
  );

  const saveAsset = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (assetModal.id)
        await api.patch(`/assets/${assetModal.id}`, assetModal);
      else await api.post("/assets", assetModal);
      setAssetModal(null);
      await load();
    } catch (requestError) {
      alert(
        requestError.response?.data?.message || "Unable to save the asset.",
      );
    } finally {
      setSaving(false);
    }
  };
  const saveTemplate = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (templateModal.id) {
        await api.patch(
          `/assets/maintenance-templates/${templateModal.id}`,
          templateModal,
        );
      } else {
        await api.post("/assets/maintenance-templates", templateModal);
      }
      setTemplateModal(null);
      await load();
    } catch (requestError) {
      alert(
        requestError.response?.data?.message ||
          "Unable to save the maintenance template.",
      );
    } finally {
      setSaving(false);
    }
  };
  const openDetail = async (asset) => {
    try {
      const response = await api.get(`/assets/${asset.id}`);
      setDetailModal(response.data);
      setAcademicYears((items) =>
        Array.from(
          new Set([
            ...items,
            ...(response.data.maintenance_logs || [])
              .map((log) => log.academic_year)
              .filter(Boolean),
          ]),
        ),
      );
      const selectedTemplate = templates.find(
        (template) =>
          String(template.id) ===
          String(response.data.asset.maintenance_template_id || ""),
      );
      setMaintenance({
        ...createMaintenanceLog(),
        maintenance_template_id: selectedTemplate
          ? String(selectedTemplate.id)
          : "",
        activities: (
          selectedTemplate?.activities ||
          preventiveChecklist.map((activity_text) => ({ activity_text }))
        ).map((activity) => ({
          activity_text: activity.activity_text,
          is_completed: false,
          remarks: "",
        })),
      });
    } catch {
      alert("Unable to load asset history.");
    }
  };
  const saveMaintenance = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post(
        `/assets/${detailModal.asset.id}/maintenance`,
        maintenance,
      );
      await openDetail(detailModal.asset);
      await load();
    } catch (requestError) {
      alert(
        requestError.response?.data?.message ||
          "Unable to add the maintenance log.",
      );
    } finally {
      setSaving(false);
    }
  };
  const exportMaintenancePdf = async () => {
    const { jsPDF } = await import("jspdf");
    const { asset, maintenance_logs: logs } = detailModal;
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    let y = 16;
    const line = (text, size = 9, indent = 14) => {
      pdf.setFontSize(size);
      const lines = pdf.splitTextToSize(String(text || ""), 182 - indent);
      if (y + lines.length * 5 > 280) {
        pdf.addPage();
        y = 16;
      }
      pdf.text(lines, indent, y);
      y += lines.length * 5;
    };
    pdf.setFillColor(0, 103, 71);
    pdf.rect(0, 0, 210, 30, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.text("NDMU ICT-MIS MAINTENANCE RECORD", 14, 14);
    pdf.setFontSize(9);
    pdf.text("Notre Dame of Marbel University", 14, 21);
    pdf.setTextColor(25, 35, 45);
    y = 40;
    line(`Equipment code: ${asset.asset_tag}`, 11);
    line(`Asset: ${asset.name}`);
    line(`Category: ${asset.category_name || "—"}`);
    line(`Location: ${asset.location_name || "—"}`);
    line(`Department: ${asset.department_name || "—"}`);
    y += 4;
    logs.forEach((log, index) => {
      if (y > 250) {
        pdf.addPage();
        y = 16;
      }
      line(
        `${index + 1}. ${String(log.maintenance_type).replaceAll("_", " ").toUpperCase()} — ${formatDate(log.performed_at)}`,
        10,
      );
      line(
        `Conducted by: ${log.performed_by_name || "ICT-MIS / external provider"}`,
      );
      line(`Remarks: ${log.description}`);
      (log.activities || []).forEach((activity) =>
        line(
          `${activity.is_completed ? "[x]" : "[ ]"} ${activity.activity_text}${activity.remarks ? ` — ${activity.remarks}` : ""}`,
          8,
          18,
        ),
      );
      y += 3;
    });
    pdf.save(`${asset.asset_tag}_Maintenance_Record.pdf`);
  };
  const exportMaintenancePdfForm = async () => {
    const { jsPDF } = await import("jspdf");
    const { asset, maintenance_logs: logs } = detailModal;
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const x = 20,
      w = 170;
    const head = (title) => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("JMJ Marist Brothers", 105, 14, { align: "center" });
      pdf.text("NOTRE DAME OF MARBEL UNIVERSITY", 105, 19, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text("City of Koronadal, South Cotabato", 105, 24, {
        align: "center",
      });
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text(title, 105, 39, { align: "center" });
      pdf.line(x, 44, x + w, 44);
    };
    const box = (
      left,
      top,
      width,
      height,
      value,
      bold = false,
      center = false,
    ) => {
      pdf.rect(left, top, width, height);
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(8);
      pdf.text(
        pdf.splitTextToSize(String(value || ""), width - 4),
        center ? left + width / 2 : left + 2,
        top + 5,
        { align: center ? "center" : "left" },
      );
    };
    head("MAINTENANCE RECORD");
    box(x, 52, 45, 14, "EQUIPMENT\nCODE", true, true);
    box(x + 45, 52, 125, 14, asset.asset_tag, true, true);
    box(x, 66, 45, 14, "LOCATION", true, true);
    box(x + 45, 66, 125, 14, asset.location_name || "—", true, true);
    let y = 80;
    ["DATE", "CONDUCTED BY", "REMARKS"].forEach((label, index) =>
      box(
        x + [0, 45, 103][index],
        y,
        [45, 58, 67][index],
        10,
        label,
        true,
        true,
      ),
    );
    y += 10;
    (logs.length ? logs : [{}]).slice(0, 12).forEach((log) => {
      box(x, y, 45, 14, formatDate(log.performed_at), false, true);
      box(x + 45, y, 58, 14, log.performed_by_name || "ICT-MIS", false, true);
      box(x + 103, y, 67, 14, log.description || "");
      y += 14;
    });
    logs.forEach((log) => {
      pdf.addPage();
      head("PREVENTIVE MAINTENANCE ACTIVITIES");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      [
        `Department: ${asset.department_name || "ICT-MIS"}`,
        `Frequency of Maintenance: ${(log.maintenance_frequency || "as needed").replaceAll("_", " ")}`,
        `Academic Year: ${log.academic_year || "—"}`,
        `Equipment Type/Name/Use: ${asset.name}`,
        `Brand/Model: ${[asset.brand, asset.model].filter(Boolean).join(" / ") || "—"}`,
        `Equipment Code: ${asset.asset_tag}`,
        `Location: ${asset.location_name || "—"}`,
        `Maintenance Schedule: ${formatDate(log.performed_at)}`,
      ].forEach((text, i) => pdf.text(text, x, 52 + i * 6));
      y = 103;
      [
        [125, "MAINTENANCE ACTIVITIES"],
        [15, "DONE"],
        [30, "REMARKS"],
      ].forEach(([width, label], i) =>
        box(x + [0, 125, 140][i], y, width, 10, label, true, true),
      );
      y += 10;
      (log.activities || []).forEach((activity) => {
        if (y > 268) return;
        box(x, y, 125, 10, activity.activity_text);
        box(x + 125, y, 15, 10, activity.is_completed ? "✓" : "", true, true);
        box(x + 140, y, 30, 10, activity.remarks || "");
        y += 10;
      });
      pdf.setFontSize(8);
      pdf.text(
        `Performed by: ${log.performed_by_name || "ICT-MIS"}`,
        x,
        Math.min(y + 12, 280),
      );
      pdf.text(
        `Date Accomplished: ${formatDate(log.performed_at)}`,
        118,
        Math.min(y + 12, 280),
      );
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text("ICT-FO 005a", 190, 290, { align: "right" });
    });
    pdf.save(`${asset.asset_tag}_Maintenance_Record.pdf`);
  };

  return (
    <main className="min-h-full bg-[#f4f7f5]">
      <section className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ndmu-green-700">
              ICT-MIS operations
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Asset inventory
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Track ICT equipment, custodians, warranty dates, and maintenance
              history.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTemplateModal(createMaintenanceTemplate())}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-ndmu-green-300 bg-white px-4 py-2.5 text-xs font-bold text-ndmu-green-800 transition hover:bg-ndmu-green-50"
            >
              <span className="material-symbols-outlined text-lg">
                checklist
              </span>
              Maintenance templates
            </button>
            <button
              type="button"
              onClick={() => setAssetModal({ ...emptyAsset })}
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-ndmu-green-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-ndmu-green-600"
            >
              <span className="material-symbols-outlined text-lg">add_box</span>
              Add asset
            </button>
          </div>
        </div>
      </section>
      <div className="space-y-5 p-4 sm:p-5 lg:p-6">
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Stat
            label="Total assets"
            value={summary.total}
            icon="inventory_2"
            tone="slate"
          />
          <Stat
            label="Active assets"
            value={summary.active}
            icon="verified"
            tone="emerald"
          />
          <Stat
            label="Assigned"
            value={summary.assigned}
            icon="assignment_ind"
            tone="blue"
          />
          <Stat
            label="In maintenance"
            value={summary.maintenance}
            icon="build"
            tone="amber"
          />
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <div className="flex max-w-full gap-1.5 overflow-x-auto">
              {["all", ...statuses].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold capitalize ${statusFilter === status ? "bg-ndmu-green-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {status === "all"
                    ? "All assets"
                    : status.replaceAll("_", " ")}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400">
                search
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tag, asset, serial, custodian..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-ndmu-green-500 focus:bg-white"
              />
            </div>
          </div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                Asset register
              </h2>
              <p className="mt-0.5 text-[10px] text-slate-400">
                {loading
                  ? "Loading inventory..."
                  : `${filtered.length} matching assets`}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] table-fixed text-left text-xs">
              <colgroup>
                <col className="w-[13%]" />
                <col className="w-[27%]" />
                <col className="w-[14%]" />
                <col className="w-[15%]" />
                <col className="w-[14%]" />
                <col className="w-[10%]" />
                <col className="w-[7%]" />
              </colgroup>
              <thead className="border-b border-slate-200 bg-slate-50 text-[9px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3">Asset tag</th>
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Maintenance</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <LoadingRows />
                ) : error ? (
                  <MessageRow
                    title={error}
                    action="Try again"
                    onAction={load}
                  />
                ) : visible.length ? (
                  visible.map((asset) => (
                    <tr
                      key={asset.id}
                      className="transition hover:bg-emerald-50/30"
                    >
                      <td className="px-5 py-3">
                        <span className="inline-flex rounded-md border border-ndmu-green-200 bg-ndmu-green-50 px-2 py-1 text-[10px] font-black text-ndmu-green-800">
                          {asset.asset_tag}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="truncate font-extrabold text-slate-900">
                          {asset.name}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-slate-400">
                          {[asset.category_name, asset.brand, asset.model]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={asset.status} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="truncate font-bold text-slate-700">
                          {asset.department_name || "No department"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[10px] font-semibold text-slate-600">
                          {asset.next_maintenance_due
                            ? `Due ${formatDate(asset.next_maintenance_due)}`
                            : asset.last_maintenance_at
                              ? `Last ${formatDate(asset.last_maintenance_at)}`
                              : "No logs yet"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Active active={Boolean(asset.is_active)} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openDetail(asset)}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-ndmu-green-700 hover:bg-ndmu-green-50"
                        >
                          <span className="material-symbols-outlined text-base">
                            history
                          </span>
                          Logs
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setAssetModal({
                              ...asset,
                              is_active: Boolean(asset.is_active),
                              department_id: asset.department_id || "",
                              category_id: asset.category_id || "",
                              location_id: asset.location_id || "",
                            })
                          }
                          className="ml-1 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-100"
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
                    title="No matching assets"
                    description="Add an asset or change the current filters."
                  />
                )}
              </tbody>
            </table>
          </div>
          {!loading && !error && filtered.length > 0 && (
            <Pagination
              page={activePage}
              pages={pages}
              total={filtered.length}
              onChange={setPage}
            />
          )}
        </section>
      </div>
      <Modal
        isOpen={Boolean(assetModal)}
        onClose={() => !saving && setAssetModal(null)}
        title={assetModal?.id ? "Edit asset" : "Add asset"}
        maxWidth="max-w-3xl"
      >
        {assetModal && (
          <AssetForm
            asset={assetModal}
            setAsset={setAssetModal}
            departments={departments}
            categories={categories}
            locations={locations}
            templates={templates.filter(
              (template) =>
                template.is_active ||
                String(template.id) ===
                  String(assetModal.maintenance_template_id),
            )}
            onCreateCategory={async (name) => {
              const response = await api.post("/assets/categories", { name });
              const created = response.data.category;
              setCategories((items) =>
                [...items, created].sort((a, b) =>
                  a.name.localeCompare(b.name),
                ),
              );
              return created;
            }}
            onCreateLocation={async (name) => {
              const response = await api.post("/assets/locations", { name });
              const created = response.data.location;
              setLocations((items) =>
                [...items, created].sort((a, b) =>
                  a.name.localeCompare(b.name),
                ),
              );
              return created;
            }}
            staff={staff}
            saving={saving}
            onSubmit={saveAsset}
          />
        )}
      </Modal>
      <Modal
        isOpen={Boolean(templateModal)}
        onClose={() => !saving && setTemplateModal(null)}
        title={
          templateModal?.id
            ? "Edit maintenance template"
            : "Maintenance templates"
        }
        maxWidth="max-w-3xl"
      >
        {templateModal && (
          <TemplateForm
            template={templateModal}
            setTemplate={setTemplateModal}
            templates={templates}
            categories={categories}
            saving={saving}
            onSubmit={saveTemplate}
          />
        )}
      </Modal>
      <Modal
        isOpen={Boolean(detailModal)}
        onClose={() => !saving && setDetailModal(null)}
        title={
          detailModal
            ? `Maintenance · ${detailModal.asset.asset_tag}`
            : "Maintenance"
        }
        maxWidth="max-w-4xl"
      >
        {detailModal && (
          <div className="space-y-5 text-xs">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <p className="font-extrabold text-emerald-900">
                {detailModal.asset.name}
              </p>
              <p className="mt-1 text-[11px] text-emerald-800">
                {detailModal.asset.category_name} ·{" "}
                {detailModal.asset.serial_number || "No serial number"}
              </p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={exportMaintenancePdfForm}
                className="inline-flex items-center gap-2 rounded-lg border border-ndmu-green-300 bg-white px-3 py-2 text-[11px] font-bold text-ndmu-green-800 hover:bg-ndmu-green-50"
              >
                <span className="material-symbols-outlined text-base">
                  picture_as_pdf
                </span>
                Export maintenance PDF
              </button>
            </div>
            <ConfirmForm
              onConfirm={saveMaintenance}
              title="Record maintenance?"
              description="Save this maintenance record and its completed activities to the asset history."
              confirmLabel="Save maintenance"
              className="rounded-xl border border-slate-200 p-4"
            >
              <p className="font-extrabold text-slate-800">
                Record maintenance
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Type">
                  <select
                    value={maintenance.maintenance_type}
                    onChange={(event) =>
                      setMaintenance({
                        ...maintenance,
                        maintenance_type: event.target.value,
                      })
                    }
                    className={inputClass}
                  >
                    {maintenanceTypes.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Date" required>
                  <input
                    required
                    type="date"
                    value={maintenance.performed_at}
                    onChange={(event) =>
                      setMaintenance({
                        ...maintenance,
                        performed_at: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Academic year">
                  <SearchableSelect
                    value={maintenance.academic_year}
                    onChange={(value) =>
                      setMaintenance({ ...maintenance, academic_year: value })
                    }
                    options={academicYears.map((year) => ({
                      id: year,
                      name: year,
                    }))}
                    placeholder="Search or add academic year"
                    onCreate={async (year) => {
                      setAcademicYears((items) => [
                        ...new Set([...items, year]),
                      ]);
                      setMaintenance({ ...maintenance, academic_year: year });
                    }}
                  />
                </Field>
                <Field label="Maintenance frequency">
                  <select
                    value={maintenance.maintenance_frequency}
                    onChange={(event) =>
                      setMaintenance({
                        ...maintenance,
                        maintenance_frequency: event.target.value,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="semi_annual">Semi-annual</option>
                    <option value="annual">Annual</option>
                    <option value="as_needed">As needed</option>
                  </select>
                </Field>
                <Field label="Activity template">
                  <SearchableSelect
                    value={maintenance.maintenance_template_id}
                    onChange={(value) => {
                      const template = templates.find(
                        (item) => String(item.id) === String(value),
                      );
                      setMaintenance({
                        ...maintenance,
                        maintenance_template_id: value,
                        activities: (template?.activities || []).map(
                          (activity) => ({
                            activity_text: activity.activity_text,
                            is_completed: false,
                            remarks: "",
                          }),
                        ),
                      });
                    }}
                    options={templates.filter((template) => template.is_active)}
                    placeholder="Choose a checklist template"
                    allowEmpty
                    emptyLabel="Custom checklist"
                  />
                </Field>
                <Field label="Performed by">
                  <SearchableSelect
                    value={maintenance.performed_by_user_id}
                    onChange={(value) =>
                      setMaintenance({
                        ...maintenance,
                        performed_by_user_id: value,
                      })
                    }
                    options={staff.map((person) => ({
                      id: person.id,
                      name: person.full_name,
                    }))}
                    placeholder="Search ICT-MIS staff"
                    allowEmpty
                    emptyLabel="ICT-MIS / external provider"
                  />
                </Field>
                <Field label="Cost (PHP)">
                  <input
                    min="0"
                    step="0.01"
                    type="number"
                    value={maintenance.cost}
                    onChange={(event) =>
                      setMaintenance({
                        ...maintenance,
                        cost: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Next due date">
                  <input
                    type="date"
                    value={maintenance.next_due_date}
                    onChange={(event) =>
                      setMaintenance({
                        ...maintenance,
                        next_due_date: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Work details" required>
                  <textarea
                    required
                    value={maintenance.description}
                    onChange={(event) =>
                      setMaintenance({
                        ...maintenance,
                        description: event.target.value,
                      })
                    }
                    className={`${inputClass} min-h-20 resize-y`}
                  />
                </Field>
              </div>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                <div className="border-b border-slate-100 bg-slate-50 px-3.5 py-3">
                  <p className="font-extrabold text-slate-800">
                    Maintenance activities
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    Tick completed activities and add a remark only when needed.
                  </p>
                </div>
                <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
                  {maintenance.activities.map((activity, index) => (
                    <div
                      key={activity.activity_text}
                      className="grid grid-cols-[auto_1fr] gap-3 px-3.5 py-2.5 sm:grid-cols-[auto_1fr_190px] sm:items-center"
                    >
                      <input
                        type="checkbox"
                        checked={activity.is_completed}
                        onChange={(event) =>
                          setMaintenance({
                            ...maintenance,
                            activities: maintenance.activities.map(
                              (item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      is_completed: event.target.checked,
                                    }
                                  : item,
                            ),
                          })
                        }
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-ndmu-green-700 focus:ring-ndmu-green-500 sm:mt-0"
                      />
                      <input
                        value={activity.activity_text}
                        onChange={(event) =>
                          setMaintenance({
                            ...maintenance,
                            activities: maintenance.activities.map(
                              (item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      activity_text: event.target.value,
                                    }
                                  : item,
                            ),
                          })
                        }
                        className="min-w-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 outline-none focus:border-ndmu-green-500"
                      />
                      <div className="col-start-2 flex gap-1.5 sm:col-start-auto">
                        <input
                          value={activity.remarks}
                          onChange={(event) =>
                            setMaintenance({
                              ...maintenance,
                              activities: maintenance.activities.map(
                                (item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, remarks: event.target.value }
                                    : item,
                              ),
                            })
                          }
                          placeholder="Remarks (optional)"
                          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] outline-none focus:border-ndmu-green-500"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setMaintenance({
                              ...maintenance,
                              activities: maintenance.activities.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            })
                          }
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Remove ${activity.activity_text || "activity"}`}
                        >
                          <span className="material-symbols-outlined text-base">
                            close
                          </span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setMaintenance({
                      ...maintenance,
                      activities: [
                        ...maintenance.activities,
                        { activity_text: "", is_completed: false, remarks: "" },
                      ],
                    })
                  }
                  className="m-3 inline-flex items-center gap-1 text-[11px] font-bold text-ndmu-green-700 hover:text-ndmu-green-900"
                >
                  <span className="material-symbols-outlined text-base">
                    add
                  </span>
                  Add activity
                </button>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  disabled={saving}
                  className="rounded-xl bg-ndmu-green-700 px-4 py-2.5 font-bold text-white disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save maintenance record"}
                </button>
              </div>
            </ConfirmForm>
            <div>
              <p className="mb-3 font-extrabold text-slate-800">
                Service history
              </p>
              {detailModal.maintenance_logs.length ? (
                <div className="space-y-2">
                  {detailModal.maintenance_logs.map((log) => (
                    <article
                      key={log.id}
                      className="rounded-xl border border-slate-200 p-3"
                    >
                      <div className="flex justify-between gap-3">
                        <div>
                          <StatusBadge status={log.maintenance_type} />
                          <p className="mt-2 whitespace-pre-wrap text-slate-700">
                            {log.description}
                          </p>
                        </div>
                        <p className="shrink-0 text-[10px] font-bold text-slate-500">
                          {formatDate(log.performed_at)}
                        </p>
                      </div>
                      <p className="mt-2 text-[10px] text-slate-400">
                        {log.performed_by_name || "ICT-MIS / external provider"}
                        {log.cost
                          ? ` · ₱${Number(log.cost).toLocaleString()}`
                          : ""}
                        {log.next_due_date
                          ? ` · Next due ${formatDate(log.next_due_date)}`
                          : ""}
                        {log.academic_year ? ` · AY ${log.academic_year}` : ""}
                        {log.maintenance_frequency
                          ? ` · ${log.maintenance_frequency.replaceAll("_", " ")}`
                          : ""}
                      </p>
                      {log.activities?.length > 0 && (
                        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[10px] text-slate-600">
                          <span className="font-bold text-ndmu-green-700">
                            {
                              log.activities.filter(
                                (activity) => activity.is_completed,
                              ).length
                            }
                            /{log.activities.length} activities completed
                          </span>
                          <div className="mt-1.5 space-y-1">
                            {log.activities
                              .filter(
                                (activity) =>
                                  activity.is_completed || activity.remarks,
                              )
                              .map((activity) => (
                                <p key={activity.id}>
                                  • {activity.activity_text}
                                  {activity.remarks
                                    ? ` — ${activity.remarks}`
                                    : ""}
                                </p>
                              ))}
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl bg-slate-50 p-5 text-center text-slate-400">
                  No maintenance has been recorded for this asset.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}

function AssetForm({
  asset,
  setAsset,
  departments,
  categories,
  locations,
  templates,
  onCreateCategory,
  onCreateLocation,
  staff,
  saving,
  onSubmit,
}) {
  const set = (key, value) => setAsset({ ...asset, [key]: value });
  return (
    <ConfirmForm
      onConfirm={onSubmit}
      title={asset.id ? "Save asset changes?" : "Add asset?"}
      description={
        asset.id
          ? "Apply changes to this asset register entry."
          : "Add this asset to the ICT-MIS inventory."
      }
      confirmLabel={asset.id ? "Save changes" : "Add asset"}
      className="space-y-4 text-xs"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Asset tag" required>
          <input
            required
            value={asset.asset_tag}
            onChange={(e) => set("asset_tag", e.target.value.toUpperCase())}
            className={inputClass}
          />
        </Field>
        <Field label="Asset name" required>
          <input
            required
            value={asset.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Category" required>
          <SearchableSelect
            value={asset.category_id}
            onChange={(value) => set("category_id", value)}
            options={categories}
            placeholder="Search or add a category"
            onCreate={async (name) => {
              const created = await onCreateCategory(name);
              set("category_id", String(created.id));
            }}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Brand">
          <input
            value={asset.brand || ""}
            onChange={(e) => set("brand", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Model">
          <input
            value={asset.model || ""}
            onChange={(e) => set("model", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Serial number">
          <input
            value={asset.serial_number || ""}
            onChange={(e) => set("serial_number", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Operational status">
          <select
            value={asset.status}
            onChange={(e) => {
              const status = e.target.value;
              setAsset({
                ...asset,
                status,
                is_active: ["retired", "lost"].includes(status)
                  ? false
                  : asset.is_active,
              });
            }}
            className={inputClass}
          >
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Department">
          <SearchableSelect
            value={asset.department_id || ""}
            onChange={(value) => set("department_id", value)}
            options={departments.map((department) => ({
              id: department.id,
              name: `${department.code} — ${department.name}`,
            }))}
            placeholder="Search departments"
            allowEmpty
            emptyLabel="No department"
          />
        </Field>
        <Field label="Location">
          <SearchableSelect
            value={asset.location_id || ""}
            onChange={(value) => set("location_id", value)}
            options={locations}
            placeholder="Search or add a location"
            allowEmpty
            emptyLabel="No location"
            onCreate={async (name) => {
              const created = await onCreateLocation(name);
              set("location_id", String(created.id));
            }}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Preventive maintenance template">
          <SearchableSelect
            value={asset.maintenance_template_id || ""}
            onChange={(value) => set("maintenance_template_id", value)}
            options={templates}
            placeholder="Choose a default checklist"
            allowEmpty
            emptyLabel="No default template"
          />
        </Field>
        <Field label="Purchase date">
          <input
            type="date"
            value={asset.purchase_date || ""}
            onChange={(e) => set("purchase_date", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Warranty end">
          <input
            type="date"
            value={asset.warranty_end || ""}
            onChange={(e) => set("warranty_end", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Notes">
        <textarea
          value={asset.notes || ""}
          onChange={(e) => set("notes", e.target.value)}
          className={`${inputClass} min-h-20 resize-y`}
        />
      </Field>
      <Toggle
        active={
          !["retired", "lost"].includes(asset.status) &&
          Boolean(asset.is_active)
        }
        onChange={(value) => set("is_active", value)}
        disabled={["retired", "lost"].includes(asset.status)}
        description={
          ["retired", "lost"].includes(asset.status)
            ? "Retired and lost assets are automatically inactive."
            : "Inactive assets remain in maintenance history."
        }
      />
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={() => setAsset(null)}
          className="rounded-xl bg-slate-100 px-4 py-2.5 font-bold text-slate-600"
        >
          Cancel
        </button>
        <button
          disabled={saving}
          className="rounded-xl bg-ndmu-green-700 px-5 py-2.5 font-bold text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : asset.id ? "Save changes" : "Add asset"}
        </button>
      </div>
    </ConfirmForm>
  );
}

function TemplateForm({
  template,
  setTemplate,
  templates,
  categories,
  saving,
  onSubmit,
}) {
  const set = (key, value) => setTemplate({ ...template, [key]: value });
  return (
    <div className="space-y-5 text-xs">
      <div className="max-h-36 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
        {templates.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() =>
              setTemplate({
                ...item,
                category_id: item.category_id || "",
                is_active: Boolean(item.is_active),
                activities: (item.activities || []).map((activity) => ({
                  activity_text: activity.activity_text,
                })),
              })
            }
            className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition hover:bg-ndmu-green-50 ${String(template.id) === String(item.id) ? "bg-ndmu-green-50" : ""}`}
          >
            <span>
              <span className="block font-bold text-slate-800">
                {item.name}
              </span>
              <span className="text-[10px] text-slate-500">
                {item.activities?.length || 0} activities
                {item.category_name ? ` · ${item.category_name}` : ""}
              </span>
            </span>
            <Active active={Boolean(item.is_active)} />
          </button>
        ))}
      </div>
      <ConfirmForm
        onConfirm={onSubmit}
        title={
          template.id
            ? "Save template changes?"
            : "Create maintenance template?"
        }
        description={
          template.id
            ? "Apply changes to this preventive maintenance template."
            : "Create this reusable preventive maintenance template."
        }
        confirmLabel={template.id ? "Save changes" : "Create template"}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Template name" required>
            <input
              required
              value={template.name}
              onChange={(event) => set("name", event.target.value)}
              placeholder="e.g. Network equipment annual PM"
              className={inputClass}
            />
          </Field>
          <Field label="Applies to category">
            <SearchableSelect
              value={template.category_id || ""}
              onChange={(value) => set("category_id", value)}
              options={categories}
              placeholder="All asset categories"
              allowEmpty
              emptyLabel="All asset categories"
            />
          </Field>
        </div>
        <Field label="Purpose / guidance">
          <input
            value={template.description || ""}
            onChange={(event) => set("description", event.target.value)}
            placeholder="Brief reminder for technicians"
            className={inputClass}
          />
        </Field>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="border-b border-slate-100 bg-slate-50 px-3.5 py-3">
            <p className="font-extrabold text-slate-800">
              Checklist activities
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              These become a starting checklist. A maintenance record can still
              be tailored per asset.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {template.activities.map((activity, index) => (
              <div key={index} className="flex gap-2 px-3.5 py-2">
                <input
                  required
                  value={activity.activity_text}
                  onChange={(event) =>
                    set(
                      "activities",
                      template.activities.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, activity_text: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder="Describe the maintenance activity"
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-ndmu-green-500"
                />
                <button
                  type="button"
                  disabled={template.activities.length === 1}
                  onClick={() =>
                    set(
                      "activities",
                      template.activities.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    )
                  }
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Remove activity"
                >
                  <span className="material-symbols-outlined text-base">
                    close
                  </span>
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              set("activities", [...template.activities, { activity_text: "" }])
            }
            className="m-3 inline-flex items-center gap-1 text-[11px] font-bold text-ndmu-green-700"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Add activity
          </button>
        </div>
        <Toggle
          active={Boolean(template.is_active)}
          onChange={(value) => set("is_active", value)}
        />
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-ndmu-green-700 px-5 py-2.5 font-bold text-white disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : template.id
                ? "Save template"
                : "Create template"}
          </button>
        </div>
      </ConfirmForm>
    </div>
  );
}
function Field({ label, required, children }) {
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
function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  allowEmpty = false,
  emptyLabel = "None",
  onCreate,
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const normalized = term.trim().toLowerCase();
  const selected = options.find((item) => String(item.id) === String(value));
  const matches = options.filter((item) =>
    item.name.toLowerCase().includes(normalized),
  );
  const canCreate =
    onCreate &&
    normalized &&
    !options.some((item) => item.name.toLowerCase() === normalized);
  const choose = (next) => {
    onChange(next);
    setTerm("");
    setOpen(false);
  };
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`${inputClass} flex items-center justify-between text-left`}
      >
        <span
          className={`min-w-0 truncate whitespace-nowrap ${selected ? "text-slate-800" : "text-slate-400"}`}
          title={selected?.name}
        >
          {selected?.name || placeholder}
        </span>
        <span className="material-symbols-outlined text-base text-slate-400">
          expand_more
        </span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <input
              autoFocus
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-ndmu-green-500"
            />
          </div>
          <div className="max-h-44 overflow-y-auto p-1">
            {allowEmpty && (
              <button
                type="button"
                onClick={() => choose("")}
                className="w-full rounded-lg px-3 py-2 text-left text-xs text-slate-500 hover:bg-slate-50"
              >
                {emptyLabel}
              </button>
            )}
            {matches.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => choose(String(item.id))}
                className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-ndmu-green-50"
              >
                {item.name}
              </button>
            ))}
            {canCreate && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await onCreate(term.trim());
                    setTerm("");
                    setOpen(false);
                  } catch (error) {
                    alert(
                      error.response?.data?.message ||
                        "Unable to create category.",
                    );
                  }
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-ndmu-green-700 hover:bg-ndmu-green-50"
              >
                + Add “{term.trim()}”
              </button>
            )}
            {!matches.length && !canCreate && (
              <p className="px-3 py-3 text-xs text-slate-400">
                No matches found.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
function Toggle({ active, onChange, disabled = false, description }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <p className="font-extrabold text-slate-800">Active status</p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {description || "Inactive assets remain in maintenance history."}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        disabled={disabled}
        onClick={() => !disabled && onChange(!active)}
        className={`relative h-7 w-12 rounded-full ${active ? "bg-ndmu-green-700" : "bg-slate-300"} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        <span
          className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${active ? "translate-x-5" : ""}`}
        />
      </button>
    </div>
  );
}
function Stat({ label, value, icon, tone }) {
  const colors = {
    slate: "bg-slate-100 text-slate-600",
    emerald: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
        </div>
        <span
          className={`grid h-10 w-10 place-items-center rounded-xl ${colors[tone]}`}
        >
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </span>
      </div>
    </div>
  );
}
function StatusBadge({ status }) {
  const tones = {
    available: "bg-emerald-100 text-emerald-700",
    assigned: "bg-blue-100 text-blue-700",
    in_maintenance: "bg-amber-100 text-amber-800",
    retired: "bg-slate-100 text-slate-600",
    lost: "bg-rose-100 text-rose-700",
    inspection: "bg-blue-100 text-blue-700",
    preventive: "bg-emerald-100 text-emerald-700",
    repair: "bg-amber-100 text-amber-800",
    upgrade: "bg-violet-100 text-violet-700",
    other: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide ${tones[status] || tones.other}`}
    >
      {String(status).replaceAll("_", " ")}
    </span>
  );
}
function Active({ active }) {
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
function LoadingRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <tr key={index}>
          <td colSpan={7} className="px-5 py-4">
            <div className="h-5 animate-pulse rounded bg-slate-100" />
          </td>
        </tr>
      ))}
    </>
  );
}
function MessageRow({ title, description, action, onAction }) {
  return (
    <tr>
      <td colSpan={7} className="px-5 py-14 text-center">
        <span className="material-symbols-outlined text-4xl text-slate-300">
          inventory_2
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
function Pagination({ page, pages, total, onChange }) {
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
      <p className="text-[11px] text-slate-500">
        Page {page} of {pages} · {total} assets
      </p>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page === pages}
          onClick={() => onChange(page + 1)}
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(`${String(value).slice(0, 10)}T00:00:00`))
    : "—";
}
