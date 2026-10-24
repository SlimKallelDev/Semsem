import { useEffect, useState } from "react";
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import Spacer from "../../components/Spacer";
import ThemedText from "../../components/ThemedText";
import ThemedTextInput from "../../components/ThemedTextInput";
import ThemedButton from "../../components/ThemedButton";
import {
  palette,
  radii,
  shadows,
} from "../../constants/designSystem";
import { useUser } from "../../contexts/UserContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const { login, loading } = useUser();

  const handleBackToHome = () => {
    router.replace("/home");
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        handleBackToHome();
        return true;
      }
    );

    return () => subscription.remove();
  }, []);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }

    setError(null);

    try {
      await login(email.trim(), password);
      router.replace("/home");
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.82}
          onPress={handleBackToHome}
        >
          <Ionicons name="chevron-back" size={23} color="#19201B" />
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
                <Ionicons name="paw" size={26} color={palette.primaryStrong} />
              </View>
              <Spacer height={16} />
              <ThemedText type="title" style={styles.title}>
                Welcome Back!
              </ThemedText>
              <ThemedText type="subtitle" style={styles.subtitle}>
                Login to connect with pet lovers
              </ThemedText>

              <Spacer height={30} />

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
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={styles.input}
              />

              <Spacer height={24} />

              <ThemedButton
                onPress={handleSubmit}
                disabled={loading}
                style={loading ? styles.buttonDisabled : null}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Sign In</Text>
                )}
              </ThemedButton>

              {error && (
                <>
                  <Spacer height={16} />
                  <ThemedText style={styles.errorText}>{error}</ThemedText>
                </>
              )}

              <Spacer height={24} />

              <Link href="/(auth)/forgot-password" asChild>
                <ThemedText style={styles.link}>Forgot password?</ThemedText>
              </Link>

              <Spacer height={48} />

              <ThemedText style={styles.footer}>
                Don't have an account?{" "}
                <Link href="/(auth)/register" asChild>
                  <ThemedText style={styles.linkInline}>Sign up</ThemedText>
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
    width: 42,
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  authCard: {
    width: "100%",
    maxWidth: 520,
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
  link: {
    textAlign: "center",
    fontSize: 15,
    color: palette.primaryStrong,
    fontWeight: "700",
  },
  linkInline: { fontWeight: "800", color: palette.primaryStrong },
  footer: { textAlign: "center", fontSize: 15 },
});
