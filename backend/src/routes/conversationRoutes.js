const express = require("express");
const router = express.Router();

const {
  getUserConversations,
  getConversationById,
} = require("../controllers/conversationController");

router.get("/user/:userId", getUserConversations);
router.get("/:conversationId", getConversationById);

module.exports = router;
