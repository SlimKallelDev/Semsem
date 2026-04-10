import { StyleSheet, Text, View, Pressable } from 'react-native'
import React from 'react'
import { Colors } from "../constants/Colors"

function ThemedButton({ style, ...props }) {
  return (
        <Pressable 
        style={({pressed}) => [styles.btn, pressed && styles.pressed] }
        {...props}
        />
  )

}

const styles = StyleSheet.create({
    btn: {
        backgroundColor: Colors.primary,
        padding: 18,
        borderRadius: 6,
        marginVertical: 10,
    },
    pressed: {
        opacity: 0.5,
    },

})

export default ThemedButton

