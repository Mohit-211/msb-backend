const express = require('express');
const router = express.Router();

const { blogController,userController } = require('../../controllers');
const authMiddleware = require("../../middlewares/auth.middleware")
const { adminAuth, userAuth } = require('../../middlewares/access.middleware');

router.post('/createBlog', [ ...adminAuth, authMiddleware.validateNewBlogBody ], blogController.createBlog);
router.get('/getAllBlogs', adminAuth, blogController.getAllBlogs);
router.get('/getBlogById', adminAuth, blogController.getBlogById);
router.put('/updateBlog', adminAuth, blogController.updateBlog);
router.delete('/deleteBlog', adminAuth, blogController.deleteBlog);

router.post('/like', userAuth, blogController.likeAndDislikeBlog);
router.get('/getLikesCount', userAuth, blogController.getLikesCountAndUserLikeStatus)

router.post('/comment', userAuth, blogController.createCommenetInBlog);
router.get('/getAllCommentByBlogId', userAuth, blogController.getAllCommentsByBlogId);

router.get('/getAllLikesByBlogId', adminAuth, blogController.getAllLikesByBlogId)
router.get('/getCommentsByBlogId', adminAuth, blogController.getCommentsByBlogId)
router.delete('/deleteCommentByAdmin', adminAuth, blogController.deleteCommentByAdmin)

// Needs a signed-in user, whose plan decides whether a paid story opens. GET is the one to use; POST stays for the current site.
// Last, so it doesn't catch the named paths above.
router.get('/:blog_id', userAuth, userController.getBlogById);
router.post('/:blog_id', userAuth, userController.getBlogById);

module.exports = router;
