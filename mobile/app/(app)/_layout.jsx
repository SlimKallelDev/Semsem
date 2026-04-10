import { Tabs, router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import NotificationSheet from "../../components/NotificationSheet";
import { LocationFilterProvider } from "../../contexts/LocationFilterContext";
import { useUser } from "../../contexts/UserContext";
import {
  emitNotificationsUpdated,
  subscribeNotificationsUpdated,
} from "../../services/notificationEvents";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../services/notificationService";

const GREEN = "#3DB85C";
const INACTIVE = "#8F9591";
const HOME_INACTIVE = "#CFCFCF";

function FloatingHomeTabButton({
  accessibilityLabel,
  focused,
  onLongPress,
  onPress,
  testID,
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.homeTabButton}
    >
      <View
        style={[
          styles.homeTabCircle,
          focused ? styles.homeTabCircleActive : styles.homeTabCircleInactive,
        ]}
      >
        <Ionicons name="home" size={27} color="#FFFFFF" />
      </View>

      <Text
        style={[
          styles.homeTabLabel,
          focused && styles.homeTabLabelActive,
        ]}
      >
        Home
      </Text>
    </TouchableOpacity>
  );
}

export default function AppLayout() {
  const { user } = useUser();
  const pathname = usePathname();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const isLoggedIn = !!user;
  const isHomeActive =
    pathname === "/home" || pathname === "/" || pathname.startsWith("/home/");
  const userAvatar = useMemo(
    () => user?.avatar || user?.image || "https://via.placeholder.com/100",
    [user]
  );

  const syncUnreadCount = useCallback((items) => {
    const count = Array.isArray(items)
      ? items.filter((item) => !item?.isRead).length
      : 0;

    setUnreadCount(count);
  }, []);

  const loadUnreadCount = useCallback(async () => {
    if (!isLoggedIn) {
      setUnreadCount(0);
      return;
    }

    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (error) {
      console.log("Load unread notifications error:", error.message);
    }
  }, [isLoggedIn]);

  const loadNotifications = useCallback(async () => {
    if (!isLoggedIn) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setNotificationsLoading(true);

      const data = await getNotifications();
      const items = Array.isArray(data) ? data : [];

      setNotifications(items);
      syncUnreadCount(items);
    } catch (error) {
      console.log("Load notifications error:", error.message);
    } finally {
      setNotificationsLoading(false);
    }
  }, [isLoggedIn, syncUnreadCount]);

  useEffect(() => {
    if (!isLoggedIn) {
      setNotifications([]);
      setUnreadCount(0);
      setSheetVisible(false);
      return;
    }

    loadUnreadCount();
  }, [isLoggedIn, loadUnreadCount, pathname]);

  useEffect(() => {
    if (sheetVisible) {
      loadNotifications();
    }
  }, [loadNotifications, sheetVisible]);

  useEffect(() => {
    const unsubscribe = subscribeNotificationsUpdated(() => {
      if (sheetVisible) {
        loadNotifications();
      } else {
        loadUnreadCount();
      }
    });

    return unsubscribe;
  }, [loadNotifications, loadUnreadCount, sheetVisible]);

  const openNotifications = () => {
    if (!isLoggedIn) {
      router.push("/(auth)/login");
      return;
    }

    setSheetVisible(true);
  };

  const closeNotifications = () => {
    setSheetVisible(false);
  };

  const markNotificationReadLocally = useCallback(
    (notificationId) => {
      setNotifications((current) => {
        const next = current.map((item) =>
          item?._id === notificationId
            ? {
                ...item,
                isRead: true,
                readAt: item?.readAt || new Date().toISOString(),
              }
            : item
        );

        syncUnreadCount(next);
        return next;
      });
    },
    [syncUnreadCount]
  );

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();

      const next = notifications.map((item) => ({
        ...item,
        isRead: true,
        readAt: item?.readAt || new Date().toISOString(),
      }));

      setNotifications(next);
      setUnreadCount(0);
      emitNotificationsUpdated();
    } catch (error) {
      console.log("Mark all notifications read error:", error.message);
    }
  };

  const handleNotificationPress = async (notification) => {
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

    try {
      if (notificationId && !notification?.isRead) {
        await markNotificationAsRead(notificationId);
        markNotificationReadLocally(notificationId);
        emitNotificationsUpdated();
      }
    } catch (error) {
      console.log("Mark notification read error:", error.message);
    }

    closeNotifications();

    if (postId) {
      setTimeout(() => {
        router.push(`/post/${postId}`);
      }, 120);
      return;
    }

    if (conversationId) {
      setTimeout(() => {
        router.push(`/messages/${conversationId}`);
      }, 120);
    }
  };

  const renderProfileButton = () => {
    if (user) {
      return (
        <TouchableOpacity
          onPress={() => router.push("/profile")}
          style={styles.profileButton}
          activeOpacity={0.85}
        >
          <Image source={{ uri: userAvatar }} style={styles.profileImage} />
          <View style={styles.profileDot} />
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        onPress={() => router.push("/(auth)/login")}
        style={styles.profileButton}
        activeOpacity={0.85}
      >
        <View style={styles.profileFallback}>
          <Ionicons name="person" size={20} color="#FFFFFF" />
        </View>
        <View style={styles.profileDot} />
      </TouchableOpacity>
    );
  };

  return (
    <LocationFilterProvider>
      <>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: GREEN,
            tabBarInactiveTintColor: INACTIVE,
            tabBarStyle: {
              backgroundColor: "#FFFFFF",
              borderTopColor: "#E9E9E9",
              height: 76,
              paddingTop: 4,
              paddingBottom: 8,
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: "500",
              marginTop: 1,
            },
            tabBarIconStyle: {
              marginTop: 2,
            },
            tabBarItemStyle: {
              paddingTop: 4,
            },
            headerShown: true,
            headerTitle: "",
            headerShadowVisible: false,
            headerStyle: styles.header,
            headerBackground: () => <View style={styles.headerBackground} />,
            headerLeft: () => (
              <TouchableOpacity
                style={styles.headerLeft}
                activeOpacity={0.8}
                onPress={() => router.replace("/home")}
              >
                <Text style={styles.headerTitleText}>Semsem</Text>
              </TouchableOpacity>
            ),
            headerLeftContainerStyle: styles.headerLeftContainer,
            headerRightContainerStyle: styles.headerRightContainer,
            headerRight: () => (
              <View style={styles.headerActions}>
                {isLoggedIn ? (
                  <TouchableOpacity
                    onPress={openNotifications}
                    style={styles.notificationButton}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={
                        unreadCount > 0
                          ? "notifications"
                          : "notifications-outline"
                      }
                      size={26}
                      color="#252B27"
                    />

                    {unreadCount > 0 ? (
                      <View style={styles.notificationBadge}>
                        <Text style={styles.notificationBadgeText}>
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                ) : null}

                {renderProfileButton()}
              </View>
            ),
          }}
        >
          <Tabs.Screen
            name="meet"
            options={{
              title: "Meet",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="search-outline" size={size} color={color} />
              ),
            }}
          />

          <Tabs.Screen
            name="messages"
            options={{
              title: "Messages",
              tabBarIcon: ({ color, size }) => (
                <Ionicons
                  name="chatbubbles-outline"
                  size={size}
                  color={color}
                />
              ),
            }}
          />

          <Tabs.Screen
            name="home"
            options={{
              title: "Home",
              tabBarLabel: () => null,
              tabBarIcon: () => null,
              tabBarButton: (props) => (
                <FloatingHomeTabButton
                  {...props}
                  focused={isHomeActive}
                />
              ),
            }}
          />

          <Tabs.Screen
            name="mypets"
            options={{
              title: "My Pets",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="paw-outline" size={size} color={color} />
              ),
            }}
          />

          <Tabs.Screen
            name="myposts"
            options={{
              title: "My Posts",
              tabBarIcon: ({ color, size }) => (
                <Ionicons
                  name="document-text-outline"
                  size={size}
                  color={color}
                />
              ),
            }}
          />

          <Tabs.Screen
            name="profile"
            options={{
              href: null,
              headerShown: false,
              tabBarStyle: { display: "none" },
            }}
          />
        </Tabs>

        <NotificationSheet
          visible={sheetVisible}
          loading={notificationsLoading}
          notifications={notifications}
          unreadCount={unreadCount}
          onClose={closeNotifications}
          onMarkAllRead={handleMarkAllRead}
          onPressNotification={handleNotificationPress}
        />
      </>
    </LocationFilterProvider>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#FFFFFF",
    height: 108,
  },
  headerBackground: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
  },
  headerLeftContainer: {
    paddingLeft: 18,
  },
  headerRightContainer: {
    paddingRight: 18,
  },
  headerLeft: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleText: {
    fontSize: 30,
    fontWeight: "800",
    color: GREEN,
    letterSpacing: 0.3,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  notificationButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FBFBFB",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#EE4545",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 12,
  },
  homeTabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: -20,
  },
  homeTabCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 7,
  },
  homeTabCircleActive: {
    backgroundColor: GREEN,
    shadowColor: GREEN,
    shadowOpacity: 0.2,
  },
  homeTabCircleInactive: {
    backgroundColor: HOME_INACTIVE,
    shadowColor: "#C8CCCA",
    shadowOpacity: 0.1,
  },
  homeTabLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "600",
    color: INACTIVE,
  },
  homeTabLabelActive: {
    color: GREEN,
  },
  profileButton: {
    position: "relative",
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  profileFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 5,
  },
  profileDot: {
    position: "absolute",
    right: 1,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
    borderColor: GREEN,
  },
});
