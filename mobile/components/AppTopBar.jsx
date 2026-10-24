import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useMemo } from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";

import {
  CHROME_DIVIDER_COLOR,
  CHROME_DIVIDER_HEIGHT,
} from "../constants/chromeLayout";
import { palette, radii, shadows } from "../constants/designSystem";
import { useUser } from "../contexts/UserContext";
import ThemedText from "./ThemedText";

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
                <Ionicons name="person-outline" size={21} color={palette.text} />
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
              <Ionicons name="chevron-back" size={23} color={palette.ink} />
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
    backgroundColor: palette.surface,
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
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 10,
  },
  brandWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    fontSize: 28,
    fontWeight: "800",
    color: palette.primary,
    letterSpacing: -0.4,
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
    backgroundColor: palette.primary,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    zIndex: 2,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: palette.primaryTint,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: palette.ink,
    marginHorizontal: 10,
  },
  centerContentButton: {
    flex: 1,
    minHeight: 42,
    marginHorizontal: 10,
    justifyContent: "center",
  },
  spacer: {
    width: 40,
  },
});
