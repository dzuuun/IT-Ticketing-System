const express = require('express');
const router = express.Router();
const teamController = require('./team.controller');
const { authenticate, requireRole } = require('../../auth/middleware');

router.get('/', authenticate, teamController.getTeams);
router.post('/', authenticate, requireRole('admin'), teamController.createTeam);
router.patch('/:teamId', authenticate, requireRole('admin'), teamController.updateTeam);

module.exports = router;
