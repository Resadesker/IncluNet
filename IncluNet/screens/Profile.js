import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, AsyncStorage } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen({ route }) {
  const { username } = route.params;
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    fetch(`http://192.168.178.23:5000/api/profile/${username}`)
      .then((response) => response.json())
      .then((data) => setAvatar(data.avatar))
      .catch((error) => console.error('Error fetching profile:', error));
  }, [username]);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const formData = new FormData();
      formData.append('file', {
        uri: result.assets[0].uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      });

      fetch(`http://192.168.178.23:5000/api/profile/${username}/avatar`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
        .then((response) => response.json())
        .then((data) => setAvatar(data.avatar))
        .catch((error) => console.error('Error uploading avatar:', error));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.username}>Welcome, {username}</Text>
      {avatar && <Image source={{ uri: `http://192.168.178.23:5000${avatar}` }} style={styles.avatar} />}
      <TouchableOpacity style={styles.uploadButton} onPress={pickAvatar}>
        <Text style={styles.buttonText}>Change Avatar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
  },
  uploadButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
