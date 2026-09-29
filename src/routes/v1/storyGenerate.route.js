const express = require('express');
const router = express.Router();

const { storyGenerateController, adminStoryController } = require('../../controllers');
const authMiddleware = require("../../middlewares/auth.middleware")

router.post('/', [ authMiddleware.verifyAuthJWTToken ], storyGenerateController.generateNewStory);
router.post('/sort', [ authMiddleware.verifyAuthJWTToken ], storyGenerateController.generateSortStory);
router.get('/', [ authMiddleware.verifyAuthJWTToken ], storyGenerateController.getStoryHistory);
router.put('/', [ authMiddleware.verifyAuthJWTToken ], storyGenerateController.saveStory);


router.get('/getAllGeneratedStories', adminStoryController.getAllGeneratedStories);
router.get('/getStoryById/:id', adminStoryController.getStoryById);
router.post('/makeGeneratedStoryLive/:id', adminStoryController.makeGeneratedStoryLive);

module.exports = router;