const express = require("express");
const router = express.Router();
const userController = require("./user.controller");
const { authenticate, requireRole } = require("../../auth/middleware");

router.get(
  "/technicians",
  authenticate,
  requireRole("admin", "team_leader", "technician", "encoder"),
  userController.getTechnicians,
);
router.get("/", authenticate, requireRole("admin"), userController.getAllUsers);
router.post(
  "/bulk-import",
  authenticate,
  requireRole("admin"),
  userController.bulkImportUsers,
);
router.post("/", authenticate, requireRole("admin"), userController.createUser);
router.patch(
  "/:userId/role",
  authenticate,
  requireRole("admin"),
  userController.updateUserRole,
);

module.exports = router;
