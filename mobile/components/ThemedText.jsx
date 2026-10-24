import { StyleSheet, Text } from "react-native";

import { Colors } from "../constants/Colors";
import { typography } from "../constants/designSystem";

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
  ...props
}) => {
  const theme = Colors.light;
  const resolvedType = type;
  const typeStyle = TYPE_STYLES[resolvedType] || styles.body;
  const textColor =
    color ||
    (["display", "title", "section"].includes(resolvedType) || title
      ? theme.title
      : theme.text);

  return (
    <Text
      style={[styles.base, typeStyle, { color: textColor }, style]}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
  body: {
    fontSize: 15,
  },
});

export default ThemedText;
