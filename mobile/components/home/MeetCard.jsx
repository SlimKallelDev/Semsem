import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Dimensions, Image, StyleSheet, TouchableOpacity, View } from "react-native";

import ThemedText from "../ThemedText";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_GAP = 14;
const HORIZONTAL_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;
const CARD_HEIGHT = 286;
const GREEN = "#3DB85C";

function formatAge(dateValue) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const day = 24 * 60 * 60 * 1000;
  const year = 365 * day;
  const month = 30 * day;

  if (diff >= year) {
    return `${Math.max(1, Math.floor(diff / year))}y`;
  }

  if (diff >= month) {
    return `${Math.max(1, Math.floor(diff / month))}m`;
  }

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

export default function MeetCard({ pet, isLastInRow }) {
  if (!pet) return null;

  const petId = pet?._id || pet?.id;
  const age = formatAge(pet?.date);
  const location = formatLocation(pet);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      style={[styles.wrapper, isLastInRow && styles.lastInRow]}
      onPress={() => {
        if (petId) {
          router.push(`/pet/${petId}`);
        }
      }}
    >
      <View style={styles.card}>
        <Image
          source={{
            uri: pet?.image || "https://via.placeholder.com/400x400.png?text=Pet",
          }}
          style={styles.image}
        />

        <LinearGradient
          colors={["rgba(0,0,0,0.02)", "rgba(0,0,0,0.72)"]}
          style={styles.overlay}
        />

        <View style={styles.cornerBadge}>
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
        </View>

        {!!age && (
          <View style={styles.ageBadge}>
            <ThemedText style={styles.ageText}>{age}</ThemedText>
          </View>
        )}

        <View style={styles.info}>
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
}

const styles = StyleSheet.create({
  wrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginRight: CARD_GAP,
    marginBottom: 18,
  },
  lastInRow: {
    marginRight: 0,
  },
  card: {
    flex: 1,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: "#E2EAE4",
    shadowColor: "#183125",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 5,
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
    height: "60%",
  },
  cornerBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  ageBadge: {
    position: "absolute",
    right: 12,
    bottom: 12,
    minWidth: 42,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  ageText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  info: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    paddingRight: 42,
  },
  name: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
  },
  meta: {
    marginTop: 4,
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
  },
  locationRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    marginLeft: 4,
    color: "rgba(255,255,255,0.92)",
    fontSize: 12,
    flex: 1,
  },
});
