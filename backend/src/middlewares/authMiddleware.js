const jwt = require("jsonwebtoken");

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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      userId: decoded.userId,
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authMiddleware;