const express = require("express");
const router = express.Router();
const announcementController = require("./announcement.controller");
const { authenticate, requireRole } = require("../../auth/middleware");

router.get("/", announcementController.getAnnouncements);
router.get(
  "/manage",
  authenticate,
  requireRole("admin"),
  announcementController.getManagedAnnouncements,
);
router.post(
  "/",
  authenticate,
  requireRole("admin"),
  announcementController.createAnnouncement,
);
router.patch(
  "/:announcementId",
  authenticate,
  requireRole("admin"),
  announcementController.updateAnnouncement,
);

module.exports = router;
