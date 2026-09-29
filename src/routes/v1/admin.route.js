const express = require('express');
const router = express.Router();

const { adminController } = require('../../controllers');
const adminMiddleware = require('../../middlewares/admin.middleware');
const roleMiddleware = require('../../middlewares/role.middleware');

router.post('/register', adminController.createAdminUser);
router.post('/login', [adminMiddleware.validateLoginAdminBody], adminController.loginAdminUser);
router.post('/change-password', [adminMiddleware.validateResetPassordBody, adminMiddleware.validateJWTtoken], adminController.resetAdminPassword);
router.post('/otp',  adminController.sendOTP);
router.post('/verify-otp',  adminController.verifyOTP);
router.post('/forgot-password',  adminController.forgotAdminPassword);
router.put('/updateAdmin',[adminMiddleware.validateJWTtoken],adminController.updateAdmin);
router.delete('/deleteAdmin',[adminMiddleware.validateJWTtoken],adminController.deleteAdmin);
router.get('/getAllAdmin',[adminMiddleware.validateJWTtoken,roleMiddleware.isSuperAdmin],adminController.getAllAdmins);
router.get('/getAdminProfile',[adminMiddleware.validateJWTtoken],adminController.getProfile);
router.get('/getAdminById',adminController.findAdminById);

router.get('/getAllUsers',[adminMiddleware.validateJWTtoken,roleMiddleware.isSuperAdmin],adminController.getAllUsers);
router.get('/getUserById',adminController.getUserById);
router.delete('/deleteUser',[adminMiddleware.validateJWTtoken],adminController.deleteUser);
router.post('/createUser',[adminMiddleware.validateJWTtoken],adminController.adminAddUser);

router.post('/updatepaymentStatus',adminController.updatePaymentStatus)

router.get('/getUserCount',[adminMiddleware.validateJWTtoken,roleMiddleware.isSuperAdmin],adminController.getUserCount);
router.get('/getUserCountByMonth',adminController.getUserCountByMonth);
router.get('/getBlogCount',adminController.getBlogCount);
router.get('/getCategoryCount',adminController.getCategoryCount);
router.get('/getMostViewedStory',adminController.getMostViewedStory);
router.get('/getMostLikedStory',adminController.getMostLikedStory);
router.get('/getLoginLogs',adminController.getLoginLogs);
router.post('/getLoginLogsOfUser',adminController.getLoginLogsOfUser);

module.exports = router;