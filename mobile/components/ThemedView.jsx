import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "../constants/Colors";

const ThemedView = ({ style, safe = false, ...props }) => {
  const theme = Colors.light;
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        {
          backgroundColor: theme.background,
          ...(safe
            ? {
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
              }
            : {}),
        },
        style,
      ]}
      {...props}
    />
  );
};

export default ThemedView;
