import { StyleSheet, View } from "react-native";

import SharedLocationFilterBar from "../../components/location/SharedLocationFilterBar";
import PostsFeed from "../../components/home/PostsFeed";

export default function Home() {
  return (
    <View style={styles.container}>
      <SharedLocationFilterBar />
      <PostsFeed />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6FAF8",
  },
});
