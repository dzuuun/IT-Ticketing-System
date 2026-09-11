const express = require("express");
const router = express.Router();
const departmentController = require("./department.controller");
const { authenticate, requireRole } = require("../../auth/middleware");

router.get("/", departmentController.getDepartments);
router.post(
  "/bulk-import",
  authenticate,
  requireRole("admin"),
  departmentController.bulkImportDepartments,
);
router.post(
  "/",
  authenticate,
  requireRole("admin"),
  departmentController.createDepartment,
);
router.patch(
  "/:departmentId",
  authenticate,
  requireRole("admin"),
  departmentController.updateDepartment,
);

module.exports = router;
