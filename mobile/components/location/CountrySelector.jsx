import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { COUNTRIES } from "../../constants/countries";
import { resolveCountryName } from "../../constants/governorates";
import ThemedText from "../ThemedText";

const GREEN = "#3DB85C";

export default function CountrySelector({
  value,
  onChange,
  placeholder = "Select a country",
  buttonStyle,
  textStyle,
  placeholderTextColor = "#93A198",
  disabled = false,
}) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");

  const filteredCountries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return COUNTRIES;

    const startsWith = COUNTRIES.filter((country) =>
      country.toLowerCase().startsWith(query)
    );
    const contains = COUNTRIES.filter((country) => {
      const key = country.toLowerCase();
      return !key.startsWith(query) && key.includes(query);
    });

    return [...startsWith, ...contains];
  }, [search]);

  const handleSelect = (country) => {
    onChange?.(resolveCountryName(country));
    setSearch("");
    setVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.selectButton, buttonStyle]}
        activeOpacity={0.86}
        disabled={disabled}
        onPress={() => setVisible(true)}
      >
        <ThemedText
          style={[
            styles.selectText,
            textStyle,
            !value && { color: placeholderTextColor },
          ]}
          numberOfLines={1}
        >
          {value || placeholder}
        </ThemedText>
        <Ionicons name="chevron-down" size={17} color="#7F8C85" />
      </TouchableOpacity>

      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
              <View>
                <ThemedText style={styles.headerTitle}>Select Country</ThemedText>
                <ThemedText style={styles.headerSubtitle}>
                  Used to match nearby profiles and filters
                </ThemedText>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                activeOpacity={0.82}
                onPress={() => setVisible(false)}
              >
                <Ionicons name="close" size={22} color="#334039" />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search country"
                placeholderTextColor="#94A19A"
                value={search}
                onChangeText={setSearch}
                autoFocus
                autoCapitalize="words"
              />

              <FlatList
                data={filteredCountries}
                keyExtractor={(item) => item}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const active = resolveCountryName(value) === item;

                  return (
                    <TouchableOpacity
                      style={styles.countryRow}
                      activeOpacity={0.82}
                      onPress={() => handleSelect(item)}
                    >
                      <ThemedText style={styles.countryText}>{item}</ThemedText>
                      {active ? (
                        <Ionicons name="checkmark-circle" size={21} color={GREEN} />
                      ) : null}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selectButton: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#DCE3DE",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: {
    flex: 1,
    color: "#1B2420",
    fontSize: 15,
    marginRight: 8,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E9EFEB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: "#162019",
    fontSize: 19,
    fontWeight: "900",
  },
  headerSubtitle: {
    marginTop: 2,
    color: "#718078",
    fontSize: 12,
    fontWeight: "600",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F2F5F3",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  searchInput: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCE6DD",
    backgroundColor: "#FAFCFA",
    paddingHorizontal: 14,
    color: "#172119",
    fontSize: 15,
    marginBottom: 8,
  },
  countryRow: {
    minHeight: 55,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2EF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  countryText: {
    color: "#25332A",
    fontSize: 15,
    fontWeight: "700",
  },
});
