const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'ticket-' + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt|log|zip/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname || mimetype) {
    return cb(null, true);
  }
  cb(new Error('File format not supported. Only images, PDFs, docs, logs, and zip files are allowed.'));
};

const upload = multer({
  storage: storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10) * 1024 * 1024 },
  fileFilter: fileFilter,
});

module.exports = upload;
