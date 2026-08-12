import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import { RouteProp, useRoute } from '@react-navigation/native'
import { CHAT } from '../services/api'
import { COLORS } from '../utils/theme'
import type { RootStackParamList } from '../App'

type ChatRoute = RouteProp<RootStackParamList, 'Chat'>

interface ChatMessage {
  id: number
  sender_role: 'customer' | 'vendor'
  message: string
  created_at: string
  sender_name: string
}

const POLL_MS = 5000

export default function ChatScreen() {
  const route = useRoute<ChatRoute>()
  const { shipmentId, senderRole, title } = route.params
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const listRef = useRef<FlatList<ChatMessage>>(null)

  const load = useCallback(async () => {
    try {
      const res = await CHAT.getMessages(shipmentId)
      setMessages(res.data.messages || [])
    } catch {
      Alert.alert('Error', 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [shipmentId])

  useEffect(() => {
    load()
    const timer = setInterval(load, POLL_MS)
    return () => clearInterval(timer)
  }, [load])

  const send = async () => {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    try {
      const res = await CHAT.sendMessage(shipmentId, text)
      const created = res.data?.data
      if (created) setMessages((prev) => [...prev, created])
      setDraft('')
    } catch {
      Alert.alert('Error', 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => String(m.id)}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <View style={styles.dot} />
            <Text style={styles.headerText}>{title || 'Chat'}</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {loading ? 'Loading messages...' : 'No messages yet. Say hello to coordinate your move.'}
          </Text>
        }
        renderItem={({ item: m }) => {
          const mine = m.sender_role === senderRole
          return (
            <View style={[styles.msgRow, mine ? styles.rowMine : styles.rowOther]}>
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                {!mine && <Text style={styles.senderName}>{m.sender_name}</Text>}
                <Text style={[styles.msgText, mine && styles.msgTextMine]}>{m.message}</Text>
                <Text style={[styles.time, mine && styles.timeMine]}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          )
        }}
      />

      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={send}
          placeholder="Type a message..."
          placeholderTextColor={COLORS.forest[400]}
          style={styles.input}
        />
        <TouchableOpacity onPress={send} disabled={sending || !draft.trim()} style={[styles.sendBtn, (sending || !draft.trim()) && styles.sendBtnDisabled]}>
          {sending ? (
            <ActivityIndicator color={COLORS.forest[900]} size="small" />
          ) : (
            <Text style={styles.sendText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.forest[950] },
  list: { padding: 16, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4caf7d' },
  headerText: { color: COLORS.cream[50], fontSize: 16, fontWeight: '700' },
  emptyText: { color: COLORS.forest[500], fontSize: 13, textAlign: 'center', marginTop: 40 },
  msgRow: { flexDirection: 'row', marginBottom: 10 },
  rowMine: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  bubbleMine: { backgroundColor: COLORS.saffron[400], borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: COLORS.forest[800], borderBottomLeftRadius: 4 },
  senderName: { color: COLORS.forest[400], fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  msgText: { color: COLORS.cream[50], fontSize: 14, lineHeight: 20 },
  msgTextMine: { color: COLORS.forest[900] },
  time: { color: COLORS.forest[500], fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  timeMine: { color: COLORS.forest[700] },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: COLORS.forest[700] },
  input: {
    flex: 1, backgroundColor: COLORS.forest[800], borderWidth: 1, borderColor: COLORS.forest[600],
    borderRadius: 4, color: COLORS.cream[50], paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
  },
  sendBtn: { backgroundColor: COLORS.saffron[400], paddingHorizontal: 20, paddingVertical: 12, borderRadius: 4 },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { color: COLORS.forest[900], fontWeight: '700', fontSize: 14 },
})
