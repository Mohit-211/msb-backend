const express = require('express');
const router = express.Router();

const { faqController } = require('../../controllers');
const adminMiddleware = require('../../middlewares/admin.middleware');



router.post('/create',[adminMiddleware.validateJWTtoken] , faqController.createFaq);
router.get('/all', faqController.getAllFaq);
router.get('/:id', [adminMiddleware.validateJWTtoken], faqController.findFaqById);
router.put('/:id', [adminMiddleware.validateJWTtoken], faqController.updateFaq);
router.delete('/:id', [adminMiddleware.validateJWTtoken], faqController.deleteFaq);



module.exports = router;