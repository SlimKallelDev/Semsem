import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ThemedText from "../../components/ThemedText";
import { useUser } from "../../contexts/UserContext";
import { getAppointments } from "../../services/appointmentService";
import { getMyComments } from "../../services/commentService";
import { getMyLikes } from "../../services/likeService";

const GREEN = "#3DB85C";
const BORDER = "#E1ECE5";

const ACTIVITY_META = {
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
};

const getEntityId = (value) => {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  return value?._id || value?.id || value?.userId || value?.$id || null;
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

const formatAppointmentDate = (value) => {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "No date selected";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getDisplayName = (person) => {
  const explicit = String(person?.name || person?.fullName || "").trim();
  return explicit || person?.email || "Semsem user";
};

const getPostTitle = (post) => String(post?.title || "Untitled post").trim();

const buildLikeActivity = (like) => {
  const postId = getEntityId(like?.post);
  if (!postId) return null;

  return {
    id: `like-${like?._id || like?.id || postId}`,
    type: "like",
    title: "You liked a post",
    body: getPostTitle(like?.post),
    timestamp: like?.createdAt,
    target: { type: "post", id: postId },
  };
};

const buildCommentActivity = (comment) => {
  const postId = getEntityId(comment?.post);
  if (!postId) return null;

  const text = String(comment?.text || "").trim();
  const postTitle = getPostTitle(comment?.post);

  return {
    id: `comment-${comment?._id || comment?.id || postId}`,
    type: "comment",
    title: "You commented on a post",
    body: text ? `${text} - ${postTitle}` : postTitle,
    timestamp: comment?.createdAt,
    target: { type: "post", id: postId },
  };
};

const getAppointmentOtherPerson = (appointment, userId) => {
  const requesterId = getEntityId(appointment?.requester);
  const isRequester = String(requesterId) === String(userId);
  return isRequester ? appointment?.provider : appointment?.requester;
};

const getAppointmentHistoryTitle = (historyItem) => {
  const action = historyItem?.action;
  const toStatus = String(historyItem?.toStatus || "").toLowerCase();

  if (action === "created") return "You created an appointment";
  if (action === "date_updated") return "You changed appointment date";
  if (action === "status_updated" && toStatus === "accepted") {
    return "You accepted an appointment";
  }
  if (action === "status_updated" && toStatus === "rejected") {
    return "You declined an appointment";
  }
  if (action === "status_updated" && toStatus === "cancelled") {
    return "You cancelled an appointment";
  }

  return "You updated an appointment";
};

const buildAppointmentHistoryActivity = (appointment, historyItem, userId, index) => {
  const appointmentId = getEntityId(appointment);
  if (!appointmentId) return null;

  const actorId = getEntityId(historyItem?.actor);
  if (String(actorId) !== String(userId)) return null;

  const otherPerson = getAppointmentOtherPerson(appointment, userId);
  const appointmentDate =
    historyItem?.toRequestedFor ||
    historyItem?.fromRequestedFor ||
    appointment?.requestedFor;

  return {
    id: `appointment-history-${appointmentId}-${historyItem?._id || index}`,
    type: "appointment",
    title: getAppointmentHistoryTitle(historyItem),
    body: `With ${getDisplayName(otherPerson)} on ${formatAppointmentDate(
      appointmentDate
    )}.`,
    timestamp: historyItem?.createdAt || appointment?.updatedAt || appointment?.createdAt,
    target: { type: "appointment", id: appointmentId },
  };
};

const buildLegacyAppointmentActivity = (appointment, userId) => {
  const appointmentId = getEntityId(appointment);
  const requesterId = getEntityId(appointment?.requester);
  if (!appointmentId || String(requesterId) !== String(userId)) return null;

  const otherPerson = getAppointmentOtherPerson(appointment, userId);

  return {
    id: `appointment-created-${appointmentId}`,
    type: "appointment",
    title: "You created an appointment",
    body: `With ${getDisplayName(otherPerson)} on ${formatAppointmentDate(
      appointment?.requestedFor
    )}.`,
    timestamp: appointment?.createdAt,
    target: { type: "appointment", id: appointmentId },
  };
};

const buildAppointmentActivities = (appointment, userId) => {
  const history = Array.isArray(appointment?.history) ? appointment.history : [];
  const historyItems = history
    .map((historyItem, index) =>
      buildAppointmentHistoryActivity(appointment, historyItem, userId, index)
    )
    .filter(Boolean);

  if (historyItems.length > 0) return historyItems;

  const legacyItem = buildLegacyAppointmentActivity(appointment, userId);
  return legacyItem ? [legacyItem] : [];
};

export default function ActivityScreen() {
  const { user, initializing } = useUser();
  const userId = getEntityId(user);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadActivity = useCallback(async (isRefresh = false) => {
    if (!userId) {
      setActivity([]);
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

      setError("");
      const [likesData, commentsData, appointmentsData] = await Promise.all([
        getMyLikes(),
        getMyComments(),
        getAppointments(),
      ]);

      const likeItems = (Array.isArray(likesData) ? likesData : [])
        .map(buildLikeActivity)
        .filter(Boolean);
      const commentItems = (Array.isArray(commentsData) ? commentsData : [])
        .map(buildCommentActivity)
        .filter(Boolean);
      const appointmentItems = (Array.isArray(appointmentsData)
        ? appointmentsData
        : []
      ).flatMap((appointment) => buildAppointmentActivities(appointment, userId));

      const nextActivity = [...likeItems, ...commentItems, ...appointmentItems].sort(
        (left, right) =>
          new Date(right?.timestamp || 0).getTime() -
          new Date(left?.timestamp || 0).getTime()
      );

      setActivity(nextActivity);
    } catch (loadError) {
      console.log("Activity page error:", loadError?.message || loadError);
      setError("Unable to load activity.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadActivity();
    }, [loadActivity])
  );

  useEffect(() => {
    if (!initializing && !userId) {
      router.replace("/(auth)/login");
    }
  }, [initializing, userId]);

  const handlePressActivity = (item) => {
    if (!userId) {
      router.replace("/(auth)/login");
      return;
    }

    if (item?.target?.type === "post" && item?.target?.id) {
      router.push(`/post/${item.target.id}`);
      return;
    }

    if (item?.target?.type === "appointment" && item?.target?.id) {
      router.push(`/appointment/${item.target.id}`);
    }
  };

  const renderActivityItem = ({ item }) => {
    const meta = ACTIVITY_META[item?.type] || ACTIVITY_META.appointment;

    return (
      <TouchableOpacity
        style={styles.activityCard}
        activeOpacity={0.88}
        onPress={() => handlePressActivity(item)}
      >
        <View
          style={[
            styles.activityIcon,
            { backgroundColor: meta.iconBackground },
          ]}
        >
          <Ionicons name={meta.icon} size={21} color={meta.iconColor} />
        </View>

        <View style={styles.activityBody}>
          <ThemedText style={styles.activityTitle} numberOfLines={1}>
            {item?.title || "Activity"}
          </ThemedText>
          <ThemedText style={styles.activityText} numberOfLines={3}>
            {item?.body || "Tap to view details."}
          </ThemedText>
          <ThemedText style={styles.activityTime}>
            {formatRelativeTime(item?.timestamp)}
          </ThemedText>
        </View>

        <Ionicons name="chevron-forward" size={18} color="#98A39D" />
      </TouchableOpacity>
    );
  };

  if (!userId) return null;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <FlatList
        data={activity}
        keyExtractor={(item, index) => String(item?.id || `activity-${index}`)}
        renderItem={renderActivityItem}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadActivity(true)}
            tintColor={GREEN}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          activity.length === 0 && styles.emptyListContent,
        ]}
        ListHeaderComponent={
          <View style={styles.headerCard}>
            <View style={styles.headerIcon}>
              <Ionicons name="pulse-outline" size={28} color={GREEN} />
            </View>
            <View style={styles.headerText}>
              <ThemedText style={styles.title}>Activity</ThemedText>
              <ThemedText style={styles.subtitle}>
                Your likes, comments, and appointment history
              </ThemedText>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="pulse-outline" size={32} color={GREEN} />
            </View>
            <ThemedText style={styles.emptyTitle}>No activity yet</ThemedText>
            <ThemedText style={styles.emptyText}>
              Posts you like, comments you write, and appointment changes you make
              will appear here.
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
  activityCard: {
    minHeight: 84,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFFFFF",
    padding: 13,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  activityIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  activityBody: {
    flex: 1,
    minWidth: 0,
  },
  activityTitle: {
    flex: 1,
    color: "#17201A",
    fontSize: 15,
    fontWeight: "900",
  },
  activityText: {
    marginTop: 4,
    color: "#445049",
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: "600",
  },
  activityTime: {
    marginTop: 6,
    color: "#8F9B95",
    fontSize: 12,
    fontWeight: "700",
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
