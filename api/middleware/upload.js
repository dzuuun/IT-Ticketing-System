const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `ticket-${crypto.randomBytes(16).toString("hex")}${ext}`);
  },
});

function isAllowedUpload(file) {
  const allowedMimeTypes = {
    ".jpg": ["image/jpeg"],
    ".jpeg": ["image/jpeg"],
    ".png": ["image/png"],
    ".gif": ["image/gif"],
    ".webp": ["image/webp"],
    ".pdf": ["application/pdf"],
    ".doc": ["application/msword"],
    ".docx": [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    ".txt": ["text/plain"],
    ".log": ["text/plain"],
    ".zip": ["application/zip", "application/x-zip-compressed"],
  };
  const extension = path.extname(file.originalname).toLowerCase();
  const mimetype = String(file.mimetype || "").toLowerCase();

  return Boolean(allowedMimeTypes[extension]?.includes(mimetype));
}

const fileFilter = (req, file, cb) => {
  if (isAllowedUpload(file)) return cb(null, true);
  cb(
    new Error(
      "File format not supported. Only images, PDFs, docs, logs, and zip files are allowed.",
    ),
  );
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10) * 1024 * 1024,
  },
  fileFilter: fileFilter,
});

const cleanupUploadedFiles = (files = []) =>
  Promise.all(
    files.map((file) =>
      fs.promises.unlink(file.path).catch((error) => {
        if (error.code !== "ENOENT")
          console.error("[Upload Cleanup Error]:", error.message);
      }),
    ),
  );

function ticketAttachments(req, res, next) {
  upload.array("attachments", 5)(req, res, (error) => {
    if (error) {
      cleanupUploadedFiles(req.files).finally(() => next(error));
      return;
    }

    res.once("finish", () => {
      if (res.statusCode >= 400) cleanupUploadedFiles(req.files);
    });
    next();
  });
}

upload.isAllowedUpload = isAllowedUpload;
upload.ticketAttachments = ticketAttachments;
upload.cleanupUploadedFiles = cleanupUploadedFiles;

module.exports = upload;
