const path = require("path");
const Joi = require("joi");

// Node's built-in .env loader. Like dotenv, it keeps variables that are already set (e.g. by PM2).
try {
  process.loadEnvFile(path.join(__dirname, "../../.env"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const envVarsSchema = Joi.object({
  NODE_ENV: Joi.string().valid("production", "development", "test").required(),

  PORT: Joi.number().default(5000),

  // Database
  CENTRAL_MYSQL_HOST: Joi.string().required(),
  CENTRAL_MYSQL_USER: Joi.string().required(),
  CENTRAL_MYSQL_DB: Joi.string().required(),
  CENTRAL_MYSQL_PORT: Joi.number().default(3306),
  CENTRAL_MYSQL_PASSWORD: Joi.string().allow("").optional(),

  // Authentication. Secrets need 32+ characters, e.g. from `openssl rand -hex 32`.
  JWT_SECRET: Joi.string().min(32).required(),

  // Signs admin tokens. It must differ from JWT_SECRET so a user token can never pass as an admin token.
  ADMIN_JWT_SECRET: Joi.string().min(32).invalid(Joi.ref("JWT_SECRET")).required(),

  JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30),

  // Email
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().optional(),
  SMTP_USERNAME: Joi.string().optional(),
  SMTP_PASSWORD: Joi.string().optional(),
  EMAIL_FROM: Joi.string().optional(),

  // Application
  DEFAULT_API_DATA_LIMIT: Joi.number().default(15),

  ACCESSDOMAINS: Joi.string().required(),

  // OpenAI. The client throws without a key, so require it here where the error is clear.
  OPENAI_KEY: Joi.string().required(),
  OPENAI_MODEL: Joi.string().default("gpt-4o"),

  // Absolute path to uploaded files (images, docs, ...). Defaults to public/uploads for local dev.
  STORAGE_DIR: Joi.string().optional(),
}).unknown();

const { value: envVars, error } = envVarsSchema
  .prefs({
    errors: {
      label: "key",
    },
  })
  .validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,

  port: envVars.PORT,

  databases: {
    central: {
      db: envVars.CENTRAL_MYSQL_DB,
      port: envVars.CENTRAL_MYSQL_PORT,
      host: envVars.CENTRAL_MYSQL_HOST,
      user: envVars.CENTRAL_MYSQL_USER,
      passwd: envVars.CENTRAL_MYSQL_PASSWORD,
    },
  },

  jwt: {
    secret: envVars.JWT_SECRET,

    adminSecret: envVars.ADMIN_JWT_SECRET,

    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
  },

  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,

      secure: false,
      requireTLS: true,

      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
    },

    from: envVars.EMAIL_FROM,
  },

  accessDomains: envVars.ACCESSDOMAINS,

  defaultLimit: envVars.DEFAULT_API_DATA_LIMIT,

  OPENAI_KEY: envVars.OPENAI_KEY,

  OPENAI_MODEL: envVars.OPENAI_MODEL,

  STORAGE_DIR: path.resolve(
    envVars.STORAGE_DIR || path.join(__dirname, "../../public/uploads")
  ),
};
