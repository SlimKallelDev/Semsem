import { request } from "./api";

export const getAppointments = async () => {
  return request("/appointments");
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

export default {
  getAppointments,
  createAppointment,
  updateAppointmentStatus,
};
