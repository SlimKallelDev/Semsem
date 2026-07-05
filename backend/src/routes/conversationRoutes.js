const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");

const {
  getUserConversations,
  getConversationById,
} = require("../controllers/conversationController");

router.use(authMiddleware);

router.get("/user/:userId", getUserConversations);
router.get("/:conversationId", getConversationById);

module.exports = router;
