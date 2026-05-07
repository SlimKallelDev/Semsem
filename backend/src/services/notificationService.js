const Notification = require("../models/Notification");

const notificationPopulate = [
  {
    path: "actor",
    select: "_id name email avatar image",
  },
  {
    path: "data.post",
    select: "_id title image type",
  },
  {
    path: "data.conversation",
    select: "_id participants lastMessage",
  },
  {
    path: "data.comment",
    select: "_id text post",
  },
  {
    path: "data.appointment",
    select: "_id requester provider status requestedFor pets otherPet createdAt",
  },
];

const populateNotificationQuery = (query) => {
  let current = query;

  notificationPopulate.forEach((item) => {
    current = current.populate(item);
  });

  return current;
};

const createNotification = async ({
  recipient,
  actor = null,
  type,
  title,
  body,
  resourceType = "system",
  resourceId = null,
  data = {},
}) => {
  if (!recipient || !type || !title || !body) {
    return null;
  }

  if (actor && String(actor) === String(recipient)) {
    return null;
  }

  return Notification.create({
    recipient,
    actor,
    type,
    title,
    body,
    resourceType,
    resourceId,
    data: {
      post: data.post || null,
      conversation: data.conversation || null,
      comment: data.comment || null,
      appointment: data.appointment || null,
    },
  });
};

module.exports = {
  createNotification,
  populateNotificationQuery,
};
