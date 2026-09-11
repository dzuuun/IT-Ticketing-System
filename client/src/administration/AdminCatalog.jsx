import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Modal from "../components/Modal";

const catalogIcons = [
  "account_circle",
  "wifi",
  "computer",
  "desktop_windows",
  "print",
  "settings",
  "storage",
  "cloud",
  "school",
  "smart_display",
  "security",
  "help",
];

export default function AdminCatalog() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeCategoryId, setActiveCategoryId] = useState("");

  // New Category modal
  const [newCatModalOpen, setNewCatModalOpen] = useState(false);
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catIcon, setCatIcon] = useState("category");

  // New Subcategory / Service Item modal
  const [newSubModalOpen, setNewSubModalOpen] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState("");
  const [subName, setSubName] = useState("");
  const [subDesc, setSubDesc] = useState("");
  const [subType, setSubType] = useState("service_request");
  const [subPriority, setSubPriority] = useState("medium");
  const [subFields, setSubFields] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [confirmingAction, setConfirmingAction] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await api.get("/categories/admin");
      if (res.data.success) {
        setCategories(res.data.categories);
        if (res.data.categories.length > 0 && !selectedCatId) {
          setSelectedCatId(String(res.data.categories[0].id));
        }
        setActiveCategoryId((current) => {
          const stillExists = res.data.categories.some(
            (category) => String(category.id) === String(current),
          );
          return stillExists
            ? current
            : String(res.data.categories[0]?.id || "");
        });
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
      setLoadError(
        "The service catalog could not be loaded. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    try {
      const endpoint =
        editingItem.kind === "category"
          ? `/categories/${editingItem.id}`
          : `/categories/subcategories/${editingItem.id}`;
      const { kind, id, subcategories, ...payload } = editingItem;
      await api.patch(endpoint, payload);
      setEditingItem(null);
      fetchCategories();
    } catch (error) {
      alert(error.response?.data?.message || "Unable to update catalog item.");
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/login");
      return;
    }
    if (user && isAdmin) fetchCategories();
  }, [user, isAdmin, authLoading, navigate]);

  const handleCreateCategory = async () => {
    try {
      const response = await api.post("/categories", {
        name: catName,
        description: catDesc,
        icon: catIcon,
      });
      const newCategoryId = String(response.data.categoryId || "");
      if (newCategoryId) {
        setActiveCategoryId(newCategoryId);
        setSelectedCatId(newCategoryId);
      }
      setNewCatModalOpen(false);
      setCatName("");
      setCatDesc("");
      fetchCategories();
    } catch (err) {
      alert("Failed to create category.");
    }
  };

  const handleCreateSubcategory = async () => {
    try {
      await api.post("/categories/subcategories", {
        category_id: selectedCatId,
        name: subName,
        description: subDesc,
        default_type: subType,
        default_priority: subPriority,
        form_schema: subFields,
      });
      setNewSubModalOpen(false);
      setSubName("");
      setSubDesc("");
      setSubFields([]);
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create service item.");
    }
  };

  const summary = useMemo(() => {
    const services = categories.flatMap(
      (category) => category.subcategories || [],
    );
    return {
      categories: categories.length,
      activeCategories: categories.filter((category) =>
        Boolean(category.is_active),
      ).length,
      services: services.length,
      activeServices: services.filter((service) => Boolean(service.is_active))
        .length,
      formFields: services.reduce(
        (total, service) =>
          total +
          (Array.isArray(service.form_schema) ? service.form_schema.length : 0),
        0,
      ),
    };
  }, [categories]);

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase();
    return categories.filter((category) => {
      const statusMatches =
        statusFilter === "all" ||
        (statusFilter === "active"
          ? Boolean(category.is_active)
          : !category.is_active);
      const searchMatches =
        !term ||
        [
          category.name,
          category.description,
          ...(category.subcategories || []).map((service) => service.name),
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(term),
        );
      return statusMatches && searchMatches;
    });
  }, [categories, search, statusFilter]);

  const activeCategory = useMemo(
    () =>
      filteredCategories.find(
        (category) => String(category.id) === String(activeCategoryId),
      ) || filteredCategories[0] || null,
    [filteredCategories, activeCategoryId],
  );

  useEffect(() => {
    if (
      activeCategory &&
      String(activeCategory.id) !== String(activeCategoryId)
    ) {
      setActiveCategoryId(String(activeCategory.id));
    }
  }, [activeCategory, activeCategoryId]);

  const requestConfirmation = (event, action) => {
    event.preventDefault();
    setConfirmation(action);
  };

  const confirmCatalogAction = async () => {
    if (!confirmation) return;
    setConfirmingAction(true);
    try {
      if (confirmation.type === "create-category") {
        await handleCreateCategory();
      } else if (confirmation.type === "create-service") {
        await handleCreateSubcategory();
      } else if (confirmation.type === "edit") {
        await handleSaveEdit();
      }
      setConfirmation(null);
    } finally {
      setConfirmingAction(false);
    }
  };

  return (
    <div className="min-h-full bg-[#f4f7f5]">
      <main>
        <section className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ndmu-green-700">
                Administration module
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                Service catalog
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Organize request categories, service items, priorities, and
                service-specific form fields.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setNewCatModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
              >
                <span className="material-symbols-outlined text-lg">
                  create_new_folder
                </span>
                Add category
              </button>
              <button
                type="button"
                onClick={() => setNewSubModalOpen(true)}
                disabled={categories.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-ndmu-green-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-ndmu-green-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Add service item
              </button>
            </div>
          </div>
        </section>

        <div className="space-y-5 p-4 sm:p-5 lg:p-6">
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <CatalogStat
              label="Categories"
              value={summary.categories}
              detail={`${summary.activeCategories} active`}
              icon="category"
              tone="emerald"
              loading={loading}
            />
            <CatalogStat
              label="Service items"
              value={summary.services}
              detail={`${summary.activeServices} available`}
              icon="design_services"
              tone="blue"
              loading={loading}
            />
            <CatalogStat
              label="Custom fields"
              value={summary.formFields}
              detail="Across all services"
              icon="dynamic_form"
              tone="violet"
              loading={loading}
            />
            <CatalogStat
              label="Inactive records"
              value={
                summary.categories -
                summary.activeCategories +
                (summary.services - summary.activeServices)
              }
              detail="Retained for history"
              icon="archive"
              tone="slate"
              loading={loading}
            />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-1.5">
                {["all", "active", "inactive"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-lg px-3 py-2 text-[11px] font-bold capitalize transition ${statusFilter === status ? "bg-ndmu-green-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {status}
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
                  placeholder="Search categories or services"
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
          </section>

          {loading ? (
            <CatalogSkeleton />
          ) : loadError ? (
            <div className="rounded-2xl border border-rose-200 bg-white px-6 py-14 text-center">
              <span className="material-symbols-outlined text-4xl text-rose-300">
                cloud_off
              </span>
              <p className="mt-2 text-sm font-bold text-slate-700">
                {loadError}
              </p>
              <button
                type="button"
                onClick={fetchCategories}
                className="mt-3 text-xs font-bold text-ndmu-green-700"
              >
                Try again
              </button>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300">
                folder_off
              </span>
              <h2 className="mt-2 text-sm font-extrabold text-slate-700">
                No catalog records found
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Try another search or status filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
                className="mt-3 text-xs font-bold text-ndmu-green-700"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <section className="space-y-4">
              <div
                className="flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
                role="tablist"
                aria-label="Service catalog categories"
              >
                {filteredCategories.map((category) => {
                  const isActive = String(category.id) === String(activeCategory?.id);
                  const serviceCount = (category.subcategories || []).length;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveCategoryId(String(category.id))}
                      className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold transition ${isActive ? "bg-ndmu-green-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
                    >
                      <span className="material-symbols-outlined text-base">
                        {category.icon || "category"}
                      </span>
                      <span>{category.name}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}
                      >
                        {serviceCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {activeCategory && (
                <CategoryPanel
                  key={activeCategory.id}
                  category={activeCategory}
                  onEditCategory={() =>
                    setEditingItem({
                      ...activeCategory,
                      kind: "category",
                      is_active: Boolean(activeCategory.is_active),
                    })
                  }
                  onEditService={(service) =>
                    setEditingItem({
                      ...service,
                      kind: "subcategory",
                      is_active: Boolean(service.is_active),
                      form_schema: Array.isArray(service.form_schema)
                        ? service.form_schema
                        : [],
                    })
                  }
                  onAddService={() => {
                    setSelectedCatId(String(activeCategory.id));
                    setNewSubModalOpen(true);
                  }}
                />
              )}
            </section>
          )}
        </div>
      </main>

      {/* New Category Modal */}
      <Modal
        isOpen={newCatModalOpen}
        onClose={() => setNewCatModalOpen(false)}
        title="Create Service Category"
      >
        <form
          onSubmit={(event) =>
            requestConfirmation(event, {
              type: "create-category",
              title: "Create service category?",
              description: `Add “${catName.trim()}” to the service catalog.`,
              confirmLabel: "Create category",
            })
          }
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Category Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Identity & Google Workspace"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Brief description of the types of requests in this category"
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <IconField value={catIcon} onChange={setCatIcon} />
          <div className="pt-3 border-t flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setNewCatModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-ndmu-green-800 text-white font-bold rounded-lg"
            >
              Save Category
            </button>
          </div>
        </form>
      </Modal>

      {/* New Subcategory Modal */}
      <Modal
        isOpen={newSubModalOpen}
        onClose={() => setNewSubModalOpen(false)}
        title="Create Service Item"
        maxWidth="max-w-3xl"
      >
        <form
          onSubmit={(event) =>
            requestConfirmation(event, {
              type: "create-service",
              title: "Create service item?",
              description: `Add “${subName.trim()}” to the selected category.`,
              confirmLabel: "Create service item",
            })
          }
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Parent Category
            </label>
            <select
              value={selectedCatId}
              onChange={(e) => setSelectedCatId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Service Item Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Schoology Exam Reset"
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Default Type
              </label>
              <select
                value={subType}
                onChange={(e) => setSubType(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
              >
                <option value="service_request">Service Request</option>
                <option value="incident">Incident</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Default Priority
              </label>
              <select
                value={subPriority}
                onChange={(e) => setSubPriority(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <FormFieldBuilder fields={subFields} onChange={setSubFields} />
          <div className="pt-3 border-t flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setNewSubModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-ndmu-green-800 text-white font-bold rounded-lg"
            >
              Save Service Item
            </button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        title={
          editingItem?.kind === "category"
            ? "Edit Service Category"
            : "Edit Service Item"
        }
        maxWidth={
          editingItem?.kind === "subcategory" ? "max-w-3xl" : "max-w-lg"
        }
      >
        {editingItem && (
          <form
            onSubmit={(event) =>
              requestConfirmation(event, {
                type: "edit",
                title: "Save catalog changes?",
                description: `Apply changes to “${editingItem.name || "this catalog item"}”.`,
                confirmLabel: "Save changes",
              })
            }
            className="space-y-4 text-xs"
          >
            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                Name
              </label>
              <input
                required
                value={editingItem.name || ""}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, name: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-slate-700">
                Description
              </label>
              <textarea
                rows={2}
                value={editingItem.description || ""}
                onChange={(e) =>
                  setEditingItem({
                    ...editingItem,
                    description: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            {editingItem.kind === "category" ? (
              <IconField
                value={editingItem.icon || ""}
                onChange={(icon) => setEditingItem({ ...editingItem, icon })}
              />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">
                      Type
                    </label>
                    <select
                      value={editingItem.default_type}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          default_type: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    >
                      <option value="service_request">Service Request</option>
                      <option value="incident">Incident</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">
                      Priority
                    </label>
                    <select
                      value={editingItem.default_priority}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          default_priority: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    >
                      {["low", "medium", "high", "urgent", "critical"].map(
                        (value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                </div>
                <FormFieldBuilder
                  fields={editingItem.form_schema || []}
                  onChange={(form_schema) =>
                    setEditingItem({ ...editingItem, form_schema })
                  }
                />
              </>
            )}
            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span>
                <span className="block font-bold text-slate-800">
                  Active status
                </span>
                <span className="block text-[11px] text-slate-500">
                  Inactive items remain in ticket history but cannot be selected
                  for new requests.
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={editingItem.is_active}
                onClick={() =>
                  setEditingItem({
                    ...editingItem,
                    is_active: !editingItem.is_active,
                  })
                }
                className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${editingItem.is_active ? "justify-end bg-ndmu-green-700" : "justify-start bg-slate-300"}`}
              >
                <span className="h-5 w-5 rounded-full bg-white shadow" />
              </button>
            </label>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="rounded-lg bg-slate-100 px-4 py-2 font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={savingEdit}
                type="submit"
                className="rounded-lg bg-ndmu-green-800 px-4 py-2 font-bold text-white"
              >
                {savingEdit ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(confirmation)}
        onClose={() => !confirmingAction && setConfirmation(null)}
        title={confirmation?.title || "Confirm action"}
        maxWidth="max-w-md"
      >
        <div className="space-y-5 text-sm">
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <span className="material-symbols-outlined mt-0.5 text-xl text-amber-600">
              help
            </span>
            <p className="leading-5">{confirmation?.description}</p>
          </div>
          <p className="text-xs leading-5 text-slate-500">
            Review the details before continuing. This change is recorded in
            the service catalog immediately.
          </p>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={confirmingAction}
              onClick={() => setConfirmation(null)}
              className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
            >
              Go back
            </button>
            <button
              type="button"
              disabled={confirmingAction}
              onClick={confirmCatalogAction}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ndmu-green-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-ndmu-green-600 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">
                check_circle
              </span>
              {confirmingAction
                ? "Saving..."
                : confirmation?.confirmLabel || "Confirm"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const statTones = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  slate: "border-slate-200 bg-slate-100 text-slate-600",
};

function CatalogStat({ label, value, detail, icon, tone, loading }) {
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
          <p className="mt-1 text-[10px] text-slate-400">{detail}</p>
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

function CategoryPanel({
  category,
  onEditCategory,
  onEditService,
  onAddService,
}) {
  const services = category.subcategories || [];
  const activeServices = services.filter((service) =>
    Boolean(service.is_active),
  ).length;
  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${category.is_active ? "border-slate-200" : "border-slate-300 opacity-80"}`}
    >
      <header className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${category.is_active ? "bg-ndmu-green-50 text-ndmu-green-700" : "bg-slate-100 text-slate-400"}`}
          >
            <span className="material-symbols-outlined text-xl">
              {category.icon || "category"}
            </span>
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-sm font-extrabold text-slate-900">
                {category.name}
              </h2>
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${category.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}
              >
                {category.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">
              {category.description || "No category description provided."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="mr-1 text-[10px] font-semibold text-slate-400">
            {activeServices}/{services.length} available
          </span>
          <button
            type="button"
            onClick={onEditCategory}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition hover:border-ndmu-green-300 hover:text-ndmu-green-700"
          >
            <span className="material-symbols-outlined text-base">edit</span>
            Edit category
          </button>
          <button
            type="button"
            onClick={onAddService}
            className="inline-flex items-center gap-1.5 rounded-lg bg-ndmu-green-50 px-3 py-2 text-[11px] font-bold text-ndmu-green-800 transition hover:bg-ndmu-green-100"
          >
            <span className="material-symbols-outlined text-base">add</span>Add
            item
          </button>
        </div>
      </header>

      {services.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <span className="material-symbols-outlined text-3xl text-slate-300">
            playlist_add
          </span>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            No service items in this category.
          </p>
          <button
            type="button"
            onClick={onAddService}
            className="mt-2 text-xs font-bold text-ndmu-green-700"
          >
            Add the first item
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] table-fixed text-left text-xs">
            <colgroup>
              <col className="w-[36%]" />
              <col className="w-[18%]" />
              <col className="w-[10%]" />
              <col className="w-[14%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[9px] font-black uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-2.5">Service item</th>
                <th className="px-4 py-2.5">Classification</th>
                <th className="px-4 py-2.5">Priority</th>
                <th className="px-4 py-2.5">Form</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-5 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {services.map((service) => {
                const fieldCount = Array.isArray(service.form_schema)
                  ? service.form_schema.length
                  : 0;
                return (
                  <tr
                    key={service.id}
                    className="transition hover:bg-emerald-50/30"
                  >
                    <td className="px-5 py-3">
                      <p
                        className="truncate font-bold text-slate-800"
                        title={service.name}
                      >
                        {service.name}
                      </p>
                      <p
                        className="mt-0.5 truncate text-[10px] text-slate-400"
                        title={service.description || ""}
                      >
                        {service.description || "No description"}
                      </p>
                    </td>
                    <td className="truncate whitespace-nowrap px-4 py-3">
                      <span
                        className={`rounded-md px-2 py-1 text-[9px] font-extrabold uppercase ${service.default_type === "incident" ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700"}`}
                      >
                        {service.default_type === "incident"
                          ? "Incident"
                          : "Service request"}
                      </span>
                    </td>
                    <td className="truncate px-4 py-3">
                      <span className="font-semibold capitalize text-slate-600">
                        {service.default_priority}
                      </span>
                    </td>
                    <td className="truncate px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold ${fieldCount ? "bg-violet-50 text-violet-700" : "bg-slate-100 text-slate-500"}`}
                      >
                        <span className="material-symbols-outlined text-sm">
                          dynamic_form
                        </span>
                        {fieldCount} {fieldCount === 1 ? "field" : "fields"}
                      </span>
                    </td>
                    <td className="truncate px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${service.is_active ? "text-emerald-700" : "text-slate-400"}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${service.is_active ? "bg-emerald-500" : "bg-slate-300"}`}
                        />
                        {service.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onEditService(service)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-ndmu-green-700 transition hover:border-ndmu-green-400 hover:bg-ndmu-green-50"
                      >
                        <span className="material-symbols-outlined text-sm">
                          edit
                        </span>
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

function CatalogSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((item) => (
        <div
          key={item}
          className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white"
        >
          <div className="flex items-center gap-3 border-b border-slate-100 p-5">
            <div className="h-11 w-11 rounded-xl bg-slate-100" />
            <div className="flex-1">
              <div className="h-4 w-48 rounded bg-slate-100" />
              <div className="mt-2 h-3 w-80 max-w-full rounded bg-slate-100" />
            </div>
          </div>
          <div className="space-y-3 p-5">
            {[1, 2, 3].map((row) => (
              <div key={row} className="h-8 rounded bg-slate-100" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FormFieldBuilder({ fields, onChange }) {
  const addField = () => {
    onChange([
      ...fields,
      {
        id: `field_${Date.now()}`,
        label: "",
        type: "text",
        placeholder: "",
        required: false,
        options: [],
      },
    ]);
  };

  const updateField = (index, changes) => {
    onChange(
      fields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...changes } : field,
      ),
    );
  };

  const moveField = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= fields.length) return;
    const reordered = [...fields];
    [reordered[index], reordered[nextIndex]] = [
      reordered[nextIndex],
      reordered[index],
    ];
    onChange(reordered);
  };

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <span className="material-symbols-outlined text-[17px] text-ndmu-green-700">
              dynamic_form
            </span>
            Request form fields
          </div>
          <p className="mt-0.5 text-[10px] text-slate-500">
            These fields appear after the requestor selects this service.
          </p>
        </div>
        <button
          type="button"
          onClick={addField}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-ndmu-green-50 px-3 py-2 font-bold text-ndmu-green-800 transition hover:bg-ndmu-green-100"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>Add
          field
        </button>
      </div>

      <div className="space-y-3 p-3">
        {fields.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center">
            <span className="material-symbols-outlined text-2xl text-slate-300">
              view_list
            </span>
            <p className="mt-1 font-semibold text-slate-600">
              No additional information required
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              The service will only ask for the standard ticket details.
            </p>
          </div>
        ) : (
          fields.map((field, index) => {
            const optionsValue = Array.isArray(field.options)
              ? field.options.join("\n")
              : field.options || "";
            return (
              // The internal field key is editable, so it cannot be used as
              // React's element key. Doing so remounts this row on every
              // keystroke and makes the input lose focus.
              <div
                key={`field-row-${index}`}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-slate-100 px-1.5 text-[10px] font-black text-slate-500">
                    {index + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveField(index, -1)}
                      title="Move up"
                      className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-25"
                    >
                      <span className="material-symbols-outlined text-base">
                        arrow_upward
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={index === fields.length - 1}
                      onClick={() => moveField(index, 1)}
                      title="Move down"
                      className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-25"
                    >
                      <span className="material-symbols-outlined text-base">
                        arrow_downward
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onChange(
                          fields.filter(
                            (_, fieldIndex) => fieldIndex !== index,
                          ),
                        )
                      }
                      title="Remove field"
                      className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <span className="material-symbols-outlined text-base">
                        delete
                      </span>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">
                      Field label <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      value={field.label || ""}
                      onChange={(e) =>
                        updateField(index, { label: e.target.value })
                      }
                      placeholder="e.g. Device model"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-ndmu-green-600 focus:ring-2 focus:ring-ndmu-green-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">
                      Answer type
                    </label>
                    <select
                      value={field.type || "text"}
                      onChange={(e) =>
                        updateField(index, {
                          type: e.target.value,
                          options:
                            e.target.value === "select" ? field.options : [],
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-ndmu-green-600 focus:ring-2 focus:ring-ndmu-green-100"
                    >
                      <option value="text">Short text</option>
                      <option value="textarea">Long text</option>
                      <option value="select">Dropdown</option>
                      <option value="email">Email</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">
                      Internal field key{" "}
                      <span className="font-normal text-slate-400">
                        (unique)
                      </span>
                    </label>
                    <input
                      required
                      pattern="[A-Za-z0-9_-]+"
                      value={field.id || ""}
                      onChange={(e) =>
                        updateField(index, { id: e.target.value })
                      }
                      placeholder="device_model"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-[11px] outline-none focus:border-ndmu-green-600 focus:ring-2 focus:ring-ndmu-green-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700">
                      Placeholder / hint
                    </label>
                    <input
                      value={field.placeholder || ""}
                      onChange={(e) =>
                        updateField(index, { placeholder: e.target.value })
                      }
                      placeholder="Example shown inside the field"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-ndmu-green-600 focus:ring-2 focus:ring-ndmu-green-100"
                    />
                  </div>
                  {field.type === "select" && (
                    <div className="sm:col-span-2">
                      <label className="mb-1 block font-semibold text-slate-700">
                        Dropdown options{" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={optionsValue}
                        onChange={(e) =>
                          updateField(index, { options: e.target.value })
                        }
                        placeholder={"One option per line\nOption A\nOption B"}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-ndmu-green-600 focus:ring-2 focus:ring-ndmu-green-100"
                      />
                    </div>
                  )}
                </div>
                <label className="mt-3 flex items-center gap-2 font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(field.required)}
                    onChange={(e) =>
                      updateField(index, { required: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-ndmu-green-700 focus:ring-ndmu-green-600"
                  />
                  Required response
                </label>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function IconField({ value, onChange }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="font-semibold text-slate-700">Category Icon</label>
        <span className="text-[10px] text-slate-400">Material Symbol</span>
      </div>
      <div className="flex min-h-10 overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-ndmu-green-600 focus-within:ring-2 focus-within:ring-ndmu-green-100">
        <div className="flex w-11 shrink-0 items-center justify-center border-r border-slate-200 bg-ndmu-green-50 text-ndmu-green-800">
          <span className="material-symbols-outlined text-[20px]">
            {value || "category"}
          </span>
        </div>
        <input
          list="catalog-icon-options"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search or enter an icon name"
          className="min-w-0 flex-1 px-3 py-2 outline-none"
        />
      </div>
      <datalist id="catalog-icon-options">
        {catalogIcons.map((icon) => (
          <option key={icon} value={icon} />
        ))}
      </datalist>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {catalogIcons.map((icon) => (
          <button
            key={icon}
            type="button"
            onClick={() => onChange(icon)}
            title={icon}
            className={`grid h-8 w-8 place-items-center rounded-lg border transition ${value === icon ? "border-ndmu-green-700 bg-ndmu-green-700 text-white" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-ndmu-green-400 hover:text-ndmu-green-800"}`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {icon}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
