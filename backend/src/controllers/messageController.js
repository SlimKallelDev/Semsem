const Message = require("../models/message");
const Conversation = require("../models/Conversation");
const { createNotification } = require("../services/notificationService");

const startConversation = async (req, res, next) => {
  try {
    const { user1, user2 } = req.body;

    if (!user1 || !user2) {
      return res.status(400).json({ message: "user1 and user2 are required" });
    }

    if (String(user1) === String(user2)) {
      return res
        .status(400)
        .json({ message: "You cannot start a conversation with yourself" });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [user1, user2], $size: 2 },
    })
      .populate("participants", "_id name email image")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "_id name email image",
        },
      });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [user1, user2],
      });

      conversation = await Conversation.findById(conversation._id)
        .populate("participants", "_id name email image")
        .populate({
          path: "lastMessage",
          populate: {
            path: "sender",
            select: "_id name email image",
          },
        });
    }

    return res.status(200).json(conversation);
  } catch (error) {
    next(error);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const { conversation, sender, text } = req.body;

    if (!conversation || !sender || !text?.trim()) {
      return res
        .status(400)
        .json({ message: "conversation, sender and text are required" });
    }

    const conversationExists = await Conversation.findById(conversation);
    if (!conversationExists) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const message = await Message.create({
      conversation,
      sender,
      text: text.trim(),
    });

    await Conversation.findByIdAndUpdate(conversation, {
      lastMessage: message._id,
      updatedAt: new Date(),
    });

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "_id name email image")
      .populate("conversation");

    const recipientIds = Array.isArray(conversationExists.participants)
      ? conversationExists.participants.filter(
          (participantId) => String(participantId) !== String(sender)
        )
      : [];

    await Promise.all(
      recipientIds.map((recipientId) =>
        createNotification({
          recipient: recipientId,
          actor: sender,
          type: "message",
          title: "New message",
          body: `${
            populatedMessage?.sender?.name ||
            populatedMessage?.sender?.email ||
            "Someone"
          } sent you a message.`,
          resourceType: "conversation",
          resourceId: conversationExists._id,
          data: {
            conversation: conversationExists._id,
          },
        })
      )
    );

    return res.status(201).json(populatedMessage);
  } catch (error) {
    next(error);
  }
};

const getMessagesByConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "_id name email image")
      .populate("conversation")
      .sort({ createdAt: 1 });

    return res.status(200).json(messages);
  } catch (error) {
    next(error);
  }
};

const deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const lastMessage = await Message.findOne({
      conversation: message.conversation,
    }).sort({ createdAt: -1 });

    await Conversation.findByIdAndUpdate(message.conversation, {
      lastMessage: lastMessage ? lastMessage._id : null,
      updatedAt: new Date(),
    });

    return res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startConversation,
  sendMessage,
  getMessagesByConversation,
  deleteMessage,
};
