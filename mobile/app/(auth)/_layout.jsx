import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useUser } from "../../contexts/UserContext";
import GuestOnly from "../../components/auth/GuestOnly";
import ThemedLoader from "../../components/ThemedLoader";

export default function AuthLayout() {
  const { initializing } = useUser();

  if (initializing) {
    return <ThemedLoader fullScreen />;
  }

  return (
    <GuestOnly>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
        }}
      />
    </GuestOnly>
  );
}
