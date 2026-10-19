const express = require("express");
const router = express.Router();
const authController = require("./controller");
const { authenticate } = require("./middleware");
const { getGoogleConfiguration, authenticateGoogle } = require("./google");

router.post("/register", authController.register);
router.get("/setup/status", authController.getSetupStatus);
router.post("/setup", authController.setup);
router.post("/login", authController.login);
router.get("/google/config", getGoogleConfiguration);
router.post("/google", authenticateGoogle, authController.googleLogin);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", authenticate, authController.getMe);
router.post("/change-password", authenticate, authController.updatePassword);

module.exports = router;
