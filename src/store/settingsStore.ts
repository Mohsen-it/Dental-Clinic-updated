import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { ClinicSettings } from '../types'

interface SettingsState {
  settings: ClinicSettings | null
  isLoading: boolean
  error: string | null
  isDarkMode: boolean
  language: string
  currency: string
}

// Helper function to save clinic settings backup to localStorage
const saveSettingsBackup = (settings: ClinicSettings | null) => {
  if (settings && settings.clinic_name && settings.clinic_name !== 'عيادة الأسنان') {
    try {
      const backup = {
        clinic_name: settings.clinic_name,
        doctor_name: settings.doctor_name,
        clinic_logo: settings.clinic_logo,
        clinic_phone: settings.clinic_phone,
        clinic_email: settings.clinic_email,
        clinic_address: settings.clinic_address,
        timestamp: Date.now()
      }
      localStorage.setItem('dental-clinic-settings-backup', JSON.stringify(backup))
      console.log('Settings backup saved to localStorage')
    } catch (error) {
      console.warn('Failed to save settings backup:', error)
    }
  }
}

// Helper function to restore clinic settings backup from localStorage
const restoreSettingsBackup = (): Partial<ClinicSettings> | null => {
  try {
    const backupStr = localStorage.getItem('dental-clinic-settings-backup')
    if (backupStr) {
      const backup = JSON.parse(backupStr)
      // Only restore if backup is recent (within 30 days) and has valid data
      if (backup.timestamp && (Date.now() - backup.timestamp) < 30 * 24 * 60 * 60 * 1000 &&
          backup.clinic_name && backup.clinic_name !== 'عيادة الأسنان') {
        console.log('Restoring settings from localStorage backup')
        return backup
      }
    }
  } catch (error) {
    console.warn('Failed to restore settings backup:', error)
  }
  return null
}

interface SettingsActions {
  // Data operations
  loadSettings: () => Promise<void>
  updateSettings: (settings: Partial<ClinicSettings>) => Promise<void>

  // UI preferences
  toggleDarkMode: () => void
  initializeDarkMode: () => void
  setLanguage: (language: string) => void
  setCurrency: (currency: string) => void

  // Error handling
  clearError: () => void

  // Getters
  getWorkingDays: () => string[]
  isWorkingDay: (date: Date) => boolean
  getWorkingHours: () => { start: string; end: string }
  isWithinWorkingHours: (time: string) => boolean
}

type SettingsStore = SettingsState & SettingsActions

export const useSettingsStore = create<SettingsStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        settings: null,
        isLoading: false,
        error: null,
        isDarkMode: false,
        language: 'en',
        currency: 'USD',

        // Data operations
        loadSettings: async () => {
          set({ isLoading: true, error: null })
          try {
            const settings = await window.electronAPI.settings.get()

            // If settings are missing or incomplete, try to restore from localStorage backup
            if (!settings || !settings.clinic_name || settings.clinic_name === 'عيادة الأسنان') {
              const backup = restoreSettingsBackup()
              if (backup) {
                // Update settings with backup data
                const restoredSettings = {
                  ...settings,
                  ...backup
                }
                await window.electronAPI.settings.update(backup)
                set({
                  settings: restoredSettings,
                  language: settings?.language || 'ar',
                  currency: settings?.currency || 'USD',
                  isLoading: false
                })
                // Save the restored settings as a new backup
                saveSettingsBackup(restoredSettings)
                return
              }
            }

            set({
              settings,
              language: settings?.language || 'ar',
              currency: settings?.currency || 'USD',
              isLoading: false
            })

            // Save backup of loaded settings
            saveSettingsBackup(settings)
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load settings',
              isLoading: false
            })
          }
        },

        updateSettings: async (settingsData) => {
          set({ isLoading: true, error: null })
          try {
            const updatedSettings = await window.electronAPI.settings.update(settingsData)
            set({
              settings: updatedSettings,
              language: updatedSettings.language,
              currency: updatedSettings.currency,
              isLoading: false
            })

            // Save backup immediately after successful update
            saveSettingsBackup(updatedSettings)

            // Force update of localStorage backup after successful database update
            // This ensures the backup is always in sync with the database
            setTimeout(() => {
              const currentState = get()
              if (currentState.settings) {
                // Trigger a state update to refresh the persisted backup
                set({ settings: currentState.settings })
              }
            }, 10)
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to update settings',
              isLoading: false
            })
          }
        },

        // UI preferences
        toggleDarkMode: () => {
          const { isDarkMode, settings } = get()
          const newDarkMode = !isDarkMode

          // Preserve current settings before theme change
          const currentSettings = settings

          // Update state with preserved settings to prevent UI flicker
          set({
            isDarkMode: newDarkMode,
            settings: currentSettings // Explicitly preserve settings
          })

          // Apply dark mode to document
          if (newDarkMode) {
            document.documentElement.classList.add('dark')
            localStorage.setItem('dental-clinic-theme', 'dark')
          } else {
            document.documentElement.classList.remove('dark')
            localStorage.setItem('dental-clinic-theme', 'light')
          }

          // Save settings backup immediately to prevent data loss
          if (currentSettings) {
            try {
              localStorage.setItem('dental-clinic-settings-backup', JSON.stringify({
                clinic_name: currentSettings.clinic_name,
                doctor_name: currentSettings.doctor_name,
                clinic_logo: currentSettings.clinic_logo,
                clinic_phone: currentSettings.clinic_phone,
                clinic_email: currentSettings.clinic_email,
                clinic_address: currentSettings.clinic_address,
                backup_timestamp: Date.now()
              }))
            } catch (error) {
              console.warn('Failed to save settings backup:', error)
            }
          }

          // Update settings in database if available (non-blocking)
          try {
            get().updateSettings({ theme: newDarkMode ? 'dark' : 'light' })
          } catch (error) {
            console.warn('Failed to save theme preference to database:', error)
          }
        },

        // Initialize dark mode from stored preference
        initializeDarkMode: () => {
          const storedTheme = localStorage.getItem('dental-clinic-theme')
          const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          const currentState = get()

          let shouldBeDark = false

          if (storedTheme) {
            shouldBeDark = storedTheme === 'dark'
          } else {
            shouldBeDark = systemPrefersDark
            // Save the system preference to localStorage
            localStorage.setItem('dental-clinic-theme', shouldBeDark ? 'dark' : 'light')
          }

          // Preserve current settings during theme initialization
          const currentSettings = currentState.settings

          // Only update if different from current state
          if (shouldBeDark !== currentState.isDarkMode) {
            set({
              isDarkMode: shouldBeDark,
              // Keep settings visible during theme initialization
              settings: currentSettings
            })

            // Apply to document
            if (shouldBeDark) {
              document.documentElement.classList.add('dark')
            } else {
              document.documentElement.classList.remove('dark')
            }
          }

          // Load settings if not already loaded (non-blocking)
          if (!currentSettings) {
            get().loadSettings()
          }
        },

        setLanguage: (language) => {
          set({ language })
          // Update settings in database
          get().updateSettings({ language })
        },

        setCurrency: (currency) => {
          set({ currency })
          // Update settings in database
          get().updateSettings({ currency })
        },

        // Error handling
        clearError: () => {
          set({ error: null })
        },

        // Getters
        getWorkingDays: () => {
          const { settings } = get()
          if (!settings?.working_days) return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
          return settings.working_days.split(',').map(day => day.trim())
        },

        isWorkingDay: (date) => {
          const workingDays = get().getWorkingDays()
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
          const dayName = dayNames[date.getDay()]
          return workingDays.includes(dayName)
        },

        getWorkingHours: () => {
          const { settings } = get()
          return {
            start: settings?.working_hours_start || '09:00',
            end: settings?.working_hours_end || '17:00'
          }
        },

        isWithinWorkingHours: (time) => {
          const { start, end } = get().getWorkingHours()
          return time >= start && time <= end
        }
      }),
      {
        name: 'settings-store',
        partialize: (state) => ({
          language: state.language,
          currency: state.currency,
          isDarkMode: state.isDarkMode,
          // Keep a backup of essential clinic settings in localStorage
          // This helps prevent data loss during theme switching
          clinicSettingsBackup: state.settings ? {
            clinic_name: state.settings.clinic_name,
            doctor_name: state.settings.doctor_name,
            clinic_logo: state.settings.clinic_logo,
            clinic_phone: state.settings.clinic_phone,
            clinic_email: state.settings.clinic_email,
            clinic_address: state.settings.clinic_address,
            // Add timestamp for backup validation
            backup_timestamp: Date.now()
          } : null
        }),
        // Force immediate persistence to prevent data loss
        storage: {
          getItem: (name) => {
            const str = localStorage.getItem(name)
            if (!str) return null
            return JSON.parse(str)
          },
          setItem: (name, value) => {
            localStorage.setItem(name, JSON.stringify(value))
            // Also save a separate backup for extra safety
            if (value.state?.clinicSettingsBackup) {
              localStorage.setItem('dental-clinic-settings-backup', JSON.stringify(value.state.clinicSettingsBackup))
            }
          },
          removeItem: (name) => localStorage.removeItem(name),
        }
      }
    ),
    {
      name: 'settings-store',
    }
  )
)
