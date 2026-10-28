const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const { status: httpStatus } = require('http-status');

const { STORAGE_DIR } = require("./config");
const ApiError = require('../utils/ApiError');

// Per file. Large enough for the blog and section videos.
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Set storage engine
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === 'videos') {
            cb(null, path.join(STORAGE_DIR, "videos"));
        } else if (file.fieldname === 'images') {
            cb(null, path.join(STORAGE_DIR, "images"));
        } else {
            cb(new Error('Invalid fieldname'));
        }
    },
    filename: function (req, file, cb) {
        const ext = file.mimetype.split("/")[1];
        // The random part keeps names unguessable and stops files saved in the same millisecond from overwriting each other.
        cb(null, `${file.fieldname}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`);
    }
});

// Check file type
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif|mp4|mov/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new ApiError(httpStatus.BAD_REQUEST, 'Only images and videos can be uploaded.'));
    }
}

const parseUpload = multer({
    storage: storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).fields([
    { name: 'images', maxCount: 10 },
    { name: 'videos', maxCount: 10 }
]);

// Runs after authentication. Multer replaces req.body, so put back the user the auth middleware attached
// (this also stops a form field called "user" from impersonating someone).
const upload = (req, res, next) => {
    const user = req.body?.user;
    parseUpload(req, res, (err) => {
        if (err) {
            return next(err instanceof multer.MulterError ? new ApiError(httpStatus.BAD_REQUEST, err.message) : err);
        }
        if (user) req.body.user = user;
        next();
    });
};

module.exports = upload;
