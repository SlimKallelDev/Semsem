import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import MeetGrid from "../../components/home/MeetGrid";
import PostsFeed from "../../components/home/PostsFeed";
import ServicesDirectory from "../../components/home/ServicesDirectory";
import SharedLocationFilterBar from "../../components/location/SharedLocationFilterBar";
import ThemedText from "../../components/ThemedText";
import {
  CHROME_DIVIDER_COLOR,
  CHROME_DIVIDER_HEIGHT,
} from "../../constants/chromeLayout";
import { PROFILE_TYPES } from "../../constants/profileTypes";

/** Vertical rhythm: logo row → segmented tabs → section title + location */
const CHROME_TOOLBAR_GAP = 12;

/** Home shell — restrained palette, same accent; emphasis via space & typography */
const ACCENT = "#3DB85C";
const ACCENT_MUTED = "#2F6B45";
const PAGE_BG = "#F2F5F2";
const SURFACE = "#FFFFFF";
const TRACK = "#EBF5EF";
const TRACK_BORDER = "#D8E8E0";
const TEXT_MAIN = "#1A231E";
const TEXT_MUTED = "#5C6C64";
const RADIUS_LG = 20;
const RADIUS_MD = 16;
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
    const color = active ? SURFACE : TEXT_MUTED;

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
                activeOpacity={0.82}
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

        <View style={styles.toolbarDivider} />

        <View style={styles.sectionToolbarRow}>
          <View style={styles.sectionHeadLeft}>
            <View style={styles.sectionIconWrap}>
              {renderIcon(activeMeta, false, 16)}
            </View>
            <ThemedText style={styles.sectionTitle} numberOfLines={1}>
              {activeMeta.title}
            </ThemedText>
            <TouchableOpacity
              style={styles.categoryTriangleBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => setFilterMenuOpen((value) => !value)}
              accessibilityRole="button"
              accessibilityLabel={`${activeMeta.title}: ${activeFilter.label}`}
              accessibilityHint="Opens category filter options"
            >
              <View style={styles.categoryTriangleInner}>
                <MaterialCommunityIcons
                  name={filterMenuOpen ? "menu-up" : "menu-down"}
                  size={18}
                  color={ACCENT_MUTED}
                />
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.locationSlot}>
            <SharedLocationFilterBar />
          </View>
        </View>

        {filterMenuOpen ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
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
    backgroundColor: PAGE_BG,
  },
  topNavWrap: {
    backgroundColor: SURFACE,
    borderBottomWidth: CHROME_DIVIDER_HEIGHT,
    borderBottomColor: CHROME_DIVIDER_COLOR,
    paddingHorizontal: 16,
    paddingTop: CHROME_TOOLBAR_GAP,
    paddingBottom: CHROME_TOOLBAR_GAP,
    shadowColor: "#0D1F14",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    zIndex: 10,
  },
  segmentedNav: {
    minHeight: 48,
    borderRadius: RADIUS_LG,
    backgroundColor: TRACK,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TRACK_BORDER,
    padding: 5,
    flexDirection: "row",
    gap: 5,
  },
  navButton: {
    flex: 1,
    minWidth: 0,
    height: 38,
    borderRadius: RADIUS_MD - 4,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 4,
  },
  navButtonActive: {
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 2,
  },
  navButtonText: {
    flexShrink: 1,
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: -0.15,
  },
  navButtonTextActive: {
    color: SURFACE,
    fontWeight: "800",
  },
  toolbarDivider: {
    height: CHROME_DIVIDER_HEIGHT,
    backgroundColor: CHROME_DIVIDER_COLOR,
    marginTop: CHROME_TOOLBAR_GAP,
    marginHorizontal: -2,
  },
  sectionToolbarRow: {
    marginTop: CHROME_TOOLBAR_GAP,
    paddingTop: 2,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionHeadLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  categoryTriangleBtn: {
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 4,
    marginLeft: 2,
  },
  categoryTriangleInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: TRACK,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TRACK_BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  locationSlot: {
    flexShrink: 0,
    justifyContent: "center",
    alignItems: "flex-end",
    maxWidth: "46%",
  },
  sectionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F4FAF6",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(61, 184, 92, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  sectionTitle: {
    flex: 1,
    color: TEXT_MAIN,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.35,
    marginRight: 6,
    lineHeight: 21,
  },
  filterMenu: {
    gap: 10,
    paddingTop: CHROME_TOOLBAR_GAP,
    paddingBottom: 6,
    paddingLeft: 2,
    paddingRight: 16,
    alignItems: "center",
  },
  filterOption: {
    minHeight: 38,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#DCE7E1",
    backgroundColor: "#FAFCFB",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    shadowColor: "#0D1F14",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.035,
    shadowRadius: 2,
    elevation: 1,
  },
  filterOptionActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  filterOptionText: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  filterOptionTextActive: {
    color: SURFACE,
    fontWeight: "800",
  },
  content: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
});
