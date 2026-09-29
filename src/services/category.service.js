const httpStatus = require("http-status");
const slugify = require("slugify");

const { Category } = require("../models");
const ApiError = require("../utils/ApiError");

const findCategoryById = async (id) => {
  const categoryDoc = await Category.findOne({
    where: { id: id },
  });
  return categoryDoc ? categoryDoc : {};
};

const createCategory = async (reqBody,files) => {
  const existingCategory = await Category.findOne({
    where: {
      slug: slugify(reqBody.title, { lower: true }),
    },
  });
  if (existingCategory) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Category with the same title already exists"
    );
  }
  const categoryObj = {
    title: reqBody.title,
  };

  if (
    files &&
    Object.keys(files).length !== 0 &&
    files.images &&
    files.images.length !== 0
  ) {
    let currImage = files.images[0];
    categoryObj["file_uri"] = "/images";
    categoryObj["file_name"] = currImage.filename;
  }

  const categoryDoc = await Category.create(categoryObj);
  if (!categoryDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create new Category"
    );
  }
  return categoryDoc ? true : false;
};

const updateCategory = async (reqBody,files) => {
  const categoryDoc = await Category.findOne({
    where: {
      id: reqBody.category_id,
    },
  });

  if (!categoryDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
  }
  if (
    reqBody.title &&
    typeof reqBody.title !== "undefined" &&
    reqBody.title !== ""
  ) {
    categoryDoc["title"] = reqBody.title;
    categoryDoc.slug = slugify(reqBody.title, { lower: true });
  }

  if (
    files &&
    Object.keys(files).length !== 0 &&
    files.images &&
    files.images.length !== 0
  ) {
    let currImage = files.images[0];
    categoryDoc["file_uri"] = "/images";
    categoryDoc["file_name"] = currImage.filename;
  }

  await categoryDoc.save();
  return categoryDoc ? categoryDoc : {};
};

const getAllCategorys = async () => {
  const categoryDocs = await Category.findAll({
    where: { is_active: 1 },
  });

  if (!categoryDocs) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to get all Category"
    );
  }

  // Sorting the categories alphabetically by their names
  const sortedCategories = categoryDocs.sort((a, b) =>
    a.title.localeCompare(b.title)
  );

  return sortedCategories;
};

const deleteCategory = async (reqBody) => {
  const categoryDoc = await Category.findOne({
    where: {
      id: reqBody.category_id,
    },
  });
  if (!categoryDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
  }
  await categoryDoc.destroy({
    where: { id: reqBody.category_id, is_active: true },
  });
};

module.exports = {
  findCategoryById,
  createCategory,
  updateCategory,
  getAllCategorys,
  deleteCategory,
};
