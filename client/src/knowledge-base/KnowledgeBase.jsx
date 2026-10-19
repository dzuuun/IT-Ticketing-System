import React, { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Modal from "../components/Modal";
import ConfirmForm from "../components/ConfirmForm";

const emptyArticle = { title: "", category: "", summary: "", content: "", is_published: true };

const categoryIcon = (category = "") => {
  const value = category.toLowerCase();
  if (value.includes("network")) return "wifi";
  if (value.includes("account") || value.includes("access"))
    return "account_circle";
  if (value.includes("software") || value.includes("system")) return "terminal";
  if (value.includes("hardware") || value.includes("device")) return "computer";
  if (value.includes("print")) return "print";
  return "menu_book";
};

export default function KnowledgeBase({ manage = false }) {
  const { isAdmin, loading: authLoading } = useAuth();
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [catalogCategories, setCatalogCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [articleForm, setArticleForm] = useState(emptyArticle);
  const [publishing, setPublishing] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [publicationFilter, setPublicationFilter] = useState("all");
  const [publicationTarget, setPublicationTarget] = useState(null);
  const categoryPickerRef = useRef(null);

  useEffect(() => {
    const closeCategoryPicker = (event) => {
      if (!categoryPickerRef.current?.contains(event.target))
        setCategoryOpen(false);
    };
    document.addEventListener("mousedown", closeCategoryPicker);
    return () => document.removeEventListener("mousedown", closeCategoryPicker);
  }, []);

  useEffect(() => {
    let active = true;
    api
      .get("/categories")
      .then((response) => {
        if (active && response.data?.success)
          setCatalogCategories(response.data.categories || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const fetchArticles = async (
    category = selectedCategory,
    search = searchTerm,
    status = publicationFilter,
  ) => {
    if (manage && (authLoading || !isAdmin)) return;
    setLoading(true);
    setLoadError("");
    try {
      const res = await api.get(manage ? "/kb/manage/articles" : "/kb", {
        params: {
          category: category !== "all" ? category : undefined,
          search: search.trim() || undefined,
          status: manage ? status : undefined,
        },
      });
      if (res.data.success) {
        setArticles(res.data.articles || []);
        setCategories(res.data.categories || []);
      }
    } catch {
      setLoadError("The knowledge base could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(
      () => fetchArticles(selectedCategory, searchTerm, publicationFilter),
      250,
    );
    return () => clearTimeout(timer);
  }, [selectedCategory, searchTerm, publicationFilter, manage, isAdmin, authLoading]);

  const handlePublish = async (event) => {
    event.preventDefault();
    setPublishing(true);
    try {
      if (editingId) await api.patch(`/kb/${editingId}`, articleForm);
      else await api.post("/kb", articleForm);
      setArticleForm(emptyArticle);
      setCreateOpen(false);
      setCategoryOpen(false);
      setSelectedCategory("all");
      setSearchTerm("");
      setPublicationFilter("all");
      await fetchArticles("all", "", "all");
    } catch (error) {
      alert(error.response?.data?.message || "Unable to save the article.");
    } finally {
      setPublishing(false);
    }
  };

  const openEditor = (article) => {
    setEditingId(article?.id || null);
    setArticleForm(article ? {
      title: article.title, category: article.category,
      summary: article.summary || "", content: article.content || "",
      is_published: Boolean(Number(article.is_published)),
    } : { ...emptyArticle, is_published: !manage });
    setCategoryOpen(false);
    setCreateOpen(true);
  };
  const changePublication = async () => {
    setPublishing(true);
    try {
      await api.patch(`/kb/${publicationTarget.id}/publication`, {
        is_published: !Boolean(Number(publicationTarget.is_published)),
      });
      setPublicationTarget(null);
      await fetchArticles();
    } catch (error) {
      alert(error.response?.data?.message || "Unable to change article visibility.");
    } finally { setPublishing(false); }
  };
  const pickerCategories = editingId && articleForm.category &&
    !catalogCategories.some((category) => category.name === articleForm.category)
    ? [...catalogCategories, { id: "current", name: articleForm.category }]
    : catalogCategories;

  if (manage && !authLoading && !isAdmin) return <Navigate to="/kb" replace />;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-3xl bg-ndmu-green-950 px-6 py-8 text-white shadow-lg sm:px-10 sm:py-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-ndmu-green-700/45 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-ndmu-gold-400/15 blur-3xl" />
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-white/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-ndmu-gold-300">
              <span className="material-symbols-outlined text-sm">
                auto_stories
              </span>
              ICT-MIS Help Center
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              {manage ? "Manage knowledge base" : "Find answers. Solve it faster."}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-100/70">
              {manage
                ? "Create and edit guides, save unpublished articles, and choose what appears in the public knowledge base."
                : "Browse campus technology guides, account instructions, and practical troubleshooting steps maintained by ICT-MIS."}
            </p>
          </div>
          {!authLoading && isAdmin && (
            <div className="flex flex-wrap items-center gap-3">
            <Link
              to={manage ? "/kb" : "/admin/knowledge-base"}
              className="rounded-xl border border-emerald-100/40 px-4 py-3 text-xs font-bold hover:bg-white/10"
            >
              {manage ? "View public knowledge base" : "Manage articles"}
            </Link>
            <button
              type="button"
              onClick={() => openEditor(null)}
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-ndmu-gold-400 px-4 py-3 text-xs font-extrabold text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-ndmu-gold-300 hover:shadow-md"
            >
              <span className="material-symbols-outlined text-lg">
                note_add
              </span>
              Add knowledge article
            </button>
            </div>
          )}
        </div>

        <div className="relative mt-7 max-w-3xl">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-slate-400">
            search
          </span>
          <input
            type="search"
            placeholder="Search Wi-Fi, account access, Schoology, devices..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-2xl border border-white/20 bg-white py-3.5 pl-12 pr-12 text-sm text-slate-900 shadow-xl outline-none transition placeholder:text-slate-400 focus:ring-4 focus:ring-ndmu-gold-400/30"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          )}
        </div>
      </section>

      <section className="mt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ndmu-green-700">
              Browse resources
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950">
              Knowledge articles
            </h2>
          </div>
          {manage && (
            <select
              aria-label="Publication status"
              value={publicationFilter}
              onChange={(event) => setPublicationFilter(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
            >
              <option value="all">All statuses</option>
              <option value="published">Published</option>
              <option value="unpublished">Unpublished</option>
            </select>
          )}
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1 sm:justify-end">
            {["all", ...categories].map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`shrink-0 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${selectedCategory === category ? "border-ndmu-green-700 bg-ndmu-green-700 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-ndmu-green-300 hover:text-ndmu-green-800"}`}
              >
                {category === "all" ? "All articles" : category}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div
                  key={item}
                  className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <div className="h-10 w-10 rounded-xl bg-slate-100" />
                  <div className="mt-5 h-4 w-4/5 rounded bg-slate-100" />
                  <div className="mt-3 h-3 w-full rounded bg-slate-100" />
                  <div className="mt-2 h-3 w-2/3 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-rose-200 bg-white px-6 py-12 text-center">
              <span className="material-symbols-outlined text-3xl text-rose-400">
                cloud_off
              </span>
              <p className="mt-2 text-sm font-bold text-slate-800">
                {loadError}
              </p>
              <button
                type="button"
                onClick={() => fetchArticles()}
                className="mt-4 rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700"
              >
                Try again
              </button>
            </div>
          ) : articles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300">
                search_off
              </span>
              <h3 className="mt-2 text-base font-extrabold text-slate-800">
                No matching articles
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Try a different search term or browse all categories.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("all");
                  setPublicationFilter("all");
                }}
                className="mt-4 text-xs font-bold text-ndmu-green-700 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : manage ? (
            <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {articles.map((article) => (
                <article key={article.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900">{article.title}</h3>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${Number(article.is_published) ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                        {Number(article.is_published) ? "Published" : "Unpublished"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ndmu-green-700">{article.category}</p>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{article.summary}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                    {Number(article.is_published) === 1 && (
                      <Link to={`/kb/${article.slug}`} className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100">View</Link>
                    )}
                    <button type="button" disabled={publishing} onClick={() => openEditor(article)} className="rounded-lg bg-ndmu-green-50 px-3 py-2 text-ndmu-green-800 disabled:opacity-50">Edit</button>
                    <button type="button" disabled={publishing} onClick={() => setPublicationTarget(article)} className="rounded-lg border border-slate-300 px-3 py-2 text-slate-700 disabled:opacity-50">
                      {Number(article.is_published) ? "Unpublish" : "Publish"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {articles.map((article) => (
                <Link
                  key={article.id}
                  to={`/kb/${article.slug}`}
                  className="group flex min-h-56 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-ndmu-green-300 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-ndmu-green-50 text-ndmu-green-700 transition group-hover:bg-ndmu-green-700 group-hover:text-white">
                      <span className="material-symbols-outlined text-xl">
                        {categoryIcon(article.category)}
                      </span>
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide text-slate-500">
                      {article.category}
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-extrabold leading-6 text-slate-900 transition-colors group-hover:text-ndmu-green-800">
                    {article.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500">
                    {article.summary}
                  </p>
                  <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4 text-[11px]">
                    <span className="flex items-center gap-3 text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">
                          visibility
                        </span>
                        {article.views || 0}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">
                          thumb_up
                        </span>
                        {article.helpful_count || 0}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-ndmu-green-700">
                      Read guide
                      <span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-1">
                        arrow_forward
                      </span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-7 flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-ndmu-gold-50 text-ndmu-gold-800">
            <span className="material-symbols-outlined">support_agent</span>
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              Still need help?
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Send the ICT-MIS team a request with the details of your issue.
            </p>
          </div>
        </div>
        <Link
          to="/submit"
          className="inline-flex items-center gap-2 rounded-xl bg-ndmu-green-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-ndmu-green-600"
        >
          <span className="material-symbols-outlined text-lg">add_task</span>
          Submit a request
        </Link>
      </section>

      <Modal
        isOpen={createOpen}
        onClose={() => !publishing && setCreateOpen(false)}
        title={editingId ? "Edit Knowledge Base Article" : "New Knowledge Base Article"}
        maxWidth="max-w-3xl"
      >
        <ConfirmForm
          onConfirm={handlePublish}
          title={editingId ? "Save article changes?" : "Save knowledge base article?"}
          description={articleForm.is_published ? "The saved article will be visible in the public knowledge base." : "The saved article will be hidden from the public knowledge base."}
          confirmLabel="Save article"
          className="space-y-4 text-xs"
        >
          <div className="rounded-xl border border-ndmu-green-200 bg-ndmu-green-50 px-4 py-3 text-ndmu-green-900">
            {articleForm.is_published ? "This article will be published for all users." : "This article will remain unpublished and can be edited here."}
          </div>
          <div>
            <label className="mb-1.5 block font-bold text-slate-700">
              Article title <span className="text-rose-500">*</span>
            </label>
            <input
              required
              maxLength={255}
              value={articleForm.title}
              onChange={(event) =>
                setArticleForm({ ...articleForm, title: event.target.value })
              }
              placeholder="A clear, task-focused title"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-ndmu-green-600 focus:ring-4 focus:ring-ndmu-green-100"
            />
          </div>
          <div ref={categoryPickerRef} className="relative">
            <label className="mb-1.5 block font-bold text-slate-700">
              Category <span className="text-rose-500">*</span>
            </label>
            <div
              className={`flex overflow-hidden rounded-xl border bg-white transition focus-within:ring-4 focus-within:ring-ndmu-green-100 ${categoryOpen ? "border-ndmu-green-600" : "border-slate-300"}`}
            >
              <span className="material-symbols-outlined grid w-11 shrink-0 place-items-center border-r border-slate-200 bg-slate-50 text-lg text-ndmu-green-700">
                {categoryIcon(articleForm.category)}
              </span>
              <input
                required
                readOnly
                value={articleForm.category}
                onClick={() => setCategoryOpen(true)}
                placeholder="Select a service catalog category"
                className="min-w-0 flex-1 cursor-pointer px-3 py-2.5 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setCategoryOpen((open) => !open)}
                aria-label="Toggle category options"
                aria-expanded={categoryOpen}
                className="grid w-10 shrink-0 place-items-center text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              >
                <span
                  className={`material-symbols-outlined text-lg transition-transform ${categoryOpen ? "rotate-180" : ""}`}
                >
                  expand_more
                </span>
              </button>
            </div>
            {categoryOpen && (
              <div className="absolute z-30 mt-1.5 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                {pickerCategories.length > 0 ? (
                  pickerCategories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => {
                        setArticleForm({
                          ...articleForm,
                          category: category.name,
                        });
                        setCategoryOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition ${articleForm.category === category.name ? "bg-ndmu-green-50 text-ndmu-green-800" : "text-slate-700 hover:bg-slate-50"}`}
                    >
                      <span className="material-symbols-outlined text-[17px] text-ndmu-green-700">
                        {category.icon || categoryIcon(category.name)}
                      </span>
                      <span className="flex-1">{category.name}</span>
                      {articleForm.category === category.name && (
                        <span className="material-symbols-outlined text-[17px] text-ndmu-green-700">
                          check
                        </span>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-4 text-center">
                    <p className="text-xs font-semibold text-slate-600">
                      No active catalog categories found
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      Add or activate a category in Service Catalog first.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <div className="mb-1.5 flex justify-between">
              <label className="font-bold text-slate-700">
                Short summary <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">
                {articleForm.summary.length}/500
              </span>
            </div>
            <textarea
              required
              maxLength={500}
              rows={3}
              value={articleForm.summary}
              onChange={(event) =>
                setArticleForm({ ...articleForm, summary: event.target.value })
              }
              placeholder="Explain what this guide helps the reader accomplish."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm leading-5 outline-none focus:border-ndmu-green-600 focus:ring-4 focus:ring-ndmu-green-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block font-bold text-slate-700">
              Article content <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={12}
              value={articleForm.content}
              onChange={(event) =>
                setArticleForm({ ...articleForm, content: event.target.value })
              }
              placeholder={
                "Write clear instructions. Use numbered steps where possible.\n\n1. First step\n2. Second step\n3. Expected result"
              }
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-xs leading-6 outline-none focus:border-ndmu-green-600 focus:ring-4 focus:ring-ndmu-green-100"
            />
          </div>
          <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 font-bold text-slate-700">
            <input
              type="checkbox"
              checked={articleForm.is_published}
              onChange={(event) => setArticleForm({ ...articleForm, is_published: event.target.checked })}
            />
            Published — visible in the public knowledge base
          </label>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={publishing}
              onClick={() => setCreateOpen(false)}
              className="rounded-xl bg-slate-100 px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={publishing}
              className="inline-flex items-center gap-2 rounded-xl bg-ndmu-green-700 px-5 py-2.5 font-bold text-white hover:bg-ndmu-green-600 disabled:opacity-60"
            >
              <span
                className={`material-symbols-outlined text-base ${publishing ? "animate-spin" : ""}`}
              >
                {publishing ? "progress_activity" : "publish"}
              </span>
              {publishing ? "Saving..." : "Save article"}
            </button>
          </div>
        </ConfirmForm>
      </Modal>
      <Modal
        isOpen={Boolean(publicationTarget)}
        onClose={() => !publishing && setPublicationTarget(null)}
        title={Number(publicationTarget?.is_published) ? "Unpublish article?" : "Publish article?"}
      >
        <p className="text-sm text-slate-700">
          {Number(publicationTarget?.is_published)
            ? `Hide “${publicationTarget.title}” from the public knowledge base? You can edit and publish it again later.`
            : `Make “${publicationTarget?.title}” visible in the public knowledge base?`}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" disabled={publishing} onClick={() => setPublicationTarget(null)} className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold">Cancel</button>
          <button type="button" disabled={publishing} onClick={changePublication} className="rounded-lg bg-ndmu-green-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {publishing ? "Saving..." : Number(publicationTarget?.is_published) ? "Unpublish" : "Publish"}
          </button>
        </div>
      </Modal>
    </main>
  );
}
