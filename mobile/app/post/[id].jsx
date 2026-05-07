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
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
import { deletePost, getPostById } from "../../services/postService";
import { useUser } from "../../contexts/UserContext";
import { emitNotificationsUpdated } from "../../services/notificationEvents";
import { markNotificationsByResourceAsRead } from "../../services/notificationService";
import {
  formatUserTypeAndRating,
  formatUserTypeRatingWithCount,
  isVeterinaryUser,
} from "../../constants/userDisplay";

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
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadAll();
    }
  }, [id]);

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

  const handleToggleLike = async () => {
    if (!currentUserId || likeSubmitting) {
      if (!currentUserId) {
        Alert.alert("Error", "You need to be logged in");
      }
      return;
    }

    try {
      setLikeSubmitting(true);

      if (alreadyLiked) {
        await unlikePost(id);
      } else {
        await likePost(id);
      }

      await loadLikes();
    } catch (error) {
      console.log("Toggle like error:", error.message);
      Alert.alert("Error", error.message || "Failed to update like");
    } finally {
      setLikeSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!currentUserId) {
      Alert.alert("Error", "You need to be logged in");
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
    post?.location?.governorate || post?.location?.city,
    post?.location?.country,
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
            {!!post.image && (
              <Image source={{ uri: post.image }} style={styles.image} />
            )}

            <ThemedText type="title" style={styles.title}>
              {post.title}
            </ThemedText>

            <ThemedText style={styles.meta}>
              {(post.type || "Post").toString()} | {(post.pet_type || "Pet").toString()}
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

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[
                  styles.likeButton,
                  alreadyLiked && styles.likeButtonActive,
                  likeSubmitting && styles.disabledButton,
                ]}
                onPress={handleToggleLike}
                disabled={likeSubmitting}
              >
                <ThemedText
                  style={[
                    styles.likeButtonText,
                    alreadyLiked && styles.likeButtonTextActive,
                  ]}
                >
                  {alreadyLiked ? "Liked" : "Like"} ({likes.length})
                </ThemedText>
              </TouchableOpacity>

              {isOwner && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => router.push(`/post/edit/${id}`)}
                >
                  <ThemedText style={styles.editButtonText}>Edit</ThemedText>
                </TouchableOpacity>
              )}
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
                {likes.length ? `See who liked (${likes.length})` : "No likes yet"}
              </ThemedText>
            </TouchableOpacity>

            {isOwner && (
              <TouchableOpacity
                style={[styles.deleteButton, deleting && styles.disabledButton]}
                onPress={handleDeletePost}
                disabled={deleting}
              >
                <ThemedText style={styles.deleteButtonText}>
                  {deleting ? "Deleting..." : "Delete Post"}
                </ThemedText>
              </TouchableOpacity>
            )}

            <View style={styles.commentsSection}>
              <ThemedText style={styles.sectionTitle}>
                Comments ({comments.length})
              </ThemedText>

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
  image: {
    width: "100%",
    height: 280,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: "#e9e9e9",
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
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  likeButton: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  likeButtonActive: {
    backgroundColor: "#fde7ea",
  },
  likeButtonText: {
    fontWeight: "700",
  },
  likeButtonTextActive: {
    color: "#c0392b",
  },
  likersButton: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DEE7E1",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  likersButtonDisabled: {
    opacity: 0.65,
  },
  likersButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#51615A",
  },
  likersButtonTextDisabled: {
    color: "#8F9C95",
  },
  editButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  editButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  deleteButton: {
    backgroundColor: "#e74c3c",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 18,
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "700",
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

