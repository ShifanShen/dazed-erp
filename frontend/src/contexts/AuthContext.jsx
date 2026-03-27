import { createContext, useContext, useState, useEffect } from 'react'
import { login as apiLogin } from '../api/auth'
import { clearAuth, getStoredUser, getToken, setStoredUser, setToken } from '../utils/authStorage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // 初始化时从 localStorage 恢复用户信息
  useEffect(() => {
    const storedUser = getStoredUser()
    const token = getToken()
    if (storedUser && token) {
      setUser(storedUser)
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    const response = await apiLogin(username, password)
    const userData = {
      username: response.username,
      displayName: response.displayName,
      role: response.role,
    }
    setToken(response.token)
    setStoredUser(userData)
    setUser(userData)
    return response
  }

  const logout = () => {
    clearAuth()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
