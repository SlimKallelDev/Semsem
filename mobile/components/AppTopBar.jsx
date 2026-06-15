import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useMemo } from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";

import {
  CHROME_DIVIDER_COLOR,
  CHROME_DIVIDER_HEIGHT,
} from "../constants/chromeLayout";
import { useUser } from "../contexts/UserContext";
import ThemedText from "./ThemedText";

const GREEN = "#3DB85C";

export default function AppTopBar({
  title,
  onBack,
  showBack = true,
  centerContent = null,
  onCenterPress,
  centerDisabled = false,
}) {
  const { user } = useUser();
  const pathname = usePathname();
  const avatarUri = useMemo(
    () => user?.avatar || user?.image || "https://via.placeholder.com/100",
    [user]
  );

  const handleProfilePress = () => {
    if (user) {
      router.push({
        pathname: "/profile",
        params: {
          returnTo: pathname || "/home",
        },
      });
      return;
    }

    router.push("/(auth)/login");
  };

  const handleBackPress = () => {
    if (onBack) {
      onBack();
      return;
    }

    const canGoBack =
      typeof router.canGoBack === "function" ? router.canGoBack() : true;

    if (canGoBack) {
      router.back();
      return;
    }

    router.replace("/home");
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.brandWrap}
          activeOpacity={0.8}
          onPress={() => router.replace("/home")}
        >
          <ThemedText style={styles.brandText}>Semsem</ThemedText>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <View style={styles.avatarWrap}>
            <TouchableOpacity
              onPress={handleProfilePress}
              style={styles.iconButton}
              activeOpacity={0.85}
            >
              {user ? (
                <Image source={{ uri: avatarUri }} style={styles.profileImage} />
              ) : (
                <Ionicons name="person-outline" size={22} color="#2E3830" />
              )}
            </TouchableOpacity>
            {user ? <View style={styles.profileDot} /> : null}
          </View>
        </View>
      </View>

      {showBack ? (
        <>
          <View style={styles.headerDivider} />
          <View style={styles.container}>
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.82}
              onPress={handleBackPress}
            >
              <Ionicons name="chevron-back" size={24} color="#19201B" />
            </TouchableOpacity>

            {centerContent ? (
              <TouchableOpacity
                style={styles.centerContentButton}
                activeOpacity={onCenterPress && !centerDisabled ? 0.85 : 1}
                onPress={onCenterPress}
                disabled={!onCenterPress || centerDisabled}
              >
                {centerContent}
              </TouchableOpacity>
            ) : (
              <ThemedText style={styles.title} numberOfLines={1}>
                {title}
              </ThemedText>
            )}

            <View style={styles.spacer} />
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: CHROME_DIVIDER_HEIGHT,
    borderBottomColor: CHROME_DIVIDER_COLOR,
  },
  headerDivider: {
    height: CHROME_DIVIDER_HEIGHT,
    backgroundColor: CHROME_DIVIDER_COLOR,
    marginHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 0,
    paddingBottom: 8,
  },
  brandWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    fontSize: 30,
    fontWeight: "800",
    color: GREEN,
    letterSpacing: 0.2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarWrap: {
    position: "relative",
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
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
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F6F8F6",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 19,
    fontWeight: "800",
    color: "#17201A",
    marginHorizontal: 10,
  },
  centerContentButton: {
    flex: 1,
    minHeight: 42,
    marginHorizontal: 10,
    justifyContent: "center",
  },
  spacer: {
    width: 42,
  },
});
