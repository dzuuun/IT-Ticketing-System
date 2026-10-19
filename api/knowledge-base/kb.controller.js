const service = require("./kb.service");

function failure(res, error) {
  if (!error.status) console.error("[Knowledge Base Error]:", error.message);
  return res.status(error.status || 500).json({
    success: false,
    message: error.status ? error.message : "Unable to complete the knowledge base request.",
  });
}
async function getArticles(req, res) {
  try { return res.json({ success: true, ...await service.getArticles(req.query) }); }
  catch (error) { return failure(res, error); }
}
async function getManagedArticles(req, res) {
  try { return res.json({ success: true, ...await service.getArticles(req.query, true) }); }
  catch (error) { return failure(res, error); }
}
async function getArticleBySlug(req, res) {
  try { return res.json({ success: true, article: await service.getArticleBySlug(req.params.slug) }); }
  catch (error) { return failure(res, error); }
}
async function createArticle(req, res) {
  try {
    const article = await service.createArticle(req.body, req.user.id);
    return res.status(201).json({ success: true, article,
      message: article.is_published ? "Knowledge base article published." : "Knowledge base article saved as unpublished." });
  } catch (error) { return failure(res, error); }
}
async function updateArticle(req, res) {
  try {
    const article = await service.updateArticle(req.params.id, req.body);
    return res.json({ success: true, article, message: "Knowledge base article updated." });
  } catch (error) { return failure(res, error); }
}
async function setPublication(req, res) {
  try {
    const article = await service.setPublication(req.params.id, req.body?.is_published);
    return res.json({ success: true, article,
      message: article.is_published ? "Article published." : "Article unpublished. It is now hidden from the public knowledge base." });
  } catch (error) { return failure(res, error); }
}
async function markHelpful(req, res) {
  try {
    await service.markHelpful(req.params.id);
    return res.json({ success: true, message: "Feedback recorded. Thank you!" });
  } catch (error) { return failure(res, error); }
}

module.exports = { getArticles, getManagedArticles, getArticleBySlug,
  createArticle, updateArticle, setPublication, markHelpful };
