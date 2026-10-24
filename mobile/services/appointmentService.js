import { request } from "./api";

export const getAppointments = async () => {
  return request("/appointments");
};

export const getAppointmentById = async (appointmentId) => {
  return request(`/appointments/${appointmentId}`);
};

export const createAppointment = async (payload = {}) => {
  return request("/appointments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateAppointmentStatus = async (appointmentId, status) => {
  return request(`/appointments/${appointmentId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
};

export const updateAppointmentDate = async (appointmentId, requestedFor) => {
  return request(`/appointments/${appointmentId}/date`, {
    method: "PATCH",
    body: JSON.stringify({ requestedFor }),
  });
};

export default {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointmentDate,
  updateAppointmentStatus,
};
