const express = require('express');
const router = express.Router();

const {sectionContentController,bannerContentController,cardContentController,socialLoginController} = require('../../controllers');
const { adminAuth } = require('../../middlewares/access.middleware');


//section content api
router.post('/createSectionContent', adminAuth, sectionContentController.createSectionContent);
router.get('/getAllSectionContent', sectionContentController.getAllSectionContent);
router.get('/findSectionContentById', sectionContentController.findSectionContentById);
router.put('/updateSectionContent', adminAuth, sectionContentController.updateSectionContent);
router.delete('/deleteSectionContent', adminAuth, sectionContentController.deleteSectionContent);

//banner content api
router.post('/createBannerContent', adminAuth, bannerContentController.createBannerContent);
router.get('/getAllBannerContent', bannerContentController.getAllBannerContent);
router.get('/findBannerContentById', bannerContentController.findBannerContentById);
router.put('/updateBannerContent', adminAuth, bannerContentController.updateBannerContent);
router.delete('/deleteBannerContent', adminAuth, bannerContentController.deleteBannerContent);

//card content api
router.post('/createCardContent', adminAuth, cardContentController.createCardContent);
router.get('/getAllCardContent', cardContentController.getAllCardContent);
router.get('/findCardContentById', cardContentController.findCardContentById);
router.put('/updateCardContent', adminAuth, cardContentController.updateCardContent);
router.delete('/deleteCardContent', adminAuth, cardContentController.deleteCardContent);

//social login api
router.post('/createSocialLogin', adminAuth, socialLoginController.createSocialLogin);
router.get('/getAllSocialLogin', socialLoginController.getAllSocialLogin);
router.get('/findSocialLoginById', socialLoginController.findSocialLoginById);
router.put('/updateSocialLogin', adminAuth, socialLoginController.updateSocialLogin);
router.delete('/deleteSocialLogin', adminAuth, socialLoginController.deleteSocialLogin);

module.exports = router;
