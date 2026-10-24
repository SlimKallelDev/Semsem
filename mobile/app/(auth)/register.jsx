import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Keyboard,
  ActivityIndicator,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import Spacer from "../../components/Spacer";
import ThemedText from "../../components/ThemedText";
import ThemedTextInput from "../../components/ThemedTextInput";
import ThemedButton from "../../components/ThemedButton";
import LocationSelector from "../../components/location/LocationSelector";
import { useUser } from "../../contexts/UserContext";
import { PROFILE_TYPES } from "../../constants/profileTypes";
import {
  resolveCountryName,
  resolveGovernorateForCountry,
} from "../../constants/governorates";
import {
  palette,
  radii,
  shadows,
} from "../../constants/designSystem";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profileType, setProfileType] = useState("");
  const [country, setCountry] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [error, setError] = useState(null);

  const { register, loading } = useUser();

  const handleSubmit = async () => {
    const normalizedCountry = resolveCountryName(country);
    const normalizedGovernorate = resolveGovernorateForCountry(
      normalizedCountry,
      governorate
    );

    if (
      !name.trim() ||
      !email.trim() ||
      !password ||
      !profileType ||
      !normalizedCountry.trim() ||
      !normalizedGovernorate.trim()
    ) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setError(null);

    try {
      await register(name.trim(), email.trim(), password, profileType, {
        country: normalizedCountry.trim(),
        governorate: normalizedGovernorate.trim(),
      });
      router.replace("/(app)/home");
    } catch (err) {
      setError(err.message || "Registration failed. Try again.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.82}
          onPress={() => router.replace("/home")}
        >
          <Ionicons name="chevron-back" size={23} color={palette.ink} />
        </TouchableOpacity>
        <View style={styles.brandWrap}>
          <Text style={styles.brandText}>Semsem</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.authCard}>
              <View style={styles.heroIcon}>
                <Ionicons
                  name="people"
                  size={27}
                  color={palette.primaryStrong}
                />
              </View>
              <Spacer height={16} />

              <ThemedText type="title" style={styles.title}>
                Join Our Pet Community
              </ThemedText>
              <ThemedText type="subtitle" style={styles.subtitle}>
                Create account and meet new furry friends
              </ThemedText>

              <Spacer height={30} />

              <ThemedTextInput
                placeholder="Your name / nickname"
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
                style={styles.input}
              />

              <Spacer height={16} />

              <ThemedTextInput
                placeholder="Email address"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                style={styles.input}
              />

              <Spacer height={16} />

              <ThemedTextInput
                placeholder="Password (min. 6 characters)"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={styles.input}
              />

              <Spacer height={16} />

              <ThemedText style={styles.fieldLabel}>Profile type *</ThemedText>
              <View style={styles.profileTypeWrap}>
                {PROFILE_TYPES.map((type) => {
                  const active = profileType === type.value;

                  return (
                    <TouchableOpacity
                      key={type.value}
                      activeOpacity={0.85}
                      onPress={() => setProfileType(type.value)}
                      style={[styles.profileChip, active && styles.profileChipActive]}
                    >
                      <ThemedText
                        style={[
                          styles.profileChipText,
                          active && styles.profileChipTextActive,
                        ]}
                      >
                        {type.label}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Spacer height={18} />

              <ThemedText style={styles.fieldLabel}>Location *</ThemedText>
              <View style={styles.locationCard}>
                <ThemedText style={styles.locationHint}>
                  Choose your country and city so Semsem can match nearby
                  posts, pets, and services.
                </ThemedText>

                <LocationSelector
                  country={country}
                  governorate={governorate}
                  onChange={(location) => {
                    setCountry(location.country);
                    setGovernorate(location.governorate);
                  }}
                  placeholder="Country / City"
                  buttonStyle={styles.locationInput}
                  title="Select Location"
                  subtitle="Search city or country and choose one entry"
                />
              </View>

              <Spacer height={32} />

              <ThemedButton
                onPress={handleSubmit}
                disabled={loading}
                style={loading ? styles.buttonDisabled : null}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </ThemedButton>

              {error && (
                <>
                  <Spacer height={16} />
                  <ThemedText style={styles.errorText}>{error}</ThemedText>
                </>
              )}

              <Spacer height={48} />

              <ThemedText style={styles.footer}>
                Already have an account?{" "}
                <Link href="/(auth)/login" asChild>
                  <ThemedText style={styles.linkInline}>Sign in</ThemedText>
                </Link>
              </ThemedText>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  flex: { flex: 1 },
  header: {
    minHeight: 58,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft,
  },
  brandWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandText: {
    color: palette.primary,
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  headerSpacer: {
    width: 40,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  authCard: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    backgroundColor: palette.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 22,
    paddingVertical: 28,
    ...shadows.card,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  title: { textAlign: "center" },
  subtitle: {
    textAlign: "center",
    marginTop: 8,
    color: palette.muted,
  },
  input: { width: "100%" },
  fieldLabel: {
    fontSize: 13,
    color: palette.text,
    marginBottom: 8,
    marginLeft: 2,
    fontWeight: "600",
  },
  profileTypeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  profileChip: {
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  profileChipActive: {
    borderColor: palette.primary,
    backgroundColor: palette.primarySoft,
  },
  profileChipText: {
    fontSize: 13,
    color: "#4F5E54",
    fontWeight: "600",
  },
  profileChipTextActive: {
    color: palette.primaryStrong,
    fontWeight: "700",
  },
  locationCard: {
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.lg,
    padding: 12,
  },
  locationHint: {
    color: palette.muted,
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: 10,
  },
  locationInput: {
    borderWidth: 1,
    borderColor: palette.borderStrong,
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  errorText: {
    color: palette.danger,
    textAlign: "center",
    backgroundColor: "rgba(204,71,90,0.12)",
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(204,71,90,0.3)",
  },
  linkInline: { fontWeight: "800", color: palette.primaryStrong },
  footer: { textAlign: "center", fontSize: 15 },
});
