const multer = require("multer");

const createSingleImageUploader = ({ fieldName, label, maxFileSizeMb }) => {
  const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;

  const uploader = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxFileSizeBytes,
    },
    fileFilter: (req, file, cb) => {
      if (file?.mimetype?.startsWith("image/")) {
        cb(null, true);
        return;
      }

      cb(new Error(`${label} must be an image file`));
    },
  });

  return (req, res, next) => {
    uploader.single(fieldName)(req, res, (error) => {
      if (!error) {
        next();
        return;
      }

      const uploadError = new Error(
        error.code === "LIMIT_FILE_SIZE"
          ? `${label} must be ${maxFileSizeMb} MB or smaller`
          : error.message
      );

      uploadError.statusCode = 400;
      next(uploadError);
    });
  };
};

const createGalleryImageUploader = ({
  singleFieldName,
  multipleFieldName,
  label,
  maxFileSizeMb,
  maxFiles,
}) => {
  const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;

  const uploader = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxFileSizeBytes,
      files: maxFiles + 1,
    },
    fileFilter: (req, file, cb) => {
      if (file?.mimetype?.startsWith("image/")) {
        cb(null, true);
        return;
      }

      cb(new Error(`${label} must be an image file`));
    },
  });

  return (req, res, next) => {
    uploader.fields([
      { name: multipleFieldName, maxCount: maxFiles },
      { name: singleFieldName, maxCount: 1 },
    ])(req, res, (error) => {
      if (error) {
        const isTooManyFiles =
          error.code === "LIMIT_FILE_COUNT" ||
          error.code === "LIMIT_UNEXPECTED_FILE";

        const uploadError = new Error(
          error.code === "LIMIT_FILE_SIZE"
            ? `${label} must be ${maxFileSizeMb} MB or smaller`
            : isTooManyFiles
            ? `${label} accepts up to ${maxFiles} images`
            : error.message
        );

        uploadError.statusCode = 400;
        next(uploadError);
        return;
      }

      const imageFilesCount = Array.isArray(req.files?.[multipleFieldName])
        ? req.files[multipleFieldName].length
        : 0;
      const singleImageCount = Array.isArray(req.files?.[singleFieldName])
        ? req.files[singleFieldName].length
        : 0;
      const totalFiles = imageFilesCount + singleImageCount;

      if (totalFiles > maxFiles) {
        const uploadError = new Error(`${label} accepts up to ${maxFiles} images`);
        uploadError.statusCode = 400;
        next(uploadError);
        return;
      }

      next();
    });
  };
};

const uploadAvatar = createSingleImageUploader({
  fieldName: "avatar",
  label: "Avatar image",
  maxFileSizeMb: 5,
});

const uploadPetImage = createGalleryImageUploader({
  singleFieldName: "image",
  multipleFieldName: "images",
  label: "Pet images",
  maxFileSizeMb: 8,
  maxFiles: 5,
});

const uploadPostImage = createGalleryImageUploader({
  singleFieldName: "image",
  multipleFieldName: "images",
  label: "Post images",
  maxFileSizeMb: 8,
  maxFiles: 5,
});

module.exports = {
  uploadAvatar,
  uploadPetImage,
  uploadPostImage,
};
