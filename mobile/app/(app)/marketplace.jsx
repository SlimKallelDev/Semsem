import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ThemedText from "../../components/ThemedText";

const GREEN = "#3DB85C";

export default function MarketplaceScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.iconWrap}>
            <Ionicons name="storefront-outline" size={34} color={GREEN} />
          </View>

          <ThemedText style={styles.eyebrow}>Marketplace</ThemedText>
          <ThemedText style={styles.title}>Empty for the moment</ThemedText>
          <ThemedText style={styles.subtitle}>
            Soon you will find pet products, accessories, and trusted offers here.
          </ThemedText>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F6F4",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingBottom: 44,
  },
  heroCard: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#E1ECE5",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 42,
    alignItems: "center",
    shadowColor: "#173423",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  iconWrap: {
    width: 78,
    height: 78,
    borderRadius: 26,
    backgroundColor: "#EAF8EE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  eyebrow: {
    color: GREEN,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 8,
    color: "#17201A",
    fontSize: 25,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 10,
    color: "#748079",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    textAlign: "center",
  },
});
