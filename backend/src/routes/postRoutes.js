const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const { uploadPostImage } = require("../middlewares/uploadMiddleware");

const {
  createPost,
  getPosts,
  getPostById,
  getPostsByUser,
  updatePost,
  deletePost,
} = require("../controllers/postController");

router.get("/", getPosts);
router.get("/user/:userId", getPostsByUser);
router.get("/:id", getPostById);

router.post("/", authMiddleware, uploadPostImage, createPost);
router.put("/:id", authMiddleware, uploadPostImage, updatePost);
router.delete("/:id", authMiddleware, deletePost);

module.exports = router;
