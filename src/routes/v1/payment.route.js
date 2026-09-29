const express = require('express');
const router = express.Router();

const { paymentController } = require('../../controllers');
const authMiddleware = require('../../middlewares/auth.middleware');


router.get('/stripe/stripe-key', [authMiddleware.verifyAuthJWTToken], paymentController.geStripeKeys);
router.post('/stripe/create-payment-intent', [authMiddleware.verifyAuthJWTToken], paymentController.createPaymentIntent);
router.post('/stripe/charge-intent/webhooks', express.raw({type: 'application/json'}), paymentController.handleChargeAndIntentWebhook);
router.get('/count', paymentController.getNewPaymentCount);
router.get('/sum', paymentController.getNewPaymentTotal);
router.get('/', paymentController.getAllPayment);


router.post('/stripe/create-subscription', [authMiddleware.verifyAuthJWTToken], paymentController.createSubscription);
router.get('/stripe/price/list',  paymentController.getAllPricesForBlogs);

module.exports = router;

