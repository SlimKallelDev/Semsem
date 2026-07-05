import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import AppTopBar from "../../components/AppTopBar";
import ThemedText from "../../components/ThemedText";
import ThemedView from "../../components/ThemedView";
import {
  createComment,
  deleteComment as deleteCommentById,
  getCommentsByPost,
  updateComment as updateCommentById,
} from "../../services/commentService";
import {
  getLikesByPost,
  likePost,
  unlikePost,
} from "../../services/likeService";
import {
  deletePost,
  getPostById,
  reportPost,
} from "../../services/postService";
import { useUser } from "../../contexts/UserContext";
import { emitNotificationsUpdated } from "../../services/notificationEvents";
import { markNotificationsByResourceAsRead } from "../../services/notificationService";
import {
  formatUserTypeAndRating,
  formatUserTypeRatingWithCount,
  isVeterinaryUser,
} from "../../constants/userDisplay";
import { getPostTypeLabel } from "../../constants/postTypes";

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

  return full || person?.email || "User";
};

const normalizeImageList = (...values) => {
  const images = [];

  values.forEach((value) => {
    const list = Array.isArray(value) ? value : [value];

    list.forEach((item) => {
      const uri = String(item || "").trim();
      if (uri && !images.includes(uri)) {
        images.push(uri);
      }
    });
  });

  return images;
};

const REPORT_REASONS = [
  {
    value: "spam",
    label: "Spam or scam",
    description: "Advertising, fraud, or repeated unwanted content",
    icon: "megaphone-outline",
  },
  {
    value: "misleading",
    label: "False information",
    description: "Misleading title, description, price, or location",
    icon: "alert-circle-outline",
  },
  {
    value: "inappropriate",
    label: "Inappropriate content",
    description: "Content that should not appear on Semsem",
    icon: "eye-off-outline",
  },
  {
    value: "harassment",
    label: "Harassment or abuse",
    description: "Threatening, insulting, or targeted content",
    icon: "hand-left-outline",
  },
  {
    value: "other",
    label: "Something else",
    description: "A different issue that needs review",
    icon: "ellipsis-horizontal-circle-outline",
  },
];

function PostActionButton({
  icon,
  label,
  onPress,
  active = false,
  danger = false,
  disabled = false,
}) {
  const color = danger ? "#B53A3A" : active ? "#C73E4D" : "#45524B";

  return (
    <TouchableOpacity
      style={[
        styles.postActionButton,
        active && styles.postActionButtonActive,
        danger && styles.postActionButtonDanger,
        disabled && styles.disabledButton,
      ]}
      onPress={onPress}
      activeOpacity={0.78}
      disabled={disabled}
    >
      <Ionicons name={icon} size={21} color={color} />
      <ThemedText
        style={[
          styles.postActionButtonText,
          active && styles.postActionButtonTextActive,
          danger && styles.postActionButtonTextDanger,
        ]}
        numberOfLines={1}
      >
        {label}
      </ThemedText>
    </TouchableOpacity>
  );
}

export default function PostDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useUser();
  const insets = useSafeAreaInsets();

  const currentUserId = useMemo(
    () => user?._id || user?.id || user?.$id || null,
    [user]
  );

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [likes, setLikes] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [editingCommentSubmitting, setEditingCommentSubmitting] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [likeSubmitting, setLikeSubmitting] = useState(false);
  const [likesModalVisible, setLikesModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const postImages = useMemo(
    () => normalizeImageList(post?.images, post?.image),
    [post?.image, post?.images]
  );
  const activeImage = postImages[activeImageIndex] || "";
  const hasMultipleImages = postImages.length > 1;

  useEffect(() => {
    if (id) {
      loadAll();
    }
  }, [id]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [id]);

  useEffect(() => {
    if (activeImageIndex >= postImages.length) {
      setActiveImageIndex(0);
    }
  }, [activeImageIndex, postImages.length]);

  useEffect(() => {
    if (!id || !currentUserId) return;

    markNotificationsByResourceAsRead({
      resourceType: "post",
      resourceId: id,
    })
      .then(() => {
        emitNotificationsUpdated();
      })
      .catch((error) => {
        console.log("Mark post notifications error:", error.message);
      });
  }, [currentUserId, id]);

  const loadAll = async () => {
    try {
      setLoading(true);

      const [postData, commentsData, likesData] = await Promise.all([
        getPostById(id),
        getCommentsByPost(id),
        getLikesByPost(id),
      ]);

      setPost(postData);
      setComments(Array.isArray(commentsData) ? commentsData : []);
      setLikes(Array.isArray(likesData) ? likesData : []);
    } catch (error) {
      console.log("Load post details error:", error.message);
      Alert.alert("Error", error.message || "Failed to load post");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const data = await getCommentsByPost(id);
      setComments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("Load comments error:", error.message);
    }
  };

  const loadLikes = async () => {
    try {
      const data = await getLikesByPost(id);
      setLikes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("Load likes error:", error.message);
    }
  };

  const postOwnerId = getEntityId(post?.user);
  const isOwner =
    !!postOwnerId &&
    !!currentUserId &&
    String(postOwnerId) === String(currentUserId);

  const alreadyLiked = likes.some((like) => {
    const likeUserId = getEntityId(like?.user);
    return String(likeUserId) === String(currentUserId);
  });

  const handleOpenLogin = () => {
    router.push("/(auth)/login");
  };

  const showPreviousImage = () => {
    if (!hasMultipleImages) return;
    setActiveImageIndex((current) =>
      current === 0 ? postImages.length - 1 : current - 1
    );
  };

  const showNextImage = () => {
    if (!hasMultipleImages) return;
    setActiveImageIndex((current) =>
      current === postImages.length - 1 ? 0 : current + 1
    );
  };

  const handleToggleLike = async () => {
    if (!currentUserId || likeSubmitting) {
      if (!currentUserId) {
        handleOpenLogin();
      }
      return;
    }

    const previousLikes = likes;
    const nextLikes = alreadyLiked
      ? likes.filter(
          (like) =>
            String(getEntityId(like?.user)) !== String(currentUserId)
        )
      : [
          ...likes,
          {
            _id: `optimistic-${currentUserId}`,
            user,
          },
        ];

    try {
      setLikeSubmitting(true);
      setLikes(nextLikes);

      if (alreadyLiked) {
        await unlikePost(id);
      } else {
        await likePost(id);
      }

      await loadLikes();
    } catch (error) {
      setLikes(previousLikes);
      console.log("Toggle like error:", error.message);
      Alert.alert("Error", error.message || "Failed to update like");
    } finally {
      setLikeSubmitting(false);
    }
  };

  const handleSharePost = async () => {
    try {
      const postUrl = Linking.createURL(`/post/${id}`);
      const description = String(post?.description || "").trim();
      const excerpt =
        description.length > 180
          ? `${description.slice(0, 177).trim()}...`
          : description;
      const message = [post?.title, excerpt, postUrl].filter(Boolean).join("\n\n");

      await Share.share({
        title: post?.title || "Semsem post",
        message,
        url: postUrl,
      });
    } catch (error) {
      console.log("Share post error:", error.message);
      Alert.alert("Error", "Unable to open sharing options");
    }
  };

  const handleOpenReport = () => {
    if (!currentUserId) {
      handleOpenLogin();
      return;
    }

    if (isOwner) {
      Alert.alert("Your post", "You cannot report your own post.");
      return;
    }

    setReportModalVisible(true);
  };

  const handleCloseReport = () => {
    if (reportSubmitting) return;
    setReportModalVisible(false);
  };

  const handleSubmitReport = async () => {
    if (!reportReason || reportSubmitting) return;

    if (reportReason === "other" && !reportDetails.trim()) {
      Alert.alert("Add details", "Please briefly explain the issue.");
      return;
    }

    try {
      setReportSubmitting(true);
      const response = await reportPost(id, {
        reason: reportReason,
        details: reportDetails.trim(),
      });

      setReportModalVisible(false);
      setReportReason("spam");
      setReportDetails("");
      Alert.alert(
        "Report submitted",
        response?.message || "Thank you. The Semsem team will review this post."
      );
    } catch (error) {
      console.log("Report post error:", error.message);
      Alert.alert("Unable to report", error.message || "Please try again later.");
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!currentUserId) {
      handleOpenLogin();
      return;
    }

    if (!commentText.trim()) {
      return;
    }

    try {
      setCommentSubmitting(true);

      await createComment({
        post: id,
        user: currentUserId,
        text: commentText.trim(),
      });

      setCommentText("");
      await loadComments();
    } catch (error) {
      console.log("Create comment error:", error.message);
      Alert.alert("Error", error.message || "Failed to add comment");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeletePost = () => {
    Alert.alert("Delete post", "Are you sure you want to delete this post?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setDeleting(true);
            await deletePost(id);
            Alert.alert("Success", "Post deleted successfully");
            router.replace("/myposts");
          } catch (error) {
            console.log("Delete post error:", error.message);
            Alert.alert("Error", error.message || "Failed to delete post");
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const locationText = [
    post?.location?.country,
    post?.location?.governorate || post?.location?.city,
  ]
    .filter(Boolean)
    .join(", ");
  const authorName = getDisplayName(post?.user);
  const authorAvatar =
    post?.user?.avatar ||
    post?.user?.image ||
    post?.user?.photo ||
    post?.user?.profileImage ||
    null;
  const canOpenAuthorProfile = !!postOwnerId && !isOwner;
  const authorTypeRating = formatUserTypeRatingWithCount(post?.user);
  const isVeterinaryAuthor = isVeterinaryUser(post?.user);
  const authorHintAction = isOwner
    ? "This is your post"
    : canOpenAuthorProfile
    ? "Tap to view profile"
    : "Profile unavailable";

  const handleOpenAuthorProfile = () => {
    if (!canOpenAuthorProfile) return;
    router.push(`/user/${postOwnerId}`);
  };

  const handleOpenUserProfile = (person) => {
    const targetUserId = getEntityId(person);
    if (!targetUserId) return;

    setLikesModalVisible(false);
    router.push(`/user/${targetUserId}`);
  };

  const handleOpenLikesModal = () => {
    if (!likes.length) return;
    setLikesModalVisible(true);
  };

  const startEditComment = (comment) => {
    if (!comment?._id) return;
    setEditingCommentId(comment._id);
    setEditingCommentText(String(comment?.text || ""));
  };

  const cancelEditComment = () => {
    if (editingCommentSubmitting) return;
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const submitEditComment = async (commentId) => {
    if (!commentId || editingCommentSubmitting) return;

    const nextText = editingCommentText.trim();
    if (!nextText) {
      Alert.alert("Validation", "Comment text is required");
      return;
    }

    try {
      setEditingCommentSubmitting(true);
      await updateCommentById(commentId, nextText);
      setEditingCommentId(null);
      setEditingCommentText("");
      await loadComments();
    } catch (error) {
      console.log("Update comment error:", error.message);
      Alert.alert("Error", error.message || "Failed to update comment");
    } finally {
      setEditingCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!commentId || deletingCommentId) return;

    try {
      setDeletingCommentId(commentId);
      await deleteCommentById(commentId);

      if (editingCommentId === commentId) {
        setEditingCommentId(null);
        setEditingCommentText("");
      }

      await loadComments();
    } catch (error) {
      console.log("Delete comment error:", error.message);
      Alert.alert("Error", error.message || "Failed to delete comment");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const promptDeleteComment = (commentId) => {
    Alert.alert("Delete comment", "Are you sure you want to delete this comment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => handleDeleteComment(commentId),
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <AppTopBar title="Post Details" />
        <ThemedView style={styles.center}>
          <ActivityIndicator size="large" />
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <AppTopBar title="Post Details" />
        <ThemedView style={styles.center}>
          <ThemedText>Post not found.</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ThemedView style={styles.container}>
        <AppTopBar title="Post Details" />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.content,
              {
                paddingBottom: Math.max(40, insets.bottom + 20),
              },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {!!activeImage && (
              <View style={styles.imageCarousel}>
                <Image source={{ uri: activeImage }} style={styles.image} />

                {hasMultipleImages ? (
                  <>
                    <TouchableOpacity
                      style={[styles.imageArrowButton, styles.imageArrowLeft]}
                      activeOpacity={0.82}
                      onPress={showPreviousImage}
                    >
                      <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.imageArrowButton, styles.imageArrowRight]}
                      activeOpacity={0.82}
                      onPress={showNextImage}
                    >
                      <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.imageCounter}>
                      <ThemedText style={styles.imageCounterText}>
                        {activeImageIndex + 1}/{postImages.length}
                      </ThemedText>
                    </View>
                  </>
                ) : null}
              </View>
            )}

            <ThemedText type="title" style={styles.title}>
              {post.title}
            </ThemedText>

            <ThemedText style={styles.meta}>
              {getPostTypeLabel(post.type)} | {(post.pet_type || "Pet").toString()}
            </ThemedText>

            {!!locationText && (
              <ThemedText style={styles.location}>Location: {locationText}</ThemedText>
            )}

            <ThemedText style={styles.authorLabel}>Posted by</ThemedText>

            <TouchableOpacity
              style={[
                styles.authorBanner,
                isVeterinaryAuthor && styles.authorBannerVeterinary,
                !canOpenAuthorProfile && styles.authorBannerDisabled,
              ]}
              activeOpacity={canOpenAuthorProfile ? 0.75 : 1}
              disabled={!canOpenAuthorProfile}
              onPress={handleOpenAuthorProfile}
            >
              {authorAvatar ? (
                <Image source={{ uri: authorAvatar }} style={styles.authorAvatar} />
              ) : (
                <View style={styles.authorAvatarPlaceholder}>
                  <Ionicons name="person" size={18} color="#6C7A72" />
                </View>
              )}

              <View style={styles.authorInfo}>
                <ThemedText style={styles.authorName} numberOfLines={1}>
                  {authorName}
                </ThemedText>
                <ThemedText style={styles.authorHint} numberOfLines={1}>
                  {authorTypeRating}
                </ThemedText>
                <ThemedText style={styles.authorHintAction} numberOfLines={1}>
                  {authorHintAction}
                </ThemedText>
              </View>

              {canOpenAuthorProfile ? (
                <Ionicons name="chevron-forward" size={18} color="#8A948E" />
              ) : null}
            </TouchableOpacity>

            {!!post.description && (
              <ThemedText style={styles.description}>
                {post.description}
              </ThemedText>
            )}

            <View style={styles.postActionsPanel}>
              <View style={styles.postActionsRow}>
                <PostActionButton
                  icon={alreadyLiked ? "heart" : "heart-outline"}
                  label={`${alreadyLiked ? "Liked" : "Like"} ${likes.length}`}
                  active={alreadyLiked}
                  disabled={likeSubmitting}
                  onPress={handleToggleLike}
                />
                <PostActionButton
                  icon="share-social-outline"
                  label="Share"
                  onPress={handleSharePost}
                />
                {!isOwner ? (
                  <PostActionButton
                    icon="flag-outline"
                    label="Report"
                    danger
                    onPress={handleOpenReport}
                  />
                ) : null}
              </View>

              <TouchableOpacity
                style={[
                  styles.likersButton,
                  !likes.length && styles.likersButtonDisabled,
                ]}
                onPress={handleOpenLikesModal}
                activeOpacity={0.8}
                disabled={!likes.length}
              >
                <Ionicons
                  name="people-outline"
                  size={17}
                  color={likes.length ? "#51615A" : "#93A198"}
                />
                <ThemedText
                  style={[
                    styles.likersButtonText,
                    !likes.length && styles.likersButtonTextDisabled,
                  ]}
                >
                  {likes.length
                    ? `View ${likes.length} ${likes.length === 1 ? "like" : "likes"}`
                    : "Be the first to like this post"}
                </ThemedText>
                {likes.length ? (
                  <Ionicons name="chevron-forward" size={16} color="#7C8982" />
                ) : null}
              </TouchableOpacity>

              {isOwner ? (
                <View style={styles.ownerActionsRow}>
                  <TouchableOpacity
                    style={styles.ownerActionButton}
                    onPress={() => router.push(`/post/edit/${id}`)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="create-outline" size={19} color="#34423A" />
                    <ThemedText style={styles.ownerActionText}>
                      Edit post
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.ownerActionButton,
                      styles.ownerDeleteButton,
                      deleting && styles.disabledButton,
                    ]}
                    onPress={handleDeletePost}
                    disabled={deleting}
                    activeOpacity={0.8}
                  >
                    {deleting ? (
                      <ActivityIndicator size="small" color="#B53A3A" />
                    ) : (
                      <Ionicons name="trash-outline" size={19} color="#B53A3A" />
                    )}
                    <ThemedText style={styles.ownerDeleteText}>
                      {deleting ? "Deleting..." : "Delete post"}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            <View style={styles.commentsSection}>
              <ThemedText style={styles.sectionTitle}>
                Comments ({comments.length})
              </ThemedText>

              {currentUserId ? (
                <View style={styles.commentInputRow}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Write a comment..."
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                  />
                  <TouchableOpacity
                    style={[
                      styles.commentSendButton,
                      commentSubmitting && styles.disabledButton,
                    ]}
                    onPress={handleAddComment}
                    disabled={commentSubmitting}
                  >
                    <ThemedText style={styles.commentSendText}>
                      {commentSubmitting ? "..." : "Send"}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.commentLoginPrompt}>
                  <ThemedText style={styles.commentLoginText}>
                    Login to join the conversation.
                  </ThemedText>
                  <TouchableOpacity
                    style={styles.inlineLoginButton}
                    activeOpacity={0.82}
                    onPress={handleOpenLogin}
                  >
                    <Ionicons name="log-in-outline" size={16} color="#444444" />
                    <ThemedText style={styles.inlineLoginButtonText}>
                      Login
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              )}

              {comments.length === 0 ? (
                <ThemedText style={styles.emptyText}>No comments yet.</ThemedText>
              ) : (
                comments.map((comment) => {
                  const commentOwnerId = getEntityId(comment?.user);
                  const canOpenCommentAuthor = Boolean(commentOwnerId);
                  const isOwnComment =
                    !!currentUserId &&
                    !!commentOwnerId &&
                    String(currentUserId) === String(commentOwnerId);
                  const isEditing = editingCommentId === comment?._id;
                  const isDeleting = deletingCommentId === comment?._id;

                  return (
                    <View
                      key={comment._id}
                      style={[
                        styles.commentCard,
                        isVeterinaryUser(comment?.user) && styles.commentCardVeterinary,
                      ]}
                    >
                      <View style={styles.commentHeaderRow}>
                        <TouchableOpacity
                          style={styles.commentAuthorRow}
                          onPress={() => handleOpenUserProfile(comment?.user)}
                          activeOpacity={0.75}
                          disabled={!canOpenCommentAuthor}
                        >
                          <View style={styles.commentAuthorTextWrap}>
                            <ThemedText style={styles.commentAuthor}>
                              {getDisplayName(comment?.user)}
                            </ThemedText>
                            <ThemedText
                              style={[
                                styles.commentAuthorMeta,
                                isVeterinaryUser(comment?.user) &&
                                  styles.commentAuthorMetaVeterinary,
                              ]}
                            >
                              {formatUserTypeAndRating(comment?.user)}
                            </ThemedText>
                          </View>
                          {canOpenCommentAuthor ? (
                            <Ionicons
                              name="chevron-forward"
                              size={16}
                              color="#8A948E"
                            />
                          ) : null}
                        </TouchableOpacity>

                        {isOwnComment && !isEditing ? (
                          <View style={styles.commentOwnerActions}>
                            <TouchableOpacity
                              onPress={() => startEditComment(comment)}
                              disabled={!!deletingCommentId}
                              activeOpacity={0.8}
                            >
                              <ThemedText style={styles.commentOwnerActionText}>
                                Edit
                              </ThemedText>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => promptDeleteComment(comment._id)}
                              disabled={!!deletingCommentId}
                              activeOpacity={0.8}
                            >
                              <ThemedText
                                style={[
                                  styles.commentOwnerActionText,
                                  styles.commentOwnerDeleteText,
                                ]}
                              >
                                {isDeleting ? "Deleting..." : "Delete"}
                              </ThemedText>
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </View>

                      {isEditing ? (
                        <View>
                          <TextInput
                            style={styles.commentEditInput}
                            value={editingCommentText}
                            onChangeText={setEditingCommentText}
                            multiline
                            autoFocus
                          />
                          <View style={styles.commentEditActions}>
                            <TouchableOpacity
                              style={[
                                styles.commentEditButton,
                                styles.commentEditCancelButton,
                              ]}
                              onPress={cancelEditComment}
                              disabled={editingCommentSubmitting}
                              activeOpacity={0.85}
                            >
                              <ThemedText style={styles.commentEditCancelText}>
                                Cancel
                              </ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.commentEditButton,
                                styles.commentEditSaveButton,
                                editingCommentSubmitting && styles.disabledButton,
                              ]}
                              onPress={() => submitEditComment(comment._id)}
                              disabled={editingCommentSubmitting}
                              activeOpacity={0.85}
                            >
                              <ThemedText style={styles.commentEditSaveText}>
                                {editingCommentSubmitting ? "Saving..." : "Save"}
                              </ThemedText>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <ThemedText style={styles.commentText}>{comment.text}</ThemedText>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <Modal
          visible={reportModalVisible}
          transparent
          animationType="slide"
          onRequestClose={handleCloseReport}
        >
          <KeyboardAvoidingView
            style={styles.reportModalBackdrop}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={handleCloseReport}
            />

            <View
              style={[
                styles.reportModalCard,
                { paddingBottom: Math.max(16, insets.bottom + 8) },
              ]}
            >
              <View style={styles.reportModalHeader}>
                <View style={styles.reportModalTitleRow}>
                  <View style={styles.reportModalIcon}>
                    <Ionicons name="flag-outline" size={20} color="#B53A3A" />
                  </View>
                  <View style={styles.reportModalHeading}>
                    <ThemedText style={styles.reportModalTitle}>
                      Report this post
                    </ThemedText>
                    <ThemedText style={styles.reportModalSubtitle}>
                      Your report is private and will be reviewed.
                    </ThemedText>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.reportModalClose}
                  onPress={handleCloseReport}
                  disabled={reportSubmitting}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={19} color="#51615A" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.reportReasonsScroll}
                contentContainerStyle={styles.reportReasonsList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {REPORT_REASONS.map((reason) => {
                  const selected = reportReason === reason.value;

                  return (
                    <Pressable
                      key={reason.value}
                      style={[
                        styles.reportReasonRow,
                        selected && styles.reportReasonRowSelected,
                      ]}
                      onPress={() => setReportReason(reason.value)}
                    >
                      <Ionicons
                        name={reason.icon}
                        size={20}
                        color={selected ? "#26352D" : "#6E7B74"}
                      />
                      <View style={styles.reportReasonTextWrap}>
                        <ThemedText style={styles.reportReasonLabel}>
                          {reason.label}
                        </ThemedText>
                        <ThemedText style={styles.reportReasonDescription}>
                          {reason.description}
                        </ThemedText>
                      </View>
                      <Ionicons
                        name={selected ? "radio-button-on" : "radio-button-off"}
                        size={20}
                        color={selected ? "#2A9448" : "#A0AAA4"}
                      />
                    </Pressable>
                  );
                })}

                <ThemedText style={styles.reportDetailsLabel}>
                  Additional details {reportReason === "other" ? "*" : "(optional)"}
                </ThemedText>
                <TextInput
                  style={styles.reportDetailsInput}
                  value={reportDetails}
                  onChangeText={setReportDetails}
                  placeholder="Help the moderation team understand the issue..."
                  placeholderTextColor="#929C96"
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                />
                <ThemedText style={styles.reportCharacterCount}>
                  {reportDetails.length}/500
                </ThemedText>
              </ScrollView>

              <View style={styles.reportModalActions}>
                <TouchableOpacity
                  style={styles.reportCancelButton}
                  onPress={handleCloseReport}
                  disabled={reportSubmitting}
                  activeOpacity={0.8}
                >
                  <ThemedText style={styles.reportCancelText}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.reportSubmitButton,
                    reportSubmitting && styles.disabledButton,
                  ]}
                  onPress={handleSubmitReport}
                  disabled={reportSubmitting}
                  activeOpacity={0.8}
                >
                  {reportSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="flag" size={17} color="#FFFFFF" />
                  )}
                  <ThemedText style={styles.reportSubmitText}>
                    {reportSubmitting ? "Submitting..." : "Submit report"}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal
          visible={likesModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setLikesModalVisible(false)}
        >
          <View style={styles.likesModalBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setLikesModalVisible(false)}
            />

            <View
              style={[
                styles.likesModalCard,
                { paddingBottom: Math.max(12, insets.bottom + 6) },
              ]}
            >
              <View style={styles.likesModalHeader}>
                <ThemedText style={styles.likesModalTitle}>
                  Likes ({likes.length})
                </ThemedText>
                <TouchableOpacity
                  style={styles.likesModalClose}
                  onPress={() => setLikesModalVisible(false)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={18} color="#51615A" />
                </TouchableOpacity>
              </View>

              {likes.length === 0 ? (
                <ThemedText style={styles.emptyText}>No likes yet.</ThemedText>
              ) : (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.likesModalList}
                >
                  {likes.map((like) => {
                    const likerId = getEntityId(like?.user);
                    const likerName = getDisplayName(like?.user);

                    return (
                      <TouchableOpacity
                        key={like?._id || likerId || likerName}
                        style={styles.likerRow}
                        onPress={() => handleOpenUserProfile(like?.user)}
                        activeOpacity={0.75}
                        disabled={!likerId}
                      >
                        <View style={styles.likerAvatarWrap}>
                          {like?.user?.avatar || like?.user?.image ? (
                            <Image
                              source={{
                                uri: like?.user?.avatar || like?.user?.image,
                              }}
                              style={styles.likerAvatar}
                            />
                          ) : (
                            <View style={styles.likerAvatarFallback}>
                              <Ionicons
                                name="person"
                                size={16}
                                color="#708078"
                              />
                            </View>
                          )}
                        </View>

                        <View style={styles.likerInfo}>
                          <ThemedText style={styles.likerName} numberOfLines={1}>
                            {likerName}
                          </ThemedText>
                          <ThemedText style={styles.likerMeta} numberOfLines={1}>
                            {formatUserTypeAndRating(like?.user)}
                          </ThemedText>
                        </View>

                        {likerId ? (
                          <Ionicons
                            name="chevron-forward"
                            size={17}
                            color="#8A948E"
                          />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#F4F6F4",
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  imageCarousel: {
    position: "relative",
    width: "100%",
    height: 280,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: "#e9e9e9",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    backgroundColor: "#e9e9e9",
  },
  imageArrowButton: {
    position: "absolute",
    top: "50%",
    width: 34,
    height: 34,
    marginTop: -17,
    borderRadius: 17,
    backgroundColor: "rgba(23, 32, 26, 0.58)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageArrowLeft: {
    left: 10,
  },
  imageArrowRight: {
    right: 10,
  },
  imageCounter: {
    position: "absolute",
    right: 10,
    bottom: 10,
    borderRadius: 999,
    backgroundColor: "rgba(23, 32, 26, 0.62)",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  imageCounterText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "800",
  },
  title: {
    marginBottom: 8,
  },
  meta: {
    fontSize: 15,
    opacity: 0.7,
    marginBottom: 6,
    textTransform: "capitalize",
  },
  location: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 6,
  },
  authorLabel: {
    fontSize: 12,
    letterSpacing: 0.3,
    fontWeight: "700",
    color: "#7A847E",
    marginBottom: 7,
    textTransform: "uppercase",
  },
  authorBanner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E9E4",
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  authorBannerVeterinary: {
    borderColor: "#BFE9CF",
    backgroundColor: "#F5FFF9",
  },
  authorBannerDisabled: {
    opacity: 0.8,
  },
  authorAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E7ECE8",
  },
  authorAvatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E8EFEA",
    alignItems: "center",
    justifyContent: "center",
  },
  authorInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
    minWidth: 0,
  },
  authorName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1F2A24",
  },
  authorHint: {
    marginTop: 2,
    fontSize: 14,
    color: "#76827B",
  },
  authorHintAction: {
    marginTop: 1,
    fontSize: 12,
    color: "#8A948E",
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 18,
  },
  postActionsPanel: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDE6E0",
    backgroundColor: "#FFFFFF",
    padding: 10,
    marginBottom: 18,
  },
  postActionsRow: {
    minHeight: 68,
    flexDirection: "row",
    gap: 8,
  },
  postActionButton: {
    flex: 1,
    minWidth: 0,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E1E8E3",
    backgroundColor: "#F7F9F7",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    gap: 4,
  },
  postActionButtonActive: {
    borderColor: "#F0C8CD",
    backgroundColor: "#FFF3F4",
  },
  postActionButtonDanger: {
    borderColor: "#E8D7D7",
    backgroundColor: "#FFF9F9",
  },
  postActionButtonText: {
    maxWidth: "100%",
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "800",
    color: "#45524B",
  },
  postActionButtonTextActive: {
    color: "#C73E4D",
  },
  postActionButtonTextDanger: {
    color: "#B53A3A",
  },
  inlineLoginButton: {
    minHeight: 34,
    paddingHorizontal: 16,
    borderRadius: 17,
    backgroundColor: "#E8E8E8",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  inlineLoginButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#444444",
  },
  likersButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F3F6F4",
    paddingHorizontal: 12,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  likersButtonDisabled: {
    opacity: 0.65,
  },
  likersButtonText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#51615A",
  },
  likersButtonTextDisabled: {
    color: "#8F9C95",
  },
  ownerActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E8EDE9",
  },
  ownerActionButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D9E2DC",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    gap: 6,
  },
  ownerDeleteButton: {
    borderColor: "#E6CFCF",
    backgroundColor: "#FFF9F9",
  },
  ownerActionText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#34423A",
  },
  ownerDeleteText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#B53A3A",
  },
  disabledButton: {
    opacity: 0.7,
  },
  commentsSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E7EEEA",
    padding: 14,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#2B3241",
    marginBottom: 12,
  },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 16,
  },
  commentLoginPrompt: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E4EAE6",
    backgroundColor: "#F8FAF8",
    padding: 12,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  commentLoginText: {
    flex: 1,
    minWidth: 0,
    color: "#5C6861",
    fontSize: 13.5,
    fontWeight: "700",
  },
  commentInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#DFE5E1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    textAlignVertical: "top",
  },
  commentSendButton: {
    backgroundColor: "#222",
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  commentSendText: {
    color: "#fff",
    fontWeight: "700",
  },
  emptyText: {
    color: "#7A837F",
    marginTop: 4,
  },
  commentCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8EEEA",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  commentCardVeterinary: {
    borderColor: "#BFE9CF",
    backgroundColor: "#F6FFF9",
  },
  commentHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  commentAuthorRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  commentAuthorTextWrap: {
    flex: 1,
    marginRight: 8,
    minWidth: 0,
  },
  commentAuthor: {
    fontWeight: "700",
  },
  commentAuthorMeta: {
    marginTop: 2,
    marginBottom: 5,
    fontSize: 12,
    color: "#74817A",
    fontWeight: "600",
  },
  commentAuthorMetaVeterinary: {
    color: "#197B57",
  },
  commentOwnerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginLeft: 8,
    paddingTop: 1,
  },
  commentOwnerActionText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#4B5B53",
  },
  commentOwnerDeleteText: {
    color: "#C74848",
  },
  commentEditInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#D9E3DD",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    textAlignVertical: "top",
  },
  commentEditActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  commentEditButton: {
    height: 34,
    minWidth: 72,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  commentEditCancelButton: {
    backgroundColor: "#EEF2EF",
  },
  commentEditSaveButton: {
    backgroundColor: "#2A9448",
  },
  commentEditCancelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#51615A",
  },
  commentEditSaveText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  commentText: {
    lineHeight: 20,
  },
  reportModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(19, 27, 23, 0.42)",
    justifyContent: "flex-end",
  },
  reportModalCard: {
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: "#DFE8E2",
    paddingTop: 14,
    paddingHorizontal: 14,
  },
  reportModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  reportModalTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reportModalIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  reportModalHeading: {
    flex: 1,
    minWidth: 0,
  },
  reportModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1F2A24",
  },
  reportModalSubtitle: {
    marginTop: 2,
    fontSize: 12.5,
    lineHeight: 17,
    color: "#748078",
  },
  reportModalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F0F5F2",
    alignItems: "center",
    justifyContent: "center",
  },
  reportReasonsScroll: {
    flexGrow: 0,
  },
  reportReasonsList: {
    paddingBottom: 6,
  },
  reportReasonRow: {
    minHeight: 62,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8E4",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
    gap: 10,
  },
  reportReasonRowSelected: {
    borderColor: "#91C9A2",
    backgroundColor: "#F3FAF5",
  },
  reportReasonTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  reportReasonLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#26352D",
  },
  reportReasonDescription: {
    marginTop: 2,
    fontSize: 11.5,
    lineHeight: 15,
    color: "#78837D",
  },
  reportDetailsLabel: {
    marginTop: 3,
    marginBottom: 7,
    fontSize: 13,
    fontWeight: "800",
    color: "#3C4942",
  },
  reportDetailsInput: {
    minHeight: 88,
    maxHeight: 130,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCE4DF",
    backgroundColor: "#FAFBFA",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#26312B",
  },
  reportCharacterCount: {
    marginTop: 4,
    textAlign: "right",
    fontSize: 11,
    color: "#87918B",
  },
  reportModalActions: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 10,
  },
  reportCancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCE4DF",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  reportCancelText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#4D5B53",
  },
  reportSubmitButton: {
    flex: 1.35,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#B53A3A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    gap: 7,
  },
  reportSubmitText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  likesModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(19, 27, 23, 0.36)",
    justifyContent: "flex-end",
  },
  likesModalCard: {
    maxHeight: "72%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: "#DFE8E2",
    paddingTop: 12,
    paddingHorizontal: 14,
  },
  likesModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  likesModalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1F2A24",
  },
  likesModalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F5F2",
  },
  likesModalList: {
    paddingBottom: 10,
  },
  likerRow: {
    minHeight: 58,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF3EE",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  likerAvatarWrap: {
    marginRight: 10,
  },
  likerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8EFEB",
  },
  likerAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E9F0EB",
    alignItems: "center",
    justifyContent: "center",
  },
  likerInfo: {
    flex: 1,
    marginRight: 8,
    minWidth: 0,
  },
  likerName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#203029",
  },
  likerMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#76837C",
  },
});

