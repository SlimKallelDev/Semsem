import { Text, View , useColorScheme, TextInput} from 'react-native'
import { Colors } from "../constants/Colors"

const ThemedTextInput = ({ style, ...props }) => {

    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme] ?? Colors.light

  return (
    <TextInput 
        style={[
            {
                backgroundColor: theme.uiBackgroundColor,
                color: theme.text,
                padding: 20,
                borderRadius: 6,
                borderWidth: 0.2,
            }, style
        ]}
        {...props}
    />
  )
}

export default ThemedTextInput