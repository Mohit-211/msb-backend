const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const { status: httpStatus } = require("http-status");
const path = require("path");

const config = require("./src/config/config.js");
const routes = require("./src/routes/v1");
const morgan = require("./src/config/morgan.js");
const { authLimiter } = require("./src/middlewares/rateLimiter.js");
const ApiError = require("./src/utils/ApiError.js");
const upload = require("./src/config/multer.js");

require("./src/models");

const app = express();

app.use(
  cors({
    origin: config.accessDomains.split(","),
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  }),
);

if (config.env !== "test") {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

const PUBLIC_DIR = path.resolve(__dirname, "./public");
const { STORAGE_DIR } = config;

app.use("/images", express.static(path.join(STORAGE_DIR, "images")));
app.use("/videos", express.static(path.join(STORAGE_DIR, "videos")));
app.use("/gifs", express.static(path.join(STORAGE_DIR, "gifs")));
app.use("/docs", express.static(path.join(STORAGE_DIR, "docs")));

app.use(helmet());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Express 5 leaves req.body undefined when a request has no body; the controllers expect an object.
app.use((req, res, next) => {
  req.body ??= {};
  next();
});

app.use(compression());

app.use("/api/v1", upload, routes);

app.get("/api/healthcheck", (req, res) => {
  res.status(200).send({
    response: "ok",
  });
});

app.use(express.static(PUBLIC_DIR));

if (config.env === "production") {
  app.use("/v1/auth", authLimiter);
}

app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, "Not found"));
});

module.exports = app;
