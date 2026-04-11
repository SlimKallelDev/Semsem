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
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 14,
        marginVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pressed: {
        opacity: 0.5,
    },

})

export default ThemedButton

