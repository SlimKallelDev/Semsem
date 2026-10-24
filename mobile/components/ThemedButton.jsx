import { Pressable, StyleSheet } from "react-native";

import { Colors } from "../constants/Colors";
import { radii, shadows } from "../constants/designSystem";

function ThemedButton({ style, disabled = false, ...props }) {
  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        typeof style === "function" ? style({ pressed }) : style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 52,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: radii.md,
    marginVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.55,
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default ThemedButton;
