const express = require("express");

const {
  createAppointment,
  getAppointmentById,
  getMyAppointments,
  updateAppointmentDate,
  updateAppointmentStatus,
} = require("../controllers/appointmentController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getMyAppointments);
router.get("/:id", getAppointmentById);
router.post("/", createAppointment);
router.patch("/:id/date", updateAppointmentDate);
router.patch("/:id/status", updateAppointmentStatus);

module.exports = router;
