const dotenv = require('dotenv')
const path = require('path')
const Joi = require('joi')

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = Joi.object()
    .keys({
        NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
        PORT: Joi.number().default(5000),

        CENTRAL_MYSQL_HOST: Joi.string().required().description('Central Mysql Host'),
        CENTRAL_MYSQL_USER: Joi.string().required().description('Central Mysql User'),
        ////CENTRAL_MYSQL_PASSWORD: Joi.string().required().description('Central Mysql Password'),
        CENTRAL_MYSQL_DB: Joi.string().required().description('Central Mysql DB'),
        CENTRAL_MYSQL_PORT: Joi.string().required().description('Central Port'),

        // SHOP_MYSQL_HOST: Joi.string().required().description('Shop Mysql Host'),
        // SHOP_MYSQL_USER: Joi.string().required().description('Shop Mysql User'),
        // SHOP_MYSQL_PASSWORD: Joi.string().required().description('Shop Mysql Password'),
        // SHOP_MYSQL_DB: Joi.string().required().description('Shop Mysql DB'),
        // SHOP_MYSQL_PORT: Joi.string().required().description('Shop Port'),

        // MONGODB_URL: Joi.string().required().description('Mongo DB url'),

        JWT_SECRET: Joi.string().required().description('JWT secret key'),
        JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30).description('minutes after which access tokens expire'),
        JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30).description('days after which refresh tokens expire'),
        JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number()
            .default(10)
            .description('minutes after which reset password token expires'),
        JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number()
            .default(10)
            .description('minutes after which verify email token expires'),
        SMTP_HOST: Joi.string().description('server that will send the emails'),
        SMTP_PORT: Joi.number().description('port to connect to the email server'),
        SMTP_USERNAME: Joi.string().description('username for email server'),
        SMTP_PASSWORD: Joi.string().description('password for email server'),
        EMAIL_FROM: Joi.string().description('the from field in the emails sent by the app'),
        DEFAULT_API_DATA_LIMIT: Joi.number().default(15),
        ACCESSDOMAINS: Joi.string().description('All allow origin URL coma seprated'),
        STORY_VALIDATION_TIME_SPAN_HOURS: Joi.string().description('How much time a story is valid to show'),
        API_BASE_URL: Joi.string().description('Base url for apis'),
        ADMIN_BASE_URL: Joi.string().description('Base url for Admin apis'),
        DEFAULT_TIMEZONE: Joi.string().description('Default Timezone for application'),
        STRIPE_PUBLISHABLE_KEY: Joi.string().description('Stripe Secret Credential'),
        STRIPE_SECRET_KEY: Joi.string().description('Stripe Secret Credential'),
        STRIPE_WEBHOOK_SECRET_INTENT_CHARGE: Joi.string().description('Stripe Secret Credential'),
        STRIPE_WEBHOOK_SECRET_CUSTOMER_INVOICE_PRICE: Joi.string().description('Stripe Secret Credential'),

        OPENAI_KEY: Joi.string().description('Open ai api key')
    })
    .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);


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
            passwd: envVars.CENTRAL_MYSQL_PASSWORD
        },
        shop: {
            db: envVars.SHOP_MYSQL_DB,
            host: envVars.SHOP_MYSQL_HOST,
            port: envVars.SHOP_MYSQL_PORT,
            user: envVars.SHOP_MYSQL_USER,
            passwd: envVars.SHOP_MYSQL_PASSWORD
        },
        cerc: {
            db: envVars.CERC_POSTGRES_DB,
            host: envVars.CERC_POSTGRES_HOST,
            port: envVars.CERC_POSTGRES_PORT,
            user: envVars.CERC_POSTGRES_USER,
            passwd: envVars.CERC_POSTGRES_PASSWORD
        }
    },
    jwt: {
        secret: envVars.JWT_SECRET,
        accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_DAYS,
        refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
        resetPasswordExpirationMinutes: envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
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
    STRIPE_WEBHOOK_SECRET_INTENT_CHARGE: envVars.STRIPE_WEBHOOK_SECRET_INTENT_CHARGE,
    STRIPE_WEBHOOK_SECRET_CUSTOMER_INVOICE_PRICE: envVars.STRIPE_WEBHOOK_SECRET_CUSTOMER_INVOICE_PRICE,
    OPENAI_KEY: envVars.OPENAI_KEY
};
