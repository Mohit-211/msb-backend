const allowedOrigins = require('../helpers/accessDomains');

const corsConfigs = {
    origin: (origin, callback) => {
        
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            // remove ||!origin to block postman request
            callback(null, true)
        } else {
            console.log("3333333333333333333333333333333", allowedOrigins.indexOf(origin))
            callback(new Error('Origin not allowed by Cors'))
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
};
module.exports = corsConfigs