import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Payment } from '../types'
import { calculateTotalRemainingBalanceForAllPatients } from '../utils/paymentCalculations'
import { SmartAlertsService } from '@/services/smartAlertsService'

interface PaymentState {
  payments: Payment[]
  filteredPayments: Payment[]
  selectedPayment: Payment | null
  isLoading: boolean
  error: string | null
  searchQuery: string
  statusFilter: string
  paymentMethodFilter: string
  totalRevenue: number
  pendingAmount: number
  totalRemainingBalance: number
  partialPaymentsCount: number
  pendingPaymentsCount: number
  monthlyRevenue: { [key: string]: number }
  paymentMethodStats: { [key: string]: number }
}

interface PaymentActions {
  // Data operations
  loadPayments: () => Promise<void>
  createPayment: (payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updatePayment: (id: string, payment: Partial<Payment>) => Promise<void>
  deletePayment: (id: string) => Promise<void>
  searchPayments: (query: string) => void

  // UI state
  setSelectedPayment: (payment: Payment | null) => void
  setSearchQuery: (query: string) => void
  setStatusFilter: (status: string) => void
  setPaymentMethodFilter: (method: string) => void
  filterPayments: () => void
  clearError: () => void

  // Analytics
  calculateTotalRevenue: () => void
  calculatePendingAmount: () => void
  calculateTotalRemainingBalance: () => void
  calculatePartialPaymentsCount: () => void
  calculatePendingPaymentsCount: () => void
  calculateMonthlyRevenue: () => void
  calculatePaymentMethodStats: () => void
  getPaymentsByPatient: (patientId: string) => Payment[]
  getPaymentsByAppointment: (appointmentId: string) => Payment[]
  getPaymentsByToothTreatment: (toothTreatmentId: string) => Payment[]
  getPaymentsByDateRange: (startDate: Date, endDate: Date) => Payment[]
  getToothTreatmentPaymentSummary: (toothTreatmentId: string) => Promise<any>

  // Payment status operations
  markAsCompleted: (id: string) => Promise<void>
  markAsPending: (id: string) => Promise<void>
  markAsFailed: (id: string) => Promise<void>
  markAsRefunded: (id: string) => Promise<void>
}

type PaymentStore = PaymentState & PaymentActions

export const usePaymentStore = create<PaymentStore>()(
  devtools(
    (set, get) => {
      // Listen for patient deletion events to update payments
      if (typeof window !== 'undefined') {
        window.addEventListener('patient-deleted', (event: any) => {
          const { patientId } = event.detail
          const { payments, selectedPayment } = get()

          // Remove payments for deleted patient
          const updatedPayments = payments.filter(p => p.patient_id !== patientId)

          set({
            payments: updatedPayments,
            selectedPayment: selectedPayment?.patient_id === patientId ? null : selectedPayment
          })

          // Recalculate all analytics immediately
          get()

        // Listen for treatment deletion events to update payments
        window.addEventListener('treatment-payments-deleted', (event: any) => {
          const { treatmentId } = event.detail
          const { payments, selectedPayment } = get()

          // Remove payments for deleted treatment
          const updatedPayments = payments.filter(p => p.tooth_treatment_id !== treatmentId)

          set({
            payments: updatedPayments,
            selectedPayment: selectedPayment?.tooth_treatment_id === treatmentId ? null : selectedPayment
          })
        }).calculateTotalRevenue()
          get().calculatePendingAmount()
          get().calculateTotalRemainingBalance()
          get().calculatePartialPaymentsCount()
          get().calculatePendingPaymentsCount()
          get().calculateMonthlyRevenue()
          get().calculatePaymentMethodStats()
          get().filterPayments()

          console.log(`💰 Removed ${payments.length - updatedPayments.length} payments for deleted patient ${patientId}`)
        })
      }

      return {
        // Initial state
        payments: [],
        filteredPayments: [],
        selectedPayment: null,
        isLoading: false,
        error: null,
        searchQuery: '',
        statusFilter: 'all',
        paymentMethodFilter: 'all',
        totalRevenue: 0,
        pendingAmount: 0,
        totalRemainingBalance: 0,
        partialPaymentsCount: 0,
        pendingPaymentsCount: 0,
        monthlyRevenue: {},
        paymentMethodStats: {},

      // Data operations
      loadPayments: async () => {
        set({ isLoading: true, error: null })
        try {
          const payments = await window.electronAPI.payments.getAll()
          set({
            payments,
            filteredPayments: payments, // Initialize filtered payments with all payments
            isLoading: false
          })

          // Calculate analytics and filter
          get().calculateTotalRevenue()
          get().calculatePendingAmount()
          get().calculateTotalRemainingBalance()
          get().calculatePartialPaymentsCount()
          get().calculatePendingPaymentsCount()
          get().calculateMonthlyRevenue()
          get().calculatePaymentMethodStats()
          get().filterPayments()
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load payments',
            isLoading: false
          })
        }
      },

      createPayment: async (paymentData) => {
        set({ isLoading: true, error: null })
        try {
          console.log('💰 Creating payment in store:', paymentData)
          const newPayment = await window.electronAPI.payments.create(paymentData)
          console.log('✅ Payment created successfully in store:', newPayment)

          // إعادة تحميل جميع المدفوعات لضمان الاتساق
          await get().loadPayments()

          // Emit events for real-time sync
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('payment-changed', {
              detail: {
                type: 'created',
                paymentId: newPayment.id,
                payment: newPayment
              }
            }))
            window.dispatchEvent(new CustomEvent('payment-added', {
              detail: {
                type: 'created',
                paymentId: newPayment.id,
                payment: newPayment
              }
            }))
          }

          return newPayment
        } catch (error) {
          console.error('❌ Failed to create payment in store:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to create payment',
            isLoading: false
          })
          throw error
        }
      },

      updatePayment: async (id, paymentData) => {
        set({ isLoading: true, error: null })
        try {
          console.log('🔄 Updating payment in store:', { id, paymentData })

          // حذف التنبيهات القديمة المرتبطة بهذه الدفعة قبل التحديث
          try {
            await SmartAlertsService.deletePaymentAlerts(id)
          } catch (error) {
            console.warn('Could not delete old payment alerts:', error)
          }

          const updatedPayment = await window.electronAPI.payments.update(id, paymentData)
          console.log('✅ Payment updated successfully in store:', updatedPayment)

          // إعادة تحميل جميع المدفوعات لضمان الاتساق
          await get().loadPayments()

          // Emit events for real-time sync
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('payment-changed', {
              detail: {
                type: 'updated',
                paymentId: id,
                payment: updatedPayment
              }
            }))
            window.dispatchEvent(new CustomEvent('payment-updated', {
              detail: {
                type: 'updated',
                paymentId: id,
                payment: updatedPayment
              }
            }))
          }

          return updatedPayment
        } catch (error) {
          console.error('❌ Failed to update payment in store:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to update payment',
            isLoading: false
          })
          throw error
        }
      },

      deletePayment: async (id) => {
        set({ isLoading: true, error: null })
        try {
          await window.electronAPI.payments.delete(id)
          const { payments, selectedPayment } = get()

          const updatedPayments = payments.filter(p => p.id !== id)

          set({
            payments: updatedPayments,
            selectedPayment: selectedPayment?.id === id ? null : selectedPayment,
            isLoading: false
          })

          // Recalculate analytics and filter
          get().calculateTotalRevenue()
          get().calculatePendingAmount()
          get().calculateTotalRemainingBalance()
          get().calculatePartialPaymentsCount()
          get().calculatePendingPaymentsCount()
          get().calculateMonthlyRevenue()
          get().calculatePaymentMethodStats()
          get().filterPayments()

          // Emit events for real-time sync
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('payment-changed', {
              detail: {
                type: 'deleted',
                paymentId: id
              }
            }))
            window.dispatchEvent(new CustomEvent('payment-deleted', {
              detail: {
                type: 'deleted',
                paymentId: id
              }
            }))
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete payment',
            isLoading: false
          })
        }
      },

      searchPayments: (query) => {
        set({ searchQuery: query })
        get().filterPayments()
      },

      // UI state management
      setSelectedPayment: (payment) => {
        set({ selectedPayment: payment })
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query })
        get().filterPayments()
      },

      setStatusFilter: (status) => {
        set({ statusFilter: status })
        get().filterPayments()
      },

      setPaymentMethodFilter: (method) => {
        set({ paymentMethodFilter: method })
        get().filterPayments()
      },

      filterPayments: () => {
        const { payments, searchQuery, statusFilter, paymentMethodFilter } = get()

        let filtered = payments

        // Apply search filter
        if (searchQuery) {
          filtered = filtered.filter(payment => {
            const patientName = payment.patient ?
              `${payment.patient.first_name} ${payment.patient.last_name}` : ''

            return (
              payment.receipt_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              payment.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              payment.amount.toString().includes(searchQuery) ||
              payment.payment_method.toLowerCase().includes(searchQuery.toLowerCase()) ||
              payment.status.toLowerCase().includes(searchQuery.toLowerCase())
            )
          })
        }

        // Apply status filter
        if (statusFilter !== 'all') {
          filtered = filtered.filter(payment => payment.status === statusFilter)
        }

        // Apply payment method filter
        if (paymentMethodFilter !== 'all') {
          filtered = filtered.filter(payment => payment.payment_method === paymentMethodFilter)
        }

        set({ filteredPayments: filtered })
      },

      clearError: () => {
        set({ error: null })
      },

      // Analytics
      calculateTotalRevenue: () => {
        const { payments } = get()
        // حساب إجمالي الإيرادات من جميع المدفوعات المكتملة والجزئية
        const total = payments
          .filter(p => p.status === 'completed' || p.status === 'partial')
          .reduce((sum, payment) => {
            // استخدام total_amount (المبلغ بعد الخصم والضريبة) بدلاً من amount (المبلغ الأصلي)
            const amount = Number(payment.total_amount || payment.amount)

            if (isNaN(amount) || !isFinite(amount)) {
              console.warn('Invalid payment amount:', payment.total_amount || payment.amount, 'for payment:', payment.id)
              return sum
            }
            return sum + amount
          }, 0)

        const validTotal = isNaN(total) || !isFinite(total) ? 0 : Math.round(total * 100) / 100
        set({ totalRevenue: validTotal })
      },

      calculatePendingAmount: () => {
        const { payments } = get()
        const pending = payments
          .filter(p => p.status === 'pending')
          .reduce((sum, payment) => {
            // دالة مساعدة للتحقق من صحة المبالغ
            const validateAmount = (amount: any): number => {
              const num = Number(amount)
              return isNaN(num) || !isFinite(num) ? 0 : Math.round(num * 100) / 100
            }

            const amount = validateAmount(payment.amount)
            const totalAmountDue = validateAmount(payment.total_amount_due)

            // للمدفوعات المعلقة، استخدم المبلغ الإجمالي المطلوب أو المتبقي إذا كان متوفراً
            let pendingAmount = amount

            if (payment.tooth_treatment_id) {
              // للمدفوعات المرتبطة بعلاجات، استخدم التكلفة الإجمالية للعلاج
              const treatmentCost = validateAmount(payment.treatment_total_cost) || totalAmountDue
              pendingAmount = treatmentCost
            } else if (totalAmountDue > 0) {
              pendingAmount = totalAmountDue
            } else {
              const remainingBalance = validateAmount(payment.remaining_balance)
              if (remainingBalance > 0) {
                pendingAmount = remainingBalance
              }
            }

            return sum + pendingAmount
          }, 0)

        const validPending = isNaN(pending) || !isFinite(pending) ? 0 : Math.round(pending * 100) / 100
        set({ pendingAmount: validPending })
      },



      calculateTotalRemainingBalance: () => {
        const { payments } = get()
        let totalRemaining = 0

        // حساب المبلغ المتبقي من المدفوعات المرتبطة بالعلاجات (فقط من الدفعات الجزئية)
        const treatmentPayments = payments.filter(p => p.tooth_treatment_id && p.status === 'partial')
        const treatmentGroups: { [treatmentId: string]: Payment[] } = {}

        treatmentPayments.forEach(payment => {
          if (!treatmentGroups[payment.tooth_treatment_id!]) {
            treatmentGroups[payment.tooth_treatment_id!] = []
          }
          treatmentGroups[payment.tooth_treatment_id!].push(payment)
        })

        // حساب المتبقي لكل علاج (فقط من الدفعات الجزئية)
        Object.keys(treatmentGroups).forEach(treatmentId => {
          const treatmentPaymentsList = treatmentGroups[treatmentId]
          // استخدام آخر دفعة للحصول على المعلومات المحدثة
          const latestPayment = treatmentPaymentsList[treatmentPaymentsList.length - 1]
          if (latestPayment.treatment_remaining_balance !== undefined) {
            totalRemaining += latestPayment.treatment_remaining_balance
          }
        })

        // حساب المبلغ المتبقي من المدفوعات المرتبطة بالمواعيد (فقط من الدفعات الجزئية)
        const appointmentPayments = payments.filter(p => p.appointment_id && !p.tooth_treatment_id && p.status === 'partial')
        const appointmentGroups: { [appointmentId: string]: Payment[] } = {}

        appointmentPayments.forEach(payment => {
          if (!appointmentGroups[payment.appointment_id!]) {
            appointmentGroups[payment.appointment_id!] = []
          }
          appointmentGroups[payment.appointment_id!].push(payment)
        })

        // حساب المتبقي لكل موعد (فقط من الدفعات الجزئية)
        Object.keys(appointmentGroups).forEach(appointmentId => {
          const appointmentPaymentsList = appointmentGroups[appointmentId]
          // استخدام آخر دفعة للحصول على المعلومات المحدثة
          const latestPayment = appointmentPaymentsList[appointmentPaymentsList.length - 1]
          if (latestPayment.remaining_balance !== undefined) {
            totalRemaining += latestPayment.remaining_balance
          }
        })

        // حساب المبلغ المتبقي من المدفوعات العامة (فقط من الدفعات الجزئية)
        const generalPayments = payments.filter(p => !p.appointment_id && !p.tooth_treatment_id && p.status === 'partial')
        generalPayments.forEach(payment => {
          if (payment.remaining_balance !== undefined && payment.remaining_balance > 0) {
            totalRemaining += payment.remaining_balance
          }
        })

        set({ totalRemainingBalance: Math.round(totalRemaining * 100) / 100 })
      },

      calculatePartialPaymentsCount: () => {
        const { payments } = get()
        const partialCount = payments.filter(p => p.status === 'partial').length

        set({ partialPaymentsCount: partialCount })
      },

      calculatePendingPaymentsCount: () => {
        const { payments } = get()
        const pendingCount = payments.filter(p => p.status === 'pending').length

        set({ pendingPaymentsCount: pendingCount })
      },

      calculateMonthlyRevenue: () => {
        const { payments } = get()
        const monthlyData: { [key: string]: number } = {}

        payments
          .filter(p => p.status === 'completed' || p.status === 'partial')
          .forEach(payment => {
            try {
              const paymentDate = new Date(payment.payment_date)
              // Validate date
              if (isNaN(paymentDate.getTime())) {
                console.warn('Invalid payment date:', payment.payment_date)
                return
              }

              const month = paymentDate.toISOString().slice(0, 7) // YYYY-MM
              // للمدفوعات المكتملة والجزئية: استخدم total_amount (المبلغ بعد الخصم والضريبة)
              // هذا يتطابق مع منطق التصدير ويعكس القيم الحقيقية المدفوعة
              const amount = Number(payment.total_amount || payment.amount)

              if (isNaN(amount) || !isFinite(amount)) {
                console.warn('Invalid payment amount for monthly revenue:', payment.total_amount || payment.amount, 'for payment:', payment.id)
                return
              }

              const currentMonthTotal = monthlyData[month] || 0
              const newTotal = currentMonthTotal + amount

              if (isNaN(newTotal) || !isFinite(newTotal)) {
                console.warn('Invalid monthly total calculation for month:', month)
                return
              }

              monthlyData[month] = Math.round(newTotal * 100) / 100
            } catch (error) {
              console.warn('Error processing payment date:', payment.payment_date, error)
            }
          })

        set({ monthlyRevenue: monthlyData })
      },

      calculatePaymentMethodStats: () => {
        const { payments } = get()
        const methodStats: { [key: string]: number } = {}

        payments
          .filter(p => p.status === 'completed' || p.status === 'partial')
          .forEach(payment => {
            const method = payment.payment_method || 'unknown'
            // For partial payments, use amount_paid instead of amount, otherwise use total_amount
            const amount = payment.status === 'partial' && payment.amount_paid !== undefined
              ? Number(payment.amount_paid)
              : Number(payment.total_amount || payment.amount)

            if (isNaN(amount) || !isFinite(amount)) {
              console.warn('Invalid payment amount for method stats:', payment.total_amount || payment.amount, 'for payment:', payment.id)
              return
            }

            const currentMethodTotal = methodStats[method] || 0
            const newTotal = currentMethodTotal + amount

            if (isNaN(newTotal) || !isFinite(newTotal)) {
              console.warn('Invalid method total calculation for method:', method)
              return
            }

            methodStats[method] = Math.round(newTotal * 100) / 100
          })

        set({ paymentMethodStats: methodStats })
      },

      getPaymentsByPatient: (patientId) => {
        const { payments } = get()
        return payments.filter(p => p.patient_id === patientId)
      },

      getPaymentsByAppointment: (appointmentId) => {
        const { payments } = get()
        return payments.filter(p => p.appointment_id === appointmentId)
      },

      getPaymentsByToothTreatment: (toothTreatmentId) => {
        const { payments } = get()
        return payments.filter(p => p.tooth_treatment_id === toothTreatmentId)
      },

      getPaymentsByDateRange: (startDate, endDate) => {
        const { payments } = get()

        return payments.filter(payment => {
          const paymentDateStr = payment.payment_date
          if (!paymentDateStr) return false

          const paymentDate = new Date(paymentDateStr)

          // للتواريخ التي تحتوي على وقت، نحتاج لمقارنة التاريخ فقط
          let paymentDateForComparison: Date
          if (paymentDateStr.includes('T') || paymentDateStr.includes(' ')) {
            // التاريخ يحتوي على وقت، استخدمه كما هو
            paymentDateForComparison = paymentDate
          } else {
            // التاريخ بدون وقت، اعتبره في بداية اليوم
            paymentDateForComparison = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), paymentDate.getDate(), 0, 0, 0, 0)
          }

          return paymentDateForComparison >= startDate && paymentDateForComparison <= endDate
        })
      },

      getToothTreatmentPaymentSummary: async (toothTreatmentId) => {
        try {
          return await window.electronAPI.payments.getToothTreatmentSummary(toothTreatmentId)
        } catch (error) {
          console.error('Failed to get tooth treatment payment summary:', error)
          throw error
        }
      },

      // Payment status operations
      markAsCompleted: async (id) => {
        await get().updatePayment(id, { status: 'completed' })
      },

      markAsPending: async (id) => {
        await get().updatePayment(id, { status: 'pending' })
      },

      markAsFailed: async (id) => {
        await get().updatePayment(id, { status: 'failed' })
      },

      markAsRefunded: async (id) => {
        await get().updatePayment(id, { status: 'refunded' })
      }
      }
    },
    {
      name: 'payment-store',
    }
  )
)
