const { v2: cloudinary } = require("cloudinary");
const env = require("./env");

const configureCloudinary = () => {
  if (env.CLOUDINARY_URL) {
    const cloudinaryUrl = new URL(env.CLOUDINARY_URL);

    cloudinary.config({
      cloud_name: cloudinaryUrl.hostname,
      api_key: decodeURIComponent(cloudinaryUrl.username),
      api_secret: decodeURIComponent(cloudinaryUrl.password),
      secure: true,
    });

    return;
  }

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
};

const isCloudinaryConfigured = () => {
  return Boolean(
    env.CLOUDINARY_URL ||
      (env.CLOUDINARY_CLOUD_NAME &&
        env.CLOUDINARY_API_KEY &&
        env.CLOUDINARY_API_SECRET)
  );
};

configureCloudinary();

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
};
