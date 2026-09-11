const express = require("express");
const router = express.Router();
const authController = require("./controller");
const { authenticate } = require("./middleware");

router.post("/register", authController.register);
router.get("/setup/status", authController.getSetupStatus);
router.post("/setup", authController.setup);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", authenticate, authController.getMe);
router.post("/change-password", authenticate, authController.updatePassword);

module.exports = router;
