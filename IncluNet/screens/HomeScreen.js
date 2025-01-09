import React, { useEffect, useState } from 'react';
import { useContext } from 'react';
import { UserContext } from '../UserContext';
import {
  FlatList,
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const { height, width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [chats, setChats] = useState([]);

  useEffect(() => {
    // Fetch posts
    fetch('http://192.168.178.23:5000/api/posts')
      .then((response) => response.json())
      .then((data) => setPosts(data))
      .catch((error) => console.error('Error fetching posts:', error));
    console.log(posts);

    // Fetch user's chats
    fetch('http://192.168.178.23:5000/api/chats')
      .then((response) => response.json())
      .then((data) => setChats(data))
      .catch((error) => console.error('Error fetching chats:', error));
  }, []);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      alert('Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 1,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      await uploadImage(base64Image);
    }
  };

  const { user } = useContext(UserContext); // Access the logged-in user's data

  const uploadImage = async (base64Image) => {
    try {
      const fk_user_id = user?.id; // Ensure user ID is available
      if (!fk_user_id) {
        Alert.alert('Error', 'You must be logged in to upload an image.');
        return;
      }

      const response = await fetch('http://192.168.178.23:5000/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ image: base64Image, fk_user_id }), // Ensure 'image' key is used
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Image upload failed. Please try again.');
      }

      const data = await response.json();
      setPosts((prevPosts) => [data, ...prevPosts]); // Add new post to the state
      Alert.alert('Success', 'Image uploaded successfully!');
    } catch (error) {
      console.error('Failed to upload image:', error.message);
      Alert.alert('Upload Failed', error.message || 'Something went wrong.');
    }
  };



  const startChat = (userId) => {
    fetch(`http://192.168.178.23:5000/api/start_chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ user_2: userId }),
    })
      .then((response) => response.json())
      .then((data) => {
        Alert.alert('Chat started!', `Chat ID: ${data.chat_id}`);
        setChats((prevChats) => [data, ...prevChats]);
      })
      .catch((error) => console.error('Error starting chat:', error));
  };

  const renderItem = ({ item }) => (
    <View style={styles.postContainer}>
      <View style={styles.leftColumn}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
        >
          <Image source={{ uri: `http://192.168.178.23:5000${item.avatar}` }} style={styles.avatar} />
          <Image source={{ uri: `http://192.168.178.23:5000/uploads/default_avatar.jpeg` }} style={styles.posterAvatar} />
        </TouchableOpacity>
      </View>
      <Image source={{ uri: `http://192.168.178.23:5000${item.image}` }} style={styles.postImage} />
      <View style={styles.rightColumn}>
        {item.audio && (
          <TouchableOpacity style={styles.playButton}>
            <Text style={styles.buttonText}>▶</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => startChat(item.user_id)}
        >
          <Text style={styles.buttonText}>💬</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.profileButton}
        onPress={() => navigation.navigate('Profile')}
      >
        <Image
          source={{ uri: 'http://192.168.178.23:5000/uploads/default_avatar.jpeg' }}
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
    width: 100,
    height: 100,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftColumn: {
    width: '23%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginTop: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignSelf: 'flex-start', // Ensure avatar stays at the top left
  },
  postImage: {
    width: '54%',
    height: height,
    resizeMode: 'cover',
  },
  rightColumn: {
    width: '23%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#00FF00',
    borderRadius: 25,
    marginBottom: 20,
  },
  chatButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFAA00',
    borderRadius: 25,
    marginTop: 500,
    bottom: 20,
  },
  buttonText: {
    fontSize: 20,
    color: '#fff',
  },
});
