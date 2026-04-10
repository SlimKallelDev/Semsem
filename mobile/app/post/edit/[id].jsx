import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  View,
  Image,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import ThemedView from "../../../components/ThemedView";
import ThemedText from "../../../components/ThemedText";
import { getPostById, updatePost } from "../../../services/postService";
import { useUser } from "../../../contexts/UserContext";

const POST_TYPES = ["adoption", "lost", "found", "mating", "general"];

export default function EditPostScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useUser();

  const currentUserId = useMemo(
    () => user?._id || user?.id || user?.$id || null,
    [user]
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [post, setPost] = useState(null);

  const [type, setType] = useState("general");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [petType, setPetType] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    if (id) {
      loadPost();
    }
  }, [id]);

  const loadPost = async () => {
    try {
      setLoading(true);

      const data = await getPostById(id);
      setPost(data);

      const ownerId = data?.user?._id || data?.user;

      if (String(ownerId) !== String(currentUserId)) {
        Alert.alert("Error", "You are not allowed to edit this post");
        router.back();
        return;
      }

      setType(data?.type || "general");
      setTitle(data?.title || "");
      setDescription(data?.description || "");
      setImage(data?.image || "");
      setPetType(data?.pet_type || "");
      setCountry(data?.location?.country || "");
      setCity(data?.location?.city || "");
    } catch (error) {
      console.log("Load edit post error:", error.message);
      Alert.alert("Error", error.message || "Failed to load post");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePost = async () => {
    if (saving) return;

    if (!title.trim()) {
      Alert.alert("Validation", "Title is required");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Validation", "Description is required");
      return;
    }

    if (!country.trim()) {
      Alert.alert("Validation", "Country is required");
      return;
    }

    try {
      setSaving(true);

      await updatePost(id, {
        type,
        title: title.trim(),
        description: description.trim(),
        image: image.trim(),
        pet_type: petType.trim(),
        location: {
          country: country.trim(),
          city: city.trim(),
        },
      });

      Alert.alert("Success", "Post updated successfully");
      router.replace(`/post/${id}`);
    } catch (error) {
      console.log("Update post error:", error.message);
      Alert.alert("Error", error.message || "Failed to update post");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.center}>
          <ActivityIndicator size="large" />
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.center}>
          <ThemedText>Post not found.</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedText type="title" style={styles.pageTitle}>
            Update Post
          </ThemedText>

          {!!image && (
            <Image source={{ uri: image }} style={styles.previewImage} />
          )}

          <ThemedText style={styles.label}>Type</ThemedText>
          <View style={styles.typeRow}>
            {POST_TYPES.map((item) => {
              const active = item === type;

              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.typeButton, active && styles.typeButtonActive]}
                  onPress={() => setType(item)}
                >
                  <ThemedText
                    style={[styles.typeButtonText, active && styles.typeButtonTextActive]}
                  >
                    {item}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>

          <ThemedText style={styles.label}>Title</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Post title"
            value={title}
            onChangeText={setTitle}
          />

          <ThemedText style={styles.label}>Description</ThemedText>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Post description"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <ThemedText style={styles.label}>Image URL</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Image URL"
            value={image}
            onChangeText={setImage}
            autoCapitalize="none"
          />

          <ThemedText style={styles.label}>Pet type</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Dog, Cat..."
            value={petType}
            onChangeText={setPetType}
          />

          <ThemedText style={styles.label}>Country</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Country"
            value={country}
            onChangeText={setCountry}
          />

          <ThemedText style={styles.label}>City</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="City"
            value={city}
            onChangeText={setCity}
          />

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.disabledButton]}
            onPress={handleUpdatePost}
            disabled={saving}
          >
            <ThemedText style={styles.saveButtonText}>
              {saving ? "Updating..." : "Save Changes"}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
          >
            <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
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
  pageTitle: {
    marginBottom: 18,
  },
  previewImage: {
    width: "100%",
    height: 220,
    borderRadius: 14,
    marginBottom: 16,
    backgroundColor: "#e9e9e9",
  },
  label: {
    marginBottom: 6,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
    marginBottom: 14,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  typeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#eee",
  },
  typeButtonActive: {
    backgroundColor: "#cdeccd",
  },
  typeButtonText: {
    textTransform: "capitalize",
  },
  typeButtonTextActive: {
    fontWeight: "700",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: "#eee",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  cancelButtonText: {
    fontWeight: "700",
    color: "#222",
  },
  disabledButton: {
    opacity: 0.7,
  },
});