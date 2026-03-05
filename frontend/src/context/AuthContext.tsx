import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { api } from '../services/api'
import type { AuthTokenResponse, LoginPayload, RegisterPayload } from '../types/user'

interface AuthContextValue {
  token: string | null
  userId: number | null
  isAuthenticated: boolean
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function decodeTokenUserId(token: string): number | null {
  try {
    const [, payload] = token.split('.')
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    const exp = Number(decoded.exp)
    const now = Math.floor(Date.now() / 1000)
    if (!Number.isFinite(exp) || exp <= now) {
      return null
    }
    return Number(decoded.sub)
  } catch {
    return null
  }
}

export function AuthProvider({ children }: PropsWithChildren): JSX.Element {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [userId, setUserId] = useState<number | null>(() => {
    const stored = localStorage.getItem('token')
    return stored ? decodeTokenUserId(stored) : null
  })

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await api.post<AuthTokenResponse>('/auth/login', payload)
    const accessToken = response.data.access_token
    localStorage.setItem('token', accessToken)
    setToken(accessToken)
    setUserId(decodeTokenUserId(accessToken))
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    await api.post('/auth/register', payload)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setToken(null)
    setUserId(null)
  }, [])

  useEffect(() => {
    if (token && !decodeTokenUserId(token)) {
      logout()
    }
  }, [logout, token])

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      userId,
      isAuthenticated: Boolean(token && userId),
      login,
      register,
      logout,
    }),
    [token, userId, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
