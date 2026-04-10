import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import ThemedText from "./ThemedText";

export default function AppTopBar({ title, onBack }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        activeOpacity={0.82}
        onPress={onBack || (() => router.back())}
      >
        <Ionicons name="chevron-back" size={24} color="#19201B" />
      </TouchableOpacity>

      <ThemedText style={styles.title} numberOfLines={1}>
        {title}
      </ThemedText>

      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF3EF",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F6F8F6",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 19,
    fontWeight: "800",
    color: "#17201A",
    marginHorizontal: 10,
  },
  spacer: {
    width: 42,
  },
});
