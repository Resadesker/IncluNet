import React, { useEffect, useState, useContext } from 'react';
import {
  FlatList,
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Image,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { UserContext } from '../UserContext';
import Constants from 'expo-constants';

const { height, width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const { user } = useContext(UserContext);

  useEffect(() => {
    fetch(`http://${Constants.expoConfig.extra.API_URL}/api/posts`)
      .then((r) => r.json())
      .then(setPosts)
      .catch(console.error);
  }, []);

  const pickImage = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) return Alert.alert('Permission to access camera roll is required!');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 1,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      uploadImage(base64Image);
    }
  };

  const uploadImage = async (base64Image) => {
    if (!user?.id) return Alert.alert('Error', 'You must be logged in to upload an image.');
    try {
      const res = await fetch(`http://${Constants.expoConfig.extra.API_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image, fk_user_id: user.id }),
      });
      if (!res.ok) throw await res.json();
      const newPost = await res.json();
      setPosts((prev) => [newPost, ...prev]);
      Alert.alert('Success', 'Image uploaded successfully!');
    } catch (error) {
      console.error(error);
      Alert.alert('Upload Failed', error.error || 'Something went wrong.');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.postContainer}>
      <View style={styles.leftColumn}>
        <TouchableOpacity onPress={() => navigation.navigate('Profile', { username: item.user.nickname })}>
          <Image source={{ uri: `http://${Constants.expoConfig.extra.API_URL}${item.user.avatar}` }} style={styles.avatar} />
        </TouchableOpacity>
      </View>

      <View style={styles.centerColumn}>
        <Image source={{ uri: `http://${Constants.expoConfig.extra.API_URL}${item.image}` }} style={styles.postImage} />
      </View>

      <View style={styles.rightColumn}>
        {!item.audio && (
          <TouchableOpacity style={styles.playButton}>
            <Text style={styles.buttonText}>▶</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => navigation.navigate('Chat', {
            chatId: [item.user.nickname, user.username].sort().join('_'),
            userId: user.username
          })}
        >
          <Text style={styles.buttonText}>🗣️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.profileButton}
        onPress={() => navigation.navigate('Profile', { username: user.username })}
      >
        <Image
          source={{
            uri: user.avatar
              ? `http://${Constants.expoConfig.extra.API_URL}${user.avatar}`
              : `http://${Constants.expoConfig.extra.API_URL}/uploads/default_avatar.jpeg`,
          }}
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
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: 0, marginBottom: -25, backgroundColor: '#fff' },

  profileButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    elevation: 10,
  },
  profileIcon: { width: 100, height: 100, borderRadius: 25 },

  uploadButton: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 10,
  },
  plusText: { color: '#fff', fontSize: 40, fontWeight: 'bold', bottom: 3 },

  postContainer: {
    width: width,
    height: height,
    flexDirection: 'row',
    alignItems: 'center',
  },

  leftColumn: { width: '24%', justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 200, height: 200, borderRadius: 560 },

  centerColumn: {
    width: '52%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  postImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  rightColumn: {
    width: '24%',
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 80,
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    width: 120,
    height: 120,
    borderRadius: 80,
    backgroundColor: '#FFAA00',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: 0 }],
    // left or right stays as you like
  },
  chatButton: {
    position: 'absolute',
    bottom: '10%',
    width: 120,
    height: 120,
    borderRadius: 80,
    backgroundColor: '#FFAA00',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: -60 }],
    // left or right stays as you like
  },
  buttonText: { fontSize: 52, color: '#fff' },
});
