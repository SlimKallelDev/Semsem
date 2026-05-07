import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { useLocationFilter } from "../../contexts/LocationFilterContext";
import { getPets } from "../../services/petService";
import ThemedText from "../ThemedText";

const GREEN = "#3DB85C";
const GREEN_DARK = "#248241";
const PET_CARD_WIDTH = 106;
const PET_CARD_HEIGHT = 146;
const PET_CARD_GAP = 8;
const PET_SNAP_INTERVAL = PET_CARD_WIDTH + PET_CARD_GAP;

function formatLocation(pet) {
  if (typeof pet?.location === "string" && pet.location.trim()) {
    return pet.location.trim();
  }

  return [
    pet?.location?.governorate ||
      pet?.location?.city ||
      pet?.owner?.governorate ||
      pet?.owner?.city,
    pet?.location?.country || pet?.owner?.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function titleCase(value) {
  const text = String(value || "").trim();

  if (!text) return "";

  return text
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function formatPetSummary(pet) {
  const type = titleCase(pet?.type) || "Pet";
  const breed = titleCase(pet?.breed);

  return [type, breed].filter(Boolean).join(" \u00b7 ");
}

export default function HomeMeetPreview() {
  const { filters, selectionLabel } = useLocationFilter();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rowWidth, setRowWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const swipeHintX = useRef(new Animated.Value(0)).current;
  const swipeHintOpacity = useRef(new Animated.Value(0)).current;
  const hasPlayedSwipeHint = useRef(false);

  const loadPets = async () => {
    try {
      setLoading(true);
      const data = await getPets(filters);
      setPets(Array.isArray(data) ? data.slice(0, 8) : []);
    } catch (error) {
      console.log("Home preview pets error:", error.message);
      setPets([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPets();
    }, [filters.governorate, filters.country])
  );

  const subtitle = useMemo(() => {
    if (selectionLabel === "Near Me") {
      return "Fresh profiles around your area";
    }

    if (selectionLabel === "All over the world") {
      return "Explore pets from every region";
    }

    return `Selected area: ${selectionLabel}`;
  }, [selectionLabel]);

  const maxScrollX = Math.max(contentWidth - rowWidth, 0);

  useEffect(() => {
    if (loading || pets.length === 0 || maxScrollX <= 2 || hasPlayedSwipeHint.current) {
      return;
    }

    hasPlayedSwipeHint.current = true;
    setShowSwipeHint(true);
    swipeHintX.setValue(0);
    swipeHintOpacity.setValue(0);

    const animation = Animated.sequence([
      Animated.timing(swipeHintOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.delay(160),
      Animated.parallel([
        Animated.timing(swipeHintX, {
          toValue: -46,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(2520),
          Animated.timing(swipeHintOpacity, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]);

    animation.start(({ finished }) => {
      if (finished) {
        setShowSwipeHint(false);
      }
    });

    return () => animation.stop();
  }, [loading, maxScrollX, pets.length, swipeHintOpacity, swipeHintX]);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <View style={styles.titleIcon}>
            <Ionicons name="paw" size={18} color={GREEN} />
          </View>

          <View style={styles.titleTextWrap}>
            <ThemedText style={styles.title}>Pets to Meet</ThemedText>
            <ThemedText style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </ThemedText>
          </View>
        </View>

        <TouchableOpacity
          style={styles.seeAllButton}
          activeOpacity={0.88}
          onPress={() => router.push("/meet")}
        >
          <ThemedText style={styles.seeAllText}>See all</ThemedText>
          <Ionicons name="chevron-forward" size={14} color={GREEN_DARK} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={PET_SNAP_INTERVAL}
          snapToAlignment="start"
          contentContainerStyle={styles.row}
        >
          {Array.from({ length: 3 }).map((_, index) => (
            <View
              key={index}
              style={[styles.loadingCard, index === 2 && styles.trailingSpaceFix]}
            >
              <ActivityIndicator color={GREEN} />
            </View>
          ))}
        </ScrollView>
      ) : pets.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="paw-outline" size={24} color={GREEN} />
          <ThemedText style={styles.emptyTitle}>No pets yet</ThemedText>
          <ThemedText style={styles.emptyText}>
            Try another area from the location filter above.
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={PET_SNAP_INTERVAL}
          snapToAlignment="start"
          onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
          onContentSizeChange={(width) => setContentWidth(width)}
          contentContainerStyle={styles.row}
        >
          {pets.map((pet, index) => {
            const petId = pet?._id || pet?.id;
            const location = formatLocation(pet);
            const petSummary = formatPetSummary(pet);

            return (
              <TouchableOpacity
                key={petId}
                activeOpacity={0.9}
                style={[styles.cardWrap, index === pets.length - 1 && styles.trailingSpaceFix]}
                onPress={() => petId && router.push(`/pet/${petId}`)}
              >
                <View style={styles.card}>
                  <Image
                    source={{
                      uri:
                        pet?.image ||
                        "https://via.placeholder.com/400x400.png?text=Pet",
                    }}
                    style={styles.image}
                  />

                  <View style={styles.badge}>
                    <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                  </View>

                  <View style={styles.infoPanel}>
                    <View style={styles.cardInfo}>
                      <ThemedText style={styles.cardName} numberOfLines={1}>
                        {pet?.name || "Unnamed"}
                      </ThemedText>
                      <ThemedText style={styles.cardMeta} numberOfLines={1}>
                        {petSummary}
                      </ThemedText>
                      <View
                        style={[
                          styles.locationRow,
                          !location && styles.locationRowPlaceholder,
                        ]}
                      >
                        <Ionicons
                          name="location-outline"
                          size={13}
                          color="rgba(255,255,255,0.92)"
                        />
                        <ThemedText style={styles.locationText} numberOfLines={1}>
                          {location || " "}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {showSwipeHint ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.swipeHint,
            {
              opacity: swipeHintOpacity,
              transform: [{ translateX: swipeHintX }],
            },
          ]}
        >
          <MaterialCommunityIcons
            name="gesture-swipe-left"
            size={36}
            color="#FFFFFF"
            style={styles.swipeHintIcon}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 4,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E7EEEA",
    shadowColor: "#214032",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  headerRow: {
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 10,
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  titleTextWrap: {
    flexShrink: 1,
  },
  titleIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EAF8ED",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#17211B",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#728078",
  },
  seeAllButton: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    backgroundColor: "#FBFFFC",
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "800",
    color: GREEN_DARK,
  },
  row: {
    paddingHorizontal: 12,
    paddingRight: 12,
  },
  loadingCard: {
    width: PET_CARD_WIDTH,
    height: PET_CARD_HEIGHT,
    borderRadius: 16,
    backgroundColor: "#E7F0EA",
    marginRight: PET_CARD_GAP,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    marginHorizontal: 14,
    borderRadius: 24,
    backgroundColor: "#F9FCFA",
    borderWidth: 1,
    borderColor: "#E7EFE8",
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: "800",
    color: "#1C271F",
  },
  emptyText: {
    marginTop: 4,
    fontSize: 14,
    color: "#75817A",
    textAlign: "center",
    lineHeight: 20,
  },
  cardWrap: {
    marginRight: PET_CARD_GAP,
  },
  trailingSpaceFix: {
    marginRight: 0,
  },
  card: {
    width: PET_CARD_WIDTH,
    height: PET_CARD_HEIGHT,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#DDE8E0",
    shadowColor: "#1A2E22",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  infoPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 58,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 10,
    backgroundColor: "rgba(29, 34, 31, 0.56)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.14)",
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  cardMeta: {
    marginTop: 1,
    fontSize: 11,
    color: "rgba(255,255,255,0.9)",
  },
  locationRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  locationRowPlaceholder: {
    opacity: 0,
  },
  locationText: {
    marginLeft: 3,
    fontSize: 10,
    color: "rgba(255,255,255,0.92)",
    flex: 1,
  },
  swipeHint: {
    position: "absolute",
    right: 56,
    top: 112,
  },
  swipeHintIcon: {
    textShadowColor: "rgba(0, 0, 0, 0.42)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
});

