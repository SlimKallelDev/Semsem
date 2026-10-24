import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { PROFILE_TYPES, getProfileTypeLabel, normalizeProfileType } from "../../constants/profileTypes";
import {
  formatUserTypeRatingWithCount,
  getUserRatingAverage,
  getUserRatingCount,
} from "../../constants/userDisplay";
import { normalizeLocationKey } from "../../constants/governorates";
import { useLocationFilter } from "../../contexts/LocationFilterContext";
import { useUser } from "../../contexts/UserContext";
import { startConversation } from "../../services/messageService";
import { getUsers } from "../../services/userService";
import ThemedText from "../ThemedText";

const GREEN = "#3DB85C";
const GREEN_DARK = "#227B3E";
/** Same as MeetGrid masonry top inset + Meet card vertical rhythm */
const CARD_SECTION_PADDING_TOP = 12;
const SERVICE_TYPES = PROFILE_TYPES.filter((item) => item.value !== "pet_owner");
const PLACEHOLDER_AVATAR = "https://via.placeholder.com/240x240.png?text=Semsem";

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

const getEntityId = (value) => {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  return value?._id || value?.id || value?.userId || value?.$id || null;
};

const getDisplayName = (person) => {
  const explicit = String(person?.name || person?.fullName || "").trim();
  return explicit || person?.email || "Semsem provider";
};

const getLocationText = (provider) =>
  [provider?.country, provider?.governorate || provider?.city]
    .filter(Boolean)
    .join(", ");

const locationPartMatches = (providerValue, filterValue) => {
  const providerKey = normalizeLocationKey(providerValue);
  const filterKey = normalizeLocationKey(filterValue);

  if (!filterKey) return true;
  if (!providerKey) return false;

  return providerKey === filterKey || providerKey.includes(filterKey);
};

const providerMatchesLocation = (provider, filters) => {
  return (
    locationPartMatches(provider?.country, filters?.country) &&
    locationPartMatches(provider?.governorate || provider?.city, filters?.governorate)
  );
};

const getProviderIcon = (profileType) => {
  return SERVICE_ICON[normalizeProfileType(profileType)] || "briefcase";
};

function ServicesEmptyState({ hasProviders }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name={hasProviders ? "location-outline" : "briefcase-outline"}
          size={30}
          color={GREEN}
        />
      </View>
      <ThemedText style={styles.emptyTitle}>
        {hasProviders ? "No services in this area" : "No service providers yet"}
      </ThemedText>
      <ThemedText style={styles.emptyText}>
        {hasProviders
          ? "Try another service type or change the location filter."
          : "Service providers will appear here when they create a profile."}
      </ThemedText>
    </View>
  );
}

export default function ServicesDirectory({ selectedType = "all" }) {
  const { user } = useUser();
  const { filters } = useLocationFilter();
  const currentUserId = getEntityId(user);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chatStartingId, setChatStartingId] = useState(null);
  const [error, setError] = useState(null);

  const loadProviders = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);
      const data = await getUsers();
      setProviders(Array.isArray(data) ? data : []);
    } catch (loadError) {
      console.log("Load services error:", loadError?.message || loadError);
      setError("Unable to load service providers.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProviders();
    }, [loadProviders])
  );

  const serviceProviders = useMemo(() => {
    const serviceTypeValues = new Set(SERVICE_TYPES.map((item) => item.value));

    return providers.filter((provider) => {
      const providerId = getEntityId(provider);
      const profileType = normalizeProfileType(provider?.profileType);
      const isSelf =
        providerId && currentUserId && String(providerId) === String(currentUserId);

      return serviceTypeValues.has(profileType) && !isSelf;
    });
  }, [currentUserId, providers]);

  const filteredProviders = useMemo(() => {
    return serviceProviders
      .filter((provider) => {
        const profileType = normalizeProfileType(provider?.profileType);
        return selectedType === "all" || profileType === selectedType;
      })
      .filter((provider) => providerMatchesLocation(provider, filters))
      .sort((a, b) => {
        const ratingDiff = getUserRatingAverage(b) - getUserRatingAverage(a);
        if (ratingDiff !== 0) return ratingDiff;
        return getUserRatingCount(b) - getUserRatingCount(a);
      });
  }, [filters, selectedType, serviceProviders]);

  const handleOpenProfile = (provider) => {
    const providerId = getEntityId(provider);
    if (providerId) {
      router.push(`/user/${providerId}`);
    }
  };

  const handleStartChat = async (provider) => {
    const providerId = getEntityId(provider);
    if (!providerId) return;

    if (!currentUserId) {
      router.push("/(auth)/login");
      return;
    }

    try {
      setChatStartingId(providerId);

      const conversation = await startConversation({
        user1: currentUserId,
        user2: providerId,
      });
      const conversationId = getEntityId(conversation);

      if (!conversationId) {
        throw new Error("Conversation not created");
      }

      router.push(`/messages/${conversationId}`);
    } catch (chatError) {
      console.log("Start service chat error:", chatError?.message || chatError);
      setError(chatError?.message || "Failed to start a discussion.");
    } finally {
      setChatStartingId(null);
    }
  };

  const handleRequestAppointment = async (provider) => {
    const providerId = getEntityId(provider);
    if (!providerId) return;

    if (!currentUserId) {
      router.push("/(auth)/login");
      return;
    }

    router.push({
      pathname: "/appointment/request",
      params: { providerId },
    });
  };

  const renderHeader = () =>
    error ? (
      <View style={styles.headerBlock}>
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={16} color="#C54A4A" />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      </View>
    ) : null;

  const renderProvider = ({ item }) => {
    const providerId = getEntityId(item);
    const profileType = normalizeProfileType(item?.profileType);
    const avatarUri = item?.avatar || item?.image || PLACEHOLDER_AVATAR;
    const location = getLocationText(item);
    const bio = String(item?.bio || "").trim();
    const isChatStarting = chatStartingId && String(chatStartingId) === String(providerId);
    return (
      <View style={styles.providerCard}>
        <TouchableOpacity
          style={styles.providerTop}
          activeOpacity={0.86}
          disabled={!providerId}
          onPress={() => handleOpenProfile(item)}
        >
          <View style={styles.avatarButton}>
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
            <View style={styles.avatarBadge}>
              <MaterialCommunityIcons
                name={getProviderIcon(profileType)}
                size={14}
                color="#FFFFFF"
              />
            </View>
          </View>

          <View style={styles.providerInfo}>
            <ThemedText style={styles.providerName} numberOfLines={1}>
              {getDisplayName(item)}
            </ThemedText>
            <ThemedText style={styles.providerType} numberOfLines={1}>
              {formatUserTypeRatingWithCount(item)}
            </ThemedText>

            {!!location && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={13} color="#3E8F57" />
                <ThemedText style={styles.locationText} numberOfLines={1}>
                  {location}
                </ThemedText>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.serviceTagRow}>
          <View style={styles.serviceTag}>
            <MaterialCommunityIcons
              name={getProviderIcon(profileType)}
              size={14}
              color={GREEN_DARK}
            />
            <ThemedText style={styles.serviceTagText}>
              {getProfileTypeLabel(profileType)}
            </ThemedText>
          </View>
        </View>

        <ThemedText style={styles.providerBio} numberOfLines={2}>
          {bio || "Open this profile to discover their services, ratings, and posts."}
        </ThemedText>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.profileButton}
            activeOpacity={0.88}
            onPress={() => handleOpenProfile(item)}
          >
            <ThemedText style={styles.profileButtonText}>View Profile</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.messageButton, isChatStarting && styles.messageButtonDisabled]}
            activeOpacity={0.88}
            onPress={() => handleStartChat(item)}
            disabled={Boolean(isChatStarting)}
          >
            {isChatStarting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color="#FFFFFF" />
              <ThemedText style={styles.messageButtonText}>Discuss</ThemedText>
            </>
          )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.appointmentButton}
          activeOpacity={0.88}
          onPress={() => handleRequestAppointment(item)}
        >
          <Ionicons name="calendar-outline" size={16} color={GREEN_DARK} />
          <ThemedText style={styles.appointmentButtonText}>
            Request appointment
          </ThemedText>
          <ThemedText style={styles.appointmentButtonHint}>
            date + pets
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading && providers.length === 0) {
    return (
      <View style={styles.center}>
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color={GREEN} />
          <ThemedText style={styles.stateText}>Loading services...</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={filteredProviders}
      keyExtractor={(item, index) => (getEntityId(item) || index).toString()}
      renderItem={renderProvider}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={
        <ServicesEmptyState hasProviders={serviceProviders.length > 0} />
      }
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadProviders(true)}
          tintColor={GREEN}
        />
      }
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    backgroundColor: "#F4F6F4",
    paddingTop: CARD_SECTION_PADDING_TOP,
    paddingBottom: 112,
  },
  headerBlock: {
    backgroundColor: "#F4F6F4",
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  errorCard: {
    marginTop: CARD_SECTION_PADDING_TOP,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F0C9C9",
    backgroundColor: "#FFF5F5",
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  errorText: {
    flex: 1,
    color: "#A83E3E",
    fontSize: 12.5,
    fontWeight: "700",
  },
  providerCard: {
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2ECE6",
    backgroundColor: "#FFFFFF",
    padding: 14,
    shadowColor: "#173423",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  providerTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarButton: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: "#E7ECE8",
  },
  avatarBadge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: GREEN,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  providerInfo: {
    flex: 1,
    minWidth: 0,
  },
  providerName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#162019",
  },
  providerType: {
    marginTop: 3,
    fontSize: 12.5,
    fontWeight: "700",
    color: "#68766E",
  },
  locationRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    color: "#3E8F57",
    fontWeight: "700",
  },
  serviceTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 13,
  },
  serviceTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "#EFF9F2",
    borderWidth: 1,
    borderColor: "#D9EEDF",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  serviceTagText: {
    color: GREEN_DARK,
    fontSize: 12,
    fontWeight: "900",
  },
  providerBio: {
    marginTop: 11,
    color: "#52605A",
    fontSize: 13.5,
    lineHeight: 20,
  },
  actionsRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 9,
  },
  profileButton: {
    flex: 1,
    height: 44,
    borderRadius: 15,
    borderWidth: 1.2,
    borderColor: "#D6E2DB",
    backgroundColor: "#FAFCFA",
    alignItems: "center",
    justifyContent: "center",
  },
  profileButtonText: {
    color: "#314A3B",
    fontSize: 13.5,
    fontWeight: "900",
  },
  messageButton: {
    flex: 1,
    height: 44,
    borderRadius: 15,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  messageButtonDisabled: {
    opacity: 0.75,
  },
  messageButtonText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "900",
  },
  appointmentButton: {
    marginTop: 9,
    height: 44,
    borderRadius: 15,
    borderWidth: 1.2,
    borderColor: "#CFE8D6",
    backgroundColor: "#F1FBF3",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
  },
  appointmentButtonText: {
    color: GREEN_DARK,
    fontSize: 13.5,
    fontWeight: "900",
  },
  appointmentButtonHint: {
    color: "#6E7B74",
    fontSize: 10.5,
    fontWeight: "700",
  },
  emptyState: {
    marginHorizontal: 14,
    marginTop: CARD_SECTION_PADDING_TOP,
    marginBottom: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2ECE6",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 26,
    paddingVertical: 36,
    alignItems: "center",
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: "#EAF8EE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#17211A",
    textAlign: "center",
  },
  emptyText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: "#718078",
    textAlign: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F6F4",
    paddingHorizontal: 24,
  },
  stateCard: {
    minWidth: 220,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2ECE6",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: "center",
  },
  stateText: {
    marginTop: 10,
    color: "#66736B",
    fontSize: 14,
    fontWeight: "700",
  },
});
