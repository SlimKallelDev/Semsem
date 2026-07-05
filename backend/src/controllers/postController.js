const Post = require("../models/Post");
const User = require("../models/User");
const { uploadPostImageBuffer } = require("../services/cloudinaryService");
const {
  POST_TYPES,
  getAllowedPostTypesForProfileType,
  isPostTypeAllowedForProfileType,
  isValidPostType,
  normalizePostType,
} = require("../constants/postTypes");
const { USER_PUBLIC_FIELDS } = require("../constants/userPublicFields");
const {
  POST_STATUS,
  USER_STATUS,
} = require("../constants/moderationStatuses");

const HTTP_URL_PATTERN = /^https?:\/\//i;
const POST_IMAGE_MIN_CREATE = 0;
const POST_IMAGE_MAX = 5;

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeLocation = (location = {}) => ({
  governorate: location?.governorate?.trim?.() || location?.city?.trim?.() || "",
  city: location?.governorate?.trim?.() || location?.city?.trim?.() || "",
  country: location?.country?.trim?.() || "",
});

const createRequestError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parseSalePrice = (value) => {
  if (value === undefined || value === null) return null;

  const rawValue = String(value).trim();
  if (!rawValue) return null;

  const parsedPrice = Number(rawValue.replace(",", "."));
  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    throw createRequestError("Enter a valid sale price");
  }

  return parsedPrice;
};

const normalizeCurrency = (value) => String(value || "").trim().toUpperCase();

const resolveSaleDetails = ({
  type,
  price,
  currency,
  existingPrice = null,
  existingCurrency = "",
}) => {
  if (type !== POST_TYPES.SALE) {
    return {
      price: null,
      currency: "",
    };
  }

  const resolvedPrice =
    price === undefined ? parseSalePrice(existingPrice) : parseSalePrice(price);
  const resolvedCurrency =
    currency === undefined ? normalizeCurrency(existingCurrency) : normalizeCurrency(currency);

  if (resolvedPrice === null) {
    throw createRequestError("Sale price is required");
  }

  if (!resolvedCurrency) {
    throw createRequestError("Sale currency is required");
  }

  return {
    price: resolvedPrice,
    currency: resolvedCurrency,
  };
};

const normalizePostLocationDocument = (post) => {
  if (!post) return post;

  const normalizedGovernorate = String(
    post?.location?.governorate || post?.location?.city || ""
  ).trim();

  if (!post.location || typeof post.location !== "object") {
    post.location = {};
  }

  post.location.governorate = normalizedGovernorate;
  post.location.city = normalizedGovernorate;

  if (post?.user && typeof post.user === "object") {
    const userGovernorate = String(
      post.user.governorate || post.user.city || ""
    ).trim();
    post.user.governorate = userGovernorate;
    post.user.city = userGovernorate;
  }

  return post;
};

const parseLocationInput = (location) => {
  if (location === undefined) {
    return normalizeLocation({});
  }

  if (typeof location === "string") {
    const rawLocation = location.trim();

    if (!rawLocation) {
      return normalizeLocation({});
    }

    try {
      const parsed = JSON.parse(rawLocation);
      return normalizeLocation(parsed);
    } catch (error) {
      const parseError = new Error("Invalid location format");
      parseError.statusCode = 400;
      throw parseError;
    }
  }

  if (typeof location === "object" && location !== null) {
    return normalizeLocation(location);
  }

  const parseError = new Error("Invalid location format");
  parseError.statusCode = 400;
  throw parseError;
};

const buildPostLocationFilter = ({ country, governorate }) => {
  const filter = {};

  if (country?.trim()) {
    filter["location.country"] = {
      $regex: `^${escapeRegex(country.trim())}$`,
      $options: "i",
    };
  }

  if (governorate?.trim()) {
    const governorateRegex = {
      $regex: escapeRegex(governorate.trim()),
      $options: "i",
    };
    filter.$or = [
      { "location.governorate": governorateRegex },
      { "location.city": governorateRegex },
    ];
  }

  return filter;
};

const normalizeImageValue = (value) => {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
};

const parseImageListInput = (rawImages) => {
  if (rawImages === undefined) {
    return [];
  }

  if (Array.isArray(rawImages)) {
    return rawImages.map(normalizeImageValue).filter(Boolean);
  }

  const normalized = normalizeImageValue(rawImages);
  if (!normalized) {
    return [];
  }

  if (normalized.startsWith("[") && normalized.endsWith("]")) {
    try {
      const parsed = JSON.parse(normalized);
      if (!Array.isArray(parsed)) {
        const parseError = new Error("Invalid post images format");
        parseError.statusCode = 400;
        throw parseError;
      }

      return parsed.map(normalizeImageValue).filter(Boolean);
    } catch (error) {
      const parseError = new Error("Invalid post images format");
      parseError.statusCode = 400;
      throw parseError;
    }
  }

  return [normalized];
};

const getUploadedImageFiles = (req) => {
  if (!req?.files) {
    return req?.file ? [req.file] : [];
  }

  if (Array.isArray(req.files)) {
    return req.files;
  }

  return Object.values(req.files).flat().filter(Boolean);
};

const parseRemoteImageUrls = (body = {}) => {
  const listFromImages = parseImageListInput(body.images);
  const listFromImage = parseImageListInput(body.image);
  const urls = [...listFromImages, ...listFromImage];

  const invalidUrl = urls.find((value) => !HTTP_URL_PATTERN.test(value));
  if (invalidUrl) {
    const uploadError = new Error("Post images must be uploaded as image files");
    uploadError.statusCode = 400;
    throw uploadError;
  }

  return urls;
};

const resolvePostImages = async ({ req, userId }) => {
  const files = getUploadedImageFiles(req);
  const body = req?.body || {};
  const hasImageField = Object.prototype.hasOwnProperty.call(body, "image");
  const hasImagesField = Object.prototype.hasOwnProperty.call(body, "images");
  const hasImagePayload = files.length > 0 || hasImageField || hasImagesField;
  const remoteImageUrls = parseRemoteImageUrls(body);

  if (!hasImagePayload) {
    return {
      hasImagePayload: false,
      images: [],
    };
  }

  if (files.length + remoteImageUrls.length > POST_IMAGE_MAX) {
    const limitError = new Error(`Post accepts up to ${POST_IMAGE_MAX} images`);
    limitError.statusCode = 400;
    throw limitError;
  }

  const uploadedImageUrls = await Promise.all(
    files.map(async (file) => {
      const uploadedImage = await uploadPostImageBuffer(file, userId);
      return uploadedImage.secure_url;
    })
  );

  const uniqueImages = [...new Set([...uploadedImageUrls, ...remoteImageUrls])];

  if (uniqueImages.length > POST_IMAGE_MAX) {
    const limitError = new Error(`Post accepts up to ${POST_IMAGE_MAX} images`);
    limitError.statusCode = 400;
    throw limitError;
  }

  return {
    hasImagePayload: true,
    images: uniqueImages,
  };
};

const hydratePostImages = (post) => {
  if (!post) return post;

  const imagesFromArray = Array.isArray(post.images)
    ? post.images.map(normalizeImageValue).filter(Boolean)
    : [];

  const fallbackImage = normalizeImageValue(post.image);
  const normalizedImages = imagesFromArray.length
    ? imagesFromArray.slice(0, POST_IMAGE_MAX)
    : fallbackImage
    ? [fallbackImage]
    : [];

  post.images = normalizedImages;
  post.image = normalizedImages[0] || "";

  return normalizePostLocationDocument(post);
};

const getAuthorProfileType = async (userId) => {
  const author = await User.findById(userId).select("profileType");

  if (!author) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return author.profileType;
};

const getActiveUserIds = () =>
  User.find({ status: USER_STATUS.ACTIVE }).distinct("_id");

const buildVisiblePostFilter = async (query = {}) => ({
  ...buildPostLocationFilter(query),
  status: POST_STATUS.PUBLISHED,
  user: { $in: await getActiveUserIds() },
});

const createPost = async (req, res, next) => {
  try {
    const { type, title, description, pet_type, location, price, currency } = req.body;
    const normalizedType = normalizePostType(type);
    const userId = req.user?.userId;

    const normalizedLocation = parseLocationInput(location);
    const { images } = await resolvePostImages({
      req,
      userId,
    });

    if (!title?.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    if (!description?.trim()) {
      return res.status(400).json({ message: "Description is required" });
    }

    if (!isValidPostType(normalizedType)) {
      return res.status(400).json({ message: "Invalid post type" });
    }

    const profileType = await getAuthorProfileType(userId);
    const allowedTypes = getAllowedPostTypesForProfileType(profileType);

    if (!isPostTypeAllowedForProfileType(profileType, normalizedType)) {
      return res.status(403).json({
        message: "This post type is not allowed for your profile type",
        allowedTypes,
      });
    }

    const saleDetails = resolveSaleDetails({
      type: normalizedType,
      price,
      currency,
    });

    if (images.length < POST_IMAGE_MIN_CREATE) {
      return res.status(400).json({
        message: `At least ${POST_IMAGE_MIN_CREATE} post image is required`,
      });
    }

    if (!normalizedLocation.country) {
      return res.status(400).json({ message: "Country is required" });
    }

    const postPayload = {
      user: userId,
      type: normalizedType,
      title: title.trim(),
      description: description.trim(),
      image: images[0] || "",
      images,
      pet_type: String(pet_type || "").trim(),
      price: saleDetails.price,
      currency: saleDetails.currency,
      location: normalizedLocation,
      status: POST_STATUS.PUBLISHED,
    };

    const post = await Post.create(postPayload);

    const populatedPost = await Post.findById(post._id).populate(
      "user",
      USER_PUBLIC_FIELDS
    );
    hydratePostImages(populatedPost);

    res.status(201).json(populatedPost);
  } catch (error) {
    next(error);
  }
};

const getPosts = async (req, res, next) => {
  try {
    const filter = await buildVisiblePostFilter(req.query);

    const posts = await Post.find(filter)
      .populate("user", USER_PUBLIC_FIELDS)
      .sort({ createdAt: -1 });

    posts.forEach(hydratePostImages);
    res.status(200).json(posts);
  } catch (error) {
    next(error);
  }
};

const getPostById = async (req, res, next) => {
  try {
    const activeUserIds = await getActiveUserIds();
    const post = await Post.findOne({
      _id: req.params.id,
      status: POST_STATUS.PUBLISHED,
      user: { $in: activeUserIds },
    }).populate("user", USER_PUBLIC_FIELDS);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    hydratePostImages(post);
    res.status(200).json(post);
  } catch (error) {
    next(error);
  }
};

const getPostsByUser = async (req, res, next) => {
  try {
    const activeUser = await User.exists({
      _id: req.params.userId,
      status: USER_STATUS.ACTIVE,
    });

    if (!activeUser) {
      return res.status(200).json([]);
    }

    const posts = await Post.find({
      user: req.params.userId,
      status: POST_STATUS.PUBLISHED,
    })
      .populate("user", USER_PUBLIC_FIELDS)
      .sort({ createdAt: -1 });

    posts.forEach(hydratePostImages);
    res.status(200).json(posts);
  } catch (error) {
    next(error);
  }
};

const getMyPosts = async (req, res, next) => {
  try {
    const posts = await Post.find({ user: req.user.userId })
      .populate("user", USER_PUBLIC_FIELDS)
      .sort({ createdAt: -1 });

    posts.forEach(hydratePostImages);
    res.status(200).json(posts);
  } catch (error) {
    next(error);
  }
};

const updatePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.user.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this post" });
    }

    const { type, title, description, pet_type, location, price, currency } = req.body;
    const profileType = await getAuthorProfileType(req.user.userId);

    if (type !== undefined) {
      const normalizedType = normalizePostType(type);

      if (!isValidPostType(normalizedType)) {
        return res.status(400).json({ message: "Invalid post type" });
      }

      const isKeepingCurrentType =
        normalizedType === normalizePostType(post.type);

      if (
        !isKeepingCurrentType &&
        !isPostTypeAllowedForProfileType(profileType, normalizedType)
      ) {
        return res.status(403).json({
          message: "This post type is not allowed for your profile type",
          allowedTypes: getAllowedPostTypesForProfileType(profileType),
        });
      }

      post.type = normalizedType;
    }

    if (title !== undefined) post.title = String(title).trim();
    if (description !== undefined) post.description = String(description).trim();
    const { hasImagePayload, images } = await resolvePostImages({
      req,
      userId: req.user?.userId,
    });

    if (hasImagePayload) {
      post.images = images;
      post.image = images[0] || "";
    }
    if (pet_type !== undefined) post.pet_type = String(pet_type || "").trim();

    if (type !== undefined || price !== undefined || currency !== undefined) {
      const saleDetails = resolveSaleDetails({
        type: normalizePostType(post.type),
        price,
        currency,
        existingPrice: post.price,
        existingCurrency: post.currency,
      });

      post.price = saleDetails.price;
      post.currency = saleDetails.currency;
    }

    if (location !== undefined) {
      const normalizedLocation = parseLocationInput(location);

      if (!normalizedLocation.country) {
        return res.status(400).json({ message: "Country is required" });
      }

      post.location = normalizedLocation;
    }

    const updatedPost = await post.save();
    await updatedPost.populate("user", USER_PUBLIC_FIELDS);
    hydratePostImages(updatedPost);

    res.status(200).json(updatedPost);
  } catch (error) {
    next(error);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.user.toString() !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this post" });
    }

    await post.deleteOne();

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPost,
  getPosts,
  getPostById,
  getPostsByUser,
  getMyPosts,
  updatePost,
  deletePost,
};

