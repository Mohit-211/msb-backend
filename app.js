const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const httpStatus = require("http-status");

const config = require("./src/config/config.js");
const routes = require("./src/routes/v1");
const morgan = require("./src/config/morgan.js");
const { authLimiter } = require("./src/middlewares/rateLimiter.js");

const ApiError = require("./src/utils/ApiError.js");
const path = require("path");
const app = express();
const upload = require("./src/config/multer.js");
require("./src/models");

const allowedOrigins = require("./src/helpers/accessDomains.js");
app.use(
  cors({
    origin: [
      "*",
      "http://127.0.0.1:5500",
      "http://localhost:8080",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://localhost:8080",
      "https://node.mystorybank.info:4000",
      "http://localhost:5173",
      "https://admin.mystorybank.info",
      "https://mystorybank.info",
      "https://msb-user-frontend.vercel.app",
      "https://test.mystorybank.info"
    ],
    methods: "GET,POST,PUT,DELETE",
    credentials: true,
  })
);

app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  next();
});

// ----------------------------------------
// var https = require("https");
// var fs = require('fs');
// var options = {
//     key: fs.readFileSync('/etc/ssl/virtualmin/168899228910356/ssl.key'),
//     cert: fs.readFileSync('/etc/ssl/virtualmin/168899228910356/ssl.cert'),
// };

if (config.env !== "test") {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

const PUBLIC_DIR = path.resolve(__dirname, "./public");
app.use("/images", express.static(`${PUBLIC_DIR}/uploads/images`));
app.use("/videos", express.static(`${PUBLIC_DIR}/uploads/videos`));
app.use("/gifs", express.static(`${PUBLIC_DIR}/uploads/gifs`));
app.use("/docs", express.static(`${PUBLIC_DIR}/uploads/docs`));
app.use("/songs", express.static(`${PUBLIC_DIR}/uploads/songs`));

// set security HTTP headers
app.use(helmet());

// parse json request body
app.use(express.json());

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// gzip compression
app.use(compression());

// Added multer with all v1 api routes
app.use("/api/v1", upload, routes);

app.get("/api/healthcheck", function (req, res) {
  let data = {
    response: "ok",
  };
  res.status(200).send(data);
});

app.get("/test", (req, res, next) => {
  res.status(200).send("Hello World !!");
});

app.use(express.static(PUBLIC_DIR));

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 1;

// limit repeated failed requests to auth endpoints
if (config.env === "production") {
  app.use("/v1/auth", authLimiter);
}

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, "Not found"));
});

module.exports = app;