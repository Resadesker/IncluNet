import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState(null);

  const handleRegister = async () => {
    if (!avatar) {
      Alert.alert('Error', 'Please select an avatar.');
      return;
    }

    try {
      const response = await fetch('http://192.168.178.23:5000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          avatar: `data:image/jpeg;base64,${avatar}`,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Registration Successful', 'You can now log in.');
        navigation.replace('Login');
      } else {
        Alert.alert('Registration Failed', data.error);
      }
    } catch (error) {
      console.error('Registration error:', error.message);
      Alert.alert('Error', 'Something went wrong');
    }
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].base64);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity onPress={pickAvatar}>
        <Text style={styles.link}>Pick Avatar</Text>
      </TouchableOpacity>
      {avatar && (
        <Image
          source={{ uri: `data:image/jpeg;base64,${avatar}` }}
          style={styles.avatarPreview}
        />
      )}
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  input: {
    width: '80%',
    padding: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  link: {
    color: '#007bff',
    marginVertical: 10,
  },
  avatarPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginVertical: 10,
  },
});