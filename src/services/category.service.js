const { status: httpStatus } = require("http-status");
const slugify = require("slugify");
const { Op } = require("sequelize");

const { Category } = require("../models");
const ApiError = require("../utils/ApiError");
const findByIdOr404 = require("../helpers/findByIdOr404");
const filledIfSent = require("../helpers/filledIfSent");

// The slug is the category's address on the site, so two categories can't share one. On a rename the
// category's own slug doesn't count.
const assertSlugFree = async (title, exceptId) => {
  const existingCategory = await Category.findOne({
    where: {
      slug: slugify(title, { lower: true }),
      ...(exceptId && { id: { [Op.ne]: exceptId } }),
    },
  });
  if (existingCategory) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Category with the same title already exists"
    );
  }
};

const findCategoryById = async (id) => findByIdOr404(Category, id, "Category");

const findCategoryBySlug = async (slug) => {
  const categoryDoc = typeof slug === "string" && slug !== ""
    ? await Category.findOne({ where: { slug, is_active: true } })
    : null;
  if (!categoryDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
  }
  return categoryDoc;
};

const createCategory = async (reqBody,files) => {
  await assertSlugFree(reqBody.title);
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
  const categoryDoc = await findByIdOr404(Category, reqBody.category_id, "Category");
  const title = filledIfSent(reqBody, "title");
  if (title !== undefined) {
    await assertSlugFree(title, categoryDoc.id);
    categoryDoc["title"] = title;
    categoryDoc.slug = slugify(title, { lower: true });
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
  return categoryDoc;
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
  findCategoryBySlug,
  createCategory,
  updateCategory,
  getAllCategorys,
  deleteCategory,
};
