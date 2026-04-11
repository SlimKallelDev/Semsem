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
    </TouchableOpacity>
  );
}

export default function AppLayout() {
  const { user } = useUser();
  const pathname = usePathname();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState(false);
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
      setNotificationsError(false);

      const data = await getNotifications();
      const items = Array.isArray(data) ? data : [];

      setNotifications(items);
      syncUnreadCount(items);
    } catch (error) {
      console.log("Load notifications error:", error.message);
      setNotificationsError(true);
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
        <View style={styles.btnWrap}>
          <TouchableOpacity
            onPress={() => router.push("/profile")}
            style={styles.iconButton}
            activeOpacity={0.85}
          >
            <Image source={{ uri: userAvatar }} style={styles.profileImage} />
          </TouchableOpacity>
          <View style={styles.profileDot} />
        </View>
      );
    }

    return (
      <TouchableOpacity
        onPress={() => router.push("/(auth)/login")}
        style={styles.loginButton}
        activeOpacity={0.82}
      >
        <Text style={styles.loginButtonText}>Login</Text>
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
              height: 84,
              paddingTop: 6,
              paddingBottom: 14,
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: "600",
              marginTop: 2,
            },
            tabBarIconStyle: {
              marginTop: 2,
            },
            tabBarItemStyle: {
              paddingTop: 2,
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
                  <View style={styles.btnWrap}>
                    <TouchableOpacity
                      onPress={openNotifications}
                      style={[styles.iconButton, styles.iconButtonBell]}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={
                          unreadCount > 0
                            ? "notifications"
                            : "notifications-outline"
                        }
                        size={22}
                        color="#2E3830"
                      />
                    </TouchableOpacity>
                    {unreadCount > 0 ? (
                      <View style={styles.notificationBadge}>
                        <Text style={styles.notificationBadgeText}>
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </Text>
                      </View>
                    ) : null}
                  </View>
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
          error={notificationsError}
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
  btnWrap: {
    position: "relative",
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8ECE9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  iconButtonBell: {
    overflow: "visible",
  },
  loginButton: {
    height: 34,
    paddingHorizontal: 16,
    borderRadius: 17,
    backgroundColor: "#E8E8E8",
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#444444",
  },
  notificationBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EE4545",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    zIndex: 2,
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 11,
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
  profileImage: {
    width: 42,
    height: 42,
  },
  profileDot: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: GREEN,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    zIndex: 2,
  },
});
