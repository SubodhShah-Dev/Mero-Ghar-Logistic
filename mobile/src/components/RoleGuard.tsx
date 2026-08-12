import React, { useEffect, type ReactNode } from 'react'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useAuth } from '../context/AuthContext'
import type { RootStackParamList } from '../App'

interface RoleGuardProps {
  roles: string | string[]
  children: ReactNode
}

export function RoleGuard({ roles, children }: RoleGuardProps) {
  const { user, loading } = useAuth()
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()
  const allowed = Array.isArray(roles) ? roles : [roles]

  useEffect(() => {
    if (!loading && (!user || !allowed.includes(user.role))) {
      navigation.replace('Home')
    }
  }, [user, loading, allowed, navigation])

  if (loading || !user || !allowed.includes(user.role)) {
    return null
  }

  return <>{children}</>
}

export default RoleGuard
