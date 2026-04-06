import { useState, useEffect } from 'react'
import { useSettingsStore } from '../store/settingsStore'

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  passwordEnabled: boolean
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    passwordEnabled: false
  })

  const { settings, loadSettings } = useSettingsStore()

  useEffect(() => {
    checkAuthStatus()

    // Note: Removed session clearing on page refresh to maintain login state
    // Session will only be cleared when app is closed (handled by Electron main process)
  }, []) // Remove settings dependency to avoid infinite loop

  const checkAuthStatus = async () => {
    try {
      console.log('🔐 Checking auth status...')

      // Load settings directly from API instead of store
      const currentSettings = await window.electronAPI.settings.get()
      console.log('🔐 Current settings:', currentSettings)

      const passwordEnabled = currentSettings?.password_enabled === 1
      const hasPassword = currentSettings?.app_password && currentSettings.app_password.length > 0

      console.log('🔐 Password enabled:', passwordEnabled)
      console.log('🔐 Has password:', hasPassword)

      if (!passwordEnabled || !hasPassword) {
        // No password protection enabled
        console.log('🔐 No password protection, allowing access')
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          passwordEnabled: false
        })
        return
      }

      // Check if user has valid session
      const hasValidSession = sessionStorage.getItem('dental_clinic_auth') === 'true'
      console.log('🔐 Has valid session:', hasValidSession)

      if (hasValidSession) {
        // User has valid session, allow access
        console.log('🔐 Valid session found, allowing access')
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          passwordEnabled: true
        })
      } else {
        // No valid session, require authentication
        console.log('🔐 No valid session, requiring authentication')
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          passwordEnabled: true
        })
      }
    } catch (error) {
      console.error('❌ Error checking auth status:', error)
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        passwordEnabled: false
      })
    }
  }

  const login = async (password: string): Promise<boolean> => {
    try {
      console.log('🔐 Attempting login...')

      // Get current settings directly from API
      const currentSettings = await window.electronAPI.settings.get()

      if (!currentSettings?.app_password) {
        console.log('❌ No password set in settings')
        return false
      }

      // Hash the input password and compare with stored hash
      const hashedInput = await hashPassword(password)
      console.log('🔐 Password hashed, comparing...')

      if (hashedInput === currentSettings.app_password) {
        console.log('✅ Password correct, setting session')
        sessionStorage.setItem('dental_clinic_auth', 'true')
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: true
        }))
        return true
      }

      console.log('❌ Password incorrect')
      return false
    } catch (error) {
      console.error('❌ Login error:', error)
      return false
    }
  }

  const logout = async () => {
    // Clear session storage only (keep localStorage for theme and other preferences)
    sessionStorage.removeItem('dental_clinic_auth')

    // Also clear via Electron IPC if available
    try {
      if (window.electronAPI?.auth?.clearSession) {
        await window.electronAPI.auth.clearSession()
      }
    } catch (error) {
      console.log('Could not clear session via Electron:', error)
    }

    setAuthState(prev => ({
      ...prev,
      isAuthenticated: false
    }))
  }

  const setPassword = async (password: string): Promise<boolean> => {
    try {
      console.log('🔐 Setting password...')
      const hashedPassword = await hashPassword(password)

      console.log('🔐 Updating settings with hashed password...')
      const updatedSettings = await withTimeout(
        window.electronAPI.settings.update({
          app_password: hashedPassword,
          password_enabled: 1
        }),
        10000 // 10 second timeout
      )

      console.log('🔐 Settings updated:', updatedSettings)

      if (updatedSettings) {
        // Update auth state directly without reloading settings to avoid loop
        setAuthState(prev => ({
          ...prev,
          passwordEnabled: true
        }))
        console.log('✅ Password set successfully')
        return true
      }

      console.log('❌ Failed to update settings')
      return false
    } catch (error) {
      console.error('❌ Error setting password:', error)
      return false
    }
  }

  const removePassword = async (): Promise<boolean> => {
    try {
      console.log('🔐 Removing password...')
      const updatedSettings = await withTimeout(
        window.electronAPI.settings.update({
          app_password: null,
          password_enabled: 0
        }),
        10000 // 10 second timeout
      )

      console.log('🔐 Settings updated:', updatedSettings)

      if (updatedSettings) {
        // Update auth state directly without reloading settings to avoid loop
        setAuthState(prev => ({
          ...prev,
          passwordEnabled: false,
          isAuthenticated: true
        }))
        console.log('✅ Password removed successfully')
        return true
      }

      console.log('❌ Failed to update settings')
      return false
    } catch (error) {
      console.error('❌ Error removing password:', error)
      return false
    }
  }

  const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    try {
      console.log('🔐 Changing password...')

      // Get current settings directly from API
      const currentSettings = await window.electronAPI.settings.get()

      if (!currentSettings?.app_password) {
        console.log('❌ No existing password found')
        return false
      }

      // Verify old password
      const hashedOld = await hashPassword(oldPassword)
      if (hashedOld !== currentSettings.app_password) {
        console.log('❌ Old password is incorrect')
        return false
      }

      // Set new password
      const hashedNew = await hashPassword(newPassword)
      console.log('🔐 Updating with new password...')

      const updatedSettings = await withTimeout(
        window.electronAPI.settings.update({
          app_password: hashedNew
        }),
        10000 // 10 second timeout
      )

      console.log('🔐 Settings updated:', updatedSettings)

      if (updatedSettings) {
        console.log('✅ Password changed successfully')
        return true
      }

      console.log('❌ Failed to update settings')
      return false
    } catch (error) {
      console.error('❌ Error changing password:', error)
      return false
    }
  }

  return {
    ...authState,
    login,
    logout,
    setPassword,
    removePassword,
    changePassword,
    checkAuthStatus
  }
}

// Simple hash function for password (in production, use bcrypt or similar)
async function hashPassword(password: string): Promise<string> {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(password + 'dental_clinic_salt_2024')
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch (error) {
    console.error('Error hashing password:', error)
    throw error
  }
}

// Helper function to add timeout to promises
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    )
  ])
}
