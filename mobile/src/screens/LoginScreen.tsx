import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useAuth } from '../context/AuthContext'
import type { RootStackParamList } from '../App'
import { COLORS } from '../utils/theme'

type Nav = StackNavigationProp<RootStackParamList>

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigation = useNavigation<Nav>()

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password')
      return
    }
    setLoading(true)
    const res = await login(email, password, role)
    setLoading(false)
    if (!res.ok) {
      Alert.alert('Error', res.message || 'Login failed')
      return
    }
    navigation.goBack()
  }

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          placeholderTextColor={COLORS.forest[400]}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={COLORS.forest[400]}
          secureTextEntry
        />

        <Text style={styles.label}>Role</Text>
        <View style={styles.roleRow}>
          {[
            { value: 'user', label: 'Customer' },
            { value: 'vendor', label: 'Mover' },
            { value: 'admin', label: 'Admin' },
          ].map((r) => (
            <TouchableOpacity key={r.value} onPress={() => setRole(r.value)}
              style={[styles.roleBtn, role === r.value && styles.roleBtnActive]}>
              <Text style={[styles.roleText, role === r.value && styles.roleTextActive]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleLogin} disabled={loading}>
          <Text style={styles.submitText}>{loading ? 'Logging in...' : 'Login'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={styles.link}>
          <Text style={styles.linkText}>Don't have an account? Sign up</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.forest[950], padding: 24, justifyContent: 'center' },
  form: { backgroundColor: COLORS.forest[900], borderWidth: 1, borderColor: COLORS.forest[700], borderRadius: 4, padding: 24, gap: 16 },
  label: { color: COLORS.cream[200], fontSize: 14, fontWeight: '500' },
  input: { backgroundColor: COLORS.forest[800], borderWidth: 1, borderColor: COLORS.forest[600], borderRadius: 4, paddingHorizontal: 16, paddingVertical: 12, color: COLORS.cream[50], fontSize: 15, minHeight: 48 },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleBtn: { flex: 1, paddingVertical: 10, borderRadius: 4, borderWidth: 1, borderColor: COLORS.forest[600], alignItems: 'center' },
  roleBtnActive: { backgroundColor: COLORS.saffron[400], borderColor: COLORS.saffron[400] },
  roleText: { color: COLORS.forest[300], fontSize: 13, fontWeight: '600' },
  roleTextActive: { color: COLORS.forest[900] },
  submitBtn: { backgroundColor: COLORS.saffron[400], paddingVertical: 14, borderRadius: 4, alignItems: 'center', marginTop: 8 },
  submitText: { color: COLORS.forest[900], fontWeight: '700', fontSize: 16 },
  link: { alignItems: 'center', marginTop: 12 },
  linkText: { color: COLORS.forest[400], fontSize: 14 },
})
