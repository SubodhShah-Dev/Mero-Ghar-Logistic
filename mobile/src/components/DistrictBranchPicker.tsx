import React, { useState, useMemo } from 'react'
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native'
import { COLORS } from '../utils/theme'
import { provinces } from '../utils/nepal'

export type BranchOption = {
  id: number
  name: string
  province_id: number
}

type Props = {
  branches: BranchOption[]
  onSelect: (id: number) => void
  multiple?: boolean
  selectedId?: number | null
  selectedIds?: number[]
  placeholder?: string
  maxHeight?: number
}

const provinceName = (id: number) =>
  provinces.find((p) => Number(p.id) === id)?.name.replace(' Province', '') || `Province ${id}`

export default function DistrictBranchPicker({
  branches,
  onSelect,
  multiple = false,
  selectedId = null,
  selectedIds = [],
  placeholder = 'Search your district...',
  maxHeight = 280,
}: Props) {
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? branches.filter((b) => b.name.toLowerCase().includes(q) || provinceName(b.province_id).toLowerCase().includes(q))
      : branches
    const map = new Map<number, BranchOption[]>()
    for (const b of filtered) {
      const list = map.get(b.province_id) || []
      list.push(b)
      map.set(b.province_id, list)
    }
    return [...map.entries()].map(([province_id, list]) => ({ province_id, list }))
  }, [branches, query])

  const isActive = (id: number) => (multiple ? selectedIds.includes(id) : selectedId === id)

  return (
    <View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder}
        placeholderTextColor={COLORS.forest[400]}
        style={styles.search}
      />
      <ScrollView style={{ maxHeight }} nestedScrollEnabled>
        {groups.length === 0 ? (
          <Text style={styles.empty}>No districts match "{query}".</Text>
        ) : (
          groups.map((group) => (
            <View key={group.province_id} style={styles.group}>
              <Text style={styles.groupLabel}>{provinceName(group.province_id)}</Text>
              {group.list.map((b) => {
                const active = isActive(b.id)
                return (
                  <TouchableOpacity
                    key={b.id}
                    onPress={() => onSelect(b.id)}
                    style={[styles.row, active && styles.rowActive]}>
                    <Text style={[styles.rowText, active && styles.rowTextActive]}>{b.name}</Text>
                    {active ? <Text style={styles.rowCheck}>✓</Text> : null}
                  </TouchableOpacity>
                )
              })}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  search: {
    backgroundColor: COLORS.forest[800],
    borderWidth: 1,
    borderColor: COLORS.forest[600],
    borderRadius: 4,
    color: COLORS.cream[50],
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
    minHeight: 44,
  },
  group: { marginBottom: 6 },
  groupLabel: { color: COLORS.saffron[300], fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.forest[900],
    borderWidth: 1,
    borderColor: COLORS.forest[700],
    borderRadius: 4,
    marginBottom: 6,
    minHeight: 44,
  },
  rowActive: { backgroundColor: 'rgba(79,70,229,0.12)', borderColor: COLORS.saffron[400] },
  rowText: { color: COLORS.forest[300], fontSize: 14, fontWeight: '600' },
  rowTextActive: { color: COLORS.saffron[400] },
  rowCheck: { color: COLORS.saffron[400], fontSize: 14, fontWeight: '700' },
  empty: { color: COLORS.forest[400], fontSize: 13, paddingVertical: 8 },
})
