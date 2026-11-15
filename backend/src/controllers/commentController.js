const Comment = require("../models/Comment");
const Post = require("../models/Post");
const mongoose = require("mongoose");
const { createNotification } = require("../services/notificationService");
const { USER_PUBLIC_FIELDS } = require("../constants/userPublicFields");
const {
  POST_STATUS,
  USER_STATUS,
} = require("../constants/moderationStatuses");

const findPublishedPost = (postId) =>
  Post.findOne({ _id: postId, status: POST_STATUS.PUBLISHED }).populate({
    path: "user",
    match: { status: USER_STATUS.ACTIVE },
    select: "_id",
  });

const createComment = async (req, res, next) => {
  try {
    const { post, user, text, parentComment } = req.body;
    const finalUserId = req.user?.userId || user;

    if (!post || !text?.trim()) {
      res.status(400);
      throw new Error("post and text are required");
    }

    if (!finalUserId) {
      res.status(401);
      throw new Error("Unauthorized");
    }

    const postExists = await findPublishedPost(post);
    if (!postExists || !postExists.user) {
      res.status(404);
      throw new Error("Post not found");
    }

    let parent = null;
    if (parentComment) {
      if (!mongoose.isValidObjectId(parentComment)) {
        res.status(400);
        throw new Error("Invalid parent comment");
      }

      parent = await Comment.findOne({
        _id: parentComment,
        post,
      }).select("user");

      if (!parent) {
        res.status(400);
        throw new Error("Parent comment must belong to this post");
      }
    }

    const comment = await Comment.create({
      post,
      user: finalUserId,
      text: text.trim(),
      parentComment: parent?._id || null,
    });

    postExists.commentsCount = await Comment.countDocuments({ post });
    await postExists.save();

    const populatedComment = await Comment.findById(comment._id)
      .populate("user", USER_PUBLIC_FIELDS);

    await createNotification({
      recipient: postExists.user,
      actor: finalUserId,
      type: "comment",
      title: "New comment on your post",
      body: `${
        populatedComment?.user?.name || populatedComment?.user?.email || "Someone"
      } commented on "${postExists.title}".`,
      resourceType: "post",
      resourceId: postExists._id,
      data: {
        post: postExists._id,
        comment: comment._id,
      },
    });

    if (parent && String(parent.user) !== String(postExists.user._id || postExists.user)) {
      await createNotification({
        recipient: parent.user,
        actor: finalUserId,
        type: "comment",
        title: "New reply to your comment",
        body: `${
          populatedComment?.user?.name || populatedComment?.user?.email || "Someone"
        } replied to your comment on "${postExists.title}".`,
        resourceType: "post",
        resourceId: postExists._id,
        data: {
          post: postExists._id,
          comment: comment._id,
        },
      });
    }

    res.status(201).json(populatedComment);
  } catch (error) {
    next(error);
  }
};

const getCommentsByPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const post = await findPublishedPost(postId);

    if (!post || !post.user) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comments = await Comment.find({ post: postId })
      .populate("user", USER_PUBLIC_FIELDS)
      .populate({
        path: "parentComment",
        select: "_id text user",
        populate: { path: "user", select: USER_PUBLIC_FIELDS },
      })
      .sort({ createdAt: -1 });

    res.status(200).json(comments);
  } catch (error) {
    next(error);
  }
};

const getMyComments = async (req, res, next) => {
  try {
    const userId = req.user?.userId;

    const comments = await Comment.find({ user: userId })
      .populate("post", "_id title image images type user")
      .populate("user", USER_PUBLIC_FIELDS)
      .populate({
        path: "parentComment",
        select: "_id text user",
        populate: { path: "user", select: USER_PUBLIC_FIELDS },
      })
      .sort({ createdAt: -1 });

    res.status(200).json(comments);
  } catch (error) {
    next(error);
  }
};

const updateComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      res.status(401);
      throw new Error("Unauthorized");
    }

    if (!text?.trim()) {
      res.status(400);
      throw new Error("text is required");
    }

    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      res.status(404);
      throw new Error("Comment not found");
    }

    if (String(comment.user) !== String(currentUserId)) {
      res.status(403);
      throw new Error("Not authorized to edit this comment");
    }

    comment.text = text.trim();
    await comment.save();

    const populatedComment = await Comment.findById(comment._id).populate(
      "user",
      USER_PUBLIC_FIELDS
    ).populate({
      path: "parentComment",
      select: "_id text user",
      populate: { path: "user", select: USER_PUBLIC_FIELDS },
    });

    res.status(200).json(populatedComment);
  } catch (error) {
    next(error);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      res.status(401);
      throw new Error("Unauthorized");
    }

    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      res.status(404);
      throw new Error("Comment not found");
    }

    if (String(comment.user) !== String(currentUserId)) {
      res.status(403);
      throw new Error("Not authorized to delete this comment");
    }

    await Comment.updateMany(
      { parentComment: comment._id },
      { $set: { parentComment: comment.parentComment || null } }
    );
    await comment.deleteOne();

    const post = await Post.findById(comment.post);
    if (post) {
      post.commentsCount = await Comment.countDocuments({ post: comment.post });
      await post.save();
    }

    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComment,
  getCommentsByPost,
  getMyComments,
  updateComment,
  deleteComment,
};
