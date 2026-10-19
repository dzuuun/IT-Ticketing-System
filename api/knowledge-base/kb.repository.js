const { query } = require("../../db");

async function listArticles({ category, search, status, manage = false }) {
  const conditions = [];
  const params = [];
  if (!manage || status === "published") conditions.push("is_published = 1");
  if (manage && status === "unpublished") conditions.push("is_published = 0");
  if (category) { conditions.push("category = ?"); params.push(category); }
  if (search) {
    conditions.push("(title LIKE ? OR summary LIKE ? OR content LIKE ?)");
    params.push(...Array(3).fill(`%${search}%`));
  }
  const fields = manage ? "*" : "id, title, slug, category, summary, views, helpful_count, created_at";
  return query(
    `SELECT ${fields} FROM knowledge_base ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
     ORDER BY ${manage ? "updated_at DESC" : "views DESC"}, id DESC`,
    params,
  );
}

const listCategories = (manage) => query(
  `SELECT DISTINCT category FROM knowledge_base ${manage ? "" : "WHERE is_published = 1"} ORDER BY category`,
);
const findById = async (id) => (await query("SELECT * FROM knowledge_base WHERE id = ?", [id]))[0];
const findPublishedBySlug = async (slug) => (await query(
  "SELECT * FROM knowledge_base WHERE slug = ? AND is_published = 1", [slug],
))[0];
const slugExists = async (slug) => (await query(
  "SELECT id FROM knowledge_base WHERE slug = ? LIMIT 1", [slug],
)).length > 0;
const activeCategory = async (category) => (await query(
  "SELECT name FROM categories WHERE name = ? AND is_active = 1 LIMIT 1", [category],
))[0];
const createArticle = (article, slug, authorId) => query(
  `INSERT INTO knowledge_base (title, slug, category, summary, content, author_id, is_published)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
  [article.title, slug, article.category, article.summary, article.content, authorId, article.is_published ? 1 : 0],
);
const updateArticle = (id, article) => query(
  "UPDATE knowledge_base SET title = ?, category = ?, summary = ?, content = ?, is_published = ? WHERE id = ?",
  [article.title, article.category, article.summary, article.content, article.is_published ? 1 : 0, id],
);
const setPublication = (id, published) => query(
  "UPDATE knowledge_base SET is_published = ? WHERE id = ?", [published ? 1 : 0, id],
);
const incrementViews = (id) => query("UPDATE knowledge_base SET views = views + 1 WHERE id = ?", [id]);
const markHelpful = (id) => query(
  "UPDATE knowledge_base SET helpful_count = helpful_count + 1 WHERE id = ? AND is_published = 1", [id],
);

module.exports = { listArticles, listCategories, findById, findPublishedBySlug, slugExists,
  activeCategory, createArticle, updateArticle, setPublication, incrementViews, markHelpful };
