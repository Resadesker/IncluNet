import React, { useEffect, useState, useRef } from "react";
import { View, TouchableOpacity, Image, FlatList, Text, StyleSheet, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { Audio as ExpoAudio } from "expo-av";
import { io } from "socket.io-client";
import Constants from 'expo-constants';

const API_BASE = `http://${Constants.expoConfig.extra.API_URL}`;

export default function ChatScreen({ route, navigation }) {
  // Expect route.params: chatId, userId, otherUser (with avatar, nickname)
  const { chatId, userId, otherUser } = route.params;
  const [messages, setMessages] = useState([]);
  const [recording, setRecording] = useState(null);
  const socket = useRef(null);

  // Set a minimal audio mode configuration on mount
  useEffect(() => {
    async function configureAudio() {
      try {
        await ExpoAudio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      } catch (error) {
        console.error("Error setting audio mode:", error);
      }
    }
    configureAudio();
  }, []);

  // Connect to WebSocket and fetch messages
  useEffect(() => {
    console.log("Chat ID: " + chatId);
    socket.current = io(API_BASE);
    socket.current.emit("join", { chat_id: chatId });
    socket.current.on("new_message", (msg) => {
      console.log("Received new message:", msg);
      setMessages((prev) => [msg, ...prev]);
    });
    fetchMessages();
    return () => {
      socket.current.disconnect();
    };
  }, []);

  // Fetch past messages from REST API
  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/messages/${chatId}`);
      const data = await res.json();
      setMessages(data.reverse());
    } catch (err) {
      console.error("Failed to load messages", err);
    }
  };

  // Pick an image and send it via WebSocket
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission required", "Permission to access camera roll is required!");
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 1,
        base64: true, // Request base64 data
      });
      console.log("Image picker result: ...");
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let base64Data = asset.base64;
        // If base64 is missing, read from file URI manually.
        if (!base64Data) {
          console.log("No base64 in asset; reading file from URI");
          base64Data = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
        if (base64Data) {
          // Build the base64 string with the appropriate mime type.
          const base64Image = `data:${asset.mimeType};base64,${base64Data}`;
          sendMessage({ image: base64Image });
        } else {
          console.error("No base64 data available after reading file");
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
    }
  };

  // Toggle recording: start or stop, then send audio
  const toggleRecording = async () => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        console.log("Recording stopped. File stored at", uri);
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        sendMessage({ audio: `data:audio/m4a;base64,${base64}` });
        setRecording(null);
      } else {
        const { granted } = await ExpoAudio.requestPermissionsAsync();
        if (!granted) {
          console.error("Audio permissions not granted");
          return;
        }
        await ExpoAudio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const rec = new ExpoAudio.Recording();
        await rec.prepareToRecordAsync(ExpoAudio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
        await rec.startAsync();
        console.log("Recording started");
        setRecording(rec);
      }
    } catch (error) {
      console.error("Error during recording:", error);
      setRecording(null);
    }
  };

  // Send a message via WebSocket
  const sendMessage = (data) => {
    console.log("Sending message in chat ", chatId);
    const msg = { fk_chat: chatId, fk_author: userId, ...data };
    console.log("Sending message:...");
    socket.current.emit("send_message", msg);
    console.log("Sent message!");
  };

  // Render each message (image or audio)
  const renderItem = ({ item }) => {
    console.log("Rendering message:", item.fk_author, userId);
    const isOwnMessage = item.fk_author == userId;
    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        {item.fk_img && (
          <Image source={{ uri: `${API_BASE}${item.fk_img}` }} style={styles.messageImage} />
        )}
        {item.fk_audio && (
          <TouchableOpacity
            onPress={async () => {
              try {
                const { sound } = await ExpoAudio.Sound.createAsync(
                  { uri: `${API_BASE}${item.fk_audio}` },
                  { shouldPlay: true }
                );
              } catch (error) {
                console.error("Error playing audio", error);
              }
            }}
            style={styles.audioButton}
          >
            <Text style={styles.audioButtonText}>🔊</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };
  return (
    <View style={styles.container}>
      {/* Header with Back Button and Other User Info */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.homeButton} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>🏠</Text>
        </TouchableOpacity>
        {otherUser && (
          <View style={styles.userInfo}>
            <Image source={{ uri: `${API_BASE}${otherUser.avatar}` }} style={styles.avatar} />
            <Text style={styles.username}>{otherUser.nickname}</Text>
          </View>
        )}
      </View>
      {/* Chat Messages */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        inverted
        renderItem={renderItem}
        contentContainerStyle={styles.messagesList}
      />
      {/* Controls for sending image and audio */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={pickImage} style={styles.controlButton}>
          <Text style={styles.controlButtonText}>🖼️</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleRecording} style={styles.controlButton}>
          <Text style={styles.controlButtonText}>{recording ? "⏹️" : "🎤"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f0f0" },
  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },
  homeButton: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFAA00',
    borderRadius: 55,
    marginTop: 120,
    zIndex: 1,
    marginRight: 20,
    bottom: 20,
  },
  buttonText: {
    color: '#007bff',
    fontSize: 50,
  },
  userInfo: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  username: { fontSize: 18, fontWeight: "bold" },
  messagesList: { padding: 10 },
  messageContainer: { marginBottom: 10, alignItems: "flex-start" },
  messageImage: { width: 200, height: 200, borderRadius: 10 },
  audioButton: { padding: 10, backgroundColor: "#007AFF", borderRadius: 25 },
  audioButtonText: { color: "#fff", fontSize: 20 },
  controls: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 10, backgroundColor: "#fff" },
  controlButton: { padding: 10 },
  controlButtonText: { fontSize: 50 },
  messageContainer: {
    maxWidth: "70%",
    marginVertical: 5,
    padding: 10,
    borderRadius: 10,
  },
  ownMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#DCF8C6",
  },
  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
  },
  messageImage: {
    width: 350,
    height: 350,
    borderRadius: 10,
  },
  audioButton: {
    padding: 10,
    backgroundColor: "#007AFF",
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
  },
  audioButtonText: {
    color: "#fff",
    fontSize: 50,
  },
});