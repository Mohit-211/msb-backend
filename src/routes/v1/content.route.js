const express = require('express');
const router = express.Router();

const {sectionContentController,bannerContentController,cardContentController,socialLoginController} = require('../../controllers');
const adminMiddleware = require('../../middlewares/admin.middleware');


//section content api
router.post('/createSectionContent',[adminMiddleware.validateJWTtoken] , sectionContentController.createSectionContent);
router.get('/getAllSectionContent', sectionContentController.getAllSectionContent);
router.get('/findSectionContentById', sectionContentController.findSectionContentById);
router.put('/updateSectionContent', [adminMiddleware.validateJWTtoken], sectionContentController.updateSectionContent);
router.delete('/deleteSectionContent', [adminMiddleware.validateJWTtoken], sectionContentController.deleteSectionContent);

//banner content api
router.post('/createBannerContent',[adminMiddleware.validateJWTtoken] , bannerContentController.createBannerContent);
router.get('/getAllBannerContent', bannerContentController.getAllBannerContent);
router.get('/findBannerContentById', bannerContentController.findBannerContentById);
router.put('/updateBannerContent', [adminMiddleware.validateJWTtoken], bannerContentController.updateBannerContent);
router.delete('/deleteBannerContent', [adminMiddleware.validateJWTtoken], bannerContentController.deleteBannerContent);

//card content api
router.post('/createCardContent',[adminMiddleware.validateJWTtoken] , cardContentController.createCardContent);
router.get('/getAllCardContent', cardContentController.getAllCardContent);
router.get('/findCardContentById', cardContentController.findCardContentById);
router.put('/updateCardContent', [adminMiddleware.validateJWTtoken], cardContentController.updateCardContent);
router.delete('/deleteCardContent', [adminMiddleware.validateJWTtoken], cardContentController.deleteCardContent);

//social login api
router.post('/createSocialLogin',[adminMiddleware.validateJWTtoken] , socialLoginController.createSocialLogin);
router.get('/getAllSocialLogin', socialLoginController.getAllSocialLogin);
router.get('/findSocialLoginById', socialLoginController.findSocialLoginById);
router.put('/updateSocialLogin', [adminMiddleware.validateJWTtoken], socialLoginController.updateSocialLogin);
router.delete('/deleteSocialLogin', [adminMiddleware.validateJWTtoken], socialLoginController.deleteSocialLogin);




module.exports = router;