const express = require("express");
const router = express.Router();
const teamController = require("./team.controller");
const { authenticate, requireRole } = require("../../auth/middleware");

router.get("/", authenticate, teamController.getTeams);
router.post("/", authenticate, requireRole("admin"), teamController.createTeam);
router.patch(
  "/:teamId",
  authenticate,
  requireRole("admin"),
  teamController.updateTeam,
);
router.post(
  "/:teamId/members",
  authenticate,
  requireRole("admin"),
  teamController.addTeamMember,
);
router.delete(
  "/:teamId/members/:userId",
  authenticate,
  requireRole("admin"),
  teamController.removeTeamMember,
);

module.exports = router;
