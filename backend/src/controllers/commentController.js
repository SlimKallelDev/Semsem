const Comment = require("../models/Comment");
const Post = require("../models/Post");
const { createNotification } = require("../services/notificationService");

const createComment = async (req, res, next) => {
  try {
    const { post, user, text } = req.body;

    if (!post || !user || !text) {
      res.status(400);
      throw new Error("post, user and text are required");
    }

    const postExists = await Post.findById(post);
    if (!postExists) {
      res.status(404);
      throw new Error("Post not found");
    }

    const comment = await Comment.create({ post, user, text });

    const populatedComment = await Comment.findById(comment._id)
      .populate("user")
      .populate("post");

    await createNotification({
      recipient: postExists.user,
      actor: user,
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

    res.status(201).json(populatedComment);
  } catch (error) {
    next(error);
  }
};

const getCommentsByPost = async (req, res, next) => {
  try {
    const { postId } = req.params;

    const comments = await Comment.find({ post: postId })
      .populate("user")
      .populate("post")
      .sort({ createdAt: -1 });

    res.status(200).json(comments);
  } catch (error) {
    next(error);
  }
};

const updateComment = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text) {
      res.status(400);
      throw new Error("text is required");
    }

    const comment = await Comment.findByIdAndUpdate(
      req.params.id,
      { text },
      { new: true, runValidators: true }
    )
      .populate("user")
      .populate("post");

    if (!comment) {
      res.status(404);
      throw new Error("Comment not found");
    }

    res.status(200).json(comment);
  } catch (error) {
    next(error);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findByIdAndDelete(req.params.id);

    if (!comment) {
      res.status(404);
      throw new Error("Comment not found");
    }

    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComment,
  getCommentsByPost,
  updateComment,
  deleteComment,
};
