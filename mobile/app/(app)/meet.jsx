import { StyleSheet, View } from "react-native";

import SharedLocationFilterBar from "../../components/location/SharedLocationFilterBar";
import MeetGrid from "../../components/home/MeetGrid";

export default function MeetScreen() {
  return (
    <View style={styles.container}>
      <SharedLocationFilterBar />
      <MeetGrid />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6FAF8",
  },
});
