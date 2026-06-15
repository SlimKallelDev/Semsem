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

import {
  formatLocationOption,
  getLocationSearchOptions,
  normalizeLocationSelection,
} from "../../constants/locationOptions";
import ThemedText from "../ThemedText";

const GREEN = "#3DB85C";

export default function LocationSelector({
  country,
  governorate,
  onChange,
  placeholder = "Country / City",
  title = "Select Location",
  subtitle = "Search for a city, then select one result",
  buttonStyle,
  textStyle,
  placeholderTextColor = "#93A198",
  disabled = false,
  allowClear = false,
}) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");

  const selected = useMemo(
    () => normalizeLocationSelection({ country, governorate }),
    [country, governorate]
  );
  const selectedLabel = formatLocationOption(selected);
  const hasSearch = search.trim().length > 0;
  const options = useMemo(
    () =>
      visible && hasSearch
        ? getLocationSearchOptions(search, {
            currentLocation: selected,
          })
        : [],
    [hasSearch, search, selected, visible]
  );

  const handleClose = () => {
    setVisible(false);
    setSearch("");
  };

  const handleSelect = (location) => {
    onChange?.({
      country: location.country,
      governorate: location.governorate,
    });
    handleClose();
  };

  const handleClear = () => {
    onChange?.({ country: "", governorate: "" });
    handleClose();
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
            !selectedLabel && { color: placeholderTextColor },
          ]}
          numberOfLines={1}
        >
          {selectedLabel || placeholder}
        </ThemedText>
        <Ionicons name="chevron-down" size={17} color="#7F8C85" />
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
        <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={0}
          >
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
              <View style={styles.headerText}>
                <ThemedText style={styles.headerTitle}>{title}</ThemedText>
                <ThemedText style={styles.headerSubtitle}>{subtitle}</ThemedText>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                activeOpacity={0.82}
                onPress={handleClose}
              >
                <Ionicons name="close" size={22} color="#334039" />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search city or country"
                placeholderTextColor="#94A19A"
                value={search}
                onChangeText={setSearch}
                autoCapitalize="words"
                autoCorrect={false}
              />

              {allowClear && selectedLabel ? (
                <TouchableOpacity
                  style={styles.clearRow}
                  activeOpacity={0.82}
                  onPress={handleClear}
                >
                  <Ionicons name="close-circle-outline" size={19} color="#C45A5A" />
                  <ThemedText style={styles.clearText}>Clear location</ThemedText>
                </TouchableOpacity>
              ) : null}

              <FlatList
                data={options}
                keyExtractor={(item) => item.key}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={22} color="#A5B0AA" />
                    <ThemedText style={styles.emptyText}>
                      {hasSearch
                        ? "No location found. Try Tunis, Sousse, or Paris."
                        : "Start typing to search locations."}
                    </ThemedText>
                  </View>
                }
                renderItem={({ item }) => {
                  const active =
                    selected.country === item.country &&
                    selected.governorate === item.governorate;

                  return (
                    <TouchableOpacity
                      style={styles.locationRow}
                      activeOpacity={0.82}
                      onPress={() => handleSelect(item)}
                    >
                      <View style={styles.locationIcon}>
                        <Ionicons name="location-outline" size={17} color={GREEN} />
                      </View>
                      <ThemedText style={styles.locationText} numberOfLines={1}>
                        {item.label}
                      </ThemedText>
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
  headerText: {
    flex: 1,
    paddingRight: 12,
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
  clearRow: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#FFF7F7",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  clearText: {
    color: "#B44949",
    fontSize: 14,
    fontWeight: "800",
  },
  locationRow: {
    minHeight: 58,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2EF",
    flexDirection: "row",
    alignItems: "center",
  },
  locationIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#EAF8EE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  locationText: {
    flex: 1,
    color: "#25332A",
    fontSize: 15,
    fontWeight: "800",
    marginRight: 8,
  },
  emptyState: {
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    marginTop: 8,
    textAlign: "center",
    color: "#7F8A84",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
  },
});
