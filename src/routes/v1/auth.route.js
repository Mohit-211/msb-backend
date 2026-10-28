const express = require('express');
const router = express.Router();

const { authController } = require('../../controllers');
const { userAuth } = require('../../middlewares/access.middleware');
const { authLimiter, otpLimiter, otpEmailLimiter } = require('../../middlewares/rateLimiter');


router.post('/otp', [otpLimiter, otpEmailLimiter], authController.sendOTP);

router.post('/login', [authLimiter], authController.login);

router.post('/reset-password', [authLimiter, ...userAuth], authController.resetPassword);

router.post('/forgot-password', [authLimiter], authController.forgotPassword);

// The website calls logout with POST; GET stays for older clients.
router.get('/logout', userAuth, authController.logout);
router.post('/logout', userAuth, authController.logout);

module.exports = router;
