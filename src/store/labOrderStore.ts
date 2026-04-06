import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { LabOrder } from '../types'

interface LabOrderState {
  labOrders: LabOrder[]
  filteredLabOrders: LabOrder[]
  selectedLabOrder: LabOrder | null
  isLoading: boolean
  error: string | null
  searchQuery: string
  statusFilter: string
  labFilter: string
  dateRangeFilter: { start: string; end: string }

  // Statistics
  totalOrders: number
  totalCost: number
  totalPaid: number
  totalRemaining: number
  pendingOrders: number
  completedOrders: number
  cancelledOrders: number
}

interface LabOrderActions {
  // Data operations
  loadLabOrders: () => Promise<void>
  createLabOrder: (labOrder: Omit<LabOrder, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateLabOrder: (id: string, labOrder: Partial<LabOrder>) => Promise<void>
  deleteLabOrder: (id: string) => Promise<void>
  applyGeneralPayment: (labId: string, amount: number, year?: number, month?: number) => Promise<void>

  // UI state operations
  setSelectedLabOrder: (labOrder: LabOrder | null) => void
  setSearchQuery: (query: string) => void
  setStatusFilter: (status: string) => void
  setLabFilter: (labId: string) => void
  setDateRangeFilter: (range: { start: string; end: string }) => void
  filterLabOrders: () => void
  clearFilters: () => void
  clearError: () => void

  // Analytics
  calculateStatistics: () => void
  getOrdersByLab: (labId: string) => LabOrder[]
  getOrdersByPatient: (patientId: string) => LabOrder[]
  getOrdersByStatus: (status: string) => LabOrder[]
  getOrdersByDateRange: (startDate: Date, endDate: Date) => LabOrder[]
  getLabOrdersByTreatment: (treatmentId: string) => LabOrder[]
}

type LabOrderStore = LabOrderState & LabOrderActions

export const useLabOrderStore = create<LabOrderStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      labOrders: [],
      filteredLabOrders: [],
      selectedLabOrder: null,
      isLoading: false,
      error: null,
      searchQuery: '',
      statusFilter: 'all',
      labFilter: 'all',
      dateRangeFilter: { start: '', end: '' },

      // Statistics
      totalOrders: 0,
      totalCost: 0,
      totalPaid: 0,
      totalRemaining: 0,
      pendingOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,

      // Data operations
      loadLabOrders: async () => {
        set({ isLoading: true, error: null })
        try {
          const labOrders = await window.electronAPI?.labOrders?.getAll() || []

          set({
            labOrders,
            filteredLabOrders: labOrders,
            isLoading: false
          })
          get().calculateStatistics()
          get().filterLabOrders()
        } catch (error) {
          console.error('❌ [DEBUG] Error loading lab orders:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to load lab orders',
            isLoading: false
          })
        }
      },

      createLabOrder: async (labOrderData) => {
        set({ isLoading: true, error: null })
        try {
          console.log('➕ [DEBUG] Creating lab order:', labOrderData)

          // Calculate remaining balance
          const remainingBalance = labOrderData.cost - (labOrderData.paid_amount || 0)
          const orderWithBalance = {
            ...labOrderData,
            remaining_balance: remainingBalance
          }

          const newLabOrder = await window.electronAPI?.labOrders?.create(orderWithBalance)
          if (newLabOrder) {
            console.log('✅ [DEBUG] Lab order created successfully:', newLabOrder)

            // Add the new lab order to the local state instead of reloading all data
            const { labOrders } = get()
            const updatedLabOrders = [...labOrders, newLabOrder]

            set({
              labOrders: updatedLabOrders,
              isLoading: false
            })

            // Update monthly balance for the order's month
            const orderDate = new Date(newLabOrder.order_date)
            const year = orderDate.getFullYear()
            const month = orderDate.getMonth() + 1
            
            try {
              await window.electronAPI?.labMonthlyBalances?.updateOrCreate(
                newLabOrder.lab_id,
                year,
                month,
                {
                  total_cost: newLabOrder.cost,
                  total_paid: newLabOrder.paid_amount || 0,
                  remaining_balance: remainingBalance,
                  status: remainingBalance <= 0 ? 'paid' : (newLabOrder.paid_amount || 0) > 0 ? 'partial' : 'unpaid'
                }
              )
              console.log('✅ [DEBUG] Monthly balance updated successfully')
            } catch (balanceError) {
              console.warn('⚠️ [DEBUG] Could not update monthly balance:', balanceError)
            }

            get().calculateStatistics()
            get().filterLabOrders()
          }
        } catch (error) {
          console.error('❌ [DEBUG] Error creating lab order:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to create lab order',
            isLoading: false
          })
          throw error
        }
      },

      updateLabOrder: async (id, labOrderData) => {
        set({ isLoading: true, error: null })
        try {
          console.log('🔄 [DEBUG] Updating lab order:', id, labOrderData)

          // Recalculate remaining balance if cost or paid amount changed
          const currentOrder = get().labOrders.find(order => order.id === id)
          if (currentOrder && (labOrderData.cost !== undefined || labOrderData.paid_amount !== undefined)) {
            const newCost = labOrderData.cost ?? currentOrder.cost
            const newPaidAmount = labOrderData.paid_amount ?? (currentOrder.paid_amount || 0)
            labOrderData.remaining_balance = newCost - newPaidAmount
          }

          const updatedLabOrder = await window.electronAPI?.labOrders?.update(id, labOrderData)
          if (updatedLabOrder) {
            console.log('✅ [DEBUG] Lab order updated successfully:', updatedLabOrder)

            // Force reload from database to ensure consistency
            console.log('🔄 [DEBUG] Force reloading lab orders after update...')
            await get().loadLabOrders()

            // Update monthly balance for the order's month
            const orderDate = new Date(updatedLabOrder.order_date)
            const year = orderDate.getFullYear()
            const month = orderDate.getMonth() + 1
            
            // Get all orders for this lab and month to recalculate totals
            const monthOrders = get().labOrders.filter(order => {
              const oDate = new Date(order.order_date)
              return order.lab_id === updatedLabOrder.lab_id && 
                     oDate.getFullYear() === year && 
                     oDate.getMonth() + 1 === month
            })
            
            const totalCost = monthOrders.reduce((sum, o) => sum + o.cost, 0)
            const totalPaid = monthOrders.reduce((sum, o) => sum + (o.paid_amount || 0), 0)
            const remaining = totalCost - totalPaid
            
            try {
              await window.electronAPI?.labMonthlyBalances?.updateOrCreate(
                updatedLabOrder.lab_id,
                year,
                month,
                {
                  total_cost: totalCost,
                  total_paid: totalPaid,
                  remaining_balance: remaining,
                  status: remaining <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid'
                }
              )
              console.log('✅ [DEBUG] Monthly balance updated successfully')
            } catch (balanceError) {
              console.warn('⚠️ [DEBUG] Could not update monthly balance:', balanceError)
            }

            // Verify the update worked
            const verifyOrder = get().labOrders.find(order => order.id === id)
            console.log('🔍 [DEBUG] Verification after update:', {
              orderId: id,
              found: !!verifyOrder,
              tooth_treatment_id: verifyOrder?.tooth_treatment_id,
              updatedData: labOrderData
            })
          }
        } catch (error) {
          console.error('❌ [DEBUG] Error updating lab order:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to update lab order',
            isLoading: false
          })
          throw error
        }
      },

      deleteLabOrder: async (id) => {
        set({ isLoading: true, error: null })
        try {
          const success = await window.electronAPI?.labOrders?.delete(id)
          if (success) {
            const { labOrders } = get()
            const updatedLabOrders = labOrders.filter(order => order.id !== id)
            set({
              labOrders: updatedLabOrders,
              selectedLabOrder: get().selectedLabOrder?.id === id ? null : get().selectedLabOrder,
              isLoading: false
            })
            get().calculateStatistics()
            get().filterLabOrders()
          }
        } catch (error) {
          console.error('Error deleting lab order:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to delete lab order',
            isLoading: false
          })
          throw error
        }
      },

      applyGeneralPayment: async (labId: string, amount: number, year?: number, month?: number) => {
        set({ isLoading: true, error: null })
        try {
          console.log('💰 [DEBUG] Applying general payment for lab:', labId, 'amount:', amount, 'year:', year, 'month:', month)
          
          // Get all orders for the selected lab with remaining balance
          let orders = get().labOrders
            .filter(order => order.lab_id === labId) // Filter by lab ID

          // If year and month are provided, filter by month
          if (year && month) {
            orders = orders.filter(order => {
              const orderDate = new Date(order.order_date)
              const orderYear = orderDate.getFullYear()
              const orderMonth = orderDate.getMonth() + 1
              return orderYear === year && orderMonth === month
            })
          }

          orders = orders
            .map(order => {
              const remaining = order.remaining_balance || (order.cost - (order.paid_amount || 0))
              return { ...order, calculatedRemaining: Math.max(0, remaining) }
            })
            .filter(order => (order as any).calculatedRemaining > 0)
            .sort((a, b) => (a as any).calculatedRemaining - (b as any).calculatedRemaining) // Sort by smallest remaining first

          if (orders.length === 0) {
            throw new Error(year && month 
              ? `لا توجد طلبات لهذا المخبر في الشهر المحدد لها رصيد متبقي`
              : 'لا توجد طلبات لهذا المخبر لها رصيد متبقي')
          }

          // Calculate total remaining to validate
          const totalRemaining = orders.reduce((sum, order) => sum + (order as any).calculatedRemaining, 0)
          if (amount > totalRemaining) {
            throw new Error(`المبلغ (${amount}) لا يمكن أن يتجاوز إجمالي المتبقي (${totalRemaining})`)
          }

          // Distribute payment starting from smallest remaining balance
          let remainingPayment = amount
          const updates: Array<{ id: string; paidAmount: number; remainingBalance: number }> = []

          for (const order of orders) {
            if (remainingPayment <= 0) break

            const currentPaid = order.paid_amount || 0
            const paymentToApply = Math.min((order as any).calculatedRemaining, remainingPayment)
            const newPaidAmount = currentPaid + paymentToApply
            const newRemainingBalance = Math.max(0, order.cost - newPaidAmount)

            updates.push({
              id: order.id,
              paidAmount: newPaidAmount,
              remainingBalance: newRemainingBalance
            })

            remainingPayment -= paymentToApply
          }

          // Update all affected orders
          console.log('🔄 [DEBUG] Updating orders with payment:', updates)
          const updatePromises = updates.map(({ id, paidAmount, remainingBalance }) =>
            window.electronAPI?.labOrders?.update(id, {
              paid_amount: paidAmount,
              remaining_balance: remainingBalance
            })
          )

          await Promise.all(updatePromises)

          // Reload all lab orders to ensure consistency
          console.log('🔄 [DEBUG] Reloading lab orders after payment...')
          await get().loadLabOrders()

          // Update monthly balance if year and month are specified
          if (year && month) {
            try {
              // Get all orders for this lab and month to recalculate totals
              const monthOrders = get().labOrders.filter(order => {
                const oDate = new Date(order.order_date)
                return order.lab_id === labId && 
                       oDate.getFullYear() === year && 
                       oDate.getMonth() + 1 === month
              })
              
              const totalCost = monthOrders.reduce((sum, o) => sum + o.cost, 0)
              const totalPaid = monthOrders.reduce((sum, o) => sum + (o.paid_amount || 0), 0)
              const remaining = totalCost - totalPaid
              
              await window.electronAPI?.labMonthlyBalances?.updateOrCreate(
                labId,
                year,
                month,
                {
                  total_cost: totalCost,
                  total_paid: totalPaid,
                  remaining_balance: remaining,
                  status: remaining <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid'
                }
              )
              console.log('✅ [DEBUG] Monthly balance updated successfully')
            } catch (balanceError) {
              console.warn('⚠️ [DEBUG] Could not update monthly balance:', balanceError)
            }
          }

          console.log('✅ [DEBUG] General payment applied successfully for lab:', labId)
        } catch (error) {
          console.error('❌ [DEBUG] Error applying general payment:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to apply general payment',
            isLoading: false
          })
          throw error
        }
      },

      // UI state operations
      setSelectedLabOrder: (labOrder) => set({ selectedLabOrder: labOrder }),

      setSearchQuery: (query) => {
        set({ searchQuery: query })
        get().filterLabOrders()
      },

      setStatusFilter: (status) => {
        set({ statusFilter: status })
        get().filterLabOrders()
      },

      setLabFilter: (labId) => {
        set({ labFilter: labId })
        get().filterLabOrders()
      },

      setDateRangeFilter: (range) => {
        set({ dateRangeFilter: range })
        get().filterLabOrders()
      },

      filterLabOrders: () => {
        const { labOrders, searchQuery, statusFilter, labFilter, dateRangeFilter } = get()

        let filtered = [...labOrders]

        // Text search
        if (searchQuery.trim()) {
          filtered = filtered.filter(order =>
            order.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (order.lab?.name && order.lab.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (order.patient?.full_name && order.patient.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (order.notes && order.notes.toLowerCase().includes(searchQuery.toLowerCase()))
          )
        }

        // Status filter
        if (statusFilter && statusFilter !== 'all') {
          filtered = filtered.filter(order => order.status === statusFilter)
        }

        // Lab filter
        if (labFilter && labFilter !== 'all') {
          filtered = filtered.filter(order => order.lab_id === labFilter)
        }

        // Date range filter
        if (dateRangeFilter.start && dateRangeFilter.end) {
          const startDate = new Date(dateRangeFilter.start)
          const endDate = new Date(dateRangeFilter.end)
          filtered = filtered.filter(order => {
            const orderDate = new Date(order.order_date)
            return orderDate >= startDate && orderDate <= endDate
          })
        }

        set({ filteredLabOrders: filtered })
      },

      clearFilters: () => {
        set({
          searchQuery: '',
          statusFilter: 'all',
          labFilter: 'all',
          dateRangeFilter: { start: '', end: '' }
        })
        get().filterLabOrders()
      },

      clearError: () => set({ error: null }),

      // Analytics
      calculateStatistics: () => {
        const { labOrders } = get()

        const totalOrders = labOrders.length
        const totalCost = labOrders.reduce((sum, order) => sum + order.cost, 0)
        const totalPaid = labOrders.reduce((sum, order) => sum + (order.paid_amount || 0), 0)
        const totalRemaining = labOrders.reduce((sum, order) => sum + (order.remaining_balance || 0), 0)

        const pendingOrders = labOrders.filter(order => order.status === 'معلق').length
        const completedOrders = labOrders.filter(order => order.status === 'مكتمل').length
        const cancelledOrders = labOrders.filter(order => order.status === 'ملغي').length

        set({
          totalOrders,
          totalCost,
          totalPaid,
          totalRemaining,
          pendingOrders,
          completedOrders,
          cancelledOrders
        })
      },

      getOrdersByLab: (labId) => {
        return get().labOrders.filter(order => order.lab_id === labId)
      },

      getOrdersByPatient: (patientId) => {
        return get().labOrders.filter(order => order.patient_id === patientId)
      },

      getOrdersByStatus: (status) => {
        return get().labOrders.filter(order => order.status === status)
      },

      getOrdersByDateRange: (startDate, endDate) => {
        return get().labOrders.filter(order => {
          const orderDate = new Date(order.order_date)
          return orderDate >= startDate && orderDate <= endDate
        })
      },

      getLabOrdersByTreatment: (treatmentId) => {
        const allOrders = get().labOrders
        return allOrders.filter(order => order.tooth_treatment_id === treatmentId)
      }
    }),
    {
      name: 'lab-order-store'
    }
  )
)
