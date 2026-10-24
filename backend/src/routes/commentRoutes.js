const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");

const {
  createComment,
  getCommentsByPost,
  getMyComments,
  updateComment,
  deleteComment,
} = require("../controllers/commentController");

router.post("/", authMiddleware, createComment);
router.get("/me", authMiddleware, getMyComments);
router.get("/post/:postId", getCommentsByPost);
router.put("/:id", authMiddleware, updateComment);
router.delete("/:id", authMiddleware, deleteComment);

module.exports = router;
