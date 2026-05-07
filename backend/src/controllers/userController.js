const User = require("../models/User");
const UserReview = require("../models/UserReview");
const bcrypt = require("bcryptjs");
const { uploadAvatarBuffer } = require("../services/cloudinaryService");
const {
  USER_PROFILE_TYPES,
  isPublicProfileType,
  normalizeProfileType,
  resolveUserProfileType,
} = require("../constants/profileTypes");
const { USER_PUBLIC_FIELDS } = require("../constants/userPublicFields");

const REVIEW_MIN = 1;
const REVIEW_MAX = 5;
const REVIEW_MAX_LENGTH = 500;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeRatingAverage = (value) => {
  const parsed = toNumber(value, 0);
  if (parsed <= 0) return 0;
  if (parsed >= 5) return 5;
  return Number(parsed.toFixed(1));
};

const normalizeRatingCount = (value) => {
  const parsed = Math.floor(toNumber(value, 0));
  return parsed > 0 ? parsed : 0;
};

const mapUserWithProfileType = (user) => {
  const userJson =
    typeof user?.toObject === "function" ? user.toObject() : { ...(user || {}) };
  const normalizedGovernorate = String(
    userJson.governorate || userJson.city || ""
  ).trim();

  userJson.governorate = normalizedGovernorate;
  userJson.city = normalizedGovernorate;
  userJson.profileType = resolveUserProfileType(userJson.profileType);
  userJson.ratingAverage = normalizeRatingAverage(userJson.ratingAverage);
  userJson.ratingCount = normalizeRatingCount(userJson.ratingCount);
  return userJson;
};

const recalculateUserRatingStats = async (targetUserId) => {
  const stats = await UserReview.aggregate([
    { $match: { targetUser: targetUserId } },
    {
      $group: {
        _id: "$targetUser",
        ratingAverage: { $avg: "$rating" },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  const nextStats = stats[0]
    ? {
        ratingAverage: normalizeRatingAverage(stats[0].ratingAverage),
        ratingCount: normalizeRatingCount(stats[0].ratingCount),
      }
    : {
        ratingAverage: 0,
        ratingCount: 0,
      };

  await User.updateOne({ _id: targetUserId }, { $set: nextStats });
  return nextStats;
};

const createUser = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      governorate,
      city,
      country,
      phone,
      bio,
      avatar,
      role,
      profileType,
    } = req.body;

    if (!email) {
      res.status(400);
      throw new Error("Email is required");
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    if (profileType === undefined || profileType === null || profileType === "") {
      res.status(400);
      throw new Error("Profile type is required");
    }

    if (typeof profileType !== "string") {
      res.status(400);
      throw new Error("Profile type must be a single value");
    }

    const normalizedProfileType = normalizeProfileType(profileType);

    if (!isPublicProfileType(normalizedProfileType)) {
      res.status(400);
      throw new Error(
        normalizedProfileType === USER_PROFILE_TYPES.ADMIN
          ? "Admin profile type can only be assigned manually"
          : "Invalid profile type"
      );
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(400);
      throw new Error("Email already exists");
    }

    let hashedPassword;

    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      governorate: String(governorate || city || "").trim(),
      city: String(governorate || city || "").trim(),
      country,
      phone,
      bio,
      avatar,
      role,
      profileType: normalizedProfileType,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      governorate: user.governorate || user.city || "",
      country: user.country,
      phone: user.phone,
      bio: user.bio,
      avatar: user.avatar,
      profileType: resolveUserProfileType(user.profileType),
      ratingAverage: normalizeRatingAverage(user.ratingAverage),
      ratingCount: normalizeRatingCount(user.ratingCount),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password");
    const usersWithProfileType = users.map(mapUserWithProfileType);
    res.status(200).json(usersWithProfileType);
  } catch (error) {
    next(error);
  }
};

const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    const resolvedProfileType = resolveUserProfileType(user.profileType);
    if (user.profileType !== resolvedProfileType) {
      user.profileType = resolvedProfileType;
      await User.updateOne(
        { _id: user._id },
        { $set: { profileType: resolvedProfileType } }
      );
    }

    res.status(200).json(mapUserWithProfileType(user));
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const updates = { ...req.body };

    if (updates.governorate === undefined && updates.city !== undefined) {
      updates.governorate = updates.city;
    }
    if (updates.governorate !== undefined) {
      const normalizedGovernorate = String(updates.governorate || "").trim();
      updates.governorate = normalizedGovernorate;
      updates.city = normalizedGovernorate;
    }

    // Ratings are computed from reviews and must not be directly editable.
    delete updates.ratingAverage;
    delete updates.ratingCount;

    if (updates.profileType !== undefined) {
      if (typeof updates.profileType !== "string") {
        res.status(400);
        throw new Error("Profile type must be a single value");
      }

      const normalizedProfileType = normalizeProfileType(updates.profileType);

      if (!isPublicProfileType(normalizedProfileType)) {
        res.status(400);
        throw new Error(
          normalizedProfileType === USER_PROFILE_TYPES.ADMIN
            ? "Admin profile type can only be assigned manually"
            : "Invalid profile type"
        );
      }

      updates.profileType = normalizedProfileType;
    }

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    if (req.file) {
      const uploadedAvatar = await uploadAvatarBuffer(req.file, req.params.id);
      updates.avatar = uploadedAvatar.secure_url;
    } else if (
      updates.avatar &&
      typeof updates.avatar === "string" &&
      !/^https?:\/\//i.test(updates.avatar)
    ) {
      res.status(400);
      throw new Error("Avatar must be uploaded as an image file");
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    res.status(200).json(mapUserWithProfileType(user));
  } catch (error) {
    next(error);
  }
};

const getUserReviews = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;

    const targetUser = await User.findById(targetUserId).select("_id");
    if (!targetUser) {
      res.status(404);
      throw new Error("User not found");
    }

    const reviews = await UserReview.find({ targetUser: targetUserId })
      .populate("reviewer", USER_PUBLIC_FIELDS)
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    next(error);
  }
};

const upsertUserReview = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const reviewerId = req.user?.userId;
    const { rating, review } = req.body;

    if (!reviewerId) {
      res.status(401);
      throw new Error("Unauthorized");
    }

    if (String(targetUserId) === String(reviewerId)) {
      res.status(400);
      throw new Error("You cannot rate yourself");
    }

    const targetUser = await User.findById(targetUserId).select("_id");
    if (!targetUser) {
      res.status(404);
      throw new Error("User not found");
    }

    const normalizedRating = Number(rating);
    const normalizedReview = String(review || "").trim();

    if (!Number.isInteger(normalizedRating)) {
      res.status(400);
      throw new Error("Rating must be an integer between 1 and 5");
    }

    if (normalizedRating < REVIEW_MIN || normalizedRating > REVIEW_MAX) {
      res.status(400);
      throw new Error(`Rating must be between ${REVIEW_MIN} and ${REVIEW_MAX}`);
    }

    if (!normalizedReview) {
      res.status(400);
      throw new Error("Review text is required");
    }

    if (normalizedReview.length > REVIEW_MAX_LENGTH) {
      res.status(400);
      throw new Error(`Review cannot exceed ${REVIEW_MAX_LENGTH} characters`);
    }

    const userReview = await UserReview.findOneAndUpdate(
      { targetUser: targetUserId, reviewer: reviewerId },
      { rating: normalizedRating, review: normalizedReview },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    ).populate("reviewer", USER_PUBLIC_FIELDS);

    const ratingStats = await recalculateUserRatingStats(targetUserId);

    res.status(200).json({
      message: "Review saved successfully",
      review: userReview,
      ...ratingStats,
    });
  } catch (error) {
    next(error);
  }
};

const deleteMyUserReview = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const reviewerId = req.user?.userId;

    if (!reviewerId) {
      res.status(401);
      throw new Error("Unauthorized");
    }

    const deletedReview = await UserReview.findOneAndDelete({
      targetUser: targetUserId,
      reviewer: reviewerId,
    });

    if (!deletedReview) {
      res.status(404);
      throw new Error("Review not found");
    }

    const ratingStats = await recalculateUserRatingStats(targetUserId);

    res.status(200).json({
      message: "Review deleted successfully",
      ...ratingStats,
    });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  getUserReviews,
  upsertUserReview,
  deleteMyUserReview,
  deleteUser,
};

