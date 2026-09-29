const express = require('express');
const router = express.Router();

const {departmentController} = require('../../controllers');
const adminMiddleware = require('../../middlewares/admin.middleware');

router.post('/createDepartment',[adminMiddleware.validateJWTtoken] , departmentController.createDepartment);
router.get('/all',[adminMiddleware.validateJWTtoken] , departmentController.getAllDeparments);
router.get('/:id', [adminMiddleware.validateJWTtoken], departmentController.findDepartmentById);
router.put('/:id', [adminMiddleware.validateJWTtoken], departmentController.updateDepartment);
router.delete('/:id', [adminMiddleware.validateJWTtoken], departmentController.deleteDepartment);

module.exports = router;