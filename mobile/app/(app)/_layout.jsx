import { Tabs, router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LocationFilterProvider } from "../../contexts/LocationFilterContext";
import { useUser } from "../../contexts/UserContext";
import { subscribeNotificationsUpdated } from "../../services/notificationEvents";
import {
  getUnreadNotificationCount,
} from "../../services/notificationService";
import {
  CHROME_DIVIDER_COLOR,
  CHROME_DIVIDER_HEIGHT,
} from "../../constants/chromeLayout";

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
  const insets = useSafeAreaInsets();
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  const isLoggedIn = !!user;
  const isHomeActive =
    pathname === "/home" || pathname === "/" || pathname.startsWith("/home/");
  const tabBarBottomInset = Math.max(insets.bottom, 10);
  const userAvatar = useMemo(
    () => user?.avatar || user?.image || "https://via.placeholder.com/100",
    [user]
  );

  const loadUnreadCounts = useCallback(async () => {
    if (!isLoggedIn) {
      setUnreadNotificationCount(0);
      setUnreadMessageCount(0);
      return;
    }

    try {
      const [notificationCount, messageCount] = await Promise.all([
        getUnreadNotificationCount({ excludeType: "message" }),
        getUnreadNotificationCount({ type: "message" }),
      ]);

      setUnreadNotificationCount(notificationCount);
      setUnreadMessageCount(messageCount);
    } catch (error) {
      console.log("Load unread notifications error:", error.message);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      setUnreadNotificationCount(0);
      setUnreadMessageCount(0);
      return;
    }

    loadUnreadCounts();
  }, [isLoggedIn, loadUnreadCounts, pathname]);

  useEffect(() => {
    const unsubscribe = subscribeNotificationsUpdated(() => {
      loadUnreadCounts();
    });

    return unsubscribe;
  }, [loadUnreadCounts]);

  const renderProfileButton = () => {
    if (user) {
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
              height: 70 + tabBarBottomInset,
              paddingTop: 6,
              paddingBottom: tabBarBottomInset,
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
              <View style={styles.headerActions}>{renderProfileButton()}</View>
            ),
          }}
        >
          <Tabs.Screen
            name="notifications"
            options={{
              title: "Notifications",
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
              title: "Messages",
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
              title: "Activity",
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="pulse-outline" size={size} color={color} />
              ),
            }}
          />

          <Tabs.Screen
            name="myspace"
            options={{
              title: "My Space",
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

          <Tabs.Screen
            name="profile"
            options={{
              href: null,
              headerShown: false,
              tabBarStyle: { display: "none" },
            }}
          />
        </Tabs>
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
    alignItems: "center",
    justifyContent: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitleText: {
    fontSize: 30,
    fontWeight: "800",
    color: GREEN,
    letterSpacing: 0.3,
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
