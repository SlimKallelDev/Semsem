import { ActivityIndicator, StyleSheet } from "react-native";

import { Colors } from "../constants/Colors";
import ThemedView from "./ThemedView";

const ThemedLoader = () => {
  return (
    <ThemedView style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ThemedLoader;
