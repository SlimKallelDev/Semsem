import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ThemedText from "../../components/ThemedText";
import { useUser } from "../../contexts/UserContext";
import { emitNotificationsUpdated } from "../../services/notificationEvents";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../services/notificationService";

const GREEN = "#3DB85C";
const BORDER = "#E1ECE5";
const notificationStyles = {
  like: {
    icon: "heart",
    iconColor: "#E74444",
    iconBackground: "#FDEBEC",
  },
  comment: {
    icon: "chatbubble",
    iconColor: "#2B7CDB",
    iconBackground: "#EAF2FF",
  },
  appointment: {
    icon: "calendar",
    iconColor: "#2A9448",
    iconBackground: "#EAF8EE",
  },
  system: {
    icon: "notifications",
    iconColor: "#F28A1D",
    iconBackground: "#FFF3E2",
  },
};

const formatRelativeTime = (value) => {
  if (!value) return "";

  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (Number.isNaN(diff)) return "";

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < day * 2) return "Yesterday";
  return `${Math.floor(diff / day)}d ago`;
};

const getNotificationStyle = (type) =>
  notificationStyles[type] || notificationStyles.system;

const getEntityId = (value) => {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  return value?._id || value?.id || value?.userId || value?.$id || null;
};

const getDisplayName = (person) => {
  const explicit = String(person?.name || person?.fullName || "").trim();
  return explicit || person?.email || "Semsem user";
};

export default function NotificationsScreen() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item?.isRead).length,
    [notifications]
  );

  const loadNotifications = useCallback(async (isRefresh = false) => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const data = await getNotifications({ excludeType: "message" });
      setNotifications(Array.isArray(data) ? data : []);
    } catch (loadError) {
      console.log("Notifications page error:", loadError?.message || loadError);
      setError("Unable to load notifications.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead({ excludeType: "message" });
      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          isRead: true,
          readAt: item?.readAt || new Date().toISOString(),
        }))
      );
      emitNotificationsUpdated();
    } catch (markError) {
      console.log("Mark all notifications read error:", markError?.message || markError);
    }
  };

  const handlePressNotification = async (notification) => {
    const notificationId = notification?._id;
    const postId =
      notification?.data?.post?._id ||
      notification?.data?.post ||
      (notification?.resourceType === "post" ? notification?.resourceId : null);
    const conversationId =
      notification?.data?.conversation?._id ||
      notification?.data?.conversation ||
      (notification?.resourceType === "conversation"
        ? notification?.resourceId
        : null);
    const appointmentId =
      notification?.data?.appointment?._id ||
      notification?.data?.appointment ||
      (notification?.resourceType === "appointment"
        ? notification?.resourceId
        : null);

    try {
      if (notificationId && !notification?.isRead) {
        const updated = await markNotificationAsRead(notificationId);
        setNotifications((current) =>
          current.map((item) =>
            item?._id === notificationId ? { ...item, ...updated } : item
          )
        );
        emitNotificationsUpdated();
      }
    } catch (markError) {
      console.log("Mark notification read error:", markError?.message || markError);
    }

    if (postId) {
      router.push(`/post/${postId}`);
      return;
    }

    if (conversationId) {
      router.push(`/messages/${conversationId}`);
      return;
    }

    if (appointmentId) {
      router.push({
        pathname: "/myspace",
        params: {
          tab: "appointments",
          appointmentId: String(appointmentId),
        },
      });
    }
  };

  const handleOpenActorProfile = async (notification) => {
    const actorId = getEntityId(notification?.actor);
    if (!actorId) return;

    const notificationId = notification?._id;
    try {
      if (notificationId && !notification?.isRead) {
        const updated = await markNotificationAsRead(notificationId);
        setNotifications((current) =>
          current.map((item) =>
            item?._id === notificationId ? { ...item, ...updated } : item
          )
        );
        emitNotificationsUpdated();
      }
    } catch (markError) {
      console.log("Mark notification read error:", markError?.message || markError);
    }

    router.push(`/user/${actorId}`);
  };

  const renderNotification = ({ item }) => {
    const palette = getNotificationStyle(item?.type);
    const actorId = getEntityId(item?.actor);
    const actorAvatar =
      item?.actor?.avatar ||
      item?.actor?.image ||
      "https://via.placeholder.com/100";

    return (
      <TouchableOpacity
        style={[styles.notificationCard, !item?.isRead && styles.unreadCard]}
        activeOpacity={0.88}
        onPress={() => handlePressNotification(item)}
      >
        <View
          style={[
            styles.notificationIcon,
            { backgroundColor: palette.iconBackground },
          ]}
        >
          <Ionicons name={palette.icon} size={22} color={palette.iconColor} />
        </View>

        <View style={styles.notificationBody}>
          <View style={styles.notificationTitleRow}>
            <ThemedText style={styles.notificationTitle} numberOfLines={1}>
              {item?.title || "Notification"}
            </ThemedText>
            {!item?.isRead ? <View style={styles.unreadDot} /> : null}
          </View>
          <ThemedText style={styles.notificationText} numberOfLines={3}>
            {item?.body || item?.title}
          </ThemedText>
          {actorId ? (
            <TouchableOpacity
              style={styles.actorRow}
              activeOpacity={0.82}
              onPress={() => handleOpenActorProfile(item)}
            >
              <Image source={{ uri: actorAvatar }} style={styles.actorAvatar} />
              <ThemedText style={styles.actorName} numberOfLines={1}>
                View {getDisplayName(item?.actor)}
              </ThemedText>
              <Ionicons name="chevron-forward" size={13} color="#6B7C70" />
            </TouchableOpacity>
          ) : null}
          <ThemedText style={styles.notificationTime}>
            {formatRelativeTime(item?.createdAt)}
          </ThemedText>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <View style={styles.center}>
          <ThemedText>You need to be logged in to see notifications.</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <FlatList
        data={notifications}
        keyExtractor={(item, index) =>
          String(item?._id || item?.id || `notification-${index}`)
        }
        renderItem={renderNotification}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadNotifications(true)}
            tintColor={GREEN}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          notifications.length === 0 && styles.emptyListContent,
        ]}
        ListHeaderComponent={
          <View style={styles.headerCard}>
            <View style={styles.headerIcon}>
              <Ionicons name="notifications" size={28} color={GREEN} />
            </View>
            <View style={styles.headerText}>
              <ThemedText style={styles.title}>Notifications</ThemedText>
              <ThemedText style={styles.subtitle}>
                {unreadCount > 0 ? `${unreadCount} unread updates` : "All caught up"}
              </ThemedText>
            </View>

            <TouchableOpacity
              style={[
                styles.markAllButton,
                unreadCount === 0 && styles.markAllButtonDisabled,
              ]}
              activeOpacity={0.86}
              disabled={unreadCount === 0}
              onPress={handleMarkAllRead}
            >
              <Ionicons name="checkmark-done" size={16} color={GREEN} />
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-outline" size={32} color={GREEN} />
            </View>
            <ThemedText style={styles.emptyTitle}>No notifications yet</ThemedText>
            <ThemedText style={styles.emptyText}>
              Likes, comments, appointment replies, and app updates will appear here.
            </ThemedText>
          </View>
        }
        ListFooterComponent={
          error ? (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={18} color="#D94F4F" />
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F6F4",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 38,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  headerCard: {
    minHeight: 92,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFFFFF",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: "#173423",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: "#EAF8EE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 25,
    fontWeight: "900",
    color: "#17201A",
  },
  subtitle: {
    marginTop: 3,
    color: "#748079",
    fontSize: 13,
    fontWeight: "700",
  },
  markAllButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#D4ECDD",
    backgroundColor: "#F2FBF5",
    alignItems: "center",
    justifyContent: "center",
  },
  markAllButtonDisabled: {
    opacity: 0.35,
  },
  notificationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFFFFF",
    padding: 13,
    marginBottom: 10,
  },
  unreadCard: {
    backgroundColor: "#F1FBF3",
    borderColor: "#D2EEDA",
  },
  notificationIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBody: {
    flex: 1,
    minWidth: 0,
  },
  notificationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notificationTitle: {
    flex: 1,
    color: "#17201A",
    fontSize: 15,
    fontWeight: "900",
  },
  notificationText: {
    marginTop: 4,
    color: "#445049",
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: "600",
  },
  actorRow: {
    alignSelf: "flex-start",
    marginTop: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DCE9E0",
    backgroundColor: "#FFFFFF",
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E7ECE8",
  },
  actorName: {
    maxWidth: 160,
    color: "#30483A",
    fontSize: 12,
    fontWeight: "900",
  },
  notificationTime: {
    marginTop: 6,
    color: "#8F9B95",
    fontSize: 12,
    fontWeight: "700",
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: GREEN,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 70,
  },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 26,
    backgroundColor: "#EAF8EE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    color: "#17201A",
    fontSize: 21,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyText: {
    marginTop: 7,
    color: "#748079",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  errorCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0C9C9",
    backgroundColor: "#FFF5F5",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  errorText: {
    flex: 1,
    color: "#A83E3E",
    fontSize: 13,
    fontWeight: "700",
  },
});
