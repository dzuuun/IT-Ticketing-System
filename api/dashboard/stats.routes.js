const express = require("express");
const router = express.Router();
const statsController = require("./stats.controller");
const { authenticate } = require("../../auth/middleware");

router.get("/dashboard", authenticate, statsController.getDashboardStats);

module.exports = router;
