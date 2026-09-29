const express = require('express');
const router = express.Router();

const { authController } = require('../../controllers');
const authMiddleware = require('../../middlewares/auth.middleware');


router.post('/otp', authController.sendOTP);

router.post('/verify-otp', authController.verifyOTP);

router.post('/register', [authMiddleware.validateRegisterUserBody], authController.register);

router.post('/login', authController.login);

router.post('/reset-password', [authMiddleware.verifyAuthJWTToken], authController.resetPassword);

router.post('/forgot-password', authController.forgotPassword);

router.get('/logout', [authMiddleware.verifyAuthJWTToken], authController.logout);

router.post('/checkTokenStatus',authController.checkTokenStatus);

// router.get('/checkTokenStatus1', authController.checkTokenStatus1);



module.exports = router;