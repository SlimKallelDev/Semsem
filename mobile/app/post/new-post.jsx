import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import AppTopBar from "../../components/AppTopBar";
import ThemedText from "../../components/ThemedText";
import ThemedView from "../../components/ThemedView";
import { COUNTRIES } from "../../constants/countries";
import { createPost } from "../../services/postService";

const POST_TYPES = ["Adoption", "Lost", "Found", "Mating", "General"];

export default function NewPostScreen() {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Adoption");
  const [description, setDescription] = useState("");
  const [petType, setPetType] = useState("");
  const [image, setImage] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return COUNTRIES;

    return COUNTRIES.filter((item) =>
      item.toLowerCase().includes(countrySearch.trim().toLowerCase())
    );
  }, [countrySearch]);

  const pickFromGallery = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Gallery permission is required to choose an image."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.log("Gallery picker error:", error.message);
      Alert.alert("Error", "Failed to open gallery");
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Camera permission is required to take a photo."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.log("Camera error:", error.message);
      Alert.alert("Error", "Failed to open camera");
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Validation Error", "Title is required");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Validation Error", "Description is required");
      return;
    }

    if (!country.trim()) {
      Alert.alert("Validation Error", "Country is required");
      return;
    }

    try {
      setSubmitting(true);

      await createPost({
        title: title.trim(),
        type: type.toLowerCase(),
        description: description.trim(),
        image: image.trim(),
        pet_type: petType.trim(),
        location: {
          city: city.trim(),
          country: country.trim(),
        },
      });

      Alert.alert("Success", "Post created successfully");
      router.back();
    } catch (error) {
      console.log("Create post error:", error.message);
      Alert.alert("Error", error.message || "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ThemedView style={styles.container}>
        <AppTopBar title="Create New Post" />

        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Create New Post
          </ThemedText>

          <ThemedText style={styles.label}>Title</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Enter post title"
            value={title}
            onChangeText={setTitle}
          />

          <ThemedText style={styles.label}>Type</ThemedText>
          {POST_TYPES.map((item) => {
            const active = item === type;

            return (
              <TouchableOpacity
                key={item}
                style={[styles.typeButton, active && styles.activeTypeButton]}
                onPress={() => setType(item)}
              >
                <ThemedText style={active ? styles.activeTypeText : null}>
                  {item}
                </ThemedText>
              </TouchableOpacity>
            );
          })}

          <ThemedText style={styles.label}>Description</ThemedText>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the post"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <ThemedText style={styles.label}>Pet Type</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="dog, cat..."
            value={petType}
            onChangeText={setPetType}
          />

          <ThemedText style={styles.label}>Post Image</ThemedText>

          <View style={styles.imageButtonsRow}>
            <TouchableOpacity
              style={styles.imageActionButton}
              onPress={takePhoto}
            >
              <ThemedText style={styles.imageActionButtonText}>
                Take Photo
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.imageActionButton}
              onPress={pickFromGallery}
            >
              <ThemedText style={styles.imageActionButtonText}>
                Browse
              </ThemedText>
            </TouchableOpacity>
          </View>

          {!!image && (
            <View style={styles.previewWrapper}>
              <Image source={{ uri: image }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setImage("")}
              >
                <ThemedText style={styles.removeImageText}>
                  Remove image
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}

          <ThemedText style={styles.sectionTitle}>Location</ThemedText>

          <ThemedText style={styles.label}>Country *</ThemedText>
          <TouchableOpacity
            style={styles.selectInput}
            onPress={() => setCountryModalVisible(true)}
          >
            <ThemedText
              style={country ? styles.selectText : styles.placeholderText}
            >
              {country || "Select a country"}
            </ThemedText>
          </TouchableOpacity>

          <ThemedText style={styles.label}>City</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Tunis"
            value={city}
            onChangeText={setCity}
          />

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <ThemedText style={styles.submitButtonText}>
              {submitting ? "Creating..." : "Create Post"}
            </ThemedText>
          </TouchableOpacity>
        </ScrollView>

        <Modal
          visible={countryModalVisible}
          animationType="slide"
          onRequestClose={() => setCountryModalVisible(false)}
        >
          <ThemedView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <ThemedText type="title">Select Country</ThemedText>
              <TouchableOpacity onPress={() => setCountryModalVisible(false)}>
                <ThemedText style={styles.closeText}>Close</ThemedText>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Search country"
              value={countrySearch}
              onChangeText={setCountrySearch}
            />

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryItem}
                  onPress={() => {
                    setCountry(item);
                    setCountryModalVisible(false);
                    setCountrySearch("");
                  }}
                >
                  <ThemedText>{item}</ThemedText>
                </TouchableOpacity>
              )}
            />
          </ThemedView>
        </Modal>
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
  title: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 18,
    fontWeight: "bold",
  },
  label: {
    marginBottom: 8,
    marginTop: 14,
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  selectInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: "#fff",
  },
  selectText: {
    color: "#000",
  },
  placeholderText: {
    color: "#888",
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  typeButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#eee",
    marginBottom: 8,
  },
  activeTypeButton: {
    backgroundColor: "#4CAF50",
  },
  activeTypeText: {
    color: "#fff",
    fontWeight: "bold",
  },
  imageButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  imageActionButton: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  imageActionButtonText: {
    fontWeight: "700",
  },
  previewWrapper: {
    marginBottom: 12,
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: 220,
    borderRadius: 14,
    backgroundColor: "#e9e9e9",
    marginBottom: 10,
  },
  removeImageButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  removeImageText: {
    color: "#c0392b",
    fontWeight: "700",
  },
  submitButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 24,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    padding: 16,
    paddingTop: 24,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  closeText: {
    color: "#4CAF50",
    fontWeight: "700",
  },
  countryItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
});
