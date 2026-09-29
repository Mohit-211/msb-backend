const sequelize = require("../config/central.db");

const OTP = require("./otp.model");
const User = require("./user.model");
const UserToken = require("./userToken.model");
const UserAttachment = require("./userAttachment.model");
const LoginTiming = require("./loginTiming.model.js")


const ContactUs = require("./contactUs.model");
const Faq = require("./faq.model");

const Category = require("./category.model");
const Blogs = require("./blog.model");
const BlogAttachment = require("./blogAttachment.model.js");
const BlogCategory = require("./blogCategory.model");

const BlogComment = require("./blogComment.model");
const BlogLike = require("./blogLlike.model");
const BlogViews = require("./blogViews.model.js");

const Department = require("./department.model");
const Role = require("./role.model");
const Admin = require("./admin.model");

const Payment = require("./payment.model.js");

const SectionContent = require("./sectionContent.model.js");
const BannerContent = require("./banner.model.js");
const CardContent = require("./cardContent.model.js");
const SocialLogins = require("./socialLogins.model.js");

const AiStory = require("./aiStory.model.js");

module.exports = {
  OTP,
  User,
  UserToken,
  UserAttachment,
  LoginTiming,
  ContactUs,
  Faq,
  Category,
  Department,
  Role,
  Admin,
  Blogs,
  BlogAttachment,
  BlogComment,
  BlogLike,
  BlogCategory,
  Payment,
  BlogViews,
  SectionContent,
  BannerContent,
  CardContent,
  SocialLogins,
  AiStory,
};

async function init() {
  User.hasMany(UserToken, { foreignKey: "user_id", as: "tokens" });
  UserToken.belongsTo(User, { foreignKey: "user_id", as: "token_user" });

  User.hasMany(UserAttachment, { foreignKey: "user_id", as: "attachements" });
  UserAttachment.belongsTo(User, { foreignKey: "user_id", as: "user" });



  User.hasMany(LoginTiming, { foreignKey: "user_id", as: "user_login" });
  LoginTiming.belongsTo(User, { foreignKey: "user_id", as: "login_user" });

  Role.hasMany(Admin, { foreignKey: "id", as: "roles_admin" });

  Admin.belongsTo(Role, { foreignKey: "role_id", as: "admin_roles" });

  Admin.hasMany(Blogs, { foreignKey: "created_by", as: "admin_blogs" });
  Blogs.belongsTo(Admin, { foreignKey: "created_by", as: "blog_admin" });

  Blogs.belongsToMany(Category, {
    through: BlogCategory,
    foreignKey: "blog_id",
  });

  Category.belongsToMany(Blogs, {
    through: BlogCategory,
    foreignKey: "category_id",
  });

  Blogs.hasMany(BlogAttachment, {
    foreignKey: "blog_id",
    as: "blog_attachment",
  });
  BlogAttachment.belongsTo(Blogs, {
    foreignKey: "blog_id",
    as: "attachment_blogs",
  });

  User.hasMany(BlogLike, { foreignKey: "user_id", as: "user_liked_posts" });
  BlogLike.belongsTo(User, { foreignKey: "user_id", as: "liked_by" });

  Blogs.hasMany(BlogComment, { foreignKey: "blog_id", as: "comments" });
  BlogComment.belongsTo(BlogLike, {
    foreignKey: "blog_id",
    as: "comment_post",
  });

  Blogs.hasMany(BlogLike, { foreignKey: "blog_id", as: "likes" });

  User.hasMany(BlogComment, {
    foreignKey: "user_id",
    as: "user_commented_posts",
  });
  BlogComment.belongsTo(User, { foreignKey: "user_id", as: "commented_by" });
  // BlogLike.belongsTo(User, { foreignKey: "user_id", as: "liked_by" });

  AiStory.belongsTo(User, { foreignKey: "created_by", as: "generated_by" });
  User.hasMany(AiStory, { foreignKey: "created_by", as: "user_stories" });


  Blogs.belongsTo(AiStory, { foreignKey: "ai_story_id", as: "blog_ai_stories" });
  AiStory.hasMany(Blogs, { foreignKey: "ai_story_id", as: "ai_stoies_blog" });

  // sequelize
  //   .sync({ alter: true })
  //   .then((result) => console.log("Altering Table Completed."))
  //   .catch((err) =>
  //     console.log("Failed to alter all table into database:", err)
  //   );

  
}

init();