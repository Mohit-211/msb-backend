const multer = require('multer');
const path = require('path');

const { STORAGE_DIR } = require("./config");

// Set storage engine
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === 'videos') {
            cb(null, path.join(STORAGE_DIR, "videos"));
        } else if (file.fieldname === 'images') {
            cb(null, path.join(STORAGE_DIR, "images"));
        } else if (file.fieldname === 'gifs') {
            cb(null, path.join(STORAGE_DIR, "gifs"));
        } else if (file.fieldname === 'docs') {
            cb(null, path.join(STORAGE_DIR, "docs"));
        }else if (file.fieldname === 'audios') {
            cb(null, path.join(STORAGE_DIR, "audios"));
        }else {
            cb(new Error('Invalid fieldname'));
        }
    },
    filename: function (req, file, cb) {
        const ext = file.mimetype.split("/")[1];
        cb(null, `${file.fieldname}-${Date.now()}.${ext}`);
    }
});

// Check file type
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif|mp4|mov|pdf|mp3/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images, videos, mp3, and PDF files only!');
    }
}

// Init upload
const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).fields([
    { name: 'gifs', maxCount: 10 },
    { name: 'images', maxCount: 10 },
    { name: 'videos', maxCount: 10 },
    { name: 'docs', maxCount: 10 },
    { name: 'audios', maxCount: 10 }
]);

module.exports = upload;
