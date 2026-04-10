import { useState } from "react";
import {
  Alert,
  Image,
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
import { useUser } from "../../contexts/UserContext";
import { createPet } from "../../services/petService";

const GREEN = "#4CAF50";
const PET_TYPES = ["Dog", "Cat", "Bird", "Rabbit", "Other"];

export default function NewPetScreen() {
  const { user } = useUser();
  const userId = user?._id || user?.id || user?.$id || null;

  const [name, setName] = useState("");
  const [type, setType] = useState("Dog");
  const [breed, setBreed] = useState("");
  const [image, setImage] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    if (!userId) {
      Alert.alert("Error", "You must be logged in");
      return;
    }

    if (!name.trim()) {
      Alert.alert("Validation Error", "Pet name is required");
      return;
    }

    if (!type.trim()) {
      Alert.alert("Validation Error", "Pet type is required");
      return;
    }

    try {
      setSubmitting(true);

      await createPet({
        owner: userId,
        name: name.trim(),
        type: type.trim(),
        breed: breed.trim(),
        image: image.trim(),
        date: date.trim() || undefined,
        description: description.trim(),
      });

      Alert.alert("Success", "Pet created successfully");
      router.back();
    } catch (error) {
      console.log("Create pet error:", error.message);
      Alert.alert("Error", error.message || "Failed to create pet");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ThemedView style={styles.container}>
        <AppTopBar title="Create New Pet" />

        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Create New Pet
          </ThemedText>

          <ThemedText style={styles.label}>Pet Name</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Enter pet name"
            value={name}
            onChangeText={setName}
          />

          <ThemedText style={styles.label}>Type</ThemedText>
          {PET_TYPES.map((item) => {
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

          <ThemedText style={styles.label}>Breed</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Persian, Labrador..."
            value={breed}
            onChangeText={setBreed}
          />

          <ThemedText style={styles.label}>Pet Image</ThemedText>

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
              <ThemedText style={styles.imageActionButtonText}>Browse</ThemedText>
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

          <ThemedText style={styles.label}>Date</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Birth or adoption date"
            value={date}
            onChangeText={setDate}
          />

          <ThemedText style={styles.label}>Description</ThemedText>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your pet"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <ThemedText style={styles.submitButtonText}>
              {submitting ? "Creating..." : "Create Pet"}
            </ThemedText>
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
  title: {
    marginBottom: 20,
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
    backgroundColor: GREEN,
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
    backgroundColor: GREEN,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 24,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
