import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import * as Network from "expo-network";
import { getBackendStatus, subscribeBackendStatus } from "../services/api";
import ThemedText from "./ThemedText";

export default function ConnectionBanner() {
  const [backend, setBackend] = useState(getBackendStatus());
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const unsubscribe = subscribeBackendStatus(setBackend);
    Network.getNetworkStateAsync().then((state) => setOffline(state.isConnected === false)).catch(() => {});
    const network = Network.addNetworkStateListener((state) => setOffline(state.isConnected === false));
    return () => { unsubscribe(); network.remove(); };
  }, []);

  const message = offline ? "You’re offline. Some features may be unavailable." :
    backend === "checking" ? "Connecting to Semsem..." :
      backend === "unavailable" ? "Semsem is taking longer to connect. Your saved content remains available." : null;
  if (!message) return null;
  return <View style={[styles.banner, offline && styles.offline]}><ThemedText style={styles.text}>{message}</ThemedText></View>;
}

const styles = StyleSheet.create({
  banner: { backgroundColor: "#E8F6EC", paddingVertical: 7, paddingHorizontal: 12, alignItems: "center" },
  offline: { backgroundColor: "#FFF3DF" },
  text: { color: "#42614B", fontSize: 12, fontWeight: "700" },
});
