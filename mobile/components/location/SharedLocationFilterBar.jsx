import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MODE_ICON = {
  nearby: "navigate",
  place: "flag-outline",
  worldwide: "earth-outline",
};

import { COUNTRIES } from "../../constants/countries";
import { useLocationFilter } from "../../contexts/LocationFilterContext";
import ThemedText from "../ThemedText";

const GREEN = "#3DB85C";

export default function SharedLocationFilterBar() {
  const insets = useSafeAreaInsets();
  const {
    mode,
    selectionLabel,
    selectedCity,
    selectedCountry,
    setNearby,
    setWorldwide,
    applyCustomPlace,
  } = useLocationFilter();

  const [isOpen, setIsOpen] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [draftCity, setDraftCity] = useState(selectedCity);
  const [draftCountry, setDraftCountry] = useState(selectedCountry);

  useEffect(() => {
    setDraftCity(selectedCity);
    setDraftCountry(selectedCountry);
  }, [selectedCity, selectedCountry]);

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return COUNTRIES;
    return COUNTRIES.filter((c) =>
      c.toLowerCase().includes(countrySearch.trim().toLowerCase())
    );
  }, [countrySearch]);

  const handleNearMe = () => {
    setNearby();
    setIsOpen(false);
  };

  const handleWorldwide = () => {
    setWorldwide();
    setIsOpen(false);
  };

  const handleOpenPicker = () => {
    setPickerVisible(true);
  };

  const handleClosePicker = () => {
    setPickerVisible(false);
    setCountrySearch("");
  };

  const handleApplyPlace = () => {
    if (!draftCity.trim() && !draftCountry.trim()) return;
    applyCustomPlace({ city: draftCity, country: draftCountry });
    handleClosePicker();
    setIsOpen(false);
  };

  return (
    <>
      {/* ── Full-width filter bar ── */}
      <TouchableOpacity
        style={styles.filterBar}
        onPress={() => setIsOpen((v) => !v)}
        activeOpacity={0.88}
      >
        <View style={styles.filterLeft}>
          <Ionicons name={MODE_ICON[mode]} size={16} color={GREEN} />
          <ThemedText style={styles.filterLabel} numberOfLines={1}>
            {selectionLabel}
          </ThemedText>
        </View>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={18}
          color="#9AA39E"
        />
      </TouchableOpacity>

      {/* ── Inline dropdown ── */}
      {isOpen && (
        <View style={styles.dropdown}>
          {/* Near Me */}
          <TouchableOpacity
            style={styles.option}
            onPress={handleNearMe}
            activeOpacity={0.82}
          >
            <View style={[styles.optionIconWrap, { backgroundColor: GREEN }]}>
              <Ionicons name="navigate" size={17} color="#FFFFFF" />
            </View>
            <View style={styles.optionBody}>
              <ThemedText style={styles.optionTitle}>Near Me</ThemedText>
              <ThemedText style={styles.optionDesc}>
                Posts around your location
              </ThemedText>
            </View>
            {mode === "nearby" && (
              <Ionicons name="checkmark-circle" size={22} color={GREEN} />
            )}
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
                Filter by country or city
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
                Browse all posts globally
              </ThemedText>
            </View>
            {mode === "worldwide" && (
              <Ionicons name="checkmark-circle" size={22} color={GREEN} />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ── Country / City picker modal ── */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        onRequestClose={handleClosePicker}
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
              Pick a country, a city, or both.
            </ThemedText>

            <TextInput
              style={styles.cityInput}
              placeholder="City (optional)"
              placeholderTextColor="#97A29B"
              value={draftCity}
              onChangeText={setDraftCity}
            />

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
              style={styles.countryList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryItem}
                  onPress={() => {
                    setDraftCountry(item);
                    setCountrySearch("");
                  }}
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
                !draftCity.trim() &&
                  !draftCountry.trim() &&
                  styles.applyButtonDisabled,
              ]}
              onPress={handleApplyPlace}
              disabled={!draftCity.trim() && !draftCountry.trim()}
              activeOpacity={0.88}
            >
              <ThemedText style={styles.applyButtonText}>Apply</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  /* ── Full-width filter bar ── */
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#EDEEF0",
  },
  filterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#172018",
  },

  /* ── Inline dropdown ── */
  dropdown: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EAEFEB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
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

  /* ── Country/City picker modal ── */
  pickerScreen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
