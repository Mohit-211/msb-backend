const express = require('express');
const router = express.Router();

const {roleController} = require('../../controllers');
const { adminAuth, superAdminAuth } = require('../../middlewares/access.middleware');

router.post('/create', superAdminAuth, roleController.createRole);
router.get('/all', adminAuth, roleController.getAllRoles);
router.get('/getRolebyId', adminAuth, roleController.findRoleById);
router.put('/editRole', superAdminAuth, roleController.updateRole);
router.delete('/deleteRole', superAdminAuth, roleController.deleteRole);

module.exports = router;
