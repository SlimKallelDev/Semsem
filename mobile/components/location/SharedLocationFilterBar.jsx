import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COUNTRIES } from "../../constants/countries";
import {
  getGovernoratesForCountry,
  resolveCountryName,
  resolveGovernorateForCountry,
} from "../../constants/governorates";
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
  const [countrySearch, setCountrySearch] = useState("");
  const [draftGovernorate, setDraftGovernorate] = useState(selectedGovernorate);
  const [draftCountry, setDraftCountry] = useState(selectedCountry);

  useEffect(() => {
    setDraftGovernorate(selectedGovernorate);
    setDraftCountry(selectedCountry);
  }, [selectedCountry, selectedGovernorate]);

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return COUNTRIES;
    return COUNTRIES.filter((c) =>
      c.toLowerCase().includes(countrySearch.trim().toLowerCase())
    );
  }, [countrySearch]);
  const governorateOptions = useMemo(
    () => getGovernoratesForCountry(draftCountry),
    [draftCountry]
  );
  const activeDraftGovernorate = useMemo(
    () =>
      resolveGovernorateForCountry(draftCountry, draftGovernorate, {
        fallbackToRaw: false,
      }),
    [draftCountry, draftGovernorate]
  );

  const nearMeDescription = useMemo(() => {
    if (locationLoading) {
      return "Detecting your governorate and country...";
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
        title: "City / country",
        subtitle:
          [selectedGovernorate, selectedCountry].filter(Boolean).join(", ") ||
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
    setCountrySearch("");
  };

  const handleCountrySelect = (item) => {
    const nextCountry = resolveCountryName(item);

    setDraftCountry(nextCountry);
    setDraftGovernorate((current) =>
      resolveGovernorateForCountry(nextCountry, current, {
        fallbackToRaw: false,
      })
    );
    setCountrySearch("");
  };

  const handleApplyPlace = () => {
    const normalizedCountry = resolveCountryName(draftCountry);
    const normalizedGovernorate = resolveGovernorateForCountry(
      normalizedCountry,
      draftGovernorate,
      { fallbackToRaw: !governorateOptions.length }
    );

    if (!normalizedGovernorate.trim() && !normalizedCountry.trim()) return;
    applyCustomPlace({
      governorate: normalizedGovernorate,
      country: normalizedCountry,
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

              {/* Country / Governorate */}
              <TouchableOpacity
                style={styles.option}
                onPress={handleOpenPicker}
                activeOpacity={0.82}
              >
                <View style={[styles.optionIconWrap, { backgroundColor: "#E6F4EC" }]}>
                  <Ionicons name="flag-outline" size={17} color={GREEN} />
                </View>
                <View style={styles.optionBody}>
                  <ThemedText style={styles.optionTitle}>Country / Governorate</ThemedText>
                  <ThemedText style={styles.optionDesc}>
                    Filter by country or governorate
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

      {/* Country / Governorate picker modal */}
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
              <ThemedText style={styles.pickerNavTitle}>Country / Governorate</ThemedText>
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
                Pick a country, a governorate, or both.
              </ThemedText>

              {governorateOptions.length > 0 ? (
                <View style={styles.governoratePickerCard}>
                  <ThemedText style={styles.governoratePickerTitle}>
                    Governorate in {resolveCountryName(draftCountry)}
                  </ThemedText>
                  <ScrollView
                    style={styles.governoratePickerList}
                    contentContainerStyle={styles.governorateChipWrap}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                  >
                    {governorateOptions.map((item) => {
                      const active = activeDraftGovernorate === item;

                      return (
                        <TouchableOpacity
                          key={item}
                          style={[
                            styles.governorateChip,
                            active && styles.governorateChipActive,
                          ]}
                          onPress={() => setDraftGovernorate(item)}
                          activeOpacity={0.86}
                        >
                          <ThemedText
                            style={[
                              styles.governorateChipText,
                              active && styles.governorateChipTextActive,
                            ]}
                          >
                            {item}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : (
                <TextInput
                  style={styles.cityInput}
                  placeholder="Governorate (optional)"
                  placeholderTextColor="#97A29B"
                  value={draftGovernorate}
                  onChangeText={setDraftGovernorate}
                />
              )}

              <TextInput
                style={styles.searchInput}
                placeholder="Search country"
                placeholderTextColor="#97A29B"
                value={countrySearch}
                onChangeText={setCountrySearch}
              />

              <FlatList
                data={filteredCountries}
                keyExtractor={(item) => item}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={styles.countryList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.countryItem}
                    onPress={() => handleCountrySelect(item)}
                  >
                    <ThemedText style={styles.countryItemText}>{item}</ThemedText>
                    {draftCountry === item && (
                      <Ionicons name="checkmark" size={20} color={GREEN} />
                    )}
                  </TouchableOpacity>
                )}
              />

              <TouchableOpacity
                style={[
                  styles.applyButton,
                  !draftGovernorate.trim() &&
                    !draftCountry.trim() &&
                    styles.applyButtonDisabled,
                ]}
                onPress={handleApplyPlace}
                disabled={!draftGovernorate.trim() && !draftCountry.trim()}
                activeOpacity={0.88}
              >
                <ThemedText style={styles.applyButtonText}>Apply</ThemedText>
              </TouchableOpacity>
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

  /* Country/Governorate picker modal */
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
  cityInput: {
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
  governoratePickerCard: {
    borderWidth: 1,
    borderColor: "#DCE6DD",
    borderRadius: 14,
    backgroundColor: "#FAFCFA",
    padding: 12,
    marginBottom: 12,
  },
  governoratePickerTitle: {
    marginBottom: 10,
    color: "#4E5D53",
    fontSize: 13,
    fontWeight: "700",
  },
  governoratePickerList: {
    maxHeight: 136,
  },
  governorateChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  governorateChip: {
    borderWidth: 1,
    borderColor: "#D7E2DB",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  governorateChipActive: {
    borderColor: GREEN,
    backgroundColor: GREEN,
  },
  governorateChipText: {
    color: "#546258",
    fontSize: 13,
    fontWeight: "700",
  },
  governorateChipTextActive: {
    color: "#FFFFFF",
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
  countryList: {
    flex: 1,
  },
  countryItem: {
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2EF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  countryItemText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#233128",
  },
  applyButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    marginBottom: 8,
  },
  applyButtonDisabled: {
    opacity: 0.4,
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});

