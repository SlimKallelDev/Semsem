const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const Pet = require("../models/Pet");
const User = require("../models/User");
const {
  USER_PROFILE_TYPES,
  normalizeProfileType,
} = require("../constants/profileTypes");
const { USER_PUBLIC_FIELDS } = require("../constants/userPublicFields");
const { createNotification } = require("../services/notificationService");

const APPOINTMENT_POPULATE = [
  { path: "requester", select: USER_PUBLIC_FIELDS },
  { path: "provider", select: USER_PUBLIC_FIELDS },
  { path: "pets", select: "_id name type breed image images owner" },
];

const populateAppointmentQuery = (query) => {
  let current = query;

  APPOINTMENT_POPULATE.forEach((item) => {
    current = current.populate(item);
  });

  return current;
};

const getDisplayName = (user) => user?.name || user?.email || "Semsem user";

const normalizePetIds = (value) => {
  if (!Array.isArray(value)) return [];

  return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))];
};

const resolveRequestedFor = (value) => {
  const parsed = new Date(value);

  if (!value || Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const formatAppointmentDate = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "the selected date";
  return date.toLocaleDateString();
};

const getMyAppointments = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const appointments = await populateAppointmentQuery(
      Appointment.find({
        $or: [{ requester: userId }, { provider: userId }],
      }).sort({ updatedAt: -1 })
    );

    return res.status(200).json(appointments);
  } catch (error) {
    next(error);
  }
};

const createAppointment = async (req, res, next) => {
  try {
    const requester = req.user?.userId;
    const {
      provider,
      note = "",
      requestedFor = null,
      pets = [],
      otherPet = "",
    } = req.body;

    if (!requester) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!provider) {
      return res.status(400).json({ message: "Provider is required" });
    }

    if (!mongoose.isValidObjectId(provider)) {
      return res.status(400).json({ message: "Invalid provider" });
    }

    if (String(requester) === String(provider)) {
      return res
        .status(400)
        .json({ message: "You cannot request an appointment with yourself" });
    }

    const appointmentDate = resolveRequestedFor(requestedFor);

    if (!appointmentDate) {
      return res.status(400).json({ message: "Appointment date is required" });
    }

    if (appointmentDate <= new Date()) {
      return res
        .status(400)
        .json({ message: "Appointment date must be in the future" });
    }

    const selectedPetIds = normalizePetIds(pets);
    const normalizedOtherPet = String(otherPet || "").trim();

    if (selectedPetIds.length === 0 && !normalizedOtherPet) {
      return res
        .status(400)
        .json({ message: "Select at least one pet or choose Other" });
    }

    if (selectedPetIds.some((petId) => !mongoose.isValidObjectId(petId))) {
      return res.status(400).json({ message: "Invalid pet selection" });
    }

    const [requesterUser, providerUser] = await Promise.all([
      User.findById(requester).select(USER_PUBLIC_FIELDS),
      User.findById(provider).select(USER_PUBLIC_FIELDS),
    ]);

    if (!providerUser) {
      return res.status(404).json({ message: "Provider not found" });
    }

    const providerProfileType = normalizeProfileType(providerUser.profileType);

    if (providerProfileType === USER_PROFILE_TYPES.PET_OWNER) {
      return res
        .status(400)
        .json({
          message: "Appointments can only be requested with service providers",
        });
    }

    if (selectedPetIds.length > 0) {
      const ownedPetsCount = await Pet.countDocuments({
        _id: { $in: selectedPetIds },
        owner: requester,
      });

      if (ownedPetsCount !== selectedPetIds.length) {
        return res
          .status(400)
          .json({ message: "Selected pets must belong to you" });
      }
    }

    const appointment = await Appointment.create({
      requester,
      provider,
      note: String(note || "").trim(),
      pets: selectedPetIds,
      otherPet: normalizedOtherPet,
      requestedFor: appointmentDate,
    });

    await createNotification({
      recipient: provider,
      actor: requester,
      type: "appointment",
      title: "New appointment request",
      body: `${getDisplayName(requesterUser)} requested an appointment for ${formatAppointmentDate(appointmentDate)}.`,
      resourceType: "appointment",
      resourceId: appointment._id,
      data: { appointment: appointment._id },
    });

    const populatedAppointment = await populateAppointmentQuery(
      Appointment.findById(appointment._id)
    );

    return res.status(201).json(populatedAppointment);
  } catch (error) {
    next(error);
  }
};

const updateAppointmentStatus = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const { status } = req.body;
    const allowedStatuses = ["accepted", "rejected", "cancelled"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid appointment status" });
    }

    const appointment = await Appointment.findById(req.params.id)
      .populate("requester", USER_PUBLIC_FIELDS)
      .populate("provider", USER_PUBLIC_FIELDS);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const isRequester = String(appointment.requester?._id) === String(userId);
    const isProvider = String(appointment.provider?._id) === String(userId);

    if (status === "cancelled" && !isRequester) {
      return res
        .status(403)
        .json({ message: "Only the requester can cancel this appointment" });
    }

    if (["accepted", "rejected"].includes(status) && !isProvider) {
      return res
        .status(403)
        .json({ message: "Only the provider can respond to this appointment" });
    }

    if (appointment.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Only pending appointments can be updated" });
    }

    appointment.status = status;
    appointment.decidedAt = new Date();
    await appointment.save();

    if (status === "accepted" || status === "rejected") {
      await createNotification({
        recipient: appointment.requester._id,
        actor: appointment.provider._id,
        type: "appointment",
        title:
          status === "accepted"
            ? "Appointment accepted"
            : "Appointment declined",
        body: `${getDisplayName(appointment.provider)} ${
          status === "accepted" ? "accepted" : "declined"
        } your appointment request for ${formatAppointmentDate(appointment.requestedFor)}.`,
        resourceType: "appointment",
        resourceId: appointment._id,
        data: { appointment: appointment._id },
      });
    }

    const populatedAppointment = await populateAppointmentQuery(
      Appointment.findById(appointment._id)
    );

    return res.status(200).json(populatedAppointment);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyAppointments,
  createAppointment,
  updateAppointmentStatus,
};
