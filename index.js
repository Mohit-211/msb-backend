// const app = require('./app.js');
const app = require('./app.js');
const config = require('./src/config/config.js');
const logger = require('./src/config/logger.js');
const allowedOrigins = require('./src/helpers/accessDomains.js');


// For Http Server
/*
const http = require('http');
let servers = http.createServer(app);

const io = require('socket.io')(servers, {
  transports: ['polling'],
  cors: { origin: allowedOrigins },
});
require('./socketio.js')(io);

let server = servers.listen(config.port, () => {
    logger.info(`Listening to port ${config.port}`);
});
*/

// For Https Server

var https = require('https');
var fs = require('fs');

/*
var options = {
    key: fs.readFileSync('/etc/ssl/virtualmin/169839769268075/ssl.key'),
    cert: fs.readFileSync('/etc/ssl/virtualmin/169839769268075/ssl.cert'),
    ca: fs.readFileSync('/etc/ssl/virtualmin/169839769268075/ssl.ca'),
};
*/

var options = {
    key: fs.readFileSync('/etc/ssl/virtualmin/1763051079459609/ssl.key'),
    cert: fs.readFileSync('/etc/ssl/virtualmin/1763051079459609/ssl.cert'),
    ca: fs.readFileSync('/etc/ssl/virtualmin/1763051079459609/ssl.ca'),
};

let servers = https.createServer(options, app);

// const io = require('socket.io')(servers, {
//     transports: ['polling'],
//     cors: { origin: allowedOrigins },
// });
// let socketConnection = require('./socketio.js')(io);

// app.use(require('./src/middlewares/middlewares.js').global.socketIo(socketConnection));

let server = servers.listen(config.port, () => {
    logger.info(`Listening to port ${config.port}`);
});


//server exit operations
const exitHandler = () => {
    if (server) {
        server.close(() => {
            logger.info('Server closed');
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
};

//unexpectedError handler
const unexpectedErrorHandler = (error) => {
    logger.error(error);
    exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);
process.on('SIGTERM', exitHandler);
