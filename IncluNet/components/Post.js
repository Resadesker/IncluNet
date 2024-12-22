import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

export default function Post({ post }) {
  return (
    <View style={styles.container}>
      <Image source={{ uri: `http://192.168.178.23:5000${post.image}` }} style={styles.postImage} />
      <View style={styles.infoContainer}>
        <Image source={{ uri: `http://192.168.178.23:5000${post.avatar}` }} style={styles.avatar} />
        <TouchableOpacity>
          <Icon name="play-circle-outline" size={40} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity>
          <Icon name="mic" size={40} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  infoContainer: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '90%',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#fff',
  },
});