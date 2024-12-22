import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function ProfileButton({ onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <Icon name="person-circle-outline" size={50} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
});
