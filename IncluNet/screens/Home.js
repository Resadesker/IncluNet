import React, { useEffect, useState } from 'react';
import {
  FlatList,
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const { height, width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetch('http://192.168.178.23:5000/api/posts') // Update with your backend IP
      .then((response) => response.json())
      .then((data) => setPosts(data))
      .catch((error) => console.error('Error fetching posts:', error));
  }, []);

  const pickImage = async () => {
    // Ask for permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      alert('Permission to access camera roll is required!');
      return;
    }

    // Pick the image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 1,
      base64: true, // Include base64 for upload
    });

    if (!result.canceled && result.assets[0]) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      await uploadImage(base64Image);
    }
  };

  const uploadImage = async (base64Image) => {
    try {
      const response = await fetch('http://192.168.178.23:5000/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ file: base64Image }),
      });
  
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload image');
      }
  
      const data = await response.json();
      console.log('Upload response:', data); // Debugging
      setPosts((prevPosts) => [data, ...prevPosts]); // Add new post to the top
    } catch (error) {
      console.error('Failed to upload image:', error.message);
    }
  };
  

  const renderItem = ({ item }) => (
    <View style={styles.postContainer}>
      <View style={styles.headerContainer}>
        <Image source={{ uri: `http://192.168.178.23:5000${item.avatar}` }} style={styles.avatar} />
        <Text style={styles.username}>{item.user_id}</Text>
      </View>
      <Image
        source={{ uri: `http://192.168.178.23:5000${item.image}` }}
        style={styles.postImage}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
        <Image
          source={{ uri: 'http://192.168.178.23:5000/uploads/default_avatar.png' }}
          style={styles.profileIcon}
        />
      </TouchableOpacity>
      <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
        <Text style={styles.plusText}>+</Text>
      </TouchableOpacity>
      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  profileButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
  },
  profileIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  uploadButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  plusText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
  },
  postContainer: {
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    position: 'absolute',
    top: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  postImage: {
    width: width,
    height: height,
    resizeMode: 'contain',
  },
});
