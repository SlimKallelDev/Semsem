import { request } from "./api";

export const getNotifications = async () => {
  return request("/notifications");
};

export const getUnreadNotificationCount = async () => {
  const data = await request("/notifications/unread-count");
  return Number(data?.count || 0);
};

export const markNotificationAsRead = async (notificationId) => {
  return request(`/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
};

export const markAllNotificationsAsRead = async () => {
  return request("/notifications/read-all", {
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
