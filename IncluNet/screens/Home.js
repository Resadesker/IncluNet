import React, { useEffect, useState } from 'react';
import { FlatList, View, StyleSheet, Dimensions } from 'react-native';
import Post from '../components/Post';
import ProfileButton from '../components/ProfileButton';

const { height } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetch('http://192.168.178.23:5000/api/posts') // Update with your backend IP
      .then((response) => response.json())
      .then((data) => setPosts(data))
      .catch((error) => console.error(error));
  }, []);

  const renderItem = ({ item }) => (
    <View style={{ height }}>
      <Post post={item} />
    </View>
  );

  return (
    <View style={styles.container}>
      <ProfileButton onPress={() => navigation.navigate('Profile')} />
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
    backgroundColor: '#000',
  },
});
