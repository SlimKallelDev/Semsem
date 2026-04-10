const Notification = require("../models/Notification");
const { populateNotificationQuery } = require("../services/notificationService");

const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await populateNotificationQuery(
      Notification.find({ recipient: req.user.userId }).sort({ createdAt: -1 })
    );

    return res.status(200).json(notifications);
  } catch (error) {
    next(error);
  }
};

const getUnreadNotificationCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user.userId,
      isRead: false,
    });

    return res.status(200).json({ count });
  } catch (error) {
    next(error);
  }
};

const markNotificationAsRead = async (req, res, next) => {
  try {
    const notification = await populateNotificationQuery(
      Notification.findOneAndUpdate(
        {
          _id: req.params.id,
          recipient: req.user.userId,
        },
        {
          isRead: true,
          readAt: new Date(),
        },
        { new: true }
      )
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.status(200).json(notification);
  } catch (error) {
    next(error);
  }
};

const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      {
        recipient: req.user.userId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    return res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    next(error);
  }
};

const markNotificationsByResourceAsRead = async (req, res, next) => {
  try {
    const { resourceType, resourceId } = req.body;

    if (!resourceType || !resourceId) {
      return res
        .status(400)
        .json({ message: "resourceType and resourceId are required" });
    }

    await Notification.updateMany(
      {
        recipient: req.user.userId,
        resourceType,
        resourceId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    return res.status(200).json({ message: "Notifications marked as read" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  markNotificationsByResourceAsRead,
};
