import { StyleSheet, View } from "react-native";

import { Colors } from "../constants/Colors";
import { radii, shadows } from "../constants/designSystem";

const ThemedCard = ({ style, ...props }) => {
  const theme = Colors.light;

  return (
    <View
      style={[
        {
          backgroundColor: theme.uiBackground,
          borderColor: theme.border,
        },
        styles.card,
        style,
      ]}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: 20,
    ...shadows.soft,
  },
});

export default ThemedCard;
