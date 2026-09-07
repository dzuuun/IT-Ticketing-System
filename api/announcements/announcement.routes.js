const express = require('express');
const router = express.Router();
const announcementController = require('./announcement.controller');
const { authenticate, requireRole } = require('../../auth/middleware');

router.get('/', announcementController.getAnnouncements);
router.post('/', authenticate, requireRole('admin', 'team_leader'), announcementController.createAnnouncement);

module.exports = router;
