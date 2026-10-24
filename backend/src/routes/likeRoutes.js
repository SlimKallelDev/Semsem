const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const {
  likePost,
  unlikePost,
  getLikesByPost,
  getMyLikes,
} = require("../controllers/likeController");

router.post("/", authMiddleware, likePost);
router.delete("/", authMiddleware, unlikePost);
router.get("/me", authMiddleware, getMyLikes);
router.get("/post/:postId", getLikesByPost);

module.exports = router;
