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
const { uploadAvatar } = require("../middlewares/uploadMiddleware");

router.post("/", createUser);
router.get("/", getUsers);
router.get("/:id/reviews", getUserReviews);
router.post("/:id/reviews", authMiddleware, upsertUserReview);
router.delete("/:id/reviews/me", authMiddleware, deleteMyUserReview);
router.get("/:id", getUser);
router.put("/:id", uploadAvatar, updateUser);
router.delete("/:id", deleteUser);

module.exports = router;
