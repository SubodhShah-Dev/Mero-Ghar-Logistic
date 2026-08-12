import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native'
import { CHATBOT } from '../services/api'
import { COLORS } from '../utils/theme'

interface Message {
  text: string
  isUser: boolean
}

interface QuestionCategory {
  name: string
  questions: string[]
}

const FALLBACK_CATEGORIES: QuestionCategory[] = [
  { name: 'About', questions: ['What is MeroGhar Logistics?'] },
  { name: 'Booking', questions: ['How do I book a move?'] },
  { name: 'Pricing & Quote', questions: ['What are your price ranges?'] },
  { name: 'Vehicles', questions: ['What vehicle options do you have?'] },
  { name: 'Coverage', questions: ['Which provinces and districts do you cover?'] },
  { name: 'Payments', questions: ['What payment methods do you accept?'] },
  { name: 'Tracking & Special Items', questions: ['How do I track my shipment?'] },
  { name: 'Timing & Cancellation', questions: ['What is your cancellation or refund policy?'] },
  { name: 'Support & Trust', questions: ['How can I contact support?'] },
]

const LOCAL_ANSWERS: Record<string, string> = {
  help: 'I can help you with:\n📋 Booking a move\n🚛 Vehicle types & pricing\n🗺️ Province coverage\n💳 Payment methods (eSewa, Khalti, Cash)\n📦 Fragile & special items\n🛡️ Insurance & add-ons\n📊 Tracking your booking\n❓ Any other questions!',
  book: 'To book a move, use the "Book a Move" button on the home screen. Fill in your pickup/drop locations, home size, items, vehicle, preferred date, and contact info. A coordinator will call within 2 hours with a quote.',
  price: 'Pricing depends on distance, home size, vehicle type, and add-ons. A 1 BHK move in Kathmandu Valley runs about NPR 4,000-8,000. Inter-city moves start at NPR 12,000. Get an exact quote from the booking form.',
  vehicle: 'We offer: 🛺 Cargo Tempo (narrow lanes, valley), 🚛 Mini Truck (inter-city), 🚚 Large Truck (full household). Choose in the booking form.',
  payment: 'We accept: 💜 eSewa, 🟣 Khalti, 💙 IME Pay, 🏦 ConnectIPS, and 💵 Cash. Complete a small token payment online to confirm your booking.',
  eSewa: 'Yes, we accept eSewa! Choose it as the payment method and complete the token payment after submitting the form.',
  khalti: 'Yes, we accept Khalti! Choose it as the payment method and complete the token payment after submitting the form.',
}

function getLocalReply(input: string): string | null {
  const clean = input.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
  if (clean.includes('price') || clean.includes('cost') || clean.includes('quote') || clean.includes('rate')) return LOCAL_ANSWERS.price
  if (clean.includes('vehicle') || clean.includes('truck') || clean.includes('tempo') || clean.includes('cargo')) return LOCAL_ANSWERS.vehicle
  if (clean.includes('payment') || clean.includes('pay')) return LOCAL_ANSWERS.payment
  if (clean.includes('esewa')) return LOCAL_ANSWERS.eSewa
  if (clean.includes('khalti')) return LOCAL_ANSWERS.khalti
  if (clean.includes('book') || clean.includes('form') || clean.includes('schedule')) return LOCAL_ANSWERS.book
  if (clean.includes('help') || clean.includes('command') || clean.includes('can you')) return LOCAL_ANSWERS.help
  if (clean.startsWith('hi') || clean.startsWith('hel') || clean === 'h' || clean === 'hy') return 'Namaste! 👋 How can I help with your move today?'
  return null
}

export default function MeroBotScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { text: 'Namaste! 👋 I am the MeroGhar chat assistant. How can I help with your move?', isUser: false },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<QuestionCategory[]>([])
  const [showQuestions, setShowQuestions] = useState(false)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80)
  }, [messages, loading])

  useEffect(() => {
    if (categories.length === 0) {
      CHATBOT.getQuestions()
        .then(({ data }) => {
          if (data?.categories?.length) setCategories(data.categories)
          else setCategories(FALLBACK_CATEGORIES)
        })
        .catch(() => setCategories(FALLBACK_CATEGORIES))
    }
  }, [categories.length])

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setMessages((prev) => [...prev, { text: trimmed, isUser: true }])
    setInput('')
    setShowQuestions(false)

    const local = getLocalReply(trimmed)
    if (local) {
      setTimeout(() => {
        setMessages((prev) => [...prev, { text: local, isUser: false }])
      }, 300)
      return
    }

    setLoading(true)
    try {
      const { data } = await CHATBOT.sendMessage(trimmed)
      const reply = data?.response || data?.reply || data?.message || 'Sorry, I could not process that. Try asking about booking, pricing, or payment.'
      setMessages((prev) => [...prev, { text: reply, isUser: false }])
    } catch {
      setMessages((prev) => [...prev, { text: 'Sorry, I am offline right now. Please try again later or contact support.', isUser: false }])
    } finally {
      setLoading(false)
    }
  }

  const totalQuestions = categories.reduce((n, c) => n + c.questions.length, 0)

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      {showQuestions && (
        <View style={styles.questionsPanel}>
          <ScrollView>
            {categories.length === 0 ? (
              <Text style={styles.questionsEmpty}>Loading questions…</Text>
            ) : (
              categories.map((cat) => (
                <View key={cat.name} style={{ marginBottom: 12 }}>
                  <Text style={styles.categoryTitle}>{cat.name}</Text>
                  <View style={styles.questionRow}>
                    {cat.questions.map((q) => (
                      <TouchableOpacity key={q} onPress={() => sendMessage(q)} style={styles.questionChip}>
                        <Text style={styles.questionChipText}>{q}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}

      <ScrollView ref={scrollRef} style={styles.chatArea} contentContainerStyle={styles.chatContent}>
        {messages.map((m, i) => (
          <View key={i} style={[styles.bubbleRow, m.isUser ? styles.bubbleRowUser : styles.bubbleRowBot]}>
            <View style={[styles.bubble, m.isUser ? styles.bubbleUser : styles.bubbleBot]}>
              <Text style={[styles.bubbleText, m.isUser ? styles.bubbleTextUser : styles.bubbleTextBot]}>{m.text}</Text>
            </View>
          </View>
        ))}
        {loading && (
          <View style={[styles.bubbleRow, styles.bubbleRowBot]}>
            <View style={[styles.bubble, styles.bubbleBot]}>
              <Text style={[styles.bubbleText, styles.bubbleTextBot]}>Typing…</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TouchableOpacity
          onPress={() => setShowQuestions(!showQuestions)}
          style={[styles.questionsBtn, showQuestions ? styles.questionsBtnActive : null]}>
          <Text style={[styles.questionsBtnText, showQuestions ? styles.questionsBtnTextActive : null]}>
            {totalQuestions > 0 ? `Questions (${totalQuestions})` : 'Questions'}
          </Text>
        </TouchableOpacity>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask me anything…"
          placeholderTextColor={COLORS.forest[400]}
          style={styles.input}
          returnKeyType="send"
          onSubmitEditing={() => sendMessage(input)}
        />
        <TouchableOpacity onPress={() => sendMessage(input)} disabled={loading} style={[styles.sendBtn, loading ? { opacity: 0.5 } : null]}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.forest[950] },
  chatArea: { flex: 1 },
  chatContent: { padding: 16, paddingBottom: 24 },
  bubbleRow: { alignItems: 'flex-start' },
  bubbleRowUser: { alignItems: 'flex-end' },
  bubbleRowBot: { alignItems: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8 },
  bubbleUser: { backgroundColor: COLORS.saffron[400] },
  bubbleBot: { backgroundColor: COLORS.forest[800], borderWidth: 1, borderColor: COLORS.forest[700] },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: COLORS.forest[900] },
  bubbleTextBot: { color: COLORS.cream[50] },
  questionsPanel: { backgroundColor: COLORS.forest[900], borderBottomWidth: 1, borderBottomColor: COLORS.forest[700], maxHeight: '48%', padding: 12 },
  questionsEmpty: { color: COLORS.forest[400], fontSize: 13 },
  categoryTitle: { color: COLORS.saffron[400], fontSize: 13, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  questionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  questionChip: { backgroundColor: COLORS.forest[800], borderWidth: 1, borderColor: COLORS.forest[600], borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  questionChipText: { color: COLORS.cream[100], fontSize: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: COLORS.forest[700], backgroundColor: COLORS.forest[900] },
  questionsBtn: { borderWidth: 1, borderColor: COLORS.forest[600], borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9 },
  questionsBtnActive: { borderColor: COLORS.saffron[400], backgroundColor: 'rgba(245,166,35,0.15)' },
  questionsBtnText: { color: COLORS.forest[300], fontSize: 12, fontWeight: '600' },
  questionsBtnTextActive: { color: COLORS.saffron[300] },
  input: { flex: 1, backgroundColor: COLORS.forest[800], borderWidth: 1, borderColor: COLORS.forest[600], borderRadius: 8, color: COLORS.cream[50], paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  sendBtn: { backgroundColor: COLORS.saffron[400], borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  sendText: { color: COLORS.forest[900], fontWeight: '700', fontSize: 13 },
})