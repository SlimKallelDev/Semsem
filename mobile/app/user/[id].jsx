import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppTopBar from "../../components/AppTopBar";
import ThemedText from "../../components/ThemedText";
import { useUser } from "../../contexts/UserContext";
import {
  formatUserTypeAndRating,
  formatUserTypeRatingWithCount,
  isVeterinaryUser,
} from "../../constants/userDisplay";
import { isServiceProviderProfileType } from "../../constants/profileTypes";
import { startConversation } from "../../services/messageService";
import { getPetsByOwner } from "../../services/petService";
import { getPostsByUser } from "../../services/postService";
import { getUser, getUserReviews } from "../../services/userService";

const PLACEHOLDER_AVATAR = "https://via.placeholder.com/300x300.png?text=User";
const PLACEHOLDER_CARD_IMAGE =
  "https://via.placeholder.com/180x130.png?text=Semsem";

const readParam = (value) => {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
};

const getEntityId = (value) => {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  return value?._id || value?.id || value?.$id || null;
};

const getDisplayName = (person) => {
  const explicit = String(
    person?.name || person?.fullName || person?.username || ""
  ).trim();

  if (explicit) return explicit;

  const first = String(person?.firstName || "").trim();
  const last = String(person?.lastName || "").trim();
  const full = [first, last].filter(Boolean).join(" ");

  return full || person?.email || "Semsem user";
};

const formatMemberSince = (dateValue) => {
  if (!dateValue) return "Unknown";

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return "Unknown";

  return parsed.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

const formatLocation = (item) => {
  return [item?.location?.governorate || item?.location?.city, item?.location?.country]
    .filter(Boolean)
    .join(", ");
};

const toTypeLabel = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

const clampRating = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  if (parsed <= 0) return 0;
  if (parsed >= 5) return 5;
  return Math.round(parsed * 10) / 10;
};

export default function PublicUserProfileScreen() {
  const { id: rawId, refreshAt: rawRefreshAt } = useLocalSearchParams();
  const { user } = useUser();

  const profileId = readParam(rawId);
  const refreshAt = readParam(rawRefreshAt);

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [pets, setPets] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatStarting, setChatStarting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!profileId) {
      setError("User not found");
      setLoading(false);
      return;
    }

    let active = true;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const [userData, postsData, petsData, reviewsData] = await Promise.all([
          getUser(profileId),
          getPostsByUser(profileId).catch(() => []),
          getPetsByOwner(profileId).catch(() => []),
          getUserReviews(profileId).catch(() => []),
        ]);

        if (!active) return;

        setProfile(userData || null);
        setPosts(Array.isArray(postsData) ? postsData : []);
        setPets(Array.isArray(petsData) ? petsData : []);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      } catch (loadError) {
        if (!active) return;
        setError(loadError?.message || "Unable to load user profile");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [profileId, refreshAt]);

  const name = useMemo(() => getDisplayName(profile), [profile]);
  const avatarUri = profile?.avatar || profile?.image || PLACEHOLDER_AVATAR;
  const postCount = posts.length;
  const petCount = pets.length;
  const currentUserId = getEntityId(user);
  const viewedUserId = getEntityId(profile) || profileId;
  const isOwnProfile =
    !!currentUserId &&
    !!viewedUserId &&
    String(currentUserId) === String(viewedUserId);
  const canRequestAppointment =
    !isOwnProfile && isServiceProviderProfileType(profile?.profileType);
  const location =
    [profile?.governorate || profile?.city, profile?.country]
      .filter(Boolean)
      .join(", ") ||
    "Location not shared";
  const bio = String(profile?.bio || "").trim() || "No bio available yet.";
  const memberSince = formatMemberSince(profile?.createdAt);
  const profileTypeAndRating = formatUserTypeRatingWithCount(profile);
  const isVeterinaryProfile = isVeterinaryUser(profile);
  const ratingAverage = clampRating(profile?.ratingAverage);
  const ratingCount = Math.max(0, Math.floor(Number(profile?.ratingCount) || 0));

  const latestReview = reviews[0] || null;
  const myReview = useMemo(() => {
    return (
      reviews.find((item) => {
        const reviewerId = getEntityId(item?.reviewer);
        return (
          !!reviewerId &&
          !!currentUserId &&
          String(reviewerId) === String(currentUserId)
        );
      }) || null
    );
  }, [reviews, currentUserId]);

  const handleStartChat = async () => {
    if (!viewedUserId) return;

    if (!currentUserId) {
      router.push("/(auth)/login");
      return;
    }

    if (isOwnProfile) return;

    try {
      setChatStarting(true);

      const conversation = await startConversation({
        user1: currentUserId,
        user2: viewedUserId,
      });

      const conversationId = getEntityId(conversation);
      if (!conversationId) {
        throw new Error("Conversation not created");
      }

      router.push(`/messages/${conversationId}`);
    } catch (errorMessage) {
      setError(errorMessage?.message || "Failed to start chat");
    } finally {
      setChatStarting(false);
    }
  };

  const handleOpenAppointmentRequest = () => {
    if (!viewedUserId || isOwnProfile) return;

    if (!currentUserId) {
      router.push("/(auth)/login");
      return;
    }

    router.push({
      pathname: "/appointment/request",
      params: { providerId: viewedUserId },
    });
  };

  const handleOpenAddReview = () => {
    if (!viewedUserId || isOwnProfile) return;

    if (!currentUserId) {
      router.push("/(auth)/login");
      return;
    }

    router.push({
      pathname: "/user/add-review",
      params: {
        userId: viewedUserId,
        returnTo: "profile",
      },
    });
  };

  const handleOpenAllReviews = () => {
    if (!viewedUserId) return;
    router.push({
      pathname: "/user/reviews",
      params: {
        userId: viewedUserId,
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <AppTopBar title="Profile" />
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#3DB85C" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppTopBar title="Profile" />

      <ScrollView contentContainerStyle={styles.content}>
        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={18} color="#D64A5C" />
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <Image source={{ uri: avatarUri }} style={styles.avatar} />

          <ThemedText style={styles.name} numberOfLines={2}>
            {name}
          </ThemedText>

          <ThemedText style={styles.email} numberOfLines={1}>
            {profile?.email || ""}
          </ThemedText>

          <ThemedText
            style={[
              styles.typeRatingText,
              isVeterinaryProfile && styles.typeRatingTextVeterinary,
            ]}
            numberOfLines={1}
          >
            {profileTypeAndRating}
          </ThemedText>

          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Ionicons name="location-outline" size={14} color="#3E8F57" />
              <ThemedText style={styles.metaPillText} numberOfLines={1}>
                {location}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{postCount}</ThemedText>
            <ThemedText style={styles.statLabel}>Posts</ThemedText>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{petCount}</ThemedText>
            <ThemedText style={styles.statLabel}>Pets</ThemedText>
          </View>
        </View>

        {!isOwnProfile ? (
          <TouchableOpacity
            style={[styles.chatButton, chatStarting && styles.chatButtonDisabled]}
            activeOpacity={0.88}
            onPress={handleStartChat}
            disabled={chatStarting}
          >
            {chatStarting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={18}
                  color="#FFFFFF"
                />
                <ThemedText style={styles.chatButtonText}>Message</ThemedText>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        {canRequestAppointment ? (
          <TouchableOpacity
            style={styles.appointmentButton}
            activeOpacity={0.88}
            onPress={handleOpenAppointmentRequest}
          >
            <Ionicons name="calendar-outline" size={18} color="#227B3E" />
            <ThemedText style={styles.appointmentButtonText}>
              Request Appointment
            </ThemedText>
          </TouchableOpacity>
        ) : null}

        <View style={styles.sectionCard}>
          <ThemedText style={styles.sectionTitle}>About</ThemedText>
          <ThemedText style={styles.sectionText}>{bio}</ThemedText>
        </View>

        <View style={styles.sectionCard}>
          <ThemedText style={styles.sectionTitle}>Member Since</ThemedText>
          <ThemedText style={styles.sectionText}>{memberSince}</ThemedText>
        </View>

        <View style={styles.sectionCard}>
          <ThemedText style={styles.sectionTitle}>Reviews</ThemedText>

          <View style={styles.reviewSummaryRow}>
            <ThemedText style={styles.reviewSummaryValue}>
              {`${ratingAverage.toFixed(1)}\u2605`}
            </ThemedText>
            <ThemedText style={styles.reviewSummaryMeta}>
              {ratingCount} review{ratingCount === 1 ? "" : "s"}
            </ThemedText>
          </View>

          {latestReview ? (
            <View style={styles.reviewCard}>
              <View style={styles.reviewCardHeader}>
                <ThemedText style={styles.reviewAuthorName} numberOfLines={1}>
                  {getDisplayName(latestReview?.reviewer)}
                </ThemedText>
                <ThemedText style={styles.reviewRatingText}>
                  {`${(Number(latestReview?.rating) || 0).toFixed(1)}\u2605`}
                </ThemedText>
              </View>

              <ThemedText
                style={[
                  styles.reviewAuthorMeta,
                  isVeterinaryUser(latestReview?.reviewer) &&
                    styles.reviewAuthorMetaVeterinary,
                ]}
                numberOfLines={1}
              >
                {formatUserTypeAndRating(latestReview?.reviewer)}
              </ThemedText>

              <ThemedText style={styles.reviewText} numberOfLines={3}>
                {String(latestReview?.review || "").trim() || "No review text."}
              </ThemedText>
            </View>
          ) : (
            <View style={styles.emptyReviewsCard}>
              <ThemedText style={styles.emptyListText}>No reviews yet.</ThemedText>
            </View>
          )}

          <View style={styles.reviewButtonsRow}>
            {!isOwnProfile ? (
              <TouchableOpacity
                style={styles.reviewPrimaryButton}
                activeOpacity={0.88}
                onPress={handleOpenAddReview}
              >
                <ThemedText style={styles.reviewPrimaryButtonText}>
                  {myReview ? "Edit Review" : "Add Review"}
                </ThemedText>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[
                styles.reviewSecondaryButton,
                !isOwnProfile && styles.reviewSecondaryButtonCompact,
              ]}
              activeOpacity={0.88}
              onPress={handleOpenAllReviews}
            >
              <ThemedText style={styles.reviewSecondaryButtonText}>
                See All Reviews
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.listSection}>
          <ThemedText style={styles.listTitle}>Pets ({petCount})</ThemedText>

          {petCount === 0 ? (
            <View style={styles.emptyListCard}>
              <ThemedText style={styles.emptyListText}>
                No pets published yet.
              </ThemedText>
            </View>
          ) : (
            pets.map((pet, index) => {
              const petId = getEntityId(pet);
              const petImage = pet?.image || PLACEHOLDER_CARD_IMAGE;
              const petLocation = formatLocation(pet);
              const subtitle =
                [pet?.type, pet?.breed].filter(Boolean).join(" \u2022 ") || "Pet";

              return (
                <TouchableOpacity
                  key={petId || `${pet?.name || "pet"}-${index}`}
                  style={styles.listItemCard}
                  activeOpacity={0.88}
                  disabled={!petId}
                  onPress={() => petId && router.push(`/pet/${petId}`)}
                >
                  <Image source={{ uri: petImage }} style={styles.listItemImage} />

                  <View style={styles.listItemContent}>
                    <ThemedText style={styles.listItemTitle} numberOfLines={1}>
                      {pet?.name || "Unnamed pet"}
                    </ThemedText>

                    <ThemedText style={styles.listItemSubtitle} numberOfLines={1}>
                      {subtitle}
                    </ThemedText>

                    {!!petLocation && (
                      <ThemedText style={styles.listItemMeta} numberOfLines={1}>
                        {petLocation}
                      </ThemedText>
                    )}
                  </View>

                  <Ionicons name="chevron-forward" size={18} color="#8E9A93" />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.listSection}>
          <ThemedText style={styles.listTitle}>Posts ({postCount})</ThemedText>

          {postCount === 0 ? (
            <View style={styles.emptyListCard}>
              <ThemedText style={styles.emptyListText}>
                No posts published yet.
              </ThemedText>
            </View>
          ) : (
            posts.map((post, index) => {
              const postId = getEntityId(post);
              const postImage = post?.image || PLACEHOLDER_CARD_IMAGE;
              const postLocation = formatLocation(post);
              const postType = toTypeLabel(post?.type || "Post");

              return (
                <TouchableOpacity
                  key={postId || `${post?.title || "post"}-${index}`}
                  style={styles.listItemCard}
                  activeOpacity={0.88}
                  disabled={!postId}
                  onPress={() => postId && router.push(`/post/${postId}`)}
                >
                  <Image source={{ uri: postImage }} style={styles.listItemImage} />

                  <View style={styles.listItemContent}>
                    <View style={styles.postBadge}>
                      <ThemedText style={styles.postBadgeText}>{postType}</ThemedText>
                    </View>

                    <ThemedText style={styles.listItemTitle} numberOfLines={1}>
                      {post?.title || "Untitled post"}
                    </ThemedText>

                    <ThemedText style={styles.listItemSubtitle} numberOfLines={1}>
                      {toTypeLabel(post?.pet_type || "Pet")}
                    </ThemedText>

                    {!!postLocation && (
                      <ThemedText style={styles.listItemMeta} numberOfLines={1}>
                        {postLocation}
                      </ThemedText>
                    )}
                  </View>

                  <Ionicons name="chevron-forward" size={18} color="#8E9A93" />
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 32,
    gap: 12,
  },
  errorCard: {
    borderWidth: 1,
    borderColor: "#F2C6CD",
    backgroundColor: "#FFF4F6",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: "#B73A4D",
    fontSize: 13,
    fontWeight: "600",
  },
  heroCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6ECE8",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 18,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#E8ECE8",
  },
  name: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: "800",
    color: "#17201A",
    textAlign: "center",
  },
  email: {
    marginTop: 3,
    fontSize: 13,
    color: "#748079",
  },
  typeRatingText: {
    marginTop: 5,
    fontSize: 13.5,
    color: "#5E6A63",
    fontWeight: "700",
  },
  typeRatingTextVeterinary: {
    color: "#197B57",
  },
  metaRow: {
    marginTop: 12,
    width: "100%",
    alignItems: "center",
  },
  metaPill: {
    maxWidth: "100%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#EBF8EF",
    borderWidth: 1,
    borderColor: "#D9EEDF",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaPillText: {
    fontSize: 12.5,
    color: "#336B45",
    fontWeight: "600",
  },
  statsCard: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E6ECE8",
    paddingVertical: 14,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E6ECE8",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#17201A",
  },
  statLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: "#758079",
  },
  chatButton: {
    height: 50,
    borderRadius: 15,
    backgroundColor: "#3DB85C",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: "#3DB85C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  chatButtonDisabled: {
    opacity: 0.78,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  appointmentButton: {
    height: 50,
    borderRadius: 15,
    borderWidth: 1.2,
    borderColor: "#CFE8D6",
    backgroundColor: "#F1FBF3",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  appointmentButtonText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#227B3E",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E6ECE8",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#18221B",
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 14,
    color: "#3D4741",
    lineHeight: 20,
  },
  reviewSummaryRow: {
    marginTop: 2,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  reviewSummaryValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#17211A",
  },
  reviewSummaryMeta: {
    fontSize: 12.5,
    color: "#77837C",
    fontWeight: "600",
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: "#E5ECE8",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    padding: 10,
  },
  reviewCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  reviewAuthorName: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: "800",
    color: "#17211A",
  },
  reviewAuthorMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#75817A",
    fontWeight: "600",
  },
  reviewAuthorMetaVeterinary: {
    color: "#197B57",
  },
  reviewRatingText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#D0891D",
  },
  reviewText: {
    marginTop: 6,
    fontSize: 13.5,
    lineHeight: 19,
    color: "#415048",
  },
  emptyReviewsCard: {
    borderWidth: 1,
    borderColor: "#E4ECE7",
    borderRadius: 12,
    backgroundColor: "#FAFCFB",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  reviewButtonsRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  reviewPrimaryButton: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#3DB85C",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewPrimaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },
  reviewSecondaryButton: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D6E1DA",
    backgroundColor: "#F8FCF9",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  reviewSecondaryButtonCompact: {
    flex: 1,
  },
  reviewSecondaryButtonText: {
    color: "#365647",
    fontWeight: "700",
    fontSize: 13,
  },
  listSection: {
    gap: 10,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#18221B",
    marginTop: 2,
  },
  emptyListCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6ECE8",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  emptyListText: {
    fontSize: 14,
    color: "#6E7A74",
    fontWeight: "600",
  },
  listItemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6ECE8",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  listItemImage: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: "#E8ECE8",
  },
  listItemContent: {
    flex: 1,
    minWidth: 0,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#17211A",
  },
  listItemSubtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "600",
    color: "#5F6C64",
  },
  listItemMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#7E8A84",
  },
  postBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#EBF8EF",
    borderWidth: 1,
    borderColor: "#D9EEDF",
    marginBottom: 4,
  },
  postBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#327747",
  },
});

