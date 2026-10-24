import { StyleSheet, TextInput } from "react-native";

import { Colors } from "../constants/Colors";
import { radii } from "../constants/designSystem";

const ThemedTextInput = ({ style, placeholderTextColor, ...props }) => {
  const theme = Colors.light;

  return (
    <TextInput
      placeholderTextColor={placeholderTextColor || theme.placeholder}
      selectionColor={Colors.primary}
      style={[
        styles.input,
        {
          backgroundColor: theme.uiBackground,
          borderColor: theme.border,
          color: theme.title,
        },
        style,
      ]}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    minHeight: 54,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radii.md,
    borderWidth: 1,
    fontSize: 15,
    lineHeight: 20,
  },
});

export default ThemedTextInput;
