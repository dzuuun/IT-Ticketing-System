const express = require("express");
const router = express.Router();
const kbController = require("./kb.controller");
const { authenticate, requireRole } = require("../../auth/middleware");

router.get("/", kbController.getArticles);
router.get("/manage/articles", authenticate, requireRole("admin"), kbController.getManagedArticles);
router.post(
  "/",
  authenticate,
  requireRole("admin"),
  kbController.createArticle,
);
router.get("/:slug", kbController.getArticleBySlug);
router.patch("/:id", authenticate, requireRole("admin"), kbController.updateArticle);
router.patch("/:id/publication", authenticate, requireRole("admin"), kbController.setPublication);
router.post("/:id/helpful", kbController.markHelpful);

module.exports = router;
