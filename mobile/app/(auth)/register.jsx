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
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import ThemedView from "../../components/ThemedView";
import Spacer from "../../components/Spacer";
import ThemedText from "../../components/ThemedText";
import ThemedTextInput from "../../components/ThemedTextInput";
import ThemedButton from "../../components/ThemedButton";
import CountrySelector from "../../components/location/CountrySelector";
import GovernorateSelector from "../../components/location/GovernorateSelector";
import { useUser } from "../../contexts/UserContext";
import { PROFILE_TYPES } from "../../constants/profileTypes";
import {
  hasGovernorateListForCountry,
  resolveCountryName,
  resolveGovernorateForCountry,
} from "../../constants/governorates";

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
            <ThemedView>
              <Spacer height={60} />

              <ThemedText type="title" style={styles.title}>
                Join Our Pet Community
              </ThemedText>
              <ThemedText type="subtitle" style={styles.subtitle}>
                Create account and meet new furry friends
              </ThemedText>

              <Spacer height={40} />

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
                  Choose your country and governorate so Semsem can match nearby
                  posts, pets, and services.
                </ThemedText>

                <CountrySelector
                  value={country}
                  onChange={(nextCountry) => {
                    setCountry(nextCountry);
                    setGovernorate((current) =>
                      hasGovernorateListForCountry(nextCountry)
                        ? resolveGovernorateForCountry(nextCountry, current, {
                            fallbackToRaw: false,
                          })
                        : ""
                    );
                  }}
                  placeholder="Select your country"
                  buttonStyle={styles.locationInput}
                />

                <View style={styles.locationGap} />

                <GovernorateSelector
                  country={country}
                  value={governorate}
                  onChange={setGovernorate}
                  placeholder="Select or enter governorate"
                  inputStyle={styles.locationInput}
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

              <Spacer height={40} />
            </ThemedView>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F4F6F4" },
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: 24 },
  title: { textAlign: "center", fontSize: 28 },
  subtitle: { textAlign: "center", marginTop: 8, opacity: 0.8 },
  input: { width: "100%" },
  fieldLabel: {
    fontSize: 13,
    color: "#5E6B61",
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
    borderColor: "#D5E2D9",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  profileChipActive: {
    borderColor: "#3DB85C",
    backgroundColor: "#EAF7EE",
  },
  profileChipText: {
    fontSize: 13,
    color: "#4F5E54",
    fontWeight: "600",
  },
  profileChipTextActive: {
    color: "#2A9448",
    fontWeight: "700",
  },
  locationCard: {
    borderWidth: 1,
    borderColor: "#DCE7E0",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 12,
  },
  locationHint: {
    color: "#6E7B74",
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 18,
    marginBottom: 10,
  },
  locationInput: {
    borderWidth: 1,
    borderColor: "#D5E2D9",
    backgroundColor: "#FAFCFA",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  locationGap: {
    height: 10,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  errorText: {
    color: "#cc475a",
    textAlign: "center",
    backgroundColor: "rgba(204,71,90,0.12)",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(204,71,90,0.3)",
  },
  linkInline: { fontWeight: "600" },
  footer: { textAlign: "center", fontSize: 15 },
});
