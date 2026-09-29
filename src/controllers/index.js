const authController = require("./auth.controller");
const roleController = require("./role.controller");
const departmentController = require("./department.controller");
const userController = require("./user.controller");
const faqController = require("./faq.controller");
const contactUsController = require("./contactUs.controller");
const blogController = require("./blog.controller");
const categoryController = require("./category.controller");
const adminController = require("./admin.controller");
const paymentController = require("./payment.controller");
const sectionContentController = require("./sectionContent.controller");
const bannerContentController = require("./bannerContent.controller");
const cardContentController = require("./cardContent.controller");
const socialLoginController = require("./socialLogin.controller");
const storyGenerateController = require("./storyGenerate.controller");
const adminStoryController = require("./adminStory.controller")

module.exports = {
  authController,
  roleController,
  departmentController,
  userController,
  faqController,
  contactUsController,
  blogController,
  categoryController,
  adminController,
  paymentController,
  sectionContentController,
  bannerContentController,
  cardContentController,
  socialLoginController,
  storyGenerateController,
  adminStoryController
};