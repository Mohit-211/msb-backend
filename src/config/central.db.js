const { Sequelize } = require('sequelize');
const config = require('./config.js');
const logger = require('./logger.js');

// db connection option
const sequelizeOptions = {
    host: config.databases.central.host,
    port: config.databases.central.port,
    dialect: 'mysql',
    pool: {
        max: 10,
        min: 0,
        idle: 10000,
    },
    // SQL shows at debug level, so only in development.
    logging: config.env === 'production' ? false : (sql) => logger.debug(sql)
};

//create connection object
const sequelize = new Sequelize(
    config.databases.central.db,
    config.databases.central.user,
    config.databases.central.passwd,
    sequelizeOptions,
);

sequelize.authenticate()
    .then(() => logger.info('Connection has been established successfully.'))
    .catch((error) => logger.error(`Unable to connect to the database: ${error.message}`));


// export connection object
module.exports = sequelize;
