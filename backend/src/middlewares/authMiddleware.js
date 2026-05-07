const jwt = require("jsonwebtoken");
const env = require("../config/env");

const authMiddleware = (req, res, next) => {
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

    req.user = {
      userId: decoded.userId,
    };

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
