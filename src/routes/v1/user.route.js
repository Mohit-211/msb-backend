const express = require('express');
const router = express.Router();

const { userController } = require('../../controllers');
const authMiddleware = require('../../middlewares/auth.middleware');



router.get('/profile', [authMiddleware.verifyAuthJWTToken], userController.getProfile);

router.put('/updateProfile', [authMiddleware.verifyAuthJWTToken], userController.updateUserProfile);

router.post('/get-blog-from-category',userController.getBlogFromCategory);

router.get('/blog/search',userController.searchBlogByCategoryNameOrBlogHeadings)

router.post('/markBlogAsViewed', [authMiddleware.verifyAuthJWTToken], userController.markBlogAsViewed);

module.exports = router;