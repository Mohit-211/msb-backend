const httpStatus = require('http-status');

const catchAsync = require('../utils/catchAsync');
const { categoryService } = require('../services');
const responseWrapper = require('../config/responseWrapper');

const createCategory = catchAsync(async (req, res) => {

    await categoryService.createCategory(req.body,req.files);
    return responseWrapper(res, '', 'New Category Created Successfully.', httpStatus.OK);
});

const updateCategory = catchAsync(async (req, res) => {

    const categoryDoc = await categoryService.updateCategory(req.body,req.files);
    return responseWrapper(res, categoryDoc, 'Category Update Successfully.');
});

const findCategoryById = catchAsync(async (req, res) => {

    const categoryDoc = await categoryService.findCategoryById(req.query.id);
    return responseWrapper(res, categoryDoc, '');
});

const getAllCategorys = catchAsync(async (req, res) => {

    const categoryDocs = await categoryService.getAllCategorys();
    return responseWrapper(res, categoryDocs, '');
});

const deleteCategory = catchAsync(async (req, res) => {

    await categoryService.deleteCategory(req.body);
    return responseWrapper(res, '', 'Delete Successfull.');
});

module.exports = {
    createCategory,
    findCategoryById,
    getAllCategorys,
    updateCategory,
    deleteCategory
};