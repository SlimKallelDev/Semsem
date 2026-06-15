const Like = require("../models/Like");
const Post = require("../models/Post");
const { createNotification } = require("../services/notificationService");
const { USER_PUBLIC_FIELDS } = require("../constants/userPublicFields");

const likePost = async (req, res, next) => {
  try {
    const { postId, userId } = req.body;

    if (!postId) {
      return res.status(400).json({ message: "postId is required" });
    }

    const finalUserId = req.user?.userId || userId;

    if (!finalUserId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const existingLike = await Like.findOne({
      post: postId,
      user: finalUserId,
    });

    if (existingLike) {
      return res.status(400).json({ message: "Post already liked" });
    }

    const like = await Like.create({
      post: postId,
      user: finalUserId,
    });

    post.likes_count = await Like.countDocuments({ post: postId });
    await post.save();

    const populatedLike = await Like.findById(like._id)
      .populate("user", USER_PUBLIC_FIELDS)
      .populate("post", "_id title user");

    await createNotification({
      recipient: post.user,
      actor: finalUserId,
      type: "like",
      title: "New like on your post",
      body: `${
        populatedLike?.user?.name || populatedLike?.user?.email || "Someone"
      } liked "${post.title}".`,
      resourceType: "post",
      resourceId: post._id,
      data: {
        post: post._id,
      },
    });

    res.status(201).json(populatedLike);
  } catch (error) {
    next(error);
  }
};

const unlikePost = async (req, res, next) => {
  try {
    const { postId, userId } = req.body;

    if (!postId) {
      return res.status(400).json({ message: "postId is required" });
    }

    const finalUserId = req.user?.userId || userId;

    if (!finalUserId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const deletedLike = await Like.findOneAndDelete({
      post: postId,
      user: finalUserId,
    });

    if (!deletedLike) {
      return res.status(404).json({ message: "Like not found" });
    }

    const post = await Post.findById(postId);

    if (post) {
      post.likes_count = await Like.countDocuments({ post: postId });
      await post.save();
    }

    res.status(200).json({ message: "Post unliked successfully" });
  } catch (error) {
    next(error);
  }
};

const getLikesByPost = async (req, res, next) => {
  try {
    const { postId } = req.params;

    const likes = await Like.find({ post: postId })
      .populate("user", USER_PUBLIC_FIELDS)
      .sort({ createdAt: -1 });

    res.status(200).json(likes);
  } catch (error) {
    next(error);
  }
};

const getMyLikes = async (req, res, next) => {
  try {
    const userId = req.user?.userId;

    const likes = await Like.find({ user: userId })
      .populate("post", "_id title image images type user")
      .sort({ createdAt: -1 });

    res.status(200).json(likes);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  likePost,
  unlikePost,
  getLikesByPost,
  getMyLikes,
};
