import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
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

function formatLocation(pet) {
  return [pet?.owner?.city, pet?.owner?.country].filter(Boolean).join(", ");
}

export default function HomeMeetPreview() {
  const { filters, selectionLabel } = useLocationFilter();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);

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
    }, [filters.city, filters.country])
  );

  const subtitle = useMemo(() => {
    if (selectionLabel === "Near Me") {
      return "Fresh profiles around your area";
    }

    if (selectionLabel === "In All the World") {
      return "Explore pets from every region";
    }

    return `Selected area: ${selectionLabel}`;
  }, [selectionLabel]);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <View style={styles.titleIcon}>
            <Ionicons name="paw" size={18} color={GREEN} />
          </View>

          <View>
            <ThemedText style={styles.title}>Pets to Meet</ThemedText>
            <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
          </View>
        </View>

        <TouchableOpacity
          style={styles.seeAllButton}
          activeOpacity={0.88}
          onPress={() => router.push("/meet")}
        >
          <ThemedText style={styles.seeAllText}>See all</ThemedText>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {Array.from({ length: 3 }).map((_, index) => (
            <View key={index} style={styles.loadingCard}>
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
          contentContainerStyle={styles.row}
        >
          {pets.map((pet) => {
            const petId = pet?._id || pet?.id;
            const location = formatLocation(pet);

            return (
              <TouchableOpacity
                key={petId}
                activeOpacity={0.9}
                style={styles.cardWrap}
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

                  <LinearGradient
                    colors={["rgba(0,0,0,0.02)", "rgba(0,0,0,0.68)"]}
                    style={styles.overlay}
                  />

                  <View style={styles.badge}>
                    <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                  </View>

                  <View style={styles.cardInfo}>
                    <ThemedText style={styles.cardName}>
                      {pet?.name || "Unnamed"}
                    </ThemedText>
                    <ThemedText style={styles.cardMeta}>
                      {pet?.breed || pet?.type || "Pet"}
                    </ThemedText>
                    {!!location && (
                      <View style={styles.locationRow}>
                        <Ionicons
                          name="location-outline"
                          size={13}
                          color="rgba(255,255,255,0.92)"
                        />
                        <ThemedText style={styles.locationText} numberOfLines={1}>
                          {location}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingTop: 18,
    paddingBottom: 18,
    backgroundColor: "#F1F7F3",
    borderTopWidth: 1,
    borderTopColor: "#EDF2EE",
    borderBottomWidth: 1,
    borderBottomColor: "#E9EFEB",
  },
  headerRow: {
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  titleIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EAF8ED",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: "#17211B",
  },
  subtitle: {
    marginTop: 3,
    fontSize: 13,
    color: "#728078",
  },
  seeAllButton: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FBFFFC",
  },
  seeAllText: {
    fontSize: 16,
    fontWeight: "800",
    color: GREEN_DARK,
  },
  row: {
    paddingHorizontal: 18,
    paddingRight: 8,
  },
  loadingCard: {
    width: 112,
    height: 152,
    borderRadius: 18,
    backgroundColor: "#E7F0EA",
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    marginHorizontal: 18,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
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
    marginRight: 10,
  },
  card: {
    width: 112,
    height: 152,
    borderRadius: 18,
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
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "58%",
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
  cardInfo: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
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
  locationText: {
    marginLeft: 3,
    fontSize: 10,
    color: "rgba(255,255,255,0.92)",
    flex: 1,
  },
});
