import { request } from "./api";

const buildQueryString = (params = {}) => {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    )
    .join("&");

  return query ? `?${query}` : "";
};

export const getNotifications = async (params) => {
  return request(`/notifications${buildQueryString(params)}`);
};

export const getUnreadNotificationCount = async (params) => {
  const data = await request(
    `/notifications/unread-count${buildQueryString(params)}`
  );
  return Number(data?.count || 0);
};

export const markNotificationAsRead = async (notificationId) => {
  return request(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
};

export const markAllNotificationsAsRead = async (params) => {
  return request(`/notifications/read-all${buildQueryString(params)}`, {
    method: "PATCH",
  });
};

export const markNotificationsByResourceAsRead = async ({
  resourceType,
  resourceId,
}) => {
  return request("/notifications/read-by-resource", {
    method: "PATCH",
    body: JSON.stringify({ resourceType, resourceId }),
  });
};

export default {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  markNotificationsByResourceAsRead,
};
