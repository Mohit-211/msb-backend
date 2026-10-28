const express = require('express');
const router = express.Router();

const { categoryController } = require('../../controllers');
const { adminAuth } = require('../../middlewares/access.middleware');

router.post('/createCategory', adminAuth, categoryController.createCategory);
router.get('/all', categoryController.getAllCategorys);
router.get('/getCategoryById',categoryController.findCategoryById);
router.get('/getCategoryBySlug', categoryController.findCategoryBySlug);
router.put('/updateCategory', adminAuth, categoryController.updateCategory);
router.delete('/deleteCategory', adminAuth, categoryController.deleteCategory);


module.exports = router;
