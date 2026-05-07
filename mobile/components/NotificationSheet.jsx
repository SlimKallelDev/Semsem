import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ThemedText from "./ThemedText";

const GREEN = "#3DB85C";
const GREEN_LIGHT = "#F1FBF3";
const BORDER = "#E9EFEB";
const OPEN_DURATION = 280;
const CLOSE_DURATION = 220;

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
  message: {
    icon: "chatbubbles",
    iconColor: GREEN,
    iconBackground: "#EAF8EE",
  },
  match: {
    icon: "paw",
    iconColor: GREEN,
    iconBackground: "#EAF8EE",
  },
  alert: {
    icon: "location",
    iconColor: "#F28A1D",
    iconBackground: "#FFF3E2",
  },
  status: {
    icon: "checkmark-circle",
    iconColor: "#2B7CDB",
    iconBackground: "#EAF2FF",
  },
  system: {
    icon: "notifications",
    iconColor: "#F28A1D",
    iconBackground: "#FFF3E2",
  },
};

const formatRelativeTime = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const diff = Date.now() - date.getTime();

  if (Number.isNaN(diff)) {
    return "";
  }

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return "Just now";
  }

  if (diff < hour) {
    const minutes = Math.max(1, Math.floor(diff / minute));
    return `${minutes}m ago`;
  }

  if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours}h ago`;
  }

  if (diff < day * 2) {
    return "Yesterday";
  }

  return `${Math.floor(diff / day)}d ago`;
};

const getNotificationStyle = (type) => {
  return notificationStyles[type] || notificationStyles.system;
};

export default function NotificationSheet({
  visible,
  loading,
  notifications,
  unreadCount,
  onClose,
  onMarkAllRead,
  onPressNotification,
  error,
}) {
  const [isMounted, setIsMounted] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setIsMounted(true);

      const openAnimation = Animated.timing(progress, {
        toValue: 1,
        duration: OPEN_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });

      openAnimation.start();
      return () => openAnimation.stop();
    }

    const closeAnimation = Animated.timing(progress, {
      toValue: 0,
      duration: CLOSE_DURATION,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    });

    closeAnimation.start(({ finished }) => {
      if (finished) {
        setIsMounted(false);
      }
    });

    return () => closeAnimation.stop();
  }, [progress, visible]);

  const backdropOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const sheetTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [56, 0],
  });

  const sheetScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });

  const sheetOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
  });

  if (!isMounted) {
    return null;
  }

  const renderNotification = ({ item: notification }) => {
    const palette = getNotificationStyle(notification?.type);

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          !notification?.isRead && styles.notificationCardUnread,
        ]}
        activeOpacity={0.88}
        onPress={() => onPressNotification(notification)}
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
          <ThemedText style={styles.notificationText}>
            {notification?.body || notification?.title}
          </ThemedText>
          <ThemedText style={styles.notificationTime}>
            {formatRelativeTime(notification?.createdAt)}
          </ThemedText>
        </View>

        {!notification?.isRead ? <View style={styles.unreadDot} /> : null}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={isMounted}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdropPressable} onPress={onClose}>
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          />
        </Pressable>

        <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
          <Animated.View
            style={[
              styles.sheet,
              {
                opacity: sheetOpacity,
                transform: [{ translateY: sheetTranslateY }, { scale: sheetScale }],
              },
            ]}
          >
            <View style={styles.handle} />

            <View style={styles.headerRow}>
              <View style={styles.headerTextBlock}>
                <ThemedText style={styles.title}>Notifications</ThemedText>
                <ThemedText style={styles.subtitle}>
                  {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                </ThemedText>
              </View>

              <View style={styles.headerActions}>
                {notifications.length > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.readAllButton,
                      unreadCount === 0 && styles.readAllButtonDisabled,
                    ]}
                    activeOpacity={0.85}
                    onPress={onMarkAllRead}
                    disabled={unreadCount === 0}
                  >
                    <Ionicons name="checkmark-done" size={16} color={GREEN} />
                    <ThemedText style={styles.readAllText}>All read</ThemedText>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close" size={20} color="#707773" />
                </TouchableOpacity>
              </View>
            </View>

            {loading ? (
              <View style={styles.centeredState}>
                <ActivityIndicator size="large" color={GREEN} />
                <ThemedText style={styles.stateHint}>Loading...</ThemedText>
              </View>
            ) : error ? (
              <View style={styles.centeredState}>
                <View style={[styles.stateIcon, { backgroundColor: "#FFF0F0" }]}>
                  <Ionicons name="alert-circle-outline" size={28} color="#D94F4F" />
                </View>
                <ThemedText style={styles.stateTitle}>Couldn't load notifications</ThemedText>
                <ThemedText style={styles.stateHint}>Pull to refresh or try again later.</ThemedText>
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.centeredState}>
                <View style={styles.stateIcon}>
                  <Ionicons name="notifications-outline" size={28} color={GREEN} />
                </View>
                <ThemedText style={styles.stateTitle}>No notifications yet</ThemedText>
                <ThemedText style={styles.stateHint}>
                  Likes and comments{"\n"}will show up here.
                </ThemedText>
              </View>
            ) : (
              <FlatList
                data={notifications}
                renderItem={renderNotification}
                keyExtractor={(item, index) =>
                  String(item?._id || item?.id || `notification-${index}`)
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                initialNumToRender={8}
                maxToRenderPerBatch={10}
                windowSize={8}
                removeClippedSubviews
              />
            )}
          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 20, 18, 0.32)",
  },
  safeArea: {
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: "#E8EEEA",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 20,
    maxHeight: "82%",
    minHeight: 320,
    shadowColor: "#101713",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 20,
  },
  handle: {
    alignSelf: "center",
    width: 56,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D7DDD9",
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 20,
  },
  headerTextBlock: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#161C18",
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "700",
    color: GREEN,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  readAllButton: {
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: GREEN,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F8FFF9",
  },
  readAllButtonDisabled: {
    opacity: 0.4,
  },
  readAllText: {
    color: GREEN,
    fontSize: 14,
    fontWeight: "700",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F5F3",
    alignItems: "center",
    justifyContent: "center",
  },
  centeredState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  stateIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  stateTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E2B22",
    marginBottom: 6,
    textAlign: "center",
  },
  stateHint: {
    fontSize: 14,
    textAlign: "center",
    color: "#7E8C84",
    lineHeight: 21,
  },
  listContent: {
    paddingBottom: 16,
    gap: 12,
  },
  notificationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
  },
  notificationCardUnread: {
    backgroundColor: GREEN_LIGHT,
    borderColor: "#D6EFDC",
  },
  notificationIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBody: {
    flex: 1,
    paddingTop: 2,
  },
  notificationText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#17211C",
    fontWeight: "600",
  },
  notificationTime: {
    color: "#92A19A",
    fontSize: 13,
    marginTop: 6,
  },
  unreadDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: GREEN,
    marginTop: 18,
  },
});
