// mobile/app/_layout.jsx
import { Stack } from "expo-router";
import { useEffect } from "react";
import { Image, Platform, StatusBar, StyleSheet, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { UserProvider } from "../contexts/UserContext";
import { useUser } from "../contexts/UserContext";
import { preloadLocationSearchOptions } from "../constants/locationOptions";
import { palette } from "../constants/designSystem";

if (Platform.OS !== "web") {
  SplashScreen.preventAutoHideAsync().catch(() => {});
}

function AppBootstrap() {
  const { initializing } = useUser();

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
    <>
      <StatusBar barStyle="dark-content" backgroundColor={palette.surface} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: palette.background },
        }}
      />
    </>
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
