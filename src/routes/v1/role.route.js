const express = require('express');
const router = express.Router();

const {roleController} = require('../../controllers');
const adminMiddleware = require('../../middlewares/admin.middleware');

router.post('/create', roleController.createRole);
router.get('/all', roleController.getAllRoles);
router.get('/getRolebyId', roleController.findRoleById);
router.put('/editRole', [adminMiddleware.validateJWTtoken],roleController.updateRole);
router.delete('/deleteRole',[adminMiddleware.validateJWTtoken], roleController.deleteRole);

module.exports = router;