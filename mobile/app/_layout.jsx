// mobile/app/_layout.jsx
import { Stack } from "expo-router";
import { Image, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { UserProvider } from "../contexts/UserContext";
import { useUser } from "../contexts/UserContext";

function AppBootstrap() {
  const { initializing } = useUser();

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

  return <Stack screenOptions={{ headerShown: false }} />;
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
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  splashImage: {
    width: 180,
    height: 180,
  },
});
