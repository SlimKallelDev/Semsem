const express = require("express");
const router = express.Router();

const {
  createUser,
  getUsers,
  getUser,
  updateUser,
  getUserReviews,
  upsertUserReview,
  deleteMyUserReview,
  deleteUser,
} = require("../controllers/userController");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");
const { uploadAvatar } = require("../middlewares/uploadMiddleware");

router.post("/", authMiddleware, adminMiddleware, createUser);
router.get("/", getUsers);
router.get("/:id/reviews", getUserReviews);
router.post("/:id/reviews", authMiddleware, upsertUserReview);
router.delete("/:id/reviews/me", authMiddleware, deleteMyUserReview);
router.get("/:id", getUser);
router.put("/:id", authMiddleware, uploadAvatar, updateUser);
router.delete("/:id", authMiddleware, deleteUser);

module.exports = router;
