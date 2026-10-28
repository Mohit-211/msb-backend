function responseWrapper(res, data, message, status = 200) {
    return res.status(status).json({
        success: status < 400,
        status: status,
        message : message,
        data: data,
    });
};
module.exports = responseWrapper;