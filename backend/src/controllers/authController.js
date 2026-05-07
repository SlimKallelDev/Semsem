const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const {
  USER_PROFILE_TYPES,
  isPublicProfileType,
  normalizeProfileType,
  resolveUserProfileType,
} = require("../constants/profileTypes");

const normalizeRatingAverage = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  if (parsed >= 5) return 5;
  return Number(parsed.toFixed(1));
};

const normalizeRatingCount = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed);
};

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN || "7d",
    }
  );
};

const toUserPayload = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
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

const register = async (req, res, next) => {
  try {
    const { name, email, password, profileType, governorate, country } =
      req.body;

    if (!name || !email || !password || !profileType) {
      res.status(400);
      throw new Error("Name, email, password and profile type are required");
    }

    if (typeof profileType !== "string") {
      res.status(400);
      throw new Error("Profile type must be a single value");
    }

    const normalizedName = String(name).trim();
    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedProfileType = normalizeProfileType(profileType);
    const normalizedGovernorate = String(governorate || "").trim();
    const normalizedCountry = String(country || "").trim();

    if (!normalizedName) {
      res.status(400);
      throw new Error("Name is required");
    }

    if (typeof password !== "string" || password.length < 6) {
      res.status(400);
      throw new Error("Password must be at least 6 characters long");
    }

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

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      profileType: normalizedProfileType,
      governorate: normalizedGovernorate,
      city: normalizedGovernorate,
      country: normalizedCountry,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: toUserPayload(user),
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error("Email and password are required");
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(400);
      throw new Error("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400);
      throw new Error("Invalid credentials");
    }

    const resolvedProfileType = resolveUserProfileType(user.profileType);
    if (user.profileType !== resolvedProfileType) {
      user.profileType = resolvedProfileType;
      await User.updateOne(
        { _id: user._id },
        { $set: { profileType: resolvedProfileType } }
      );
    }

    const token = generateToken(user._id);

    res.status(200).json({
      message: "Login successful",
      token,
      user: toUserPayload(user),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
};

