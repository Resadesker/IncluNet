import React, { useState, useEffect, useContext } from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet, FlatList, Dimensions, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { UserContext } from '../UserContext';
import Constants from 'expo-constants';

const { width: screenWidth } = Dimensions.get('window');

const { width } = Dimensions.get('window');

export default function ProfileScreen({ route, navigation }) {
  const { user } = useContext(UserContext); // Access the logged-in user's data
  const openProfile = route?.params?.username;
  const [avatar, setAvatar] = useState(null);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    if (openProfile) {
      fetch(`http://${Constants.expoConfig.extra.API_URL}/api/profile/${openProfile}`)
        .then((response) => response.json())
        .then((data) => {
          setAvatar(data.avatar);
          setPosts(data.posts);
        })
        .catch((error) => console.error('Error fetching profile:', error));
    }
  }, [openProfile]);
  useEffect(() => {
    if (!openProfile) return;

    const fetchProfile = async () => {
      try {
        const res = await fetch(`http://${Constants.expoConfig.extra.API_URL}/api/profile/${openProfile}`);
        const data = await res.json();
        setAvatar(data.avatar);
        setPosts(data.posts);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, [openProfile]);


  const renderPost = ({ item }) => (
    <Image source={{ uri: `http://${Constants.expoConfig.extra.API_URL}${item.image}` }} style={styles.postImage} />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {user?.username != openProfile && (
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile', { username: user.username })}
          >
            <Image
              source={{
                uri: user?.avatar
                  ? `http://${Constants.expoConfig.extra.API_URL}${user.avatar}`
                  : `http://${Constants.expoConfig.extra.API_URL}/uploads/default_avatar.jpeg`,
              }}
              style={styles.profileIcon}
            />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.chatButton} onPress={() => navigation.navigate('Chat', {
          chatId: [openProfile, user?.username].sort().join('_'), userId: user?.username
        })}>
          <Text style={styles.buttonText}>💬</Text>
        </TouchableOpacity>

        <View style={styles.avatarContainer}>
          {avatar && (
            <Image
              source={{ uri: `http://${Constants.expoConfig.extra.API_URL}${avatar}` }}
              style={styles.avatar}
            />
          )}
        </View>

        <TouchableOpacity style={styles.homeButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.buttonText}>🏠</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id.toString()}
        numColumns={3}
        contentContainerStyle={styles.postsContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: 10,
  },
  profileButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    // left: '50%',
    // transform: [{ translateX: -screenWidth / 2 }],
    zIndex: 1,
  },
  profileIcon: {
    width: 100,
    height: 100,
    borderRadius: 25,
  },
  avatarContainer: {
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: 'blue',
    width: screenWidth,
    left: '50%',
    transform: [{ translateX: -screenWidth / 2 }],
  },
  avatar: {
    // left: 480,
    left: '50%',
    transform: [{ translateX: -screenWidth / 2 }],
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  homeButton: {
    position: 'absolute',
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFAA00',
    borderRadius: 55,
    marginTop: -40,
    marginRight: 20,
    top: 80,
    right: 20,
  },
  chatButton: {
    position: 'absolute',
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFAA00',
    borderRadius: 55,
    marginTop: -20,
    marginLeft: 280,
    bottom: 80,
    zIndex: 5,
  },
  buttonText: {
    color: '#007bff',
    fontSize: 50,
  },
  postsContainer: {
    padding: 5,
  },
  postImage: {
    width: width / 3 - 10,
    height: width / 3 - 10,
    margin: 5,
  },
});