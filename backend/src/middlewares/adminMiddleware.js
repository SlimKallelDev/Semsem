const User = require("../models/User");
const { USER_STATUS } = require("../constants/moderationStatuses");

const adminMiddleware = async (req, res, next) => {
  try {
    const admin =
      req.authUser ||
      (await User.findById(req.user?.userId).select(
        "_id name email role status"
      ));

    if (!admin) {
      return res.status(401).json({ message: "Administrator account not found" });
    }

    if (admin.role !== "admin") {
      return res.status(403).json({ message: "Administrator access required" });
    }

    if (admin.status !== USER_STATUS.ACTIVE) {
      return res.status(403).json({
        message: "This administrator account is not active",
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = adminMiddleware;
