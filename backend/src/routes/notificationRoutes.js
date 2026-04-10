const express = require("express");

const authMiddleware = require("../middlewares/authMiddleware");
const {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  markNotificationsByResourceAsRead,
} = require("../controllers/notificationController");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getMyNotifications);
router.get("/unread-count", getUnreadNotificationCount);
router.patch("/read-all", markAllNotificationsAsRead);
router.patch("/read-by-resource", markNotificationsByResourceAsRead);
router.patch("/:id/read", markNotificationAsRead);

module.exports = router;
