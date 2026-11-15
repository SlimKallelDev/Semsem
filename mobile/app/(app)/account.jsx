import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import {
  Alert,
  Image,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CurrencySelector from "../../components/CurrencySelector";
import ThemedText from "../../components/ThemedText";
import { CURRENCY_OPTIONS } from "../../constants/currencies";
import { useUser } from "../../contexts/UserContext";
import { getLanguageLabel, usePreferences } from "../../contexts/PreferencesContext";

const GREEN = "#35A853";
const GREEN_DARK = "#227B3E";
const INK = "#17201A";
const MUTED = "#647169";
const BORDER = "#DCE6DF";
const CARD = "#FFFFFF";
const BG = "#F3F7F4";

export default function AccountScreen() {
  const { user, logout } = useUser();
  const { currency, language, languageOptions, setCurrency, setLanguage, t } = usePreferences();
  const { returnTo: rawReturnTo } = useLocalSearchParams();
  const returnTo = useMemo(
    () => (Array.isArray(rawReturnTo) ? rawReturnTo[0] : rawReturnTo),
    [rawReturnTo]
  );

  const closePage = () => {
    const target = typeof returnTo === "string" ? returnTo.trim() : "";
    if (target && target !== "/account") {
      router.replace(target);
      return;
    }
    router.back();
  };

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={closePage}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name={language === "ar" ? "chevron-forward" : "chevron-back"} size={22} color={INK} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Account</ThemedText>
        <View style={styles.headerButtonSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {user ? (
          <View style={[styles.accountCard, language === "ar" && styles.rtlRow]}>
            <View style={styles.avatarWrap}>
              {user.avatar || user.image ? (
                <Image source={{ uri: user.avatar || user.image }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={25} color={GREEN_DARK} />
                </View>
              )}
            </View>
            <View style={styles.accountDetails}>
              <ThemedText style={styles.accountEyebrow}>Your account</ThemedText>
              <ThemedText style={styles.accountName} numberOfLines={1} translate={!user.name}>
                {user.name || "Semsem user"}
              </ThemedText>
              <ThemedText style={styles.accountEmail} numberOfLines={1} translate={false}>
                {user.email || ""}
              </ThemedText>
            </View>
            <TouchableOpacity
              style={styles.iconAction}
              onPress={() => router.push({ pathname: "/profile", params: { returnTo: "/account" } })}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="View your profile"
            >
              <Ionicons name={language === "ar" ? "chevron-back" : "chevron-forward"} size={20} color={GREEN_DARK} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.guestCard}>
            <View style={styles.guestIcon}>
              <Ionicons name="paw" size={27} color={GREEN_DARK} />
            </View>
            <ThemedText style={styles.guestTitle}>Welcome to Semsem</ThemedText>
            <ThemedText style={styles.guestDescription}>
              Sign in to your account or create one to connect with pet lovers.
            </ThemedText>
            <View style={styles.authActions}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push("/(auth)/login")}
                activeOpacity={0.84}
              >
                <ThemedText style={styles.primaryButtonText}>Sign in</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push("/(auth)/register")}
                activeOpacity={0.84}
              >
                <ThemedText style={styles.secondaryButtonText}>Sign up</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Your preferences</ThemedText>
        </View>

        <View style={styles.preferenceCard}>
            <View style={[styles.preferenceHeading, language === "ar" && styles.rtlRow]}>
            <View style={styles.preferenceIcon}>
              <Ionicons name="cash-outline" size={18} color={GREEN_DARK} />
            </View>
            <View style={styles.preferenceCopy}>
              <ThemedText style={styles.preferenceTitle}>Default currency</ThemedText>
              <ThemedText style={styles.preferenceDescription}>
                Choose the currency used to display sale prices.
              </ThemedText>
            </View>
          </View>
          <CurrencySelector value={currency} onChange={setCurrency} buttonStyle={styles.currencyButton} />
          <ThemedText style={styles.note}>
            Converted prices are estimates based on daily exchange rates.
          </ThemedText>
          <ThemedText
            style={styles.rateAttribution}
            onPress={() => Linking.openURL("https://www.exchangerate-api.com")}
            accessibilityRole="link"
          >
            Rates by ExchangeRate-API
          </ThemedText>
          <ThemedText style={styles.currencyOptionsHint}>
            {`${CURRENCY_OPTIONS.length} ${t("currencies available")}`}
          </ThemedText>
        </View>

        <View style={styles.preferenceCard}>
            <View style={[styles.preferenceHeading, language === "ar" && styles.rtlRow]}>
            <View style={styles.preferenceIcon}>
              <Ionicons name="language-outline" size={18} color={GREEN_DARK} />
            </View>
            <View style={styles.preferenceCopy}>
              <ThemedText style={styles.preferenceTitle}>Language</ThemedText>
              <ThemedText style={styles.preferenceDescription}>
                Choose the language used across Semsem.
              </ThemedText>
            </View>
          </View>
          <View style={styles.languageOptions}>
            {languageOptions.map((option) => {
              const active = language === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.languageOption, active && styles.languageOptionActive]}
                  onPress={() => setLanguage(option.value)}
                  activeOpacity={0.82}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={getLanguageLabel(option.value)}
                >
                  <ThemedText style={[styles.languageOptionText, active && styles.languageOptionTextActive]}>
                    {option.label}
                  </ThemedText>
                  {active ? <Ionicons name="checkmark-circle" size={18} color={GREEN} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {user ? (
          <TouchableOpacity style={[styles.logoutButton, language === "ar" && styles.rtlRow]} onPress={handleLogout} activeOpacity={0.84}>
            <Ionicons name="log-out-outline" size={19} color="#B63C3C" />
            <ThemedText style={styles.logoutText}>Log out</ThemedText>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  header: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: BG,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
  },
  headerButtonSpacer: { width: 40, height: 40 },
  rtlRow: { flexDirection: "row-reverse" },
  headerTitle: { color: INK, fontSize: 18, fontWeight: "800" },
  content: { padding: 18, paddingBottom: 38, gap: 16 },
  accountCard: {
    minHeight: 94,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: CARD,
  },
  avatarWrap: { width: 54, height: 54, borderRadius: 27, overflow: "hidden" },
  avatar: { width: 54, height: 54 },
  avatarPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#EAF7EE" },
  accountDetails: { flex: 1, minWidth: 0 },
  accountEyebrow: { color: GREEN_DARK, fontSize: 12, fontWeight: "800" },
  accountName: { marginTop: 2, color: INK, fontSize: 17, fontWeight: "800" },
  accountEmail: { marginTop: 2, color: MUTED, fontSize: 13 },
  iconAction: { width: 34, height: 38, alignItems: "center", justifyContent: "center" },
  guestCard: { alignItems: "center", padding: 22, borderRadius: 22, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  guestIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: "#EAF7EE", alignItems: "center", justifyContent: "center" },
  guestTitle: { marginTop: 12, color: INK, fontSize: 22, fontWeight: "900", textAlign: "center" },
  guestDescription: { marginTop: 6, color: MUTED, fontSize: 14, lineHeight: 21, textAlign: "center" },
  authActions: { width: "100%", flexDirection: "row", gap: 10, marginTop: 18 },
  primaryButton: { flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: CARD, fontSize: 15, fontWeight: "800" },
  secondaryButton: { flex: 1, minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: "#C9D8CE", backgroundColor: "#F8FBF8", alignItems: "center", justifyContent: "center" },
  secondaryButtonText: { color: GREEN_DARK, fontSize: 15, fontWeight: "800" },
  sectionHeader: { marginTop: 4 },
  sectionTitle: { color: INK, fontSize: 20, fontWeight: "900" },
  preferenceCard: { padding: 16, borderRadius: 20, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, gap: 12 },
  preferenceHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  preferenceIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: "#EAF7EE", alignItems: "center", justifyContent: "center" },
  preferenceCopy: { flex: 1, minWidth: 0 },
  preferenceTitle: { color: INK, fontSize: 15, fontWeight: "800" },
  preferenceDescription: { marginTop: 2, color: MUTED, fontSize: 12.5, lineHeight: 18 },
  currencyButton: { minHeight: 46 },
  note: { color: MUTED, fontSize: 12, lineHeight: 17 },
  rateAttribution: { color: GREEN_DARK, fontSize: 11, textDecorationLine: "underline" },
  currencyOptionsHint: { color: GREEN_DARK, fontSize: 11.5, fontWeight: "700" },
  languageOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  languageOption: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 12, borderRadius: 13, borderWidth: 1, borderColor: BORDER, backgroundColor: "#FAFCFA" },
  languageOptionActive: { borderColor: GREEN, backgroundColor: "#EAF7EE" },
  languageOptionText: { color: MUTED, fontSize: 13, fontWeight: "700" },
  languageOptionTextActive: { color: GREEN_DARK, fontWeight: "900" },
  logoutButton: { minHeight: 48, marginTop: 6, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 15, borderWidth: 1, borderColor: "#F0D9D9", backgroundColor: "#FFF8F8" },
  logoutText: { color: "#B63C3C", fontSize: 14, fontWeight: "800" },
});
