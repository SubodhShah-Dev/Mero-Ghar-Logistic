import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from './context/AuthContext'
import HomeScreen from './screens/HomeScreen'
import LoginScreen from './screens/LoginScreen'
import SignupScreen from './screens/SignupScreen'
import BookingScreen from './screens/BookingScreen'
import MyBookingsScreen from './screens/MyBookingsScreen'
import AdminScreen from './screens/AdminScreen'
import VendorScreen from './screens/VendorScreen'

export type RootStackParamList = {
  Home: undefined
  Login: undefined
  Signup: undefined
  Booking: undefined
  MyBookings: undefined
  Admin: undefined
  Vendor: undefined
}

const Stack = createStackNavigator<RootStackParamList>()

function AppNavigator() {
  const { user } = useAuth()

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#112018' },
        headerTintColor: '#fdfaf4',
        headerTitleStyle: { fontWeight: '700' },
        cardStyle: { backgroundColor: '#091410' },
      }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'MeroGhar', headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Log In' }} />
      <Stack.Screen name="Signup" component={SignupScreen} options={{ title: 'Sign Up' }} />
      <Stack.Screen name="Booking" component={BookingScreen} options={{ title: 'Book a Move' }} />
      <Stack.Screen name="MyBookings" component={MyBookingsScreen} options={{ title: 'My Bookings' }} />
      <Stack.Screen name="Admin" component={AdminScreen} options={{ title: 'Admin' }} />
      <Stack.Screen name="Vendor" component={VendorScreen} options={{ title: 'Vendor Portal' }} />
    </Stack.Navigator>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
