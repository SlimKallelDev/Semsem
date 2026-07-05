const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");

const {
  startConversation,
  sendMessage,
  getMessagesByConversation,
  deleteMessage,
} = require("../controllers/messageController");

router.use(authMiddleware);

router.post("/start", startConversation);
router.post("/", sendMessage);
router.get("/conversation/:conversationId", getMessagesByConversation);
router.delete("/:id", deleteMessage);

module.exports = router;
