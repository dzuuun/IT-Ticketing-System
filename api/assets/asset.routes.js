const express = require("express");
const { authenticate, requireRole } = require("../../auth/middleware");
const controller = require("./asset.controller");

const router = express.Router();
// Location names are safe lookup data for the public request form. New values
// are persisted only when a request is successfully submitted.
router.get("/public-locations", controller.getLocations);
router.use(authenticate, requireRole("admin"));
router.get("/categories", controller.getCategories);
router.post("/categories", controller.createCategory);
router.get("/locations", controller.getLocations);
router.get("/locations/manage", controller.getManagedLocations);
router.post("/locations", controller.createLocation);
router.patch("/locations/:locationId", controller.updateLocation);
router.get("/maintenance-templates", controller.getMaintenanceTemplates);
router.post("/maintenance-templates", controller.createMaintenanceTemplate);
router.patch(
  "/maintenance-templates/:templateId",
  controller.updateMaintenanceTemplate,
);
router.get("/", controller.getAssets);
router.post("/", controller.createAsset);
router.get("/:assetId", controller.getAsset);
router.patch("/:assetId", controller.updateAsset);
router.post("/:assetId/maintenance", controller.addMaintenanceLog);

module.exports = router;
