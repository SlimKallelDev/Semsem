import { Tabs, router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SharedLocationFilterBar from "../../components/location/SharedLocationFilterBar";
import { LocationFilterProvider } from "../../contexts/LocationFilterContext";
import { useUser } from "../../contexts/UserContext";
import { usePreferences } from "../../contexts/PreferencesContext";
import { subscribeNetworkRestored } from "../../services/api";
import { subscribeNotificationsUpdated } from "../../services/notificationEvents";
import {
  getCachedUnreadNotificationCount,
  getUnreadNotificationCount,
} from "../../services/notificationService";
import {
  CHROME_DIVIDER_COLOR,
  CHROME_DIVIDER_HEIGHT,
} from "../../constants/chromeLayout";
import { palette, shadows } from "../../constants/designSystem";

const GREEN = palette.primary;
const INACTIVE = palette.muted;
const HOME_INACTIVE = "#BFC9C2";

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
  const { t } = usePreferences();
  const pathname = usePathname();
  const currentUserId = user?._id || user?.id || user?.$id || null;
  const insets = useSafeAreaInsets();
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [inAppAlert, setInAppAlert] = useState(null);
  const unreadRequest = useRef(null);
  const lastUnreadLoadAt = useRef(0);
  const previousUnreadCounts = useRef(null);
  const previousUserId = useRef(null);
  const alertTimer = useRef(null);

  const isLoggedIn = !!user;
  const isHomeActive =
    pathname === "/home" || pathname === "/" || pathname.startsWith("/home/");
  const tabBarBottomInset = Math.max(insets.bottom, 10);
  const userAvatar = useMemo(
    () => user?.avatar || user?.image || "https://via.placeholder.com/100",
    [user]
  );

  useEffect(() => {
    if (previousUserId.current === currentUserId) return;
    previousUserId.current = currentUserId;
    previousUnreadCounts.current = null;
    lastUnreadLoadAt.current = 0;
    setUnreadNotificationCount(0);
    setUnreadMessageCount(0);
    setInAppAlert(null);
  }, [currentUserId]);

  const loadUnreadCounts = useCallback(async (force = false) => {
    if (!isLoggedIn) {
      setUnreadNotificationCount(0);
      setUnreadMessageCount(0);
      previousUnreadCounts.current = null;
      setInAppAlert(null);
      return;
    }

    if (unreadRequest.current) return unreadRequest.current;
    if (!force && Date.now() - lastUnreadLoadAt.current < 30000) return;
    const task = (async () => {
      try {
        const [notificationCount, messageCount] = await Promise.all([
        getUnreadNotificationCount({ excludeType: "message,like,comment" }),
        getUnreadNotificationCount({ type: "message" }),
        ]);

        const nextCounts = {
          notifications: Number(notificationCount) || 0,
          messages: Number(messageCount) || 0,
        };
        const previous = previousUnreadCounts.current;
        setUnreadNotificationCount(nextCounts.notifications);
        setUnreadMessageCount(nextCounts.messages);
        if (previous) {
          const newMessages = nextCounts.messages > previous.messages;
          const newNotifications = nextCounts.notifications > previous.notifications;
          if (newMessages || newNotifications) {
            setInAppAlert({
              title: newMessages && newNotifications
                ? t("New messages and notifications")
                : newMessages
                  ? t("New message received")
                  : t("New notification received"),
              route: newMessages ? "/messages" : "/notifications",
              icon: newMessages ? "chatbubble-ellipses" : "notifications",
            });
            if (alertTimer.current) clearTimeout(alertTimer.current);
            alertTimer.current = setTimeout(() => setInAppAlert(null), 6000);
          }
        }
        previousUnreadCounts.current = nextCounts;
        lastUnreadLoadAt.current = Date.now();
      } catch (error) {
        console.log("Load unread notifications error:", error.message);
      } finally {
        unreadRequest.current = null;
      }
    })();
    unreadRequest.current = task;
    return task;
  }, [isLoggedIn, t]);

  useEffect(() => {
    if (!isLoggedIn) {
      setUnreadNotificationCount(0);
      setUnreadMessageCount(0);
      previousUnreadCounts.current = null;
      return;
    }

    let active = true;
    Promise.all([
      getCachedUnreadNotificationCount({ excludeType: "message,like,comment" }),
      getCachedUnreadNotificationCount({ type: "message" }),
    ]).then(([notificationCount, messageCount]) => {
      if (active) {
        if (notificationCount !== null) setUnreadNotificationCount(notificationCount);
        if (messageCount !== null) setUnreadMessageCount(messageCount);
        if (
          previousUnreadCounts.current === null &&
          notificationCount !== null &&
          messageCount !== null
        ) {
          previousUnreadCounts.current = {
            notifications: Number(notificationCount) || 0,
            messages: Number(messageCount) || 0,
          };
        }
      }
    });
    loadUnreadCounts();
    return () => { active = false; };
  }, [currentUserId, isLoggedIn, loadUnreadCounts]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") loadUnreadCounts();
    });
    const unsubscribeNetwork = subscribeNetworkRestored(() => loadUnreadCounts(true));
    const interval = setInterval(() => {
      if (AppState.currentState === "active") loadUnreadCounts(true);
    }, 30000);
    return () => { subscription.remove(); unsubscribeNetwork(); clearInterval(interval); };
  }, [loadUnreadCounts]);

  useEffect(() => () => {
    if (alertTimer.current) clearTimeout(alertTimer.current);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeNotificationsUpdated(() => {
      loadUnreadCounts(true);
    });

    return unsubscribe;
  }, [loadUnreadCounts]);

  const renderProfileButton = () => {
    return (
      <View style={styles.btnWrap}>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/profile",
              params: { returnTo: pathname || "/home" },
            })
          }
          style={styles.iconButton}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={t("Open profile and settings")}
        >
          {user ? (
            <Image source={{ uri: userAvatar }} style={styles.profileImage} />
          ) : (
            <Ionicons name="person-outline" size={21} color={INACTIVE} />
          )}
        </TouchableOpacity>
        {user ? <View style={styles.profileDot} /> : null}
      </View>
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
              backgroundColor: palette.surface,
              borderTopColor: palette.border,
              borderTopWidth: 1,
              height: 68 + tabBarBottomInset,
              paddingTop: 7,
              paddingBottom: tabBarBottomInset,
              ...shadows.soft,
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: "700",
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
                {isHomeActive ? <SharedLocationFilterBar /> : null}
                {renderProfileButton()}
              </View>
            ),
          }}
        >
          <Tabs.Screen
            name="notifications"
            options={{
              title: t("Notifications"),
              tabBarBadge:
                unreadNotificationCount > 0
                  ? unreadNotificationCount > 9
                    ? "9+"
                    : unreadNotificationCount
                  : undefined,
              tabBarBadgeStyle: styles.messageTabBadge,
              tabBarIcon: ({ color, size }) => (
                <Ionicons
                  name="notifications-outline"
                  size={size}
                  color={color}
                />
              ),
            }}
          />

          <Tabs.Screen
            name="messages"
            options={{
              title: t("Messages"),
              tabBarBadge:
                unreadMessageCount > 0
                  ? unreadMessageCount > 9
                    ? "9+"
                    : unreadMessageCount
                  : undefined,
              tabBarBadgeStyle: styles.messageTabBadge,
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
              title: t("Home"),
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
            name="activity"
            listeners={{
              tabPress: (event) => {
                if (!isLoggedIn) {
                  event.preventDefault();
                  router.push("/(auth)/login");
                }
              },
            }}
            options={{
              title: t("My Activity"),
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="pulse-outline" size={size} color={color} />
              ),
            }}
          />

          <Tabs.Screen
            name="myspace"
            options={{
              title: t("My Space"),
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="albums-outline" size={size} color={color} />
              ),
            }}
          />

          <Tabs.Screen
            name="marketplace"
            options={{
              href: null,
            }}
          />

          <Tabs.Screen
            name="meet"
            options={{
              href: null,
            }}
          />

          <Tabs.Screen
            name="mypets"
            options={{
              href: null,
            }}
          />

          <Tabs.Screen
            name="myposts"
            options={{
              href: null,
            }}
          />

        </Tabs>
        {inAppAlert ? (
          <TouchableOpacity
            style={[styles.inAppAlert, { bottom: tabBarBottomInset + 78 }]}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={`${inAppAlert.title}. ${t("Open")}`}
            onPress={() => {
              const destination = inAppAlert.route;
              setInAppAlert(null);
              if (alertTimer.current) clearTimeout(alertTimer.current);
              router.push(destination);
            }}
          >
            <View style={styles.inAppAlertIcon}>
              <Ionicons name={inAppAlert.icon} size={20} color="#FFFFFF" />
            </View>
            <View style={styles.inAppAlertCopy}>
              <Text style={styles.inAppAlertTitle}>{inAppAlert.title}</Text>
              <Text style={styles.inAppAlertAction}>{t("Tap to view")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={19} color="#64816D" />
          </TouchableOpacity>
        ) : null}
      </>
    </LocationFilterProvider>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: palette.surface,
    height: 108,
  },
  headerBackground: {
    flex: 1,
    backgroundColor: palette.surface,
    borderBottomWidth: CHROME_DIVIDER_HEIGHT,
    borderBottomColor: CHROME_DIVIDER_COLOR,
  },
  headerLeftContainer: {
    paddingLeft: 18,
  },
  headerRightContainer: {
    paddingRight: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitleText: {
    fontSize: 28,
    fontWeight: "800",
    color: GREEN,
    letterSpacing: -0.4,
  },
  btnWrap: {
    position: "relative",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...shadows.soft,
  },
  loginButton: {
    height: 34,
    paddingHorizontal: 16,
    borderRadius: 17,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.primaryStrong,
  },
  messageTabBadge: {
    backgroundColor: "#EE4545",
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    lineHeight: 14,
  },
  homeTabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: -20,
  },
  homeTabCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
    width: 40,
    height: 40,
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
  inAppAlert: {
    position: "absolute",
    left: 14,
    right: 14,
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7E8DC",
    shadowColor: "#183D25",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 20,
  },
  inAppAlertIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
    marginRight: 11,
  },
  inAppAlertCopy: { flex: 1, minWidth: 0 },
  inAppAlertTitle: { color: "#1B3021", fontSize: 14, fontWeight: "800" },
  inAppAlertAction: { marginTop: 3, color: "#688071", fontSize: 12, fontWeight: "600" },
});
