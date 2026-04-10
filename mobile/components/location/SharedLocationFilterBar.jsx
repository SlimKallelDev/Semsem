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
import { SafeAreaView } from "react-native-safe-area-context";

import { COUNTRIES } from "../../constants/countries";
import { useLocationFilter } from "../../contexts/LocationFilterContext";
import ThemedText from "../ThemedText";

const GREEN = "#3DB85C";
const GREEN_DARK = "#2A9448";

export default function SharedLocationFilterBar() {
  const {
    mode,
    helperText,
    selectionLabel,
    selectedCity,
    selectedCountry,
    setNearby,
    setWorldwide,
    applyCustomPlace,
  } = useLocationFilter();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [draftCity, setDraftCity] = useState(selectedCity);
  const [draftCountry, setDraftCountry] = useState(selectedCountry);

  useEffect(() => {
    if (sheetVisible) {
      setDraftCity(selectedCity);
      setDraftCountry(selectedCountry);
    }
  }, [selectedCity, selectedCountry, sheetVisible]);

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) {
      return COUNTRIES;
    }

    return COUNTRIES.filter((item) =>
      item.toLowerCase().includes(countrySearch.trim().toLowerCase())
    );
  }, [countrySearch]);

  const config = useMemo(() => {
    if (mode === "worldwide") {
      return {
        icon: "earth-outline",
        tint: "#EEF8F2",
        color: "#2F8D53",
      };
    }

    if (mode === "place") {
      return {
        icon: "location-outline",
        tint: "#EAF6EE",
        color: GREEN_DARK,
      };
    }

    return {
      icon: "navigate",
      tint: "#EAF8ED",
      color: GREEN,
    };
  }, [mode]);

  const closeSheet = () => {
    setSheetVisible(false);
  };

  const handlePickNearby = () => {
    setNearby();
    closeSheet();
  };

  const handlePickWorldwide = () => {
    setWorldwide();
    closeSheet();
  };

  const handleApplyPlace = () => {
    if (!draftCity.trim() && !draftCountry.trim()) {
      return;
    }

    applyCustomPlace({
      city: draftCity,
      country: draftCountry,
    });
    closeSheet();
  };

  return (
    <>
      <View style={styles.wrapper}>
        <TouchableOpacity
          style={styles.filterButton}
          activeOpacity={0.9}
          onPress={() => setSheetVisible(true)}
        >
          <View
            style={[
              styles.leadingIconWrap,
              { backgroundColor: config.tint },
            ]}
          >
            <Ionicons name={config.icon} size={19} color={config.color} />
          </View>

          <View style={styles.copyBlock}>
            <ThemedText numberOfLines={1} style={styles.selectionText}>
              {selectionLabel}
            </ThemedText>
            <ThemedText numberOfLines={1} style={styles.helperText}>
              {helperText}
            </ThemedText>
          </View>

          <Ionicons name="chevron-down" size={22} color="#98A29B" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={sheetVisible}
        transparent
        animationType="fade"
        onRequestClose={closeSheet}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeSheet}
          />

          <View style={styles.sheet}>
            <View style={styles.handle} />

            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleBlock}>
                <ThemedText style={styles.sheetTitle}>
                  Choose Location
                </ThemedText>
                <ThemedText style={styles.sheetSubtitle}>
                  This selection stays the same in Posts and To Meet.
                </ThemedText>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeSheet}
                activeOpacity={0.85}
              >
                <Ionicons name="close" size={24} color="#66716A" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.optionCard,
                mode === "nearby" && styles.optionCardActive,
              ]}
              onPress={handlePickNearby}
              activeOpacity={0.88}
            >
              <View
                style={[
                  styles.optionIconWrap,
                  mode === "nearby" && styles.optionIconWrapActive,
                ]}
              >
                <Ionicons
                  name="navigate"
                  size={18}
                  color={mode === "nearby" ? "#FFFFFF" : GREEN}
                />
              </View>

              <View style={styles.optionCopy}>
                <ThemedText style={styles.optionTitle}>Near Me</ThemedText>
                <ThemedText style={styles.optionText}>
                  Use your profile city and country when available.
                </ThemedText>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionCard,
                mode === "worldwide" && styles.optionCardActive,
              ]}
              onPress={handlePickWorldwide}
              activeOpacity={0.88}
            >
              <View
                style={[
                  styles.optionIconWrap,
                  mode === "worldwide" && styles.optionIconWrapActive,
                ]}
              >
                <Ionicons
                  name="earth-outline"
                  size={18}
                  color={mode === "worldwide" ? "#FFFFFF" : GREEN}
                />
              </View>

              <View style={styles.optionCopy}>
                <ThemedText style={styles.optionTitle}>
                  In All the World
                </ThemedText>
                <ThemedText style={styles.optionText}>
                  Explore results from every country with no location filter.
                </ThemedText>
              </View>
            </TouchableOpacity>

            <View style={styles.customCard}>
              <View style={styles.customHeader}>
                <View
                  style={[
                    styles.optionIconWrap,
                    mode === "place" && styles.optionIconWrapActive,
                  ]}
                >
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color={mode === "place" ? "#FFFFFF" : GREEN}
                  />
                </View>

                <View style={styles.optionCopy}>
                  <ThemedText style={styles.optionTitle}>
                    Specific Place
                  </ThemedText>
                  <ThemedText style={styles.optionText}>
                    Pick a city, a country, or both.
                  </ThemedText>
                </View>
              </View>

              <TextInput
                style={styles.input}
                placeholder="City (optional)"
                placeholderTextColor="#97A29B"
                value={draftCity}
                onChangeText={setDraftCity}
              />

              <TouchableOpacity
                style={styles.countryButton}
                onPress={() => setCountryModalVisible(true)}
                activeOpacity={0.88}
              >
                <View style={styles.countryButtonTextBlock}>
                  <ThemedText style={styles.countryLabel}>Country</ThemedText>
                  <ThemedText
                    style={[
                      styles.countryValue,
                      !draftCountry && styles.countryPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {draftCountry || "Choose a country"}
                  </ThemedText>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#9CA69F" />
              </TouchableOpacity>

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
                <ThemedText style={styles.applyButtonText}>
                  Apply Place
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={countryModalVisible}
        animationType="slide"
        onRequestClose={() => setCountryModalVisible(false)}
      >
        <SafeAreaView style={styles.countryScreen}>
          <View style={styles.countryHeader}>
            <View>
              <ThemedText style={styles.countryTitle}>
                Select Country
              </ThemedText>
              <ThemedText style={styles.countrySubtitle}>
                Start typing to find your place faster.
              </ThemedText>
            </View>

            <TouchableOpacity
              style={styles.countryCloseButton}
              onPress={() => setCountryModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#66716A" />
            </TouchableOpacity>
          </View>

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
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.countryItem}
                onPress={() => {
                  setDraftCountry(item);
                  setCountryModalVisible(false);
                  setCountrySearch("");
                }}
              >
                <ThemedText style={styles.countryItemText}>{item}</ThemedText>
                {draftCountry === item ? (
                  <Ionicons name="checkmark" size={20} color={GREEN} />
                ) : null}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2EE",
  },
  filterButton: {
    minHeight: 58,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7EEE8",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  leadingIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  copyBlock: {
    flex: 1,
    marginRight: 12,
  },
  selectionText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#152018",
  },
  helperText: {
    marginTop: 2,
    fontSize: 12,
    color: "#7A867F",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 24, 18, 0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  handle: {
    width: 54,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#DDE5DE",
    alignSelf: "center",
    marginBottom: 18,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  sheetTitleBlock: {
    flex: 1,
    paddingRight: 12,
  },
  sheetTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#152018",
  },
  sheetSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: "#718078",
  },
  closeButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#F5F7F5",
    alignItems: "center",
    justifyContent: "center",
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5ECE5",
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginBottom: 12,
  },
  optionCardActive: {
    borderColor: "#CDEFD4",
    backgroundColor: "#F3FCF5",
  },
  optionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EFF8F1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  optionIconWrapActive: {
    backgroundColor: GREEN,
  },
  optionCopy: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#182219",
  },
  optionText: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: "#748078",
  },
  customCard: {
    borderRadius: 22,
    backgroundColor: "#F7FBF7",
    borderWidth: 1,
    borderColor: "#E5EEE6",
    padding: 16,
    marginTop: 6,
  },
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  input: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DCE6DD",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    color: "#172119",
    marginBottom: 12,
  },
  countryButton: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DCE6DD",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  countryButtonTextBlock: {
    flex: 1,
    paddingRight: 10,
  },
  countryLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: "#8A978F",
  },
  countryValue: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: "700",
    color: "#1A241B",
  },
  countryPlaceholder: {
    color: "#97A29B",
    fontWeight: "500",
  },
  applyButton: {
    height: 52,
    borderRadius: 18,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  applyButtonDisabled: {
    opacity: 0.45,
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  countryScreen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
  },
  countryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 18,
  },
  countryTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#142017",
  },
  countrySubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#748078",
  },
  countryCloseButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#F5F7F5",
    alignItems: "center",
    justifyContent: "center",
  },
  searchInput: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DCE6DD",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    color: "#172119",
    marginBottom: 14,
  },
  countryItem: {
    minHeight: 58,
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
});
