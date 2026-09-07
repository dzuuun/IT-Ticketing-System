const express = require('express');
const router = express.Router();

const ticketRoutes = require('./tickets/ticket.routes');
const categoryRoutes = require('./catalog/category.routes');
const departmentRoutes = require('./departments/department.routes');
const statsRoutes = require('./dashboard/stats.routes');
const userRoutes = require('./users/user.routes');
const kbRoutes = require('./knowledge-base/kb.routes');
const announcementRoutes = require('./announcements/announcement.routes');
const teamRoutes = require('./teams/team.routes');
const settingsRoutes = require('./settings/settings.routes');
const ticketController = require('./tickets/ticket.controller');
const upload = require('./middleware/upload');

router.use('/tickets', ticketRoutes);
router.use('/categories', categoryRoutes);
router.use('/departments', departmentRoutes);
router.use('/stats', statsRoutes);
router.use('/users', userRoutes);
router.use('/kb', kbRoutes);
router.use('/announcements', announcementRoutes);
router.use('/teams', teamRoutes);
router.use('/settings', settingsRoutes);
router.get('/guest/tickets/:token', ticketController.getGuestTicketByToken);
router.post('/guest/tickets/:token/replies', upload.array('attachments', 5), ticketController.postGuestReply);
router.post('/guest/tickets/:token/resolution', ticketController.confirmGuestResolution);

module.exports = router;
