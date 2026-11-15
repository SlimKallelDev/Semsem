import { StyleSheet, TextInput } from "react-native";

import { Colors } from "../constants/Colors";
import { radii } from "../constants/designSystem";
import { usePreferences } from "../contexts/PreferencesContext";

const ThemedTextInput = ({ style, placeholderTextColor, placeholder, ...props }) => {
  const { t, language } = usePreferences();
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
        language === "ar" ? styles.rtlInput : null,
      ]}
      writingDirection={language === "ar" ? "rtl" : "ltr"}
      placeholder={typeof placeholder === "string" ? t(placeholder) : placeholder}
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
  rtlInput: { textAlign: "right" },
});

export default ThemedTextInput;
