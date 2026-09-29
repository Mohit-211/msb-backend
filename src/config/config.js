const dotenv = require("dotenv");
const path = require("path");
const Joi = require("joi");

dotenv.config({
  path: path.join(__dirname, "../../.env"),
});

const envVarsSchema = Joi.object({
  NODE_ENV: Joi.string().valid("production", "development", "test").required(),

  PORT: Joi.number().default(5000),

  // Database
  CENTRAL_MYSQL_HOST: Joi.string().required(),
  CENTRAL_MYSQL_USER: Joi.string().required(),
  CENTRAL_MYSQL_DB: Joi.string().required(),
  CENTRAL_MYSQL_PORT: Joi.number().default(3306),
  CENTRAL_MYSQL_PASSWORD: Joi.string().allow("").optional(),

  // Authentication
  JWT_SECRET: Joi.string().required(),

  JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30),

  JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30),

  JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number().default(10),

  JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number().default(10),

  // Email
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().optional(),
  SMTP_USERNAME: Joi.string().optional(),
  SMTP_PASSWORD: Joi.string().optional(),
  EMAIL_FROM: Joi.string().optional(),

  // Application
  DEFAULT_API_DATA_LIMIT: Joi.number().default(15),

  ACCESSDOMAINS: Joi.string().required(),

  STORY_VALIDATION_TIME_SPAN_HOURS: Joi.number().optional(),

  API_BASE_URL: Joi.string().optional(),

  ADMIN_BASE_URL: Joi.string().optional(),

  DEFAULT_TIMEZONE: Joi.string().default("UTC"),

  // Stripe
  STRIPE_PUBLISHABLE_KEY: Joi.string().optional(),

  STRIPE_SECRET_KEY: Joi.string().optional(),

  STRIPE_WEBHOOK_SECRET_INTENT_CHARGE: Joi.string().optional(),

  STRIPE_WEBHOOK_SECRET_CUSTOMER_INVOICE_PRICE: Joi.string().optional(),

  // OpenAI
  OPENAI_KEY: Joi.string().optional(),

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

    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,

    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,

    resetPasswordExpirationMinutes:
      envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,

    verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
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

  API_BASE_URL: envVars.API_BASE_URL,

  ADMIN_BASE_URL: envVars.ADMIN_BASE_URL,

  DEFAULT_TIMEZONE: envVars.DEFAULT_TIMEZONE,

  STORY_VALIDATION_TIME_SPAN_HOURS: envVars.STORY_VALIDATION_TIME_SPAN_HOURS,

  STRIPE_PUBLISHABLE_KEY: envVars.STRIPE_PUBLISHABLE_KEY,

  STRIPE_SECRET_KEY: envVars.STRIPE_SECRET_KEY,

  STRIPE_WEBHOOK_SECRET_INTENT_CHARGE:
    envVars.STRIPE_WEBHOOK_SECRET_INTENT_CHARGE,

  STRIPE_WEBHOOK_SECRET_CUSTOMER_INVOICE_PRICE:
    envVars.STRIPE_WEBHOOK_SECRET_CUSTOMER_INVOICE_PRICE,

  OPENAI_KEY: envVars.OPENAI_KEY,

  STORAGE_DIR: path.resolve(
    envVars.STORAGE_DIR || path.join(__dirname, "../../public/uploads")
  ),
};
