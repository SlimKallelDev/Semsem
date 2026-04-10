const Conversation = require("../models/Conversation");

const getUserConversations = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "_id name email image")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "_id name email image",
        },
      })
      .sort({ updatedAt: -1 });

    return res.status(200).json(conversations);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserConversations,
};