const express = require("express");
const router = express.Router();

const {
  startConversation,
  sendMessage,
  getMessagesByConversation,
  deleteMessage,
} = require("../controllers/messageController");

router.post("/start", startConversation);
router.post("/", sendMessage);
router.get("/conversation/:conversationId", getMessagesByConversation);
router.delete("/:id", deleteMessage);

module.exports = router;