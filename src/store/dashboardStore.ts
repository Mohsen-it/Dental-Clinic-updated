import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface DashboardStats {
  totalPatients: number
  totalAppointments: number
  totalRevenue: number
  pendingPayments: number
  todayAppointments: number
  thisMonthRevenue: number
  lowStockItems: number
}

interface DashboardState {
  stats: DashboardStats
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
}

interface DashboardActions {
  loadStats: () => Promise<void>
  updateStats: (stats: Partial<DashboardStats>) => void
  clearError: () => void
  refreshStats: () => Promise<void>
}

type DashboardStore = DashboardState & DashboardActions

export const useDashboardStore = create<DashboardStore>()(
  devtools(
    (set, get) => {
      // Listen for patient deletion events to update dashboard stats
      if (typeof window !== 'undefined') {
        window.addEventListener('patient-deleted', async (event: any) => {
          console.log('📊 Dashboard: Patient deleted, refreshing stats...')
          // Refresh dashboard stats after patient deletion
          await get().refreshStats()
        })
      }

      return {
        // Initial state
        stats: {
          totalPatients: 0,
          totalAppointments: 0,
          totalRevenue: 0,
          pendingPayments: 0,
          todayAppointments: 0,
          thisMonthRevenue: 0,
          lowStockItems: 0
        },
        isLoading: false,
        error: null,
        lastUpdated: null,

        // Actions
        loadStats: async () => {
          set({ isLoading: true, error: null })
          try {
            const stats = await window.electronAPI?.dashboard?.getStats() || {
              totalPatients: 0,
              totalAppointments: 0,
              totalRevenue: 0,
              pendingPayments: 0,
              todayAppointments: 0,
              thisMonthRevenue: 0,
              lowStockItems: 0
            }

            set({
              stats,
              isLoading: false,
              lastUpdated: new Date()
            })
          } catch (error) {
            console.error('Error loading dashboard stats:', error)
            set({
              error: error instanceof Error ? error.message : 'Failed to load dashboard stats',
              isLoading: false
            })
          }
        },

        updateStats: (newStats) => {
          const { stats } = get()
          set({
            stats: { ...stats, ...newStats },
            lastUpdated: new Date()
          })
        },

        clearError: () => {
          set({ error: null })
        },

        refreshStats: async () => {
          // Refresh stats without showing loading state (for background updates)
          try {
            const stats = await window.electronAPI?.dashboard?.getStats() || get().stats

            set({
              stats,
              lastUpdated: new Date()
            })
            
            console.log('📊 Dashboard stats refreshed after patient deletion')
          } catch (error) {
            console.error('Error refreshing dashboard stats:', error)
          }
        }
      }
    },
    {
      name: 'dashboard-store',
    }
  )
)
