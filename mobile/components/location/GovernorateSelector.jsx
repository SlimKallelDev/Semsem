import { useMemo } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

import {
  getGovernoratesForCountry,
  resolveCountryName,
  resolveGovernorateForCountry,
} from "../../constants/governorates";
import ThemedText from "../ThemedText";

const GREEN = "#3DB85C";

export default function GovernorateSelector({
  country,
  value,
  onChange,
  placeholder = "Governorate",
  inputStyle,
  placeholderTextColor = "#93A198",
  disabled = false,
}) {
  const governorates = useMemo(
    () => getGovernoratesForCountry(country),
    [country]
  );
  const activeGovernorate = useMemo(
    () =>
      resolveGovernorateForCountry(country, value, {
        fallbackToRaw: false,
      }),
    [country, value]
  );
  const countryLabel = resolveCountryName(country);

  if (!governorates.length) {
    return (
      <TextInput
        style={inputStyle || styles.input}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        value={value}
        onChangeText={onChange}
        editable={!disabled}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText style={styles.helperText}>
        Select a governorate in {countryLabel} so Near me can match it exactly.
      </ThemedText>

      <View style={styles.chipWrap}>
        {governorates.map((governorate) => {
          const active = activeGovernorate === governorate;

          return (
            <TouchableOpacity
              key={governorate}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange(governorate)}
              activeOpacity={0.86}
              disabled={disabled}
            >
              <ThemedText
                style={[styles.chipText, active && styles.chipTextActive]}
              >
                {governorate}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  helperText: {
    marginBottom: 8,
    color: "#6F7C74",
    fontSize: 12.5,
    fontWeight: "600",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#DCE4DF",
    borderRadius: 18,
    backgroundColor: "#F8FAF9",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    borderColor: GREEN,
    backgroundColor: GREEN,
  },
  chipText: {
    color: "#5F6C64",
    fontSize: 13,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  input: {
    borderWidth: 1,
    borderColor: "#DCE3DE",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: "#FFFFFF",
    color: "#1B2420",
    fontSize: 15,
  },
});
