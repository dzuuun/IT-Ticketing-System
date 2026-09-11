const express = require("express");
const router = express.Router();
const kbController = require("./kb.controller");
const { authenticate, requireRole } = require("../../auth/middleware");

router.get("/", kbController.getArticles);
router.post(
  "/",
  authenticate,
  requireRole("admin"),
  kbController.createArticle,
);
router.get("/:slug", kbController.getArticleBySlug);
router.post("/:id/helpful", kbController.markHelpful);

module.exports = router;
