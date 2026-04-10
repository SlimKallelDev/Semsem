import authService from "./authService";
import { request } from "./api";

export const getUser = async (userId) => {
  return request(`/users/${userId}`);
};

export const updateUser = async (userId, payload) => {
  return request(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
};

export default {
  login: authService.login,
  register: authService.register,
  logout: authService.logout,
  getUser,
  updateUser,
};
