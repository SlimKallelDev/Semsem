// mobile/app/_layout.jsx
import { Stack, usePathname } from "expo-router";
import { useEffect, useLayoutEffect } from "react";
import { Image, Platform, StatusBar, StyleSheet, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { UserProvider } from "../contexts/UserContext";
import { useUser } from "../contexts/UserContext";
import { preloadLocationSearchOptions } from "../constants/locationOptions";
import { palette } from "../constants/designSystem";
import { AppState } from "react-native";
import { checkBackendHealth, notifyNetworkRestored } from "../services/api";
import AppVersionChecker from "../components/AppVersionChecker";
import ConnectionBanner from "../components/ConnectionBanner";
import * as Network from "expo-network";
import { rememberReturnPath } from "../services/authReturnPath";

if (Platform.OS !== "web") {
  SplashScreen.preventAutoHideAsync().catch(() => {});
}

function AppBootstrap() {
  const { initializing } = useUser();
  const pathname = usePathname();

  useLayoutEffect(() => {
    rememberReturnPath(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!initializing && Platform.OS !== "web") {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [initializing]);

  useEffect(() => {
    const preloadTimer = setTimeout(() => {
      try {
        preloadLocationSearchOptions();
      } catch (error) {
        console.log("Location search preload error:", error?.message || error);
      }
    }, 250);

    return () => clearTimeout(preloadTimer);
  }, []);

  useEffect(() => {
    checkBackendHealth().catch(() => {});
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") checkBackendHealth().catch(() => {});
    });
    const network = Network.addNetworkStateListener((state) => {
      if (state.isConnected) {
        notifyNetworkRestored();
        checkBackendHealth().catch(() => {});
      }
    });
    return () => { appState.remove(); network.remove(); };
  }, []);

  if (initializing) {
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require("../assets/startup-splash.png")}
          style={styles.splashImage}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <View style={styles.appRoot}>
      <StatusBar barStyle="dark-content" backgroundColor={palette.surface} />
      <ConnectionBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: palette.background },
        }}
      />
      <AppVersionChecker />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <UserProvider>
        <AppBootstrap />
      </UserProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appRoot: { flex: 1 },
  splashContainer: {
    flex: 1,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  splashImage: {
    width: 180,
    height: 180,
  },
});
