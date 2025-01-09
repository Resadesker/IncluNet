import React from 'react';
import { View, StatusBar, Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import { UserProvider } from './UserContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ProfileScreen from './screens/ProfileScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UserProvider>
        <NavigationContainer>
          <View style={{ flex: 1 }}>
            <StatusBar hidden={true} />
            <Stack.Navigator
              initialRouteName="Login"
              screenOptions={{
                headerShown: false,
                gestureEnabled: true,
                presentation: 'modal',
              }}
            >
              <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{
                  headerShown: false,
                  gestureEnabled: true,
                  presentation: 'modal',
                }}
              />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
            </Stack.Navigator>
          </View>
        </NavigationContainer>
      </UserProvider>
    </GestureHandlerRootView>
  );
}

