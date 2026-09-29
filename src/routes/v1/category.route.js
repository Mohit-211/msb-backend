const express = require('express');
const router = express.Router();

const { categoryController } = require('../../controllers');
const adminMiddleware = require('../../middlewares/admin.middleware');

router.post('/createCategory', [adminMiddleware.validateJWTtoken], categoryController.createCategory);
router.get('/all', categoryController.getAllCategorys);
router.get('/getCategoryById',categoryController.findCategoryById);
router.put('/updateCategory', [adminMiddleware.validateJWTtoken], categoryController.updateCategory);
router.delete('/deleteCategory', [adminMiddleware.validateJWTtoken], categoryController.deleteCategory);


module.exports = router;