const express = require('express');
const router = express.Router();

const { blogController,userController } = require('../../controllers');
const adminMiddleware = require('../../middlewares/admin.middleware');
const authMiddleware = require("../../middlewares/auth.middleware")

router.post('/createBlog', [ adminMiddleware.validateJWTtoken, authMiddleware.validateNewBlogBody ], blogController.createBlog);
router.get('/getAllBlogs', blogController.getAllBlogs);
router.get('/getBlogById', blogController.getBlogById);
router.put('/updateBlog', [ adminMiddleware.validateJWTtoken ], blogController.updateBlog);
router.delete('/deleteBlog', [ adminMiddleware.validateJWTtoken ], blogController.deleteBlog);

router.post('/like', [authMiddleware.verifyAuthJWTToken], blogController.likeAndDislikeBlog);
router.get('/like/:blog_id', [authMiddleware.verifyAuthJWTToken], blogController.getAllUserLikedPostByBlogId);
router.get('/getLikesCount',[authMiddleware.verifyAuthJWTToken],blogController.getLikesCountAndUserLikeStatus)

router.post('/comment', [authMiddleware.verifyAuthJWTToken], blogController.createCommenetInBlog);
router.get('/getAllCommentByBlogId',[authMiddleware.verifyAuthJWTToken,],blogController.getAllCommentsByBlogId);
router.get('/getAllCommentByUserId',[authMiddleware.verifyAuthJWTToken],blogController.getCommentByUserId)
router.put('/updateComment',[authMiddleware.verifyAuthJWTToken],blogController.updateComment);
router.delete('/deleteCommentByUser',[authMiddleware.verifyAuthJWTToken],blogController.deleteCommentByUser)


router.get('/getAllLikesByBlogId',blogController.getAllLikesByBlogId)
router.get('/getCommentsByBlogId',blogController.getCommentsByBlogId)
router.get('/getCommentByCommentId',blogController.getCommentByCommentId)
router.delete('/deleteCommentByAdmin',[adminMiddleware.validateJWTtoken],blogController.deleteCommentByAdmin)





router.post('/:blog_id', userController.getBlogById);


module.exports = router;