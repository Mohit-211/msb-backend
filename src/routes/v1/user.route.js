const express = require('express');
const router = express.Router();

const { userController } = require('../../controllers');
const { userAuth } = require('../../middlewares/access.middleware');



router.get('/profile', userAuth, userController.getProfile);

router.put('/updateProfile', userAuth, userController.updateUserProfile);

router.post('/get-blog-from-category',userController.getBlogFromCategory);

router.get('/blog/search',userController.searchBlogByCategoryNameOrBlogHeadings)

router.post('/markBlogAsViewed', userAuth, userController.markBlogAsViewed);

module.exports = router;
