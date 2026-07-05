const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../models/User");
const { USER_STATUS } = require("../constants/moderationStatuses");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401);
      throw new Error("No token provided");
    }

    if (!authHeader.startsWith("Bearer ")) {
      res.status(401);
      throw new Error("Invalid token format");
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select(
      "_id name email role status"
    );

    if (!user) {
      res.status(401);
      throw new Error("Account not found");
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      res.status(403);
      throw new Error("This account has been blocked by an administrator");
    }

    req.user = {
      userId: user._id,
      role: user.role,
      status: user.status,
    };
    req.authUser = user;

    next();
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      res.status(401);
      error.message = "jwt expired";
    } else if (
      error?.name === "JsonWebTokenError" ||
      error?.name === "NotBeforeError"
    ) {
      res.status(401);
      error.message = "Invalid token";
    }

    next(error);
  }
};

module.exports = authMiddleware;
