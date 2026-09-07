const express = require('express');
const router = express.Router();
const categoryController = require('./category.controller');
const { authenticate, requireRole } = require('../../auth/middleware');

router.get('/', categoryController.getCategories);
router.get('/admin', authenticate, requireRole('admin'), categoryController.getAdminCategories);
router.post('/', authenticate, requireRole('admin'), categoryController.createCategory);
router.post('/subcategories', authenticate, requireRole('admin'), categoryController.createSubcategory);
router.patch('/:categoryId', authenticate, requireRole('admin'), categoryController.updateCategory);
router.patch('/subcategories/:subcategoryId', authenticate, requireRole('admin'), categoryController.updateSubcategory);

module.exports = router;
