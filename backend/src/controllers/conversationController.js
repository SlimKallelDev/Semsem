const Conversation = require("../models/Conversation");

const populateConversation = (query) =>
  query
    .populate("participants", "_id name email avatar image")
    .populate({
      path: "lastMessage",
      populate: {
        path: "sender",
        select: "_id name email avatar image",
      },
    });

const getUserConversations = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const conversations = await populateConversation(
      Conversation.find({
        participants: userId,
      })
    ).sort({ updatedAt: -1 });

    return res.status(200).json(conversations);
  } catch (error) {
    next(error);
  }
};

const getConversationById = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    const conversation = await populateConversation(
      Conversation.findById(conversationId)
    );

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    return res.status(200).json(conversation);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserConversations,
  getConversationById,
};
