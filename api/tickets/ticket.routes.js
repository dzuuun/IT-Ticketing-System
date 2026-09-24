const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const ticketController = require("./ticket.controller");
const {
  authenticate,
  optionalAuthenticate,
  requireRole,
} = require("../../auth/middleware");
const upload = require("../middleware/upload");

const publicTicketWriteLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: (req) => Boolean(req.user),
});

// Public / Guest routes
router.post("/guest-track", ticketController.getGuestTicket);
router.get("/guest/:token", ticketController.getGuestTicketByToken);
router.post(
  "/guest/:token/replies",
  publicTicketWriteLimit,
  upload.ticketAttachments,
  ticketController.postGuestReply,
);

// Create ticket (authenticated user or guest with optional token)
router.post(
  "/",
  optionalAuthenticate,
  publicTicketWriteLimit,
  upload.ticketAttachments,
  ticketController.createTicket,
);

// Get tickets (authenticated)
router.get("/", authenticate, ticketController.getTickets);

// Get single ticket details
router.get(
  "/:identifier",
  authenticate,
  ticketController.getTicketByIdOrNumber,
);

// Post a reply / internal note (supports attachments)
router.post(
  "/:ticketId/messages",
  authenticate,
  upload.ticketAttachments,
  ticketController.postMessage,
);

// Triage ticket (MIS Staff only: Admin & Technician)
router.patch(
  "/:ticketId/triage",
  authenticate,
  requireRole("admin", "technician"),
  ticketController.triageTicket,
);

// Update status
router.patch(
  "/:ticketId/status",
  authenticate,
  requireRole("admin", "technician", "team_leader"),
  ticketController.updateTicketStatus,
);

// Technician marks as resolved
router.post(
  "/:ticketId/resolve",
  authenticate,
  requireRole("admin", "technician"),
  ticketController.resolveTicket,
);

// Requestor confirms resolution or reopens
router.post(
  "/:ticketId/confirm-resolution",
  authenticate,
  requireRole("requestor"),
  ticketController.confirmResolution,
);

module.exports = router;
