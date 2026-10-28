const authController = require("./auth.controller");
const roleController = require("./role.controller");
const userController = require("./user.controller");
const blogController = require("./blog.controller");
const categoryController = require("./category.controller");
const adminController = require("./admin.controller");
const sectionContentController = require("./sectionContent.controller");
const bannerContentController = require("./bannerContent.controller");
const cardContentController = require("./cardContent.controller");
const socialLoginController = require("./socialLogin.controller");
const storyGenerateController = require("./storyGenerate.controller");
const adminStoryController = require("./adminStory.controller")

module.exports = {
  authController,
  roleController,
  userController,
  blogController,
  categoryController,
  adminController,
  sectionContentController,
  bannerContentController,
  cardContentController,
  socialLoginController,
  storyGenerateController,
  adminStoryController
};