const httpStatus = require('http-status');

const { Department } = require('../models');
const ApiError = require('../utils/ApiError');


const createDepartment = async (reqBody) => {
    const departmentObj = {
        name : reqBody.name
    };
    const departmentDoc = await Department.create(departmentObj);
    if(!departmentDoc){
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, '|=> Failed to create new Department <=|');
    }
    return departmentDoc ? true : false;
};

const updateDepartment = async (reqBody, id) => {

    const departmentDoc = await Department.findByPk(id);

    if (!departmentDoc) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Department not found');
    }
    if (reqBody.name && typeof reqBody.name !== 'undefined' && reqBody.name !== '') {
        departmentDoc['name'] = reqBody.name;
    };

    await departmentDoc.save();
    return departmentDoc ? departmentDoc : {};
};

const getAllDeparments = async () => {
    const departmentDoc = await Department.findAll({where : {is_active : 1}});
    if(!departmentDoc){
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, '|=> Failed to create new Department <=|');
    }
    return departmentDoc;
};

const findDepartmentById = async (id) => {
    const departmentDoc = await Department.findByPk(id);
    return departmentDoc ? departmentDoc : [];
};

const deleteDepartment = async (id) => {

    const interest = await Department.findByPk(id);
    if (!interest) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Department not found');
    }
    await interest.destroy();
};

module.exports = { 
    getAllDeparments,
    createDepartment,
    updateDepartment,
    findDepartmentById,
    deleteDepartment
};