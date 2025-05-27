import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [selectedDisabilities, setSelectedDisabilities] = useState([]);

  const disabilityOptions = [
    {
      id: 'epilepsy',
      label: 'Epilepsie',
      description:
        'Die App kann auf Schwarz-Weiß umgestellt werden oder das Scrollen wird verzögert, um die Sichtbarkeit bunter Bilder zu reduzieren.',
    },
    {
      id: 'eye_control',
      label: 'Augensteuerung',
      description:
        'Tasten werden größer dargestellt, und spezielle Pfeile für das Scrollen stehen zur Verfügung.',
    },
    {
      id: 'cognitive',
      label: 'Kognitive Einschränkungen',
      description:
        'Die App verwendet einfache Bilder und Audios, um die Kommunikation zu erleichtern.',
    },
    {
      id: 'hearing',
      label: 'Hörprobleme',
      description:
        'Audioinhalte können mit Untertiteln angezeigt werden (sofern die Person lesen kann).',
    },
    {
      id: 'visual_impairment',
      label: 'Sehschwäche',
      description:
        'Posts können von einer KI beschrieben und die Inhalte vorgelesen werden.',
    },
  ];

  const toggleDisability = (id) => {
    setSelectedDisabilities((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleRegister = async () => {
    if (!avatar) {
      Alert.alert('Fehler', 'Bitte wählen Sie ein Avatar.');
      return;
    }

    try {
      const response = await fetch(`http://${Constants.expoConfig.extra.API_URL}/api/register`, {
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
        Alert.alert('Registrierung Erfolgreich', 'Sie können sich jetzt anmelden.');
        navigation.replace('Login');
      } else {
        Alert.alert('Registrierung Fehlgeschlagen', data.error);
      }
    } catch (error) {
      console.error('Registrierungsfehler:', error.message);
      Alert.alert('Fehler', 'Etwas ist schiefgelaufen');
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
    <ScrollView contentContainerStyle={styles.container}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>Zurück</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Registrieren</Text>
      <TextInput
        style={styles.input}
        placeholder="Benutzername"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Passwort"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity onPress={pickAvatar}>
        <Text style={styles.link}>Avatar auswählen</Text>
      </TouchableOpacity>
      {avatar && (
        <Image
          source={{ uri: `data:image/jpeg;base64,${avatar}` }}
          style={styles.avatarPreview}
        />
      )}
      <Text style={styles.subtitle}>Wählen Sie Einschränkungen:</Text>
      {disabilityOptions.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={[
            styles.optionContainer,
            selectedDisabilities.includes(option.id) && styles.selectedOption,
          ]}
          onPress={() => toggleDisability(option.id)}
        >
          <Text style={styles.optionLabel}>{option.label}</Text>
          <Text style={styles.optionDescription}>{option.description}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Registrieren</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f7',
    padding: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  backButtonText: {
    color: '#007bff',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    marginVertical: 15,
    color: '#555',
    textAlign: 'center',
  },
  input: {
    width: '85%',
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  link: {
    color: '#007bff',
    fontSize: 16,
    marginVertical: 10,
    textDecorationLine: 'underline',
  },
  avatarPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginVertical: 15,
    borderWidth: 2,
    borderColor: '#007bff',
  },
  optionContainer: {
    width: '85%',
    padding: 15,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  selectedOption: {
    borderColor: '#007bff',
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
});