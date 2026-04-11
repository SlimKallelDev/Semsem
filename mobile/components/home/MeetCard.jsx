import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Dimensions, Image, StyleSheet, TouchableOpacity, View } from "react-native";

import ThemedText from "../ThemedText";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_GAP = 12;
const HORIZONTAL_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;
const CARD_HEIGHT_TALL = 280;
const CARD_HEIGHT_SHORT = 216;
const GREEN = "#3DB85C";

function getCardHeight(index) {
  // Alternating pattern: tall-short / short-tall / tall-short …
  const pos = index % 4;
  return pos === 0 || pos === 3 ? CARD_HEIGHT_TALL : CARD_HEIGHT_SHORT;
}

function formatAge(dateValue) {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const day = 86400000;
  if (diff >= 365 * day) return `${Math.max(1, Math.floor(diff / (365 * day)))}y`;
  if (diff >= 30 * day) return `${Math.max(1, Math.floor(diff / (30 * day)))}m`;
  return "";
}

function formatLocation(pet) {
  return [pet?.owner?.city, pet?.owner?.country].filter(Boolean).join(", ");
}

function formatMeta(pet) {
  const type = pet?.type || "Pet";
  const breed = pet?.breed || "Unknown";
  return `${type} \u2022 ${breed}`;
}

export default function MeetCard({ pet, index = 0, isLastInRow }) {
  if (!pet) return null;

  const petId = pet?._id || pet?.id;
  const age = formatAge(pet?.date);
  const location = formatLocation(pet);
  const cardHeight = getCardHeight(index);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      style={[
        styles.wrapper,
        { height: cardHeight },
        isLastInRow && styles.lastInRow,
      ]}
      onPress={() => petId && router.push(`/pet/${petId}`)}
    >
      <View style={styles.card}>
        <Image
          source={{
            uri: pet?.image || "https://via.placeholder.com/400x600.png?text=Pet",
          }}
          style={styles.image}
          resizeMode="cover"
        />

        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.28)", "rgba(0,0,0,0.85)"]}
          locations={[0.3, 0.62, 1]}
          style={styles.overlay}
        />

        {/* Shield badge – top right */}
        <View style={styles.badge}>
          <Ionicons name="shield-checkmark" size={13} color="#FFFFFF" />
        </View>

        {/* Age pill – bottom right */}
        {!!age && (
          <View style={styles.agePill}>
            <ThemedText style={styles.ageText}>{age}</ThemedText>
          </View>
        )}

        {/* Info block – bottom left */}
        <View style={[styles.info, !!age && styles.infoWithAge]}>
          <ThemedText style={styles.name} numberOfLines={1}>
            {pet?.name || "Unnamed"}
          </ThemedText>

          <ThemedText style={styles.meta} numberOfLines={1}>
            {formatMeta(pet)}
          </ThemedText>

          {!!location && (
            <View style={styles.locationRow}>
              <Ionicons
                name="location-outline"
                size={12}
                color="rgba(255,255,255,0.88)"
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
}

const styles = StyleSheet.create({
  wrapper: {
    width: CARD_WIDTH,
    marginRight: CARD_GAP,
    marginBottom: 12,
  },
  lastInRow: {
    marginRight: 0,
  },
  card: {
    flex: 1,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#D8E6DC",
    shadowColor: "#183125",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
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
    height: "65%",
  },
  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
  },
  agePill: {
    position: "absolute",
    right: 10,
    bottom: 10,
    minWidth: 34,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  ageText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  info: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
  },
  infoWithAge: {
    right: 52,
  },
  name: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  meta: {
    marginTop: 2,
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
  },
  locationRow: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  locationText: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 11,
    flex: 1,
  },
});
