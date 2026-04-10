const express = require("express");
const router = express.Router();

const {
  createComment,
  getCommentsByPost,
  updateComment,
  deleteComment,
} = require("../controllers/commentController");

router.post("/", createComment);
router.get("/post/:postId", getCommentsByPost);
router.put("/:id", updateComment);
router.delete("/:id", deleteComment);

module.exports = router;