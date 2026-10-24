const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");

const ensureCloudinaryConfigured = () => {
  if (!isCloudinaryConfigured()) {
    const error = new Error("Cloudinary is not configured");
    error.statusCode = 500;
    throw error;
  }
};

const sanitizeId = (value, fallback = "item") => {
  const normalized = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "");

  return normalized || fallback;
};

const uploadImageBuffer = (file, options = {}) => {
  ensureCloudinaryConfigured();

  if (!file?.buffer) {
    const error = new Error("Image file is required");
    error.statusCode = 400;
    throw error;
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        use_filename: false,
        unique_filename: false,
        ...options,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    uploadStream.end(file.buffer);
  });
};

const uploadAvatarBuffer = (file, userId) => {
  return uploadImageBuffer(file, {
    folder: "semsem/avatars",
    public_id: `user-${sanitizeId(userId, "user")}`,
    overwrite: true,
    invalidate: true,
  });
};

const uploadPetImageBuffer = (file, ownerId) => {
  return uploadImageBuffer(file, {
    folder: "semsem/pets",
    public_id: `pet-${sanitizeId(ownerId, "owner")}-${Date.now()}`,
  });
};

const uploadPostImageBuffer = (file, userId) => {
  return uploadImageBuffer(file, {
    folder: "semsem/posts",
    public_id: `post-${sanitizeId(userId, "user")}-${Date.now()}`,
  });
};

module.exports = {
  uploadAvatarBuffer,
  uploadPetImageBuffer,
  uploadPostImageBuffer,
  uploadImageBuffer,
};
