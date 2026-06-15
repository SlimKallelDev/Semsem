import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import { CURRENCY_OPTIONS } from "../constants/currencies";
import ThemedText from "./ThemedText";

const GREEN = "#3DB85C";

export default function CurrencySelector({
  value,
  onChange,
  buttonStyle,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(
    () =>
      CURRENCY_OPTIONS.find((item) => item.value === String(value || "").toUpperCase()) ||
      CURRENCY_OPTIONS[0],
    [value]
  );

  const handleSelect = (nextValue) => {
    onChange?.(nextValue);
    setOpen(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, buttonStyle]}
        activeOpacity={0.86}
        disabled={disabled}
        onPress={() => setOpen((current) => !current)}
      >
        <ThemedText style={styles.buttonText} numberOfLines={1}>
          {selected?.value || "Currency"}
        </ThemedText>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={17}
          color="#6D7A72"
        />
      </TouchableOpacity>

      {open ? (
        <View style={styles.optionsList}>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {CURRENCY_OPTIONS.map((item) => {
              const active = item.value === selected?.value;

              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.optionRow, active && styles.optionRowActive]}
                  activeOpacity={0.84}
                  onPress={() => handleSelect(item.value)}
                >
                  <ThemedText
                    style={[styles.optionCode, active && styles.optionCodeActive]}
                  >
                    {item.value}
                  </ThemedText>
                  <ThemedText style={styles.optionLabel} numberOfLines={1}>
                    {item.label}
                  </ThemedText>
                  {active ? (
                    <Ionicons name="checkmark" size={17} color={GREEN} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    zIndex: 2,
  },
  button: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#DCE3DE",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  buttonText: {
    flex: 1,
    marginRight: 8,
    color: "#17201A",
    fontSize: 15,
    fontWeight: "800",
  },
  optionsList: {
    borderWidth: 1,
    borderColor: "#DDE8E1",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    marginTop: 6,
    maxHeight: 258,
    overflow: "hidden",
  },
  optionRow: {
    minHeight: 42,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF3EF",
  },
  optionRowActive: {
    backgroundColor: "#F0FBF3",
  },
  optionCode: {
    width: 38,
    color: "#17201A",
    fontSize: 13,
    fontWeight: "900",
  },
  optionCodeActive: {
    color: GREEN,
  },
  optionLabel: {
    flex: 1,
    minWidth: 0,
    color: "#66736C",
    fontSize: 12.5,
    fontWeight: "700",
    marginRight: 8,
  },
});
