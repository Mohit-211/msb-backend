const express = require('express');
const router = express.Router();

const { userController } = require('../../controllers');
const { userAuth } = require('../../middlewares/access.middleware');



router.get('/profile', userAuth, userController.getProfile);

router.put('/updateProfile', userAuth, userController.updateUserProfile);

// Reading stories needs a signed-in user. Paid stories come back as locked teasers unless their plan includes them.
router.post('/get-blog-from-category', userAuth, userController.getBlogFromCategory);

router.get('/blog/search', userAuth, userController.searchBlogByCategoryNameOrBlogHeadings)

router.post('/markBlogAsViewed', userAuth, userController.markBlogAsViewed);

module.exports = router;
