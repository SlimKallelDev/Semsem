const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const User = require("../models/User");
const { createNotification } = require("../services/notificationService");
const { USER_STATUS } = require("../constants/moderationStatuses");

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

    const currentUserId = String(req.user.userId);
    const participantIds = [String(user1), String(user2)];
    if (!participantIds.includes(currentUserId)) {
      return res.status(403).json({ message: "Not authorized for this conversation" });
    }

    const otherUserId = participantIds.find((id) => id !== currentUserId);
    const otherUser = await User.exists({
      _id: otherUserId,
      status: USER_STATUS.ACTIVE,
    });
    if (!otherUser) {
      return res.status(404).json({ message: "User not found" });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [user1, user2], $size: 2 },
    })
      .populate("participants", "_id name email avatar image")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "_id name email avatar image",
        },
      });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [user1, user2],
      });

      conversation = await Conversation.findById(conversation._id)
        .populate("participants", "_id name email avatar image")
        .populate({
          path: "lastMessage",
          populate: {
            path: "sender",
            select: "_id name email avatar image",
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
    const { conversation, text } = req.body;
    const sender = req.user.userId;

    if (!conversation || !text?.trim()) {
      return res
        .status(400)
        .json({ message: "conversation and text are required" });
    }

    const conversationExists = await Conversation.findById(conversation);
    if (!conversationExists) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (
      !conversationExists.participants.some(
        (participantId) => String(participantId) === String(sender)
      )
    ) {
      return res.status(403).json({ message: "Not authorized for this conversation" });
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
      .populate("sender", "_id name email avatar image")
      .populate("conversation");

    const io = req.app.get("io");
    if (io) {
      io.to(String(conversationExists._id)).emit("receive_message", {
        ...populatedMessage.toObject(),
        conversationId: String(conversationExists._id),
      });
    }

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
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user.userId,
    }).select("_id");

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "_id name email avatar image")
      .populate("conversation")
      .sort({ createdAt: 1 });

    return res.status(200).json(messages);
  } catch (error) {
    next(error);
  }
};

const deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (String(message.sender) !== String(req.user.userId)) {
      return res.status(403).json({ message: "Not authorized to delete this message" });
    }

    await message.deleteOne();

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
