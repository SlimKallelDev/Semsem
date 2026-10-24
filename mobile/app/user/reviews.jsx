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
import { getUser, getUserReviews } from "../../services/userService";

const PLACEHOLDER_AVATAR = "https://via.placeholder.com/300x300.png?text=User";

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

const clampRating = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  if (parsed <= 0) return 0;
  if (parsed >= 5) return 5;
  return Math.round(parsed * 10) / 10;
};

const formatDate = (dateValue) => {
  if (!dateValue) return "";
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function UserReviewsScreen() {
  const { user } = useUser();
  const { userId: rawUserId, refreshAt: rawRefreshAt } = useLocalSearchParams();
  const userId = readParam(rawUserId);
  const refreshAt = readParam(rawRefreshAt);

  const [targetUser, setTargetUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentUserId = getEntityId(user);
  const targetUserId = getEntityId(targetUser) || userId;
  const isOwnProfile =
    !!currentUserId &&
    !!targetUserId &&
    String(currentUserId) === String(targetUserId);

  useEffect(() => {
    if (!userId) {
      setError("User not found");
      setLoading(false);
      return;
    }

    let active = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [profileData, reviewsData] = await Promise.all([
          getUser(userId),
          getUserReviews(userId).catch(() => []),
        ]);

        if (!active) return;

        setTargetUser(profileData || null);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      } catch (loadError) {
        if (!active) return;
        setError(loadError?.message || "Unable to load reviews");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [userId, refreshAt]);

  const summaryText = formatUserTypeRatingWithCount(targetUser);
  const name = getDisplayName(targetUser);
  const ratingAverage = clampRating(targetUser?.ratingAverage);
  const ratingCount = Math.max(
    0,
    Math.floor(Number(targetUser?.ratingCount) || reviews.length || 0)
  );

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

  const handleOpenAddReview = () => {
    if (!targetUserId || isOwnProfile) return;

    if (!currentUserId) {
      router.push("/(auth)/login");
      return;
    }

    router.push({
      pathname: "/user/add-review",
      params: {
        userId: targetUserId,
        returnTo: "reviews",
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <AppTopBar title="Reviews" />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#3DB85C" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppTopBar title="Reviews" />

      <ScrollView contentContainerStyle={styles.content}>
        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={18} color="#D64A5C" />
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        ) : null}

        <View style={styles.summaryCard}>
          <Image
            source={{ uri: targetUser?.avatar || targetUser?.image || PLACEHOLDER_AVATAR }}
            style={styles.avatar}
          />
          <View style={styles.summaryInfo}>
            <ThemedText style={styles.userName} numberOfLines={1}>
              {name}
            </ThemedText>
            <ThemedText style={styles.userMeta} numberOfLines={1}>
              {summaryText}
            </ThemedText>
            <ThemedText style={styles.ratingMeta}>
              {`${ratingAverage.toFixed(1)}\u2605`} - {ratingCount} review
              {ratingCount === 1 ? "" : "s"}
            </ThemedText>
          </View>
        </View>

        {!isOwnProfile ? (
          <TouchableOpacity
            style={styles.addReviewButton}
            activeOpacity={0.88}
            onPress={handleOpenAddReview}
          >
            <ThemedText style={styles.addReviewButtonText}>
              {myReview ? "Edit My Review" : "Add Review"}
            </ThemedText>
          </TouchableOpacity>
        ) : null}

        {reviews.length === 0 ? (
          <View style={styles.emptyCard}>
            <ThemedText style={styles.emptyText}>No reviews yet.</ThemedText>
          </View>
        ) : (
          reviews.map((item, index) => {
            const reviewer = item?.reviewer || {};
            const reviewerName = getDisplayName(reviewer);
            const reviewerMeta = formatUserTypeAndRating(reviewer);
            const reviewId = item?._id || `${reviewerName}-${index}`;
            const isVetReviewer = isVeterinaryUser(reviewer);

            return (
              <View
                key={reviewId}
                style={[styles.reviewCard, isVetReviewer && styles.reviewCardVet]}
              >
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerBlock}>
                    <Image
                      source={{
                        uri:
                          reviewer?.avatar ||
                          reviewer?.image ||
                          PLACEHOLDER_AVATAR,
                      }}
                      style={styles.reviewerAvatar}
                    />
                    <View style={styles.reviewerInfo}>
                      <ThemedText style={styles.reviewerName} numberOfLines={1}>
                        {reviewerName}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.reviewerMeta,
                          isVetReviewer && styles.reviewerMetaVet,
                        ]}
                        numberOfLines={1}
                      >
                        {reviewerMeta}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.scoreBlock}>
                    <ThemedText style={styles.scoreText}>
                      {`${(Number(item?.rating) || 0).toFixed(1)}\u2605`}
                    </ThemedText>
                    <ThemedText style={styles.dateText}>
                      {formatDate(item?.createdAt)}
                    </ThemedText>
                  </View>
                </View>

                <ThemedText style={styles.reviewText}>
                  {String(item?.review || "").trim() || "No review text."}
                </ThemedText>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 28,
    gap: 10,
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
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5ECE7",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#E8ECE8",
  },
  summaryInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#18211B",
  },
  userMeta: {
    marginTop: 2,
    fontSize: 12.5,
    color: "#6B7770",
    fontWeight: "600",
  },
  ratingMeta: {
    marginTop: 2,
    fontSize: 12.5,
    color: "#3F4D45",
    fontWeight: "700",
  },
  addReviewButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: "#3DB85C",
    alignItems: "center",
    justifyContent: "center",
  },
  addReviewButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5ECE7",
    padding: 12,
  },
  emptyText: {
    color: "#6D7972",
    fontWeight: "600",
  },
  reviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5ECE7",
    padding: 12,
    gap: 8,
  },
  reviewCardVet: {
    borderColor: "#BFE9CF",
    backgroundColor: "#F6FFF9",
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  reviewerBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8ECE8",
  },
  reviewerInfo: {
    flex: 1,
    minWidth: 0,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#18211B",
  },
  reviewerMeta: {
    marginTop: 1,
    fontSize: 12,
    color: "#6D7972",
    fontWeight: "600",
  },
  reviewerMetaVet: {
    color: "#197B57",
  },
  scoreBlock: {
    alignItems: "flex-end",
  },
  scoreText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#D0891D",
  },
  dateText: {
    marginTop: 2,
    fontSize: 11.5,
    color: "#7B8680",
    fontWeight: "600",
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#3A4941",
  },
});
