import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppTopBar from "../../components/AppTopBar";
import ThemedText from "../../components/ThemedText";
import { useUser } from "../../contexts/UserContext";
import { formatUserTypeRatingWithCount } from "../../constants/userDisplay";
import { getUser, getUserReviews, submitUserReview } from "../../services/userService";

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

const clampStarRating = (value) => {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  if (parsed > 5) return 5;
  return parsed;
};

export default function AddReviewScreen() {
  const { user } = useUser();
  const { userId: rawUserId, returnTo: rawReturnTo } = useLocalSearchParams();
  const userId = readParam(rawUserId);
  const returnTo = readParam(rawReturnTo) || "profile";

  const [targetUser, setTargetUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [hasExistingReview, setHasExistingReview] = useState(false);

  const currentUserId = getEntityId(user);

  useEffect(() => {
    if (!userId) {
      Alert.alert("Error", "User not found");
      router.back();
      return;
    }

    if (!currentUserId) {
      router.replace("/(auth)/login");
      return;
    }

    let active = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const [profileData, reviewsData] = await Promise.all([
          getUser(userId),
          getUserReviews(userId).catch(() => []),
        ]);

        if (!active) return;

        setTargetUser(profileData || null);

        const existing =
          (Array.isArray(reviewsData) ? reviewsData : []).find((item) => {
            const reviewerId = getEntityId(item?.reviewer);
            return (
              !!reviewerId &&
              !!currentUserId &&
              String(reviewerId) === String(currentUserId)
            );
          }) || null;

        if (existing) {
          setHasExistingReview(true);
          setRating(clampStarRating(existing?.rating));
          setReview(String(existing?.review || ""));
        } else {
          setHasExistingReview(false);
          setRating(5);
          setReview("");
        }
      } catch (error) {
        if (!active) return;
        Alert.alert("Error", error?.message || "Failed to load user");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [userId, currentUserId]);

  const canSubmit = useMemo(() => {
    return !!userId && review.trim().length > 0 && !submitting;
  }, [review, submitting, userId]);

  const handleSubmit = async () => {
    if (!currentUserId) {
      router.replace("/(auth)/login");
      return;
    }

    if (!userId) return;

    const trimmedReview = String(review || "").trim();
    if (!trimmedReview) {
      Alert.alert("Validation", "Please write your review.");
      return;
    }

    try {
      setSubmitting(true);
      await submitUserReview(userId, {
        rating: clampStarRating(rating),
        review: trimmedReview,
      });

      const refreshAt = String(Date.now());
      if (returnTo === "reviews") {
        router.replace({
          pathname: "/user/reviews",
          params: { userId, refreshAt },
        });
        return;
      }

      router.replace({
        pathname: "/user/[id]",
        params: { id: userId, refreshAt },
      });
    } catch (error) {
      Alert.alert("Error", error?.message || "Failed to save review");
    } finally {
      setSubmitting(false);
    }
  };

  const title = hasExistingReview ? "Edit Review" : "Add Review";
  const targetName = getDisplayName(targetUser);
  const targetAvatar = targetUser?.avatar || targetUser?.image || PLACEHOLDER_AVATAR;
  const targetMeta = formatUserTypeRatingWithCount(targetUser);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <AppTopBar title={title} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#3DB85C" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppTopBar title={title} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.userCard}>
          <Image source={{ uri: targetAvatar }} style={styles.avatar} />
          <View style={styles.userInfo}>
            <ThemedText style={styles.userName} numberOfLines={1}>
              {targetName}
            </ThemedText>
            <ThemedText style={styles.userMeta} numberOfLines={1}>
              {targetMeta}
            </ThemedText>
          </View>
        </View>

        <View style={styles.formCard}>
          <ThemedText style={styles.sectionTitle}>Rate this user</ThemedText>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((value) => {
              const active = value <= rating;
              return (
                <TouchableOpacity
                  key={`star-${value}`}
                  onPress={() => setRating(value)}
                  activeOpacity={0.85}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={active ? "star" : "star-outline"}
                    size={30}
                    color={active ? "#F5B700" : "#AAB3AE"}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          <ThemedText style={styles.sectionTitle}>Your review</ThemedText>
          <TextInput
            style={styles.reviewInput}
            placeholder="Write your review..."
            placeholderTextColor="#97A39D"
            value={review}
            onChangeText={setReview}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.disabledButton]}
            activeOpacity={0.88}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            <ThemedText style={styles.submitButtonText}>
              {submitting ? "Saving..." : "Save Review"}
            </ThemedText>
          </TouchableOpacity>
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
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 28,
    gap: 12,
  },
  userCard: {
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
  userInfo: {
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
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5ECE7",
    padding: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#243029",
    marginBottom: 8,
  },
  starsRow: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  starButton: {
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  reviewInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#DDE6E0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1E2722",
    marginBottom: 12,
  },
  submitButton: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#3DB85C",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.7,
  },
});
