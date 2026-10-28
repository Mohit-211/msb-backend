const express = require('express');
const router = express.Router();

const { storyGenerateController, adminStoryController } = require('../../controllers');
const { adminAuth, userAuth } = require('../../middlewares/access.middleware');
const { storyLimiter } = require('../../middlewares/rateLimiter');

router.post('/', [ ...userAuth, storyLimiter ], storyGenerateController.generateNewStory);
router.post('/sort', [ ...userAuth, storyLimiter ], storyGenerateController.generateSortStory);
router.get('/', userAuth, storyGenerateController.getStoryHistory);
router.put('/', userAuth, storyGenerateController.saveStory);


router.get('/getAllGeneratedStories', adminAuth, adminStoryController.getAllGeneratedStories);
router.get('/getStoryById/:id', adminAuth, adminStoryController.getStoryById);
router.post('/makeGeneratedStoryLive/:id', adminAuth, adminStoryController.makeGeneratedStoryLive);

// Last, so it doesn't catch the admin paths above.
router.get('/:id', userAuth, storyGenerateController.getSavedStory);

module.exports = router;
