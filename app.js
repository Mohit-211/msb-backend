const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const { status: httpStatus } = require("http-status");
const path = require("path");

const config = require("./src/config/config.js");
const routes = require("./src/routes/v1");
const morgan = require("./src/config/morgan.js");
const logger = require("./src/config/logger.js");
const ApiError = require("./src/utils/ApiError.js");

require("./src/models");

const app = express();

// The API runs behind nginx. Trust it for the client IP that rate limiting uses.
app.set("trust proxy", 1);

app.use(
  cors({
    origin: config.accessDomains
      .split(",")
      .map((origin) => origin.trim().replace(/\/+$/, ""))
      .filter(Boolean),
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  }),
);

if (config.env !== "test") {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

// The website and admin panel are other origins and show the uploaded images and videos.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const { STORAGE_DIR } = config;

app.use("/images", express.static(path.join(STORAGE_DIR, "images")));
app.use("/videos", express.static(path.join(STORAGE_DIR, "videos")));
app.use("/gifs", express.static(path.join(STORAGE_DIR, "gifs")));
app.use("/docs", express.static(path.join(STORAGE_DIR, "docs")));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Express 5 leaves req.body undefined when a request has no body; the controllers expect an object.
app.use((req, res, next) => {
  req.body ??= {};
  next();
});

app.use(compression());

app.use("/api/v1", routes);

app.get("/api/healthcheck", (req, res) => {
  res.status(200).send({
    response: "ok",
  });
});

app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, "Not found"));
});

// Errors go out as JSON. Client errors keep their message, and so does a server error marked `expose`,
// whose message was written for the admin; anything else is logged and hidden.
// Express recognises error handlers by their four arguments, so `next` must stay.
app.use((err, req, res, next) => {
  const code = err.statusCode || err.status;
  const status = Number.isInteger(code) && code >= 400 && code < 600 ? code : httpStatus.INTERNAL_SERVER_ERROR;
  if (status >= 500) logger.error(err);
  res.locals.errorMessage = err.message;
  res.status(status).json({
    success: false,
    status,
    message: status < 500 || err.expose === true ? err.message : "Internal Server Error",
  });
});

module.exports = app;
