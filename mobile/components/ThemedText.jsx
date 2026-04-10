import { Text, useColorScheme } from 'react-native'
import { Colors } from "../constants/Colors"

const ThemedText = ({ style, title = false, color, ...props }) => {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.light
  const textColor = color || (title ? theme.title : theme.text)  // <-- use color prop if provided

  return (
    <Text
      style={[{ color: textColor }, style]}
      {...props}
    />
  )
}

export default ThemedText