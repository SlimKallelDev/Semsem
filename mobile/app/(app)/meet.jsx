import { StyleSheet, View } from "react-native";

import MeetGrid from "../../components/home/MeetGrid";

export default function MeetScreen() {
  return (
    <View style={styles.container}>
      <MeetGrid />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F4",
  },
});
