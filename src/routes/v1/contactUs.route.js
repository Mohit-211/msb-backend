const express = require('express');
const router = express.Router();

const { contactUsController } = require('../../controllers');
const adminMiddleware = require('../../middlewares/admin.middleware');



router.post('/create',[adminMiddleware.validateJWTtoken] , contactUsController.createContactUs);
router.get('/all', contactUsController.getAllContactUs);
router.get('/:id', [adminMiddleware.validateJWTtoken], contactUsController.findContactById);
router.put('/:id', [adminMiddleware.validateJWTtoken], contactUsController.updateContact);
router.delete('/:id', [adminMiddleware.validateJWTtoken], contactUsController.deleteContact);


module.exports = router;