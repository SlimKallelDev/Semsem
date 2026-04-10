import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import AppTopBar from "../../components/AppTopBar";
import Spacer from "../../components/Spacer";
import ThemedText from "../../components/ThemedText";
import ThemedView from "../../components/ThemedView";
import { useUser } from "../../contexts/UserContext";
import { startConversation } from "../../services/messageService";
import { getPetById } from "../../services/petService";

export default function PetDetails() {
  const { id } = useLocalSearchParams();
  const { user } = useUser();

  const currentUserId = user?._id || user?.id || user?.$id || null;

  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    if (id) {
      loadPet();
    }
  }, [id]);

  const loadPet = async () => {
    try {
      setLoading(true);
      const data = await getPetById(id);
      setPet(data);
    } catch (error) {
      console.error("Error loading pet:", error);
      Alert.alert("Error", "Failed to load pet details");
    } finally {
      setLoading(false);
    }
  };

  const isOwner = useMemo(() => {
    if (!currentUserId || !pet?.owner?._id) return false;
    return String(currentUserId) === String(pet.owner._id);
  }, [currentUserId, pet]);

  const handleStartChat = async () => {
    try {
      if (!currentUserId) {
        Alert.alert("Error", "You must be logged in");
        return;
      }

      if (!pet?.owner?._id) {
        Alert.alert("Error", "Owner not found");
        return;
      }

      if (isOwner) {
        return;
      }

      setStartingChat(true);

      const conversation = await startConversation({
        user1: currentUserId,
        user2: pet.owner._id,
        petId: pet._id,
      });

      if (!conversation?._id) {
        throw new Error("Conversation was not created");
      }

      router.push(`/messages/${conversation._id}`);
    } catch (error) {
      console.error("Error starting conversation:", error);
      Alert.alert("Error", "Failed to start conversation");
    } finally {
      setStartingChat(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <AppTopBar title="Pet Profile" />
        <ThemedView style={styles.center}>
          <ActivityIndicator size="large" />
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!pet) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <AppTopBar title="Pet Profile" />
        <ThemedView style={styles.center}>
          <ThemedText>Pet not found.</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ThemedView style={styles.screen}>
        <AppTopBar title="Pet Profile" />

        <ScrollView contentContainerStyle={styles.container}>
          <Image
            source={{
              uri: pet.image || "https://via.placeholder.com/400x400.png?text=Pet",
            }}
            style={styles.image}
          />

          <ThemedText style={styles.name}>{pet.name}</ThemedText>
          <ThemedText style={styles.info}>
            {pet.type || "Pet"} | {pet.breed || "Unknown"}
          </ThemedText>

          <Spacer height={20} />

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Description</ThemedText>
            <ThemedText style={styles.description}>
              {pet.description || "No description available."}
            </ThemedText>
          </View>

          <Spacer height={20} />

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Owner</ThemedText>
            <ThemedText style={styles.ownerText}>
              {pet.owner?.name || "Unknown owner"}
            </ThemedText>
            {!!pet.owner?.email && (
              <ThemedText style={styles.ownerSubText}>
                {pet.owner.email}
              </ThemedText>
            )}
          </View>

          {!isOwner && (
            <>
              <Spacer height={28} />
              <TouchableOpacity
                onPress={handleStartChat}
                style={[
                  styles.messageButton,
                  startingChat && styles.messageButtonDisabled,
                ]}
                disabled={startingChat}
                activeOpacity={0.88}
              >
                <ThemedText style={styles.messageButtonText}>
                  {startingChat ? "Opening..." : "Message owner"}
                </ThemedText>
              </TouchableOpacity>
            </>
          )}
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
  screen: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: 300,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: "#e9e9e9",
  },
  name: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 6,
  },
  info: {
    fontSize: 16,
    opacity: 0.7,
  },
  section: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#f7f7f7",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownerText: {
    fontSize: 16,
    fontWeight: "600",
  },
  ownerSubText: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  messageButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  messageButtonDisabled: {
    opacity: 0.7,
  },
  messageButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
