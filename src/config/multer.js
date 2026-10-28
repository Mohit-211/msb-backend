const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const { status: httpStatus } = require('http-status');

const { STORAGE_DIR } = require("./config");
const ApiError = require('../utils/ApiError');

// Per file. Large enough for the blog and section videos.
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// The types each field accepts, and the extension each is saved with. The browser's file name isn't used,
// so a compressed image uploaded as "blob" still works. SVG stays out because it can carry script.
const ALLOWED_TYPES = {
    images: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' },
    videos: { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' },
};

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
        const ext = ALLOWED_TYPES[file.fieldname][file.mimetype];
        // The random part keeps names unguessable and stops files saved in the same millisecond from overwriting each other.
        cb(null, `${file.fieldname}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`);
    }
});

// Check file type
function checkFileType(file, cb) {
    if (ALLOWED_TYPES[file.fieldname]?.[file.mimetype]) {
        return cb(null, true);
    }
    cb(new ApiError(httpStatus.BAD_REQUEST, 'Images must be JPEG, PNG, GIF or WebP, and videos MP4, WebM or MOV.'));
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
