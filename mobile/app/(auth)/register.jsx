import { useState } from "react";
import {
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Text,
} from "react-native";
import { Link, router } from "expo-router";

import ThemedView from "../../components/ThemedView";
import Spacer from "../../components/Spacer";
import ThemedText from "../../components/ThemedText";
import ThemedTextInput from "../../components/ThemedTextInput";
import ThemedButton from "../../components/ThemedButton";
import { useUser } from "../../contexts/UserContext";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const { register, loading } = useUser();

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setError(null);

    try {
      await register(name.trim(), email.trim(), password);
      router.replace("/(app)/home");
    } catch (err) {
      setError(err.message || "Registration failed. Try again.");
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ThemedView style={styles.container}>
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
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
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
  linkInline: { fontWeight: "600" },
  footer: { textAlign: "center", fontSize: 15 },
});