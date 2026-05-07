import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";

import ThemedText from "../ThemedText";

const CARD_HEIGHT_TALL = 240;
const CARD_HEIGHT_MEDIUM = 212;
const CARD_HEIGHT_SHORT = 170;
const GREEN = "#3DB85C";

function getCardHeight(index) {
  const pattern = [
    CARD_HEIGHT_TALL,
    CARD_HEIGHT_SHORT,
    CARD_HEIGHT_MEDIUM,
    CARD_HEIGHT_TALL + 10,
    CARD_HEIGHT_MEDIUM,
    CARD_HEIGHT_MEDIUM,
  ];

  return pattern[index % pattern.length];
}

function formatAge(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  const diff = Date.now() - date.getTime();
  const day = 86400000;

  if (diff >= 365 * day) {
    return `${Math.max(1, Math.floor(diff / (365 * day)))}y`;
  }

  if (diff >= 30 * day) {
    return `${Math.max(1, Math.floor(diff / (30 * day)))}m`;
  }

  return "";
}

function formatLocation(pet) {
  if (typeof pet?.location === "string") {
    return pet.location.trim();
  }

  const governorate =
    pet?.location?.governorate ||
    pet?.location?.city ||
    pet?.owner?.governorate ||
    pet?.owner?.city ||
    "";
  const country = pet?.location?.country || pet?.owner?.country || "";

  return [governorate, country].filter(Boolean).join(", ");
}

function titleCase(value) {
  const text = String(value || "").trim();

  if (!text) return "";

  return text
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function formatMeta(pet) {
  const type = titleCase(pet?.type) || "Pet";
  const breed = titleCase(pet?.breed);

  return [type, breed].filter(Boolean).join(" \u00b7 ");
}

function formatDescription(pet) {
  return formatMeta(pet);
}

export default function MeetCard({ pet, index = 0 }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!pet) return null;

  const petId = pet?._id || pet?.id;
  const age = formatAge(pet?.date);
  const location = formatLocation(pet);
  const description = formatDescription(pet);
  const cardHeight = getCardHeight(index);
  const imageUri = pet?.image;
  const isSynthetic = Boolean(pet?.isSynthetic);
  const hasImage = Boolean(imageUri) && !imageFailed && !isSynthetic;
  const isTall = cardHeight >= CARD_HEIGHT_TALL;
  const isShort = cardHeight <= CARD_HEIGHT_SHORT;

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      style={[styles.wrapper, { height: cardHeight }]}
      onPress={() => !isSynthetic && petId && router.push(`/pet/${petId}`)}
      disabled={isSynthetic}
    >
      <View style={styles.card}>
        {hasImage ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <LinearGradient
            colors={
              isSynthetic
                ? ["#DFF7E8", "#82D88D", "#14914D"]
                : ["#DDF4E5", "#75CF83", "#16783E"]
            }
            style={styles.fallbackImage}
          >
            <Ionicons
              name={isSynthetic ? "sparkles" : "paw"}
              size={42}
              color="rgba(255,255,255,0.82)"
            />
          </LinearGradient>
        )}

        <View style={styles.badge}>
          <Ionicons name="shield-checkmark" size={13} color="#FFFFFF" />
        </View>

        <View
          style={[
            styles.infoPanel,
            isTall && styles.infoPanelTall,
            isShort && styles.infoPanelShort,
          ]}
        >
          <View style={styles.info}>
            <ThemedText
              style={[styles.name, isTall && styles.nameTall]}
              numberOfLines={1}
            >
              {pet?.name || "Unnamed"}
            </ThemedText>

            <ThemedText
              style={[styles.description, isTall && styles.descriptionTall]}
              numberOfLines={1}
            >
              {description}
            </ThemedText>

            {!!location && (
              <View style={styles.locationRow}>
                <Ionicons
                  name="location-outline"
                  size={13}
                  color="rgba(255,255,255,0.88)"
                />
                <ThemedText style={styles.locationText} numberOfLines={1}>
                  {location}
                </ThemedText>
              </View>
            )}
          </View>

          {!!age && (
            <View style={styles.agePill}>
              <ThemedText style={styles.ageText}>{age}</ThemedText>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    marginBottom: 12,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#D8E6DC",
    borderWidth: 1,
    borderColor: "#E8EEEA",
    shadowColor: "#183125",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  fallbackImage: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
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
    alignSelf: "flex-end",
    minWidth: 38,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    marginLeft: 8,
  },
  ageText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  infoPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(42, 46, 43, 0.56)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.14)",
  },
  infoPanelTall: {
    paddingTop: 14,
    paddingBottom: 13,
  },
  infoPanelShort: {
    paddingTop: 9,
    paddingBottom: 9,
  },
  name: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0,
  },
  nameTall: {
    fontSize: 20,
  },
  description: {
    marginTop: 3,
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
  },
  descriptionTall: {
    fontSize: 15,
  },
  locationRow: {
    marginTop: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  locationText: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 13,
    flex: 1,
  },
});

