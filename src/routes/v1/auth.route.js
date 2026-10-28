const express = require('express');
const router = express.Router();

const { authController } = require('../../controllers');
const authMiddleware = require('../../middlewares/auth.middleware');


router.post('/otp', authController.sendOTP);

router.post('/login', authController.login);

router.post('/reset-password', [authMiddleware.verifyAuthJWTToken], authController.resetPassword);

router.post('/forgot-password', authController.forgotPassword);

router.get('/logout', [authMiddleware.verifyAuthJWTToken], authController.logout);

module.exports = router;