const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const { uploadPostImage } = require("../middlewares/uploadMiddleware");

const {
  createPost,
  getPosts,
  getPostById,
  getPostsByUser,
  getMyPosts,
  updateOwnPostStatus,
  updatePost,
  deletePost,
} = require("../controllers/postController");
const {
  createPostReport,
} = require("../controllers/postReportController");

router.get("/", getPosts);
router.get("/me", authMiddleware, getMyPosts);
router.get("/user/:userId", getPostsByUser);
router.get("/:id", getPostById);

router.post("/", authMiddleware, uploadPostImage, createPost);
router.post("/:id/reports", authMiddleware, createPostReport);
router.patch("/:id/status", authMiddleware, updateOwnPostStatus);
router.put("/:id", authMiddleware, uploadPostImage, updatePost);
router.delete("/:id", authMiddleware, deletePost);

module.exports = router;
