import AsyncStorage from "@react-native-async-storage/async-storage";
import { dedupeGet, request } from "./api";

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

const currentUserCacheSuffix = async () => {
  try {
    const raw = await AsyncStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;
    return user?._id || user?.id || "guest";
  } catch {
    return "guest";
  }
};

export const getNotifications = async (params) => {
  const query = buildQueryString(params);
  const key = `semsem:notifications:${await currentUserCacheSuffix()}${query}`;
  return dedupeGet(key, async () => {
    try {
      const data = await request(`/notifications${query}`);
      AsyncStorage.setItem(key, JSON.stringify(data)).catch(() => {});
      return data;
    } catch (error) {
      const cached = await AsyncStorage.getItem(key).catch(() => null);
      if (cached) return JSON.parse(cached);
      throw error;
    }
  });
};

export const getCachedNotifications = async (params) => {
  const key = `semsem:notifications:${await currentUserCacheSuffix()}${buildQueryString(params)}`;
  const cached = await AsyncStorage.getItem(key).catch(() => null);
  if (!cached) return null;
  try { return JSON.parse(cached); } catch { return null; }
};

export const getUnreadNotificationCount = async (params) => {
  const query = buildQueryString(params);
  const key = `semsem:notification-count:${await currentUserCacheSuffix()}${query}`;
  return dedupeGet(key, async () => {
    try {
      const data = await request(`/notifications/unread-count${query}`);
      const count = Number(data?.count || 0);
      AsyncStorage.setItem(key, String(count)).catch(() => {});
      return count;
    } catch (error) {
      const cached = await AsyncStorage.getItem(key).catch(() => null);
      if (cached !== null) return Number(cached) || 0;
      throw error;
    }
  });
};

export const getCachedUnreadNotificationCount = async (params) => {
  const key = `semsem:notification-count:${await currentUserCacheSuffix()}${buildQueryString(params)}`;
  const cached = await AsyncStorage.getItem(key).catch(() => null);
  return cached === null ? null : Number(cached) || 0;
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
  getCachedNotifications,
  getUnreadNotificationCount,
  getCachedUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  markNotificationsByResourceAsRead,
};
