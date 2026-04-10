const express = require("express");
const router = express.Router();

const {
  getUserConversations,
} = require("../controllers/conversationController");

router.get("/user/:userId", getUserConversations);

module.exports = router;