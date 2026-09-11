const express = require("express");
const { authenticate, requireRole } = require("../../auth/middleware");
const controller = require("./settings.controller");
const router = express.Router();
router.get("/", authenticate, requireRole("admin"), controller.getSettings);
router.put("/", authenticate, requireRole("admin"), controller.updateSettings);
module.exports = router;
