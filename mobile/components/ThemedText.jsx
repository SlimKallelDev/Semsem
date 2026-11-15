import { StyleSheet, Text } from "react-native";

import { Colors } from "../constants/Colors";
import { typography } from "../constants/designSystem";
import { usePreferences } from "../contexts/PreferencesContext";

const TYPE_STYLES = {
  display: typography.display,
  title: typography.title,
  section: typography.section,
  subtitle: typography.body,
  body: typography.body,
  bodyStrong: typography.bodyStrong,
  caption: typography.caption,
};

const ThemedText = ({
  style,
  title = false,
  type = null,
  color,
  translate = true,
  ...props
}) => {
  const { language, t } = usePreferences();
  const theme = Colors.light;
  const resolvedType = type;
  const typeStyle = TYPE_STYLES[resolvedType] || styles.body;
  const textColor =
    color ||
    (["display", "title", "section"].includes(resolvedType) || title
      ? theme.title
      : theme.text);
  const children = Array.isArray(props.children)
    ? props.children.map((child) => typeof child === "string" && translate ? t(child) : child)
    : typeof props.children === "string"
      ? translate ? t(props.children) : props.children
      : props.children;

  return (
    <Text
      {...props}
      style={[
        styles.base,
        typeStyle,
        { color: textColor, writingDirection: language === "ar" ? "rtl" : "ltr" },
        language === "ar" ? styles.rtlText : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
  body: {
    fontSize: 15,
  },
  rtlText: {
    textAlign: "right",
  },
});

export default ThemedText;
