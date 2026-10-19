const repository = require("./kb.repository");

function fail(status, message) { throw Object.assign(new Error(message), { status }); }
function articleId(value) {
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)))
    fail(400, "Select a valid article.");
  return Number(value);
}
function publication(value) {
  if (typeof value !== "boolean") fail(400, "Published status must be true or false.");
  return value;
}
async function articleData(body = {}, existing) {
  const article = Object.fromEntries(["title", "category", "summary", "content"]
    .map((field) => [field, typeof body[field] === "string" ? body[field].trim() : ""]));
  if (Object.values(article).some((value) => !value))
    fail(400, "Title, category, summary, and article content are required.");
  if (article.title.length > 255 || article.category.length > 100 || article.summary.length > 500 || Buffer.byteLength(article.content, "utf8") > 65535)
    fail(400, "One or more fields exceed the allowed length.");
  if (!existing || article.category !== existing.category) {
    const category = await repository.activeCategory(article.category);
    if (!category) fail(400, "Select an active category from the Service Catalog.");
    article.category = category.name;
  }
  article.is_published = body.is_published === undefined
    ? (existing ? Boolean(existing.is_published) : true)
    : publication(body.is_published);
  return article;
}
async function existingArticle(id) {
  const article = await repository.findById(articleId(id));
  if (!article) fail(404, "Article not found.");
  return article;
}

async function getArticles(filters = {}, manage = false) {
  const status = filters.status || "all";
  if (manage && !["all", "published", "unpublished"].includes(status))
    fail(400, "Select a valid publication status.");
  const articles = await repository.listArticles({
    category: String(filters.category || "").trim(),
    search: String(filters.search || "").trim(), status, manage,
  });
  const categories = (await repository.listCategories(manage)).map((row) => row.category);
  return { articles, categories };
}
async function getArticleBySlug(slug) {
  const article = await repository.findPublishedBySlug(slug);
  if (!article) fail(404, "Article not found.");
  await repository.incrementViews(article.id);
  return article;
}
async function createArticle(body, authorId) {
  const article = await articleData(body);
  const base = article.title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 220)
    || `article-${Date.now()}`;
  for (let attempt = 0; attempt < 100; attempt++) {
    const slug = attempt ? `${base}-${attempt + 1}` : base;
    if (await repository.slugExists(slug)) continue;
    try {
      const result = await repository.createArticle(article, slug, authorId);
      return { ...article, id: result.insertId, slug };
    } catch (error) {
      if (error.code !== "ER_DUP_ENTRY") throw error;
    }
  }
  fail(409, "Unable to create a unique article link. Please change the title.");
}
async function updateArticle(id, body) {
  const existing = await existingArticle(id);
  const article = await articleData(body, existing);
  await repository.updateArticle(existing.id, article);
  // Keep the existing link, authorship, and feedback when editing an article.
  return { ...article, id: existing.id, slug: existing.slug };
}
async function setPublication(id, value) {
  const published = publication(value);
  const article = await existingArticle(id);
  await repository.setPublication(article.id, published);
  return { id: article.id, is_published: published };
}
async function markHelpful(id) {
  const result = await repository.markHelpful(articleId(id));
  if (!result.affectedRows) fail(404, "Article not found.");
}

module.exports = { getArticles, getArticleBySlug, createArticle, updateArticle, setPublication, markHelpful };
