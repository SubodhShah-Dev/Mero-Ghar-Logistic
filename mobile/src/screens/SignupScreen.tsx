import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useAuth } from '../context/AuthContext'
import type { RootStackParamList } from '../App'
import { COLORS } from '../utils/theme'
import { EMAIL_REGEX, PHONE_REGEX } from '../utils/validate'

type Nav = StackNavigationProp<RootStackParamList>

export default function SignupScreen() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('user')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigation = useNavigation<Nav>()

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill all fields')
      return
    }
    if (!EMAIL_REGEX.test(email)) {
      Alert.alert('Error', 'Enter a valid email address')
      return
    }
    if (phone && !PHONE_REGEX.test(phone)) {
      Alert.alert('Error', 'Phone must be exactly 10 digits')
      return
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match')
      return
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters')
      return
    }
    setLoading(true)
    const res = await register({ name, email, password, role, phone: phone || undefined })
    setLoading(false)
    if (!res.ok) {
      Alert.alert('Error', res.message || 'Signup failed')
      return
    }
    Alert.alert('Success', 'Signup successful! Please login.', [
      { text: 'OK', onPress: () => navigation.navigate('Login') },
    ])
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <View style={styles.form}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ram Sharma" placeholderTextColor={COLORS.forest[400]} />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="your@email.com" placeholderTextColor={COLORS.forest[400]} keyboardType="email-address" autoCapitalize="none" />

        <Text style={styles.label}>Phone (optional)</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="98XXXXXXXX" placeholderTextColor={COLORS.forest[400]} keyboardType="phone-pad" maxLength={10} />

        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Min 6 characters" placeholderTextColor={COLORS.forest[400]} secureTextEntry />

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Same as above" placeholderTextColor={COLORS.forest[400]} secureTextEntry />

        <Text style={styles.label}>I am a...</Text>
        <View style={styles.roleRow}>
          {[
            { value: 'user', label: 'Customer' },
            { value: 'vendor', label: 'Mover' },
          ].map((r) => (
            <TouchableOpacity key={r.value} onPress={() => setRole(r.value)}
              style={[styles.roleBtn, role === r.value && styles.roleBtnActive]}>
              <Text style={[styles.roleText, role === r.value && styles.roleTextActive]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSignup} disabled={loading}>
          <Text style={styles.submitText}>{loading ? 'Creating account...' : 'Sign Up'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.forest[950] },
  form: { backgroundColor: COLORS.forest[900], borderWidth: 1, borderColor: COLORS.forest[700], borderRadius: 4, padding: 24, gap: 16 },
  label: { color: COLORS.cream[200], fontSize: 14, fontWeight: '500' },
  input: { backgroundColor: COLORS.forest[800], borderWidth: 1, borderColor: COLORS.forest[600], borderRadius: 4, paddingHorizontal: 16, paddingVertical: 12, color: COLORS.cream[50], fontSize: 15, minHeight: 48 },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleBtn: { flex: 1, paddingVertical: 10, borderRadius: 4, borderWidth: 1, borderColor: COLORS.forest[600], alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  roleBtnActive: { backgroundColor: COLORS.saffron[400], borderColor: COLORS.saffron[400] },
  roleText: { color: COLORS.forest[300], fontSize: 13, fontWeight: '600' },
  roleTextActive: { color: COLORS.forest[900] },
  submitBtn: { backgroundColor: COLORS.saffron[400], paddingVertical: 14, borderRadius: 4, alignItems: 'center', marginTop: 8, minHeight: 48, justifyContent: 'center' },
  submitText: { color: COLORS.forest[900], fontWeight: '700', fontSize: 16 },
})
