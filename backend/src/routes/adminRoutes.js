const express = require("express");

const {
  deleteUser,
  deletePost,
  getAppointments,
  getDashboard,
  getPostInteractions,
  getPosts,
  getReports,
  getUsageAnalytics,
  getUserPets,
  getUsers,
  updateAppointment,
  updatePost,
  updateReport,
  updateUser,
} = require("../controllers/adminController");
const adminMiddleware = require("../middlewares/adminMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(authMiddleware, adminMiddleware);

router.get("/dashboard", getDashboard);
router.get("/analytics/usage", getUsageAnalytics);
router.get("/users", getUsers);
router.get("/users/:id/pets", getUserPets);
router.patch("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);
router.get("/posts", getPosts);
router.get("/posts/:id/interactions", getPostInteractions);
router.patch("/posts/:id", updatePost);
router.delete("/posts/:id", deletePost);
router.get("/appointments", getAppointments);
router.patch("/appointments/:id", updateAppointment);
router.get("/reports", getReports);
router.patch("/reports/:id", updateReport);

module.exports = router;
