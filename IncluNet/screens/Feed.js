import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import PagerView from 'react-native-pager-view';
import Post from './components/Post';

export default function Feed() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetch('http://192.168.178.23:5000/api/posts')
      .then((response) => response.json())
      .then((data) => setPosts(data))
      .catch((error) => console.error('Error fetching posts:', error));
  }, []);

  return (
    <PagerView style={styles.pagerView} initialPage={0} orientation="vertical">
      {posts.map((post) => (
        <View key={post.id}>
          <Post post={post} />
        </View>
      ))}
    </PagerView>
  );
}

const styles = StyleSheet.create({
  pagerView: {
    flex: 1,
  },
});
