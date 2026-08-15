import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from './context/AuthContext'
import RoleGuard from './components/RoleGuard'
import HomeScreen from './screens/HomeScreen'
import LoginScreen from './screens/LoginScreen'
import SignupScreen from './screens/SignupScreen'
import BookingScreen from './screens/BookingScreen'
import MyBookingsScreen from './screens/MyBookingsScreen'
import AdminScreen from './screens/AdminScreen'
import VendorScreen from './screens/VendorScreen'
import ChatScreen from './screens/ChatScreen'
import MeroBotScreen from './screens/MeroBotScreen'
import { COLORS } from './utils/theme'

export type RootStackParamList = {
  Home: undefined
  Login: undefined
  Signup: undefined
  Booking: undefined
  MyBookings: undefined
  Admin: undefined
  Vendor: undefined
  Chat: { shipmentId: number; senderRole: 'customer' | 'vendor'; title?: string }
  MeroBot: undefined
}

const Stack = createStackNavigator<RootStackParamList>()

function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.nav },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700' },
        cardStyle: { backgroundColor: COLORS.background },
      }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'MeroGhar', headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Log In' }} />
      <Stack.Screen name="Signup" component={SignupScreen} options={{ title: 'Sign Up' }} />
      <Stack.Screen name="Booking" component={BookingScreen} options={{ title: 'Book a Move' }} />
      <Stack.Screen name="MyBookings" component={MyBookingsScreen} options={{ title: 'My Bookings' }} />
      <Stack.Screen name="Admin" options={{ title: 'Admin' }}>
        {() => (
          <RoleGuard roles={['super_admin', 'branch_admin']}>
            <AdminScreen />
          </RoleGuard>
        )}
      </Stack.Screen>
      <Stack.Screen name="Vendor" options={{ title: 'Vendor Portal' }}>
        {() => (
          <RoleGuard roles="vendor">
            <VendorScreen />
          </RoleGuard>
        )}
      </Stack.Screen>
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
      <Stack.Screen name="MeroBot" component={MeroBotScreen} options={{ title: 'MeroBot' }} />
    </Stack.Navigator>
  )
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
