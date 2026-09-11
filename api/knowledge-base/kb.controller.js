const { query } = require("../../db/index");

async function getArticles(req, res) {
  try {
    const { category, search } = req.query;
    let sql =
      "SELECT id, title, slug, category, summary, views, helpful_count, created_at FROM knowledge_base WHERE is_published = 1";
    const params = [];

    if (category) {
      sql += " AND category = ?";
      params.push(category);
    }
    if (search) {
      sql += " AND (title LIKE ? OR summary LIKE ? OR content LIKE ?)";
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += " ORDER BY views DESC, id DESC";
    const articles = await query(sql, params);
    const categoryRows = await query(
      "SELECT DISTINCT category FROM knowledge_base WHERE is_published = 1 ORDER BY category",
    );
    return res.json({
      success: true,
      articles,
      categories: categoryRows.map((row) => row.category),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch knowledge base articles.",
    });
  }
}

async function getArticleBySlug(req, res) {
  try {
    const { slug } = req.params;
    const articles = await query(
      "SELECT * FROM knowledge_base WHERE slug = ? AND is_published = 1",
      [slug],
    );
    if (articles.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Article not found." });
    }

    const article = articles[0];
    // Increment view count
    await query("UPDATE knowledge_base SET views = views + 1 WHERE id = ?", [
      article.id,
    ]);

    return res.json({ success: true, article });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch article." });
  }
}

function makeSlug(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 220);
}

async function createArticle(req, res) {
  try {
    const title = String(req.body.title || "").trim();
    const requestedCategory = String(req.body.category || "").trim();
    const summary = String(req.body.summary || "").trim();
    const content = String(req.body.content || "").trim();
    if (!title || !requestedCategory || !summary || !content) {
      return res.status(400).json({
        success: false,
        message: "Title, category, summary, and article content are required.",
      });
    }
    if (
      title.length > 255 ||
      requestedCategory.length > 100 ||
      summary.length > 500
    ) {
      return res.status(400).json({
        success: false,
        message: "One or more fields exceed the allowed length.",
      });
    }
    const catalogCategories = await query(
      "SELECT name FROM categories WHERE name = ? AND is_active = 1 LIMIT 1",
      [requestedCategory],
    );
    if (catalogCategories.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select an active category from the Service Catalog.",
      });
    }
    const category = catalogCategories[0].name;

    const baseSlug = makeSlug(title) || `article-${Date.now()}`;
    let slug = baseSlug;
    let suffix = 2;
    while (
      (
        await query("SELECT id FROM knowledge_base WHERE slug = ? LIMIT 1", [
          slug,
        ])
      ).length > 0
    ) {
      slug = `${baseSlug.slice(0, 245)}-${suffix}`;
      suffix += 1;
    }

    const result = await query(
      `INSERT INTO knowledge_base
       (title, slug, category, summary, content, author_id, is_published)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [title, slug, category, summary, content, req.user.id],
    );
    return res.status(201).json({
      success: true,
      message: "Knowledge base article published.",
      article: { id: result.insertId, slug },
    });
  } catch (error) {
    console.error("[Create Knowledge Base Article Error]:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to publish knowledge base article.",
    });
  }
}

async function markHelpful(req, res) {
  try {
    const { id } = req.params;
    await query(
      "UPDATE knowledge_base SET helpful_count = helpful_count + 1 WHERE id = ?",
      [id],
    );
    return res.json({
      success: true,
      message: "Feedback recorded. Thank you!",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to record feedback." });
  }
}

module.exports = {
  getArticles,
  getArticleBySlug,
  markHelpful,
  createArticle,
};
