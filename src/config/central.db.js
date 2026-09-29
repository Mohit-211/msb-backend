const { Sequelize } = require('sequelize');
const config = require('./config.js');

// db connection option
const sequelizeOptions = {
    host: config.databases.central.host,
    dialect: 'mysql',
    // timezone: '+05:30',
    pool: {
        max: 10,
        min: 0,
        idle: 10000,
    },
    logging: config.env === 'production' ? false : console.log
};

//create connection object
const sequelize = new Sequelize(
    config.databases.central.db,
    config.databases.central.user,
    config.databases.central.passwd,
    sequelizeOptions,
);

sequelize.authenticate()
    .then(() => console.log('Connection has been established successfully.'))
    .catch((error) => console.log('Unable to connect to the database:', error));


// export connection object
module.exports = sequelize;

