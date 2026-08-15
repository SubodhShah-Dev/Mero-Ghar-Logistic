import React, { useMemo, useState } from 'react'
import {
  View, Text, Modal, FlatList, TextInput, TouchableOpacity, StyleSheet,
  Pressable, KeyboardAvoidingView, Platform,
} from 'react-native'
import { COLORS } from '../utils/theme'

export interface VendorItem {
  id: number
  business_name: string
  rating: number
  total_jobs: number
  service_region: string
  branch_name?: string
  match_tier?: string
  plate_number?: string
  vehicle_name?: string
  vehicle_type?: string
}

interface VendorSelectionModalProps {
  visible: boolean
  vendors: VendorItem[]
  selectedVendorId: number | null
  vehicleType: string
  onSelect: (id: number) => void
  onClose: () => void
}

const ITEM_HEIGHT = 96

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, '')

export default function VendorSelectionModal({
  visible,
  vendors,
  selectedVendorId,
  vehicleType,
  onSelect,
  onClose,
}: VendorSelectionModalProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return vendors
    const nq = normalize(q)
    return vendors.filter((v) => {
      const name = v.business_name.toLowerCase()
      if (name.includes(q)) return true
      if (v.plate_number && normalize(v.plate_number).includes(nq)) return true
      return false
    })
  }, [vendors, query])

  const clearSearch = () => setQuery('')

  const renderItem = ({ item }: { item: VendorItem }) => {
    const selected = item.id === selectedVendorId
    return (
      <View style={[styles.itemRow, selected && styles.itemRowSelected]}>
        <View style={styles.itemMain}>
          <View style={styles.itemTitleRow}>
            <Text style={styles.itemName} numberOfLines={1}>{item.business_name}</Text>
            <Text style={styles.itemRating}>★ {item.rating}</Text>
          </View>
          <View style={styles.itemPlateRow}>
            <View style={styles.plateBadge}>
              <Text style={styles.plateText}>{item.plate_number || '—'}</Text>
            </View>
            <Text style={styles.itemModel} numberOfLines={1}>{item.vehicle_name || item.vehicle_type || ''}</Text>
          </View>
          <Text style={styles.itemMeta} numberOfLines={1}>
            {item.branch_name || item.service_region || 'No region'}
            {item.total_jobs != null ? ` · ${item.total_jobs} jobs` : ''}
            {item.match_tier === 'exact' ? ' · Exact route' : item.match_tier === 'province' ? ' · Covers your provinces' : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => onSelect(item.id)}
          style={[styles.selectBtn, selected && styles.selectBtnSelected]}
          hitSlop={{ top: 6, bottom: 6 }}>
          <Text style={[styles.selectText, selected && styles.selectTextSelected]}>
            {selected ? 'Selected' : 'Select'}
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyText}>
        {query.trim()
          ? `No vendors found matching '${query.trim()}'`
          : 'No vendors available for this route.'}
      </Text>
      {query.trim() ? (
        <TouchableOpacity onPress={clearSearch} style={styles.clearBtn} hitSlop={{ top: 8, bottom: 8 }}>
          <Text style={styles.clearText}>Clear Search</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Choose a Mover</Text>
            <Text style={styles.subtitle}>
              {vehicleType} · {vendors.length} available
            </Text>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Search by plate number or mover name"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="search"
                clearButtonMode="never"
              />
              {query.length > 0 ? (
                <TouchableOpacity onPress={clearSearch} style={styles.clearIconBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Text style={styles.clearIcon}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={true}
            getItemLayout={(_data, index) => ({
              length: ITEM_HEIGHT,
              offset: ITEM_HEIGHT * index,
              index,
            })}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmpty}
            showsVerticalScrollIndicator={false}
          />

          <TouchableOpacity onPress={onClose} style={styles.cancelBtn} hitSlop={{ top: 4, bottom: 4 }}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '92%',
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 16,
  },
  header: { marginBottom: 12 },
  title: { color: COLORS.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 14 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    color: COLORS.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  clearIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt,
  },
  clearIcon: { color: COLORS.textMuted, fontSize: 16, fontWeight: '700' },
  listContent: { paddingBottom: 8 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ITEM_HEIGHT,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  itemRowSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
  },
  itemMain: { flex: 1, marginRight: 10 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  itemName: { color: COLORS.text, fontSize: 15, fontWeight: '700', flex: 1 },
  itemRating: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },
  itemPlateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  plateBadge: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  plateText: { color: COLORS.text, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  itemModel: { color: COLORS.textMuted, fontSize: 12, flex: 1 },
  itemMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 6 },
  selectBtn: {
    minWidth: 84,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
  },
  selectBtnSelected: { backgroundColor: COLORS.accent },
  selectText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  selectTextSelected: { color: '#FFFFFF' },
  emptyWrap: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 16 },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  clearBtn: {
    marginTop: 16,
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  clearText: { color: COLORS.accent, fontSize: 14, fontWeight: '700' },
  cancelBtn: {
    marginTop: 8,
    minHeight: 44,
    borderRadius: 8,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600' },
})
