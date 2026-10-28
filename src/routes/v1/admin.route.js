const express = require('express');
const router = express.Router();

const { adminController } = require('../../controllers');
const adminMiddleware = require('../../middlewares/admin.middleware');
const { adminAuth, superAdminAuth } = require('../../middlewares/access.middleware');
const { authLimiter } = require('../../middlewares/rateLimiter');

router.post('/register', [...superAdminAuth, adminMiddleware.validateCreateAdminBody], adminController.createAdminUser);
router.post('/login', [authLimiter, adminMiddleware.validateLoginAdminBody], adminController.loginAdminUser);
router.post('/change-password', [authLimiter, ...adminAuth, adminMiddleware.validateResetPassordBody], adminController.resetAdminPassword);
router.put('/updateAdmin', superAdminAuth, adminController.updateAdmin);
router.delete('/deleteAdmin', superAdminAuth, adminController.deleteAdmin);
router.get('/getAllAdmin', superAdminAuth, adminController.getAllAdmins);
router.get('/getAdminProfile', adminAuth, adminController.getProfile);
router.get('/getAdminById', superAdminAuth, adminController.findAdminById);

// ?search=, and ?limit=&page= for one page as { count, rows }.
router.get('/getAllUsers', superAdminAuth, adminController.getAllUsers);
router.get('/exportUsers', superAdminAuth, adminController.exportUsers);
router.get('/getUserById', superAdminAuth, adminController.getUserById);
router.delete('/deleteUser', superAdminAuth, adminController.deleteUser);
router.post('/createUser', superAdminAuth, adminController.adminAddUser);

router.post('/updatepaymentStatus', superAdminAuth, adminController.updatePaymentStatus)
router.post('/updateUserStatus', superAdminAuth, adminController.updateUserStatus);

// A count is fine for every admin; the Dashboard needs it for sub-admins too.
router.get('/getUserCount', adminAuth, adminController.getUserCount);
router.get('/getDashboardStats', adminAuth, adminController.getDashboardStats);
router.get('/getUserCountByMonth', adminAuth, adminController.getUserCountByMonth);
router.get('/getBlogCount', adminAuth, adminController.getBlogCount);
router.get('/getCategoryCount', adminAuth, adminController.getCategoryCount);
router.get('/getMostViewedStory', adminAuth, adminController.getMostViewedStory);
router.get('/getMostLikedStory', adminAuth, adminController.getMostLikedStory);
router.post('/getLoginLogsOfUser', superAdminAuth, adminController.getLoginLogsOfUser);

module.exports = router;
