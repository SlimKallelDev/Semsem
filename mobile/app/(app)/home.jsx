import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import MeetGrid from "../../components/home/MeetGrid";
import PostsFeed from "../../components/home/PostsFeed";
import ServicesDirectory from "../../components/home/ServicesDirectory";
import ThemedText from "../../components/ThemedText";
import { PROFILE_TYPES } from "../../constants/profileTypes";

const GREEN = "#3DB85C";
const GREEN_DARK = "#227B3E";
const TABS = [
  {
    value: "feed",
    label: "Feed",
    iconFamily: "ion",
    icon: "newspaper-outline",
  },
  {
    value: "meet",
    label: "Pets to Meet",
    iconFamily: "mci",
    icon: "heart-search",
  },
  {
    value: "services",
    label: "Services",
    iconFamily: "mci",
    icon: "handshake-outline",
  },
];
const FEED_FILTERS = [
  { value: "All", label: "All", iconFamily: "ion", icon: "grid-outline" },
  { value: "Adoption", label: "Adoption", iconFamily: "ion", icon: "home-outline" },
  { value: "Lost", label: "Lost", iconFamily: "ion", icon: "alert-circle-outline" },
  { value: "Found", label: "Found", iconFamily: "ion", icon: "search-outline" },
  { value: "Mating", label: "Mating", iconFamily: "ion", icon: "heart-outline" },
  { value: "General", label: "General", iconFamily: "ion", icon: "newspaper-outline" },
];
const PET_FILTERS = [
  { value: "all", label: "All", iconFamily: "ion", icon: "paw-outline" },
  { value: "cat", label: "Cats", iconFamily: "mci", icon: "cat" },
  { value: "dog", label: "Dogs", iconFamily: "mci", icon: "dog" },
  { value: "bird", label: "Birds", iconFamily: "mci", icon: "bird" },
  { value: "other", label: "Others", iconFamily: "ion", icon: "sparkles-outline" },
];
const SERVICE_ICON = {
  veterinarian: "medical-bag",
  refuge: "home-heart",
  associations: "hand-heart",
  breeders: "dog-service",
  pet_sitters: "account-heart",
  groomer: "content-cut",
  pet_shops: "storefront",
  boarding: "bed",
};
const SERVICE_FILTERS = [
  { value: "all", label: "All Services", iconFamily: "mci", icon: "apps" },
  ...PROFILE_TYPES.filter((item) => item.value !== "pet_owner").map((item) => ({
    value: item.value,
    label: item.label,
    iconFamily: "mci",
    icon: SERVICE_ICON[item.value] || "briefcase-outline",
  })),
];
const SECTION_META = {
  feed: {
    title: "Latest Posts",
    iconFamily: "ion",
    icon: "newspaper-outline",
    filters: FEED_FILTERS,
  },
  meet: {
    title: "Pets to Meet",
    iconFamily: "mci",
    icon: "heart-search",
    filters: PET_FILTERS,
  },
  services: {
    title: "Services",
    iconFamily: "mci",
    icon: "handshake-outline",
    filters: SERVICE_FILTERS,
  },
};

export default function Home() {
  const [activeTab, setActiveTab] = useState("feed");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [feedFilter, setFeedFilter] = useState("All");
  const [petFilter, setPetFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const activeMeta = SECTION_META[activeTab] || SECTION_META.feed;
  const activeFilterValue =
    activeTab === "feed"
      ? feedFilter
      : activeTab === "meet"
        ? petFilter
        : serviceFilter;
  const activeFilter = useMemo(
    () =>
      activeMeta.filters.find((filter) => filter.value === activeFilterValue) ||
      activeMeta.filters[0],
    [activeFilterValue, activeMeta.filters]
  );

  const renderIcon = (item, active = false, size = 15) => {
    const color = active ? "#FFFFFF" : "#66736B";

    if (item.iconFamily === "mci") {
      return <MaterialCommunityIcons name={item.icon} size={size} color={color} />;
    }

    return <Ionicons name={item.icon} size={size} color={color} />;
  };

  const handleChangeTab = (nextTab) => {
    setActiveTab(nextTab);
    setFilterMenuOpen(false);
  };

  const handleSelectFilter = (value) => {
    if (activeTab === "feed") {
      setFeedFilter(value);
    } else if (activeTab === "meet") {
      setPetFilter(value);
    } else {
      setServiceFilter(value);
    }

    setFilterMenuOpen(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.topNavWrap}>
        <View style={styles.segmentedNav}>
          {TABS.map((tab) => {
            const active = activeTab === tab.value;

            return (
              <TouchableOpacity
                key={tab.value}
                style={[styles.navButton, active && styles.navButtonActive]}
                activeOpacity={0.88}
                onPress={() => handleChangeTab(tab.value)}
              >
                {renderIcon(tab, active)}
                <ThemedText
                  style={[styles.navButtonText, active && styles.navButtonTextActive]}
                  numberOfLines={1}
                >
                  {tab.label}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.sectionToolbar}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconWrap}>
              {renderIcon(activeMeta, false, 16)}
            </View>
            <ThemedText style={styles.sectionTitle} numberOfLines={1}>
              {activeMeta.title}
            </ThemedText>
          </View>

          <TouchableOpacity
            style={styles.filterButton}
            activeOpacity={0.88}
            onPress={() => setFilterMenuOpen((value) => !value)}
          >
            <ThemedText style={styles.filterButtonText} numberOfLines={1}>
              {activeFilter.label}
            </ThemedText>
            <Ionicons
              name={filterMenuOpen ? "chevron-up" : "chevron-down"}
              size={14}
              color={GREEN_DARK}
            />
          </TouchableOpacity>
        </View>

        {filterMenuOpen ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterMenu}
          >
            {activeMeta.filters.map((filter) => {
              const active = activeFilterValue === filter.value;

              return (
                <TouchableOpacity
                  key={filter.value}
                  style={[styles.filterOption, active && styles.filterOptionActive]}
                  activeOpacity={0.88}
                  onPress={() => handleSelectFilter(filter.value)}
                >
                  {renderIcon(filter, active, 14)}
                  <ThemedText
                    style={[
                      styles.filterOptionText,
                      active && styles.filterOptionTextActive,
                    ]}
                  >
                    {filter.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.content}>
        {activeTab === "feed" ? <PostsFeed selectedFilter={feedFilter} /> : null}
        {activeTab === "meet" ? <MeetGrid selectedType={petFilter} /> : null}
        {activeTab === "services" ? (
          <ServicesDirectory selectedType={serviceFilter} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F4",
  },
  topNavWrap: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E3ECE6",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    shadowColor: "#152A1D",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 9,
    elevation: 4,
    zIndex: 10,
  },
  segmentedNav: {
    minHeight: 44,
    borderRadius: 18,
    backgroundColor: "#F2F6F3",
    borderWidth: 1,
    borderColor: "#E0E8E3",
    padding: 4,
    flexDirection: "row",
    gap: 4,
  },
  navButton: {
    flex: 1,
    minWidth: 0,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 6,
  },
  navButtonActive: {
    backgroundColor: GREEN,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 3,
  },
  navButtonText: {
    flexShrink: 1,
    color: "#66736B",
    fontSize: 11,
    fontWeight: "900",
  },
  navButtonTextActive: {
    color: "#FFFFFF",
  },
  sectionToolbar: {
    marginTop: 8,
    minHeight: 38,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2EAE5",
    paddingLeft: 8,
    paddingRight: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EEF7F1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  sectionTitle: {
    flex: 1,
    color: "#17211A",
    fontSize: 15,
    fontWeight: "900",
  },
  filterButton: {
    maxWidth: 168,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#EAF8EE",
    borderWidth: 1,
    borderColor: "#D4ECDD",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  filterButtonText: {
    flexShrink: 1,
    color: GREEN_DARK,
    fontSize: 12,
    fontWeight: "900",
  },
  filterMenu: {
    gap: 8,
    paddingTop: 8,
    paddingBottom: 2,
    paddingRight: 8,
  },
  filterOption: {
    height: 34,
    borderRadius: 17,
    borderWidth: 1.2,
    borderColor: "#DDE6E0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  filterOptionActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  filterOptionText: {
    color: "#617069",
    fontSize: 12,
    fontWeight: "900",
  },
  filterOptionTextActive: {
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
  },
});
