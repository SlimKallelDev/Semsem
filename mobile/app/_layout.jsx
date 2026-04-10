// mobile/app/_layout.jsx
import { Stack } from "expo-router";
import { Image, StyleSheet, View } from "react-native";
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
    <UserProvider>
      <AppBootstrap />
    </UserProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  splashImage: {
    width: "100%",
    height: "100%",
  },
});
