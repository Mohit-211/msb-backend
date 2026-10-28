const { status: httpStatus } = require('http-status');

const { categoryService } = require('../services');
const responseWrapper = require('../config/responseWrapper');

const createCategory = async (req, res) => {

    await categoryService.createCategory(req.body,req.files);
    return responseWrapper(res, '', 'New Category Created Successfully.', httpStatus.OK);
};

const updateCategory = async (req, res) => {

    const categoryDoc = await categoryService.updateCategory(req.body,req.files);
    return responseWrapper(res, categoryDoc, 'Category Update Successfully.');
};

const findCategoryById = async (req, res) => {

    const categoryDoc = await categoryService.findCategoryById(req.query.id);
    return responseWrapper(res, categoryDoc, '');
};

const findCategoryBySlug = async (req, res) => {
    const categoryDoc = await categoryService.findCategoryBySlug(req.query.slug);
    return responseWrapper(res, categoryDoc, '');
};

const getAllCategorys = async (req, res) => {

    const categoryDocs = await categoryService.getAllCategorys();
    return responseWrapper(res, categoryDocs, '');
};

const deleteCategory = async (req, res) => {

    await categoryService.deleteCategory(req.body);
    return responseWrapper(res, '', 'Delete Successfull.');
};

module.exports = {
    createCategory,
    findCategoryById,
    findCategoryBySlug,
    getAllCategorys,
    updateCategory,
    deleteCategory
};