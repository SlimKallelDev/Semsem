import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getLocationSearchOptions,
} from "../../constants/locationOptions";
import { useLocationFilter } from "../../contexts/LocationFilterContext";
import ThemedText from "../ThemedText";

const GREEN = "#3DB85C";

export default function SharedLocationFilterBar() {
  const insets = useSafeAreaInsets();
  const {
    mode,
    nearbySummary,
    locationLoading,
    locationDetectionEnabled,
    selectedGovernorate,
    selectedCountry,
    setNearby,
    setWorldwide,
    applyCustomPlace,
  } = useLocationFilter();

  const [isOpen, setIsOpen] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const hasLocationSearch = locationSearch.trim().length > 0;

  const filteredLocations = useMemo(
    () =>
      pickerVisible && hasLocationSearch
        ? getLocationSearchOptions(locationSearch, {
            currentLocation: {
              country: selectedCountry,
              governorate: selectedGovernorate,
            },
          })
        : [],
    [
      hasLocationSearch,
      locationSearch,
      pickerVisible,
      selectedCountry,
      selectedGovernorate,
    ]
  );

  const nearMeDescription = useMemo(() => {
    if (locationLoading) {
      return "Detecting your country and city...";
    }

    if (nearbySummary) {
      return `Posts and pets around ${nearbySummary}`;
    }

    if (!locationDetectionEnabled) {
      return "Activate detect location first";
    }

    return "Posts and pets around your location";
  }, [locationDetectionEnabled, locationLoading, nearbySummary]);

  const pillMeta = useMemo(() => {
    if (locationLoading) {
      return {
        title: "Detecting",
        subtitle: "Location",
      };
    }

    if (mode === "nearby") {
      return {
        title: "Near me",
        subtitle: nearbySummary || "Your location",
      };
    }

    if (mode === "place") {
      return {
        title: "Country / City",
        subtitle:
          [selectedCountry, selectedGovernorate].filter(Boolean).join(", ") ||
          "Selected area",
      };
    }

    return {
      title: "All over",
      subtitle: "the world",
    };
  }, [
    locationLoading,
    mode,
    nearbySummary,
    selectedCountry,
    selectedGovernorate,
  ]);

  const handleNearMe = async () => {
    const hasNearbyLocation = await setNearby();

    if (hasNearbyLocation) {
      setIsOpen(false);
    }
  };

  const handleWorldwide = () => {
    setWorldwide();
    setIsOpen(false);
  };

  const handleOpenPicker = () => {
    setIsOpen(false);
    setPickerVisible(true);
  };

  const handleClosePicker = () => {
    setPickerVisible(false);
    setLocationSearch("");
  };

  const handleSelectPlace = (location) => {
    applyCustomPlace({
      governorate: location.governorate,
      country: location.country,
    });
    handleClosePicker();
    setIsOpen(false);
  };

  const overlayPaddingTop = Math.max(insets.top + 54, 86);

  return (
    <>
      <TouchableOpacity
        style={styles.locationPill}
        onPress={() => setIsOpen((v) => !v)}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`Location filter: ${pillMeta.title} ${pillMeta.subtitle}`}
      >
        <View style={styles.locationPillIcon}>
          {locationLoading ? (
            <ActivityIndicator size="small" color={GREEN} />
          ) : (
            <Ionicons name="location" size={16} color={GREEN} />
          )}
        </View>
        <View style={styles.locationPillTextWrap}>
          <ThemedText style={styles.locationPillTitle} numberOfLines={1}>
            {pillMeta.title}
          </ThemedText>
          <ThemedText style={styles.locationPillSubtitle} numberOfLines={1}>
            {pillMeta.subtitle}
          </ThemedText>
        </View>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={14}
          color="#7E8A82"
        />
      </TouchableOpacity>

      {/* Focused filter options overlay */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.focusOverlayRoot}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsOpen(false)}
          >
            <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill}>
              <View style={styles.focusOverlayDim} />
            </BlurView>
          </Pressable>

          <View
            style={[
              styles.focusOverlayContent,
              {
                paddingTop: overlayPaddingTop,
              },
            ]}
          >
            <View style={styles.dropdown}>
              {/* Near Me */}
              <TouchableOpacity
                style={styles.option}
                onPress={handleNearMe}
                activeOpacity={0.82}
                disabled={locationLoading}
              >
                <View style={[styles.optionIconWrap, { backgroundColor: GREEN }]}>
                  <Ionicons name="navigate" size={17} color="#FFFFFF" />
                </View>
                <View style={styles.optionBody}>
                  <ThemedText style={styles.optionTitle}>Near Me</ThemedText>
                  <ThemedText style={styles.optionDesc}>{nearMeDescription}</ThemedText>
                </View>
                {locationLoading ? (
                  <ActivityIndicator size="small" color={GREEN} />
                ) : mode === "nearby" ? (
                  <Ionicons name="checkmark-circle" size={22} color={GREEN} />
                ) : null}
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Country / City */}
              <TouchableOpacity
                style={styles.option}
                onPress={handleOpenPicker}
                activeOpacity={0.82}
              >
                <View style={[styles.optionIconWrap, { backgroundColor: "#E6F4EC" }]}>
                  <Ionicons name="flag-outline" size={17} color={GREEN} />
                </View>
                <View style={styles.optionBody}>
                  <ThemedText style={styles.optionTitle}>Country / City</ThemedText>
                  <ThemedText style={styles.optionDesc}>
                    Filter by one selected country and city
                  </ThemedText>
                </View>
                {mode === "place" ? (
                  <Ionicons name="checkmark-circle" size={22} color={GREEN} />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color="#C2CAC4" />
                )}
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* All over the world */}
              <TouchableOpacity
                style={styles.option}
                onPress={handleWorldwide}
                activeOpacity={0.82}
              >
                <View style={[styles.optionIconWrap, { backgroundColor: "#E6F4EC" }]}>
                  <Ionicons name="earth-outline" size={17} color={GREEN} />
                </View>
                <View style={styles.optionBody}>
                  <ThemedText style={styles.optionTitle}>All over the world</ThemedText>
                  <ThemedText style={styles.optionDesc}>
                    Browse posts and pets globally
                  </ThemedText>
                </View>
                {mode === "worldwide" && (
                  <Ionicons name="checkmark-circle" size={22} color={GREEN} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Country / City picker modal */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        onRequestClose={handleClosePicker}
      >
        <KeyboardAvoidingView
          style={styles.pickerKeyboard}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <View style={styles.pickerScreen}>
            {/* Fixed navigation-style header */}
            <View style={[styles.pickerNavBar, { paddingTop: insets.top }]}>
              <ThemedText style={styles.pickerNavTitle}>Country / City</ThemedText>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClosePicker}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={22} color="#3C4A40" />
              </TouchableOpacity>
            </View>

            {/* Scrollable content */}
            <View style={styles.pickerContent}>
              <ThemedText style={styles.pickerSubtitle}>
                Search by country or city, then select one entry.
              </ThemedText>

              <TextInput
                style={styles.searchInput}
                placeholder="Search city or country"
                placeholderTextColor="#97A29B"
                value={locationSearch}
                onChangeText={setLocationSearch}
                autoFocus
                autoCapitalize="words"
                autoCorrect={false}
              />

              <FlatList
                data={filteredLocations}
                keyExtractor={(item) => item.key}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={styles.locationList}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={22} color="#A5B0AA" />
                    <ThemedText style={styles.emptyText}>
                      {hasLocationSearch
                        ? "No location found. Try Tunis, Sousse, or Paris."
                        : "Start typing to search locations."}
                    </ThemedText>
                  </View>
                }
                renderItem={({ item }) => {
                  const active =
                    selectedCountry === item.country &&
                    selectedGovernorate === item.governorate;

                  return (
                    <TouchableOpacity
                      style={styles.locationItem}
                      onPress={() => handleSelectPlace(item)}
                      activeOpacity={0.84}
                    >
                      <View style={styles.locationItemIcon}>
                        <Ionicons name="location-outline" size={17} color={GREEN} />
                      </View>
                      <ThemedText style={styles.locationItemText}>
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
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  /* Compact header trigger */
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    minWidth: 128,
    maxWidth: 168,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D4E8DE",
    backgroundColor: "#FAFCFB",
    paddingLeft: 8,
    paddingRight: 9,
    shadowColor: "#0D1F14",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  locationPillIcon: {
    width: 24,
    height: 24,
    borderRadius: 13,
    backgroundColor: "#E9F7ED",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  locationPillTextWrap: {
    flex: 1,
    minWidth: 0,
    marginRight: 4,
  },
  locationPillTitle: {
    color: "#1E2B23",
    fontSize: 11.5,
    fontWeight: "900",
    lineHeight: 15,
  },
  locationPillSubtitle: {
    color: GREEN,
    fontSize: 10.5,
    fontWeight: "800",
    lineHeight: 13,
  },

  /* Inline dropdown */
  focusOverlayRoot: {
    flex: 1,
  },
  focusOverlayDim: {
    flex: 1,
    backgroundColor: "rgba(22, 30, 25, 0.2)",
  },
  focusOverlayContent: {
    flex: 1,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  dropdown: {
    width: "100%",
    maxWidth: 560,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DFE8E2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
    overflow: "hidden",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  optionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  optionBody: {
    flex: 1,
    marginRight: 10,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#172018",
  },
  optionDesc: {
    marginTop: 2,
    fontSize: 12,
    color: "#7A877F",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F4F1",
    marginLeft: 70,
    marginRight: 18,
  },

  /* Country/City picker modal */
  pickerScreen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  pickerKeyboard: {
    flex: 1,
  },
  pickerNavBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
  },
  pickerNavTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#172018",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F2F5F3",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerContent: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  pickerSubtitle: {
    fontSize: 13,
    color: "#748078",
    marginBottom: 16,
  },
  searchInput: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCE6DD",
    backgroundColor: "#FAFCFA",
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#172119",
    marginBottom: 12,
  },
  locationList: {
    flex: 1,
  },
  locationItem: {
    minHeight: 58,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2EF",
    flexDirection: "row",
    alignItems: "center",
  },
  locationItemIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#EAF8EE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  locationItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#233128",
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

