import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import * as Network from "expo-network";
import { useEffect, useRef, useState } from "react";
import { AppState, Linking, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { request } from "../services/api";
import ThemedText from "./ThemedText";

const CACHE_KEY = "semsem:app-version-policy:v1";
const RECHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const platform = Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : null;

export default function AppVersionChecker() {
  const [policy, setPolicy] = useState(null);
  const [dismissedOptional, setDismissedOptional] = useState(null);
  const lastCheckAt = useRef(0);
  const checkInFlight = useRef(false);
  const installedVersion = Application.nativeApplicationVersion;

  useEffect(() => {
    if (!platform || !installedVersion) return undefined;
    let active = true;

    const check = async (force = false) => {
      if (!active || checkInFlight.current || (!force && Date.now() - lastCheckAt.current < RECHECK_INTERVAL_MS)) return;
      checkInFlight.current = true;
      lastCheckAt.current = Date.now();
      try {
        const network = await Network.getNetworkStateAsync().catch(() => null);
        if (network && network.isConnected === false) return;
        const result = await request(`/app-version/check?platform=${platform}&version=${encodeURIComponent(installedVersion)}`, { timeout: 110000 });
        if (!active) return;
        setPolicy(result);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ platform, installedVersion, checkedAt: Date.now(), policy: result })).catch(() => {});
      } catch {
        const raw = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
        if (!active || !raw) return;
        try {
          const cached = JSON.parse(raw);
          if (cached.platform === platform && cached.installedVersion === installedVersion) setPolicy(cached.policy);
        } catch {}
      } finally {
        checkInFlight.current = false;
      }
    };

    AsyncStorage.getItem(CACHE_KEY).then((raw) => {
      if (!active || !raw) return;
      try {
        const cached = JSON.parse(raw);
        if (cached.platform === platform && cached.installedVersion === installedVersion) setPolicy(cached.policy);
      } catch {}
    }).finally(() => check(true));

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") check(false);
    });
    const networkSubscription = Network.addNetworkStateListener((state) => {
      if (state.isConnected) check(true);
    });

    return () => {
      active = false;
      appStateSubscription.remove();
      networkSubscription.remove();
    };
  }, [installedVersion]);

  if (!policy) return null;
  const mandatory = Boolean(policy.mandatoryUpdateRequired && policy.storeUrl);
  const optional = Boolean(policy.optionalUpdateAvailable && policy.storeUrl);
  const optionalKey = `${policy.latestVersion}:${policy.storeUrl}`;
  const visible = mandatory || (optional && dismissedOptional !== optionalKey);
  if (!visible) return null;

  const updateNow = async () => {
    if (policy.storeUrl) await Linking.openURL(policy.storeUrl).catch(() => {});
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={mandatory ? undefined : () => setDismissedOptional(optionalKey)} />
        <View style={styles.card}>
          <View style={styles.icon}><Ionicons name="cloud-download-outline" size={25} color="#FFFFFF" /></View>
          <ThemedText style={styles.title}>{mandatory ? "Update Required" : "A New Version Is Available"}</ThemedText>
          <ThemedText style={styles.message}>{mandatory
            ? "This version of Semsem is no longer supported. Update the app to continue."
            : policy.updateMessage || "A new version of Semsem is available."}</ThemedText>
          <Pressable style={styles.primary} onPress={updateNow} accessibilityRole="button">
            <ThemedText style={styles.primaryText}>Update Now</ThemedText>
          </Pressable>
          {!mandatory ? (
            <Pressable style={styles.secondary} onPress={() => setDismissedOptional(optionalKey)} accessibilityRole="button">
              <ThemedText style={styles.secondaryText}>Later</ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(12, 24, 17, 0.56)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 420, backgroundColor: "#FFFFFF", borderRadius: 24, padding: 24, alignItems: "center", elevation: 12 },
  icon: { width: 52, height: 52, borderRadius: 18, backgroundColor: "#3DB85C", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "900", color: "#17201A", textAlign: "center" },
  message: { marginTop: 10, fontSize: 15, lineHeight: 22, color: "#647169", textAlign: "center" },
  primary: { alignSelf: "stretch", marginTop: 22, borderRadius: 14, backgroundColor: "#3DB85C", paddingVertical: 14, alignItems: "center" },
  primaryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  secondary: { padding: 14 },
  secondaryText: { color: "#526158", fontSize: 14, fontWeight: "700" },
});
