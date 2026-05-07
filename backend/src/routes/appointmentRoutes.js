const express = require("express");

const {
  createAppointment,
  getMyAppointments,
  updateAppointmentStatus,
} = require("../controllers/appointmentController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getMyAppointments);
router.post("/", createAppointment);
router.patch("/:id/status", updateAppointmentStatus);

module.exports = router;
