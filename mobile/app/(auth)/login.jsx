import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Text,
} from "react-native";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import ThemedView from "../../components/ThemedView";
import Spacer from "../../components/Spacer";
import ThemedText from "../../components/ThemedText";
import ThemedTextInput from "../../components/ThemedTextInput";
import ThemedButton from "../../components/ThemedButton";
import { useUser } from "../../contexts/UserContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const { login, loading } = useUser();

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
                Welcome Back!
              </ThemedText>
              <ThemedText type="subtitle" style={styles.subtitle}>
                Login to connect with pet lovers
              </ThemedText>

              <Spacer height={40} />

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
  link: { textAlign: "center", fontSize: 15 },
  linkInline: { fontWeight: "600" },
  footer: { textAlign: "center", fontSize: 15 },
});
