const express = require("express");
const router = express.Router();

const authRoute = require("./auth.route");
const userRoute = require("./user.route");
const categoryRoute = require("./category.route");
const adminRoute = require("./admin.route");
const roleRoute = require("./role.route");
const blogRoute = require("./blog.route");
const contentRoute = require("./content.route")
const storyGenerateRoute = require("./storyGenerate.route")

const defaultRoutes = [
  {
    path: "/auth",
    route: authRoute,
  },
  {
    path: "/user",
    route: userRoute,
  },
  {
    path: "/category",
    route: categoryRoute,
  },
  {
    path: "/admin",
    route: adminRoute,
  },
  {
    path: "/role",
    route: roleRoute,
  },
  {
    path: "/blog",
    route: blogRoute,
  },
  {
    path: "/content",
    route: contentRoute,
  },
  {
    path: "/story",
    route: storyGenerateRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;