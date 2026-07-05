const mongoose = require("mongoose");

const Appointment = require("../models/Appointment");
const Comment = require("../models/Comment");
const Conversation = require("../models/Conversation");
const Like = require("../models/Like");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const Pet = require("../models/Pet");
const Post = require("../models/Post");
const { PostReport } = require("../models/PostReport");
const User = require("../models/User");
const UserReview = require("../models/UserReview");
const {
  isValidProfileType,
  normalizeProfileType,
} = require("../constants/profileTypes");
const { USER_PUBLIC_FIELDS } = require("../constants/userPublicFields");
const {
  POST_STATUS_VALUES,
  USER_STATUS,
  USER_STATUS_VALUES,
} = require("../constants/moderationStatuses");

const USER_ROLES = ["user", "admin"];
const USER_STATUSES = USER_STATUS_VALUES;
const APPOINTMENT_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "cancelled",
];
const REPORT_STATUSES = ["pending", "reviewed", "dismissed", "actioned"];
const POST_STATUSES = POST_STATUS_VALUES;

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePage = (value, fallback = 1) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseLimit = (value, fallback = 20) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 100);
};

const assertObjectId = (value, label) => {
  if (!mongoose.isValidObjectId(value)) {
    const error = new Error(`Invalid ${label} identifier`);
    error.statusCode = 400;
    throw error;
  }
};

const appointmentPopulate = (query) =>
  query
    .populate("requester", USER_PUBLIC_FIELDS)
    .populate("provider", USER_PUBLIC_FIELDS)
    .populate("pets", "_id name type breed image images owner");

const getPosts = async (req, res, next) => {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const search = String(req.query.search || "").trim();
    const filter = {};

    if (search) {
      const expression = new RegExp(escapeRegex(search), "i");
      filter.$or = [
        { title: expression },
        { description: expression },
        { pet_type: expression },
      ];
    }

    if (POST_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }

    if (req.query.type) {
      filter.type = String(req.query.type).trim().toLowerCase();
    }

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .populate("user", USER_PUBLIC_FIELDS)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Post.countDocuments(filter),
    ]);

    const postIds = posts.map((post) => post._id);
    const [likeCounts, commentCounts] = await Promise.all([
      Like.aggregate([
        { $match: { post: { $in: postIds } } },
        { $group: { _id: "$post", count: { $sum: 1 } } },
      ]),
      Comment.aggregate([
        { $match: { post: { $in: postIds } } },
        { $group: { _id: "$post", count: { $sum: 1 } } },
      ]),
    ]);
    const likesByPost = new Map(
      likeCounts.map((item) => [String(item._id), item.count])
    );
    const commentsByPost = new Map(
      commentCounts.map((item) => [String(item._id), item.count])
    );

    return res.status(200).json({
      items: posts.map((post) => ({
        ...post,
        likesCount: likesByPost.get(String(post._id)) || 0,
        commentsCount: commentsByPost.get(String(post._id)) || 0,
      })),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    next(error);
  }
};

const getPostInteractions = async (req, res, next) => {
  try {
    assertObjectId(req.params.id, "post");

    const [post, likes, comments] = await Promise.all([
      Post.findById(req.params.id).populate("user", USER_PUBLIC_FIELDS),
      Like.find({ post: req.params.id })
        .populate("user", USER_PUBLIC_FIELDS)
        .sort({ createdAt: -1 }),
      Comment.find({ post: req.params.id })
        .populate("user", USER_PUBLIC_FIELDS)
        .sort({ createdAt: -1 }),
    ]);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    return res.status(200).json({ post, likes, comments });
  } catch (error) {
    next(error);
  }
};

const updatePost = async (req, res, next) => {
  try {
    assertObjectId(req.params.id, "post");
    const updates = {};

    if (req.body.status !== undefined) {
      const status = String(req.body.status).trim().toLowerCase();
      if (!POST_STATUSES.includes(status)) {
        return res.status(400).json({ message: "Invalid post status" });
      }
      updates.status = status;
    }

    ["title", "description"].forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = String(req.body[field] || "").trim();
      }
    });

    const post = await Post.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate("user", USER_PUBLIC_FIELDS);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    return res.status(200).json(post);
  } catch (error) {
    next(error);
  }
};

const deletePost = async (req, res, next) => {
  try {
    assertObjectId(req.params.id, "post");

    const post = await Post.findById(req.params.id).select("_id");
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    await Promise.all([
      Like.deleteMany({ post: post._id }),
      Comment.deleteMany({ post: post._id }),
      PostReport.deleteMany({ post: post._id }),
      Notification.deleteMany({
        $or: [
          { resourceType: "post", resourceId: post._id },
          { "data.post": post._id },
        ],
      }),
    ]);
    await post.deleteOne();

    return res.status(200).json({
      message: "Post and related interactions deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const addActivity = (months, userId, date) => {
  if (!userId || !date) return;
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return;
  const monthIndex = parsedDate.getUTCMonth();
  months[monthIndex].users.add(String(userId));
  months[monthIndex].events += 1;
};

const getUsageAnalytics = async (req, res, next) => {
  try {
    const currentYear = new Date().getUTCFullYear();
    const requestedYear = Number.parseInt(req.query.year, 10);
    const year =
      Number.isFinite(requestedYear) &&
      requestedYear >= 2000 &&
      requestedYear <= currentYear + 1
        ? requestedYear
        : currentYear;
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    const dateFilter = { $gte: start, $lt: end };

    const [
      users,
      posts,
      comments,
      likes,
      messages,
      appointments,
      earliestRecords,
    ] = await Promise.all([
      User.find({ createdAt: dateFilter }).select("_id createdAt").lean(),
      Post.find({ createdAt: dateFilter }).select("user createdAt").lean(),
      Comment.find({ createdAt: dateFilter }).select("user createdAt").lean(),
      Like.find({ createdAt: dateFilter }).select("user createdAt").lean(),
      Message.find({ createdAt: dateFilter }).select("sender createdAt").lean(),
      Appointment.find({
        $or: [
          { createdAt: dateFilter },
          { "history.createdAt": dateFilter },
        ],
      })
        .select("requester createdAt history")
        .lean(),
      Promise.all([
        User.findOne().sort({ createdAt: 1 }).select("createdAt").lean(),
        Post.findOne().sort({ createdAt: 1 }).select("createdAt").lean(),
        Comment.findOne().sort({ createdAt: 1 }).select("createdAt").lean(),
        Like.findOne().sort({ createdAt: 1 }).select("createdAt").lean(),
        Message.findOne().sort({ createdAt: 1 }).select("createdAt").lean(),
        Appointment.findOne().sort({ createdAt: 1 }).select("createdAt").lean(),
      ]),
    ]);

    const months = Array.from({ length: 12 }, () => ({
      users: new Set(),
      events: 0,
    }));

    users.forEach((item) => addActivity(months, item._id, item.createdAt));
    posts.forEach((item) => addActivity(months, item.user, item.createdAt));
    comments.forEach((item) => addActivity(months, item.user, item.createdAt));
    likes.forEach((item) => addActivity(months, item.user, item.createdAt));
    messages.forEach((item) => addActivity(months, item.sender, item.createdAt));
    appointments.forEach((item) => {
      if (new Date(item.createdAt) >= start && new Date(item.createdAt) < end) {
        addActivity(months, item.requester, item.createdAt);
      }
      (item.history || []).forEach((historyItem) => {
        const historyDate = new Date(historyItem.createdAt);
        if (historyDate >= start && historyDate < end) {
          addActivity(months, historyItem.actor, historyDate);
        }
      });
    });

    const earliestDate = earliestRecords
      .filter(Boolean)
      .map((item) => new Date(item.createdAt))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a - b)[0];
    const earliestYear = earliestDate?.getUTCFullYear() || currentYear;
    const availableYears = [];
    for (let value = currentYear; value >= earliestYear; value -= 1) {
      availableYears.push(value);
    }

    const labels = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    return res.status(200).json({
      year,
      availableYears,
      months: months.map((month, index) => ({
        month: index + 1,
        label: labels[index],
        activeUsers: month.users.size,
        activityEvents: month.events,
      })),
    });
  } catch (error) {
    next(error);
  }
};

const getDashboard = async (req, res, next) => {
  try {
    const [
      users,
      activeUsers,
      blockedUsers,
      pets,
      appointments,
      pendingAppointments,
      reports,
      pendingReports,
      posts,
      publishedPosts,
      blockedPosts,
      recentAppointments,
      recentReports,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: "active" }),
      User.countDocuments({ status: "blocked" }),
      Pet.countDocuments(),
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: "pending" }),
      PostReport.countDocuments(),
      PostReport.countDocuments({ status: "pending" }),
      Post.countDocuments(),
      Post.countDocuments({ status: "published" }),
      Post.countDocuments({ status: "blocked" }),
      appointmentPopulate(
        Appointment.find().sort({ updatedAt: -1 }).limit(5)
      ),
      PostReport.find()
        .populate("reporter", USER_PUBLIC_FIELDS)
        .populate("post", "title type status")
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    return res.status(200).json({
      counts: {
        users,
        activeUsers,
        blockedUsers,
        pets,
        appointments,
        pendingAppointments,
        reports,
        pendingReports,
        posts,
        publishedPosts,
        blockedPosts,
      },
      recentAppointments,
      recentReports,
    });
  } catch (error) {
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const search = String(req.query.search || "").trim();
    const filter = {};

    if (search) {
      const expression = new RegExp(escapeRegex(search), "i");
      filter.$or = [
        { name: expression },
        { email: expression },
        { phone: expression },
      ];
    }

    if (USER_ROLES.includes(req.query.role)) {
      filter.role = req.query.role;
    }

    if (USER_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }

    if (req.query.profileType) {
      filter.profileType = normalizeProfileType(req.query.profileType);
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    const userIds = users.map((user) => user._id);
    const petCounts = await Pet.aggregate([
      { $match: { owner: { $in: userIds } } },
      { $group: { _id: "$owner", count: { $sum: 1 } } },
    ]);
    const petCountByOwner = new Map(
      petCounts.map((item) => [String(item._id), item.count])
    );

    return res.status(200).json({
      items: users.map((user) => ({
        ...user,
        petCount: petCountByOwner.get(String(user._id)) || 0,
      })),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    next(error);
  }
};

const getUserPets = async (req, res, next) => {
  try {
    assertObjectId(req.params.id, "user");

    const user = await User.findById(req.params.id).select(
      "_id name email role status profileType"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const pets = await Pet.find({ owner: user._id })
      .select(
        "_id name type breed image images location date description createdAt"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({ user, pets });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    assertObjectId(req.params.id, "user");

    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    const isSelf = String(target._id) === String(req.admin._id);
    const updates = {};
    const editableTextFields = [
      "name",
      "email",
      "phone",
      "country",
      "governorate",
      "bio",
    ];

    editableTextFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = String(req.body[field] || "").trim();
      }
    });

    if (updates.email) {
      updates.email = updates.email.toLowerCase();
      const duplicate = await User.findOne({
        email: updates.email,
        _id: { $ne: target._id },
      }).select("_id");
      if (duplicate) {
        return res.status(409).json({ message: "Email already exists" });
      }
    }

    if (updates.governorate !== undefined) {
      updates.city = updates.governorate;
    }

    if (req.body.role !== undefined) {
      const nextRole = String(req.body.role).trim().toLowerCase();
      if (!USER_ROLES.includes(nextRole)) {
        return res.status(400).json({ message: "Invalid user role" });
      }
      if (isSelf && nextRole !== "admin") {
        return res
          .status(400)
          .json({ message: "You cannot remove your own administrator role" });
      }
      updates.role = nextRole;
    }

    if (req.body.status !== undefined) {
      const nextStatus = String(req.body.status).trim().toLowerCase();
      if (!USER_STATUSES.includes(nextStatus)) {
        return res.status(400).json({ message: "Invalid user status" });
      }
      if (isSelf && nextStatus !== USER_STATUS.ACTIVE) {
        return res
          .status(400)
          .json({ message: "You cannot deactivate your own account" });
      }
      updates.status = nextStatus;
    }

    if (req.body.profileType !== undefined) {
      const nextProfileType = normalizeProfileType(req.body.profileType);
      if (!isValidProfileType(nextProfileType)) {
        return res.status(400).json({ message: "Invalid profile type" });
      }
      updates.profileType = nextProfileType;
    }

    const updated = await User.findByIdAndUpdate(target._id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    return res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    assertObjectId(req.params.id, "user");

    if (String(req.params.id) === String(req.admin._id)) {
      return res
        .status(400)
        .json({ message: "You cannot delete your own administrator account" });
    }

    const target = await User.findById(req.params.id).select("_id");
    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    const [posts, pets, conversations] = await Promise.all([
      Post.find({ user: target._id }).select("_id"),
      Pet.find({ owner: target._id }).select("_id"),
      Conversation.find({ participants: target._id }).select("_id"),
    ]);

    const postIds = posts.map((item) => item._id);
    const petIds = pets.map((item) => item._id);
    const conversationIds = conversations.map((item) => item._id);

    await Promise.all([
      Appointment.deleteMany({
        $or: [
          { requester: target._id },
          { provider: target._id },
          { pets: { $in: petIds } },
        ],
      }),
      Comment.deleteMany({
        $or: [{ user: target._id }, { post: { $in: postIds } }],
      }),
      Like.deleteMany({
        $or: [{ user: target._id }, { post: { $in: postIds } }],
      }),
      PostReport.deleteMany({
        $or: [{ reporter: target._id }, { post: { $in: postIds } }],
      }),
      Notification.deleteMany({
        $or: [
          { recipient: target._id },
          { actor: target._id },
          { resourceId: { $in: postIds } },
        ],
      }),
      UserReview.deleteMany({
        $or: [{ targetUser: target._id }, { reviewer: target._id }],
      }),
      Message.deleteMany({
        $or: [
          { sender: target._id },
          { conversation: { $in: conversationIds } },
        ],
      }),
      Conversation.deleteMany({ _id: { $in: conversationIds } }),
      Post.deleteMany({ _id: { $in: postIds } }),
      Pet.deleteMany({ _id: { $in: petIds } }),
    ]);

    await User.deleteOne({ _id: target._id });

    return res.status(200).json({
      message: "User and related Semsem data deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getAppointments = async (req, res, next) => {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const filter = {};

    if (APPOINTMENT_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const [items, total] = await Promise.all([
      appointmentPopulate(
        Appointment.find(filter)
          .sort({ requestedFor: -1, createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
      ),
      Appointment.countDocuments(filter),
    ]);

    return res.status(200).json({
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    next(error);
  }
};

const updateAppointment = async (req, res, next) => {
  try {
    assertObjectId(req.params.id, "appointment");

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (req.body.status !== undefined) {
      const nextStatus = String(req.body.status).trim().toLowerCase();
      if (!APPOINTMENT_STATUSES.includes(nextStatus)) {
        return res.status(400).json({ message: "Invalid appointment status" });
      }

      if (nextStatus !== appointment.status) {
        appointment.history.push({
          action: "status_updated",
          actor: req.admin._id,
          fromStatus: appointment.status,
          toStatus: nextStatus,
          toRequestedFor: appointment.requestedFor,
        });
        appointment.status = nextStatus;
        appointment.decidedAt =
          nextStatus === "pending" ? null : new Date();
      }
    }

    if (req.body.requestedFor !== undefined) {
      const nextDate = new Date(req.body.requestedFor);
      if (Number.isNaN(nextDate.getTime())) {
        return res.status(400).json({ message: "Invalid appointment date" });
      }

      if (
        !appointment.requestedFor ||
        nextDate.getTime() !== appointment.requestedFor.getTime()
      ) {
        appointment.history.push({
          action: "date_updated",
          actor: req.admin._id,
          fromStatus: appointment.status,
          toStatus: appointment.status,
          fromRequestedFor: appointment.requestedFor,
          toRequestedFor: nextDate,
        });
        appointment.requestedFor = nextDate;
      }
    }

    if (req.body.note !== undefined) {
      appointment.note = String(req.body.note || "").trim();
    }

    await appointment.save();
    const updated = await appointmentPopulate(
      Appointment.findById(appointment._id)
    );

    return res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

const getReports = async (req, res, next) => {
  try {
    const page = parsePage(req.query.page);
    const limit = parseLimit(req.query.limit);
    const filter = {};

    if (REPORT_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }
    if (req.query.reason) {
      filter.reason = String(req.query.reason).trim().toLowerCase();
    }

    const [items, total] = await Promise.all([
      PostReport.find(filter)
        .populate("reporter", USER_PUBLIC_FIELDS)
        .populate({
          path: "post",
          select: "title description type status user createdAt",
          populate: { path: "user", select: USER_PUBLIC_FIELDS },
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      PostReport.countDocuments(filter),
    ]);

    return res.status(200).json({
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    next(error);
  }
};

const updateReport = async (req, res, next) => {
  try {
    assertObjectId(req.params.id, "report");

    const report = await PostReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    if (req.body.status !== undefined) {
      const nextStatus = String(req.body.status).trim().toLowerCase();
      if (!REPORT_STATUSES.includes(nextStatus)) {
        return res.status(400).json({ message: "Invalid report status" });
      }
      report.status = nextStatus;
    }

    if (req.body.postStatus !== undefined) {
      const nextPostStatus = String(req.body.postStatus).trim().toLowerCase();
      if (!POST_STATUSES.includes(nextPostStatus)) {
        return res.status(400).json({ message: "Invalid post status" });
      }
      await Post.updateOne(
        { _id: report.post },
        { $set: { status: nextPostStatus } }
      );
    }

    await report.save();
    const updated = await PostReport.findById(report._id)
      .populate("reporter", USER_PUBLIC_FIELDS)
      .populate({
        path: "post",
        select: "title description type status user createdAt",
        populate: { path: "user", select: USER_PUBLIC_FIELDS },
      });

    return res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPosts,
  getPostInteractions,
  updatePost,
  deletePost,
  getUsageAnalytics,
  getDashboard,
  getUsers,
  getUserPets,
  updateUser,
  deleteUser,
  getAppointments,
  updateAppointment,
  getReports,
  updateReport,
};
