const User = require("../models/User");
const Pet = require("../models/Pet");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Like = require("../models/Like");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const Appointment = require("../models/Appointment");
const UserReview = require("../models/UserReview");
const mongoose = require("mongoose");
const { PostReport } = require("../models/PostReport");
const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");

const findCloudinaryPublicId = (value) => {
  if (typeof value !== "string" || !value.includes("res.cloudinary.com/")) {
    return null;
  }

  try {
    const pathname = new URL(value).pathname;
    const uploadIndex = pathname.indexOf("/image/upload/");
    if (uploadIndex < 0) return null;

    let publicId = pathname.slice(uploadIndex + "/image/upload/".length);
    publicId = publicId.replace(/^v\d+\//, "").replace(/\.[a-z0-9]+$/i, "");
    return publicId || null;
  } catch {
    return null;
  }
};

const collectCloudinaryIds = (value, ids = new Set()) => {
  if (typeof value === "string") {
    const publicId = findCloudinaryPublicId(value);
    if (publicId) ids.add(publicId);
    return ids;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectCloudinaryIds(item, ids));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectCloudinaryIds(item, ids));
  }

  return ids;
};

const deleteAccountData = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user) return false;

  const [pets, posts, conversations, reviewsByReviewer, likedPostIds] = await Promise.all([
    Pet.find({ owner: userId }).lean(),
    Post.find({ user: userId }).select("_id image images").lean(),
    Conversation.find({ participants: userId }).select("_id").lean(),
    UserReview.find({ reviewer: userId }).select("targetUser").lean(),
    Like.distinct("post", { user: userId }),
  ]);

  const postIds = posts.map((post) => post._id);
  const conversationIds = conversations.map((conversation) => conversation._id);
  const [comments, appointments] = await Promise.all([
    Comment.find({ $or: [{ user: userId }, { post: { $in: postIds } }] }).select("_id").lean(),
    Appointment.find({ $or: [{ requester: userId }, { provider: userId }] }).select("_id").lean(),
  ]);
  const commentIds = comments.map((comment) => comment._id);
  const appointmentIds = appointments.map((appointment) => appointment._id);
  const affectedTargetIds = [...new Set(
    reviewsByReviewer.map((review) => String(review.targetUser)).filter((id) => id !== String(userId))
  )];

  if (isCloudinaryConfigured()) {
    const publicIds = collectCloudinaryIds([user, pets, posts]);
    await Promise.all(
      [...publicIds].map((publicId) => cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
        invalidate: true,
      }))
    );
  }

  await Promise.all([
    Pet.deleteMany({ owner: userId }),
    Post.deleteMany({ user: userId }),
    Comment.deleteMany({ $or: [{ user: userId }, { post: { $in: postIds } }] }),
    Like.deleteMany({ $or: [{ user: userId }, { post: { $in: postIds } }] }),
    Message.deleteMany({ conversation: { $in: conversationIds } }),
    Conversation.deleteMany({ _id: { $in: conversationIds } }),
    Notification.deleteMany({ recipient: userId }),
    Notification.deleteMany({ $or: [
      { resourceType: "post", resourceId: { $in: postIds } },
      { resourceType: "comment", resourceId: { $in: commentIds } },
      { resourceType: "conversation", resourceId: { $in: conversationIds } },
      { resourceType: "appointment", resourceId: { $in: appointmentIds } },
      { "data.post": { $in: postIds } },
      { "data.comment": { $in: commentIds } },
      { "data.conversation": { $in: conversationIds } },
      { "data.appointment": { $in: appointmentIds } },
    ] }),
    Notification.updateMany({ actor: userId }, { $set: { actor: null } }),
    Appointment.deleteMany({ $or: [{ requester: userId }, { provider: userId }] }),
    Appointment.updateMany({}, { $pull: { history: { actor: userId } } }),
    UserReview.deleteMany({ $or: [{ targetUser: userId }, { reviewer: userId }] }),
    PostReport.deleteMany({ $or: [{ reporter: userId }, { post: { $in: postIds } }] }),
  ]);

  const likedPosts = await Like.aggregate([
    { $match: { post: { $in: likedPostIds } } },
    { $group: { _id: "$post", likesCount: { $sum: 1 } } },
  ]);
  const likesByPostId = new Map(likedPosts.map((item) => [String(item._id), item.likesCount]));
  await Promise.all(likedPostIds.map((postId) => Post.updateOne(
    { _id: postId },
    { $set: { likesCount: likesByPostId.get(String(postId)) || 0 } }
  )));

  const remainingReviews = await UserReview.aggregate([
    { $match: { targetUser: { $in: affectedTargetIds.map((id) => new mongoose.Types.ObjectId(id)) } } },
    { $group: { _id: "$targetUser", ratingAverage: { $avg: "$rating" }, ratingCount: { $sum: 1 } } },
  ]);
  const ratingsByUserId = new Map(remainingReviews.map((item) => [String(item._id), item]));
  await Promise.all(affectedTargetIds.map((id) => {
    const rating = ratingsByUserId.get(id);
    return User.updateOne({ _id: id }, { $set: {
      ratingAverage: rating ? Number(rating.ratingAverage.toFixed(1)) : 0,
      ratingCount: rating?.ratingCount || 0,
    } });
  }));

  await User.deleteOne({ _id: userId });
  return true;
};

module.exports = { deleteAccountData };
