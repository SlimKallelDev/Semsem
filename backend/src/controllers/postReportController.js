const mongoose = require("mongoose");

const Post = require("../models/Post");
const {
  POST_REPORT_REASONS,
  PostReport,
} = require("../models/PostReport");
const { POST_STATUS } = require("../constants/moderationStatuses");

const createPostReport = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const reporterId = req.user?.userId;
    const reason = String(req.body?.reason || "").trim().toLowerCase();
    const details = String(req.body?.details || "").trim();

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ message: "Invalid post identifier" });
    }

    if (!POST_REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ message: "Select a valid report reason" });
    }

    if (reason === "other" && !details) {
      return res
        .status(400)
        .json({ message: "Add a short explanation for this report" });
    }

    if (details.length > 500) {
      return res
        .status(400)
        .json({ message: "Report details cannot exceed 500 characters" });
    }

    const post = await Post.findOne({
      _id: postId,
      status: POST_STATUS.PUBLISHED,
    }).select("user");

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (String(post.user) === String(reporterId)) {
      return res
        .status(403)
        .json({ message: "You cannot report your own post" });
    }

    const report = await PostReport.create({
      post: postId,
      reporter: reporterId,
      reason,
      details,
    });

    return res.status(201).json({
      message: "Report submitted. Thank you for helping keep Semsem safe.",
      report: {
        id: report._id,
        reason: report.reason,
        status: report.status,
        createdAt: report.createdAt,
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "You already reported this post. It is awaiting review.",
      });
    }

    next(error);
  }
};

module.exports = {
  createPostReport,
};
