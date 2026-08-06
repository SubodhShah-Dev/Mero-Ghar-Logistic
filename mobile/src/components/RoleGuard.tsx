import React, { useEffect, type ReactNode } from 'react'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useAuth } from '../context/AuthContext'
import type { RootStackParamList } from '../App'

interface RoleGuardProps {
  role: string
  children: ReactNode
}

export function RoleGuard({ role, children }: RoleGuardProps) {
  const { user, loading } = useAuth()
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()

  useEffect(() => {
    if (!loading && (!user || user.role !== role)) {
      navigation.replace('Home')
    }
  }, [user, loading, role, navigation])

  if (loading || !user || user.role !== role) {
    return null
  }

  return <>{children}</>
}

export default RoleGuard
