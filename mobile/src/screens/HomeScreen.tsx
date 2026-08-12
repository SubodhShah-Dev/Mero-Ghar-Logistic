import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useAuth } from '../context/AuthContext'
import type { RootStackParamList } from '../App'
import { COLORS } from '../utils/theme'

type Nav = StackNavigationProp<RootStackParamList>

export default function HomeScreen() {
  const navigation = useNavigation<Nav>()
  const { user, logout } = useAuth()

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroContent}>
          <Text style={styles.badge}>NEPAL'S TRUSTED MOVING NETWORK</Text>
          <Text style={styles.title}>
            Move your home, the{' '}
            <Text style={styles.highlight}>easy way.</Text>
          </Text>
          <Text style={styles.subtitle}>
            Connect with verified, rated household movers across all 7 provinces of Nepal.
          </Text>

          <View style={styles.buttons}>
            {user?.role === 'user' ? (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => navigation.navigate('Booking')}>
                <Text style={styles.primaryBtnText}>Book a Move</Text>
              </TouchableOpacity>
            ) : user ? (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => navigation.navigate(user.role === 'admin' ? 'Admin' : 'Vendor')}>
                <Text style={styles.primaryBtnText}>
                  {user.role === 'admin' ? 'Admin Panel' : 'Vendor Portal'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.primaryBtnText}>Get Started</Text>
              </TouchableOpacity>
            )}
            {user ? (
              <TouchableOpacity style={styles.secondaryBtn} onPress={logout}>
                <Text style={styles.secondaryBtnText}>Logout</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.secondaryBtnText}>Login</Text>
              </TouchableOpacity>
            )}
          </View>

          {user && (
            <View style={styles.quickLinks}>
              <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('MeroBot')}>
                <Text style={styles.linkText}>💬 Chat Assistant</Text>
              </TouchableOpacity>
              {(user.role === 'user') && (
                <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('MyBookings')}>
                  <Text style={styles.linkText}>📋 My Bookings</Text>
                </TouchableOpacity>
              )}
              {user.role === 'admin' && (
                <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('Admin')}>
                  <Text style={styles.linkText}>⚙️ Admin Panel</Text>
                </TouchableOpacity>
              )}
              {user.role === 'vendor' && (
                <TouchableOpacity style={styles.linkBtn} onPress={() => navigation.navigate('Vendor')}>
                  <Text style={styles.linkText}>🚛 Vendor Portal</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      <View style={styles.trustBanner}>
        <Text style={styles.trustText}>✅ Verified Movers Only  ·  🇳🇵 All 7 Provinces  ·  💬 Viber & Phone Support</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        {['1. Fill the Form', '2. Get Matched', '3. Confirm & Pay', '4. Move Day!'].map((step, i) => (
          <View key={step} style={styles.stepCard}>
            <View style={[styles.stepNum, i === 3 && styles.stepNumLast]}>
              <Text style={[styles.stepNumText, i === 3 && styles.stepNumTextLast]}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('MeroBot')}
        accessibilityLabel="Open chat assistant">
        <Text style={styles.fabText}>💬</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.forest[950] },
  container: { flex: 1, backgroundColor: COLORS.forest[950] },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.saffron[400],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  fabText: { fontSize: 24 },
  hero: { paddingTop: 80, paddingHorizontal: 24, paddingBottom: 48 },
  heroContent: { alignItems: 'center' },
  badge: { color: COLORS.saffron[400], fontSize: 11, letterSpacing: 2, fontWeight: '600', marginBottom: 16 },
  title: { color: COLORS.cream[50], fontSize: 36, fontWeight: '900', textAlign: 'center', lineHeight: 40, marginBottom: 16 },
  highlight: { color: COLORS.saffron[400] },
  subtitle: { color: 'rgba(238,242,238,0.7)', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  buttons: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  primaryBtn: { backgroundColor: COLORS.saffron[400], paddingHorizontal: 28, paddingVertical: 14, borderRadius: 4 },
  primaryBtnText: { color: COLORS.forest[900], fontWeight: '700', fontSize: 16 },
  secondaryBtn: { borderWidth: 1, borderColor: COLORS.forest[600], paddingHorizontal: 28, paddingVertical: 14, borderRadius: 4 },
  secondaryBtnText: { color: COLORS.forest[300], fontSize: 15 },
  quickLinks: { gap: 10, width: '100%' },
  linkBtn: { backgroundColor: COLORS.forest[800], paddingHorizontal: 20, paddingVertical: 14, borderRadius: 4, alignItems: 'center' },
  linkText: { color: COLORS.cream[50], fontSize: 15, fontWeight: '600' },
  trustBanner: { backgroundColor: COLORS.saffron[400], paddingVertical: 12, paddingHorizontal: 16 },
  trustText: { color: COLORS.forest[900], fontSize: 12, fontWeight: '600', textAlign: 'center' },
  section: { padding: 24 },
  sectionTitle: { color: COLORS.cream[50], fontSize: 24, fontWeight: '900', marginBottom: 20, textAlign: 'center' },
  stepCard: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12, backgroundColor: COLORS.forest[900], padding: 16, borderRadius: 4, borderWidth: 1, borderColor: COLORS.forest[700] },
  stepNum: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: COLORS.saffron[400], alignItems: 'center', justifyContent: 'center' },
  stepNumLast: { backgroundColor: 'rgba(245,166,35,0.1)' },
  stepNumText: { color: COLORS.saffron[400], fontWeight: '900', fontSize: 16 },
  stepNumTextLast: { color: COLORS.saffron[400] },
  stepText: { color: COLORS.cream[50], fontSize: 15, fontWeight: '600' },
})
