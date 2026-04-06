import { useEffect, useCallback, useRef } from 'react'
import { useAppointmentStore } from '@/store/appointmentStore'
import { usePaymentStore } from '@/store/paymentStore'
import { usePatientStore } from '@/store/patientStore'
import { usePrescriptionStore } from '@/store/prescriptionStore'
import { useInventoryStore } from '@/store/inventoryStore'

/**
 * Hook لضمان تحديث الجداول في الوقت الفعلي عند تغيير البيانات
 * يحل مشكلة عدم تحديث الجداول عند تعديل البيانات
 * مع تحسينات debouncing لتقليل التحديثات المتكررة
 */
export function useRealTimeTableSync() {
  const { loadAppointments } = useAppointmentStore()
  const { loadPayments } = usePaymentStore()
  const { loadPatients } = usePatientStore()
  const { loadPrescriptions } = usePrescriptionStore()
  const { loadInventoryItems } = useInventoryStore()

  // مراجع لتخزين timers الخاصة بـ debouncing
  const debounceTimers = useRef<{ [key: string]: NodeJS.Timeout }>({})

  // دالة debounce محسّنة
  const debounce = useCallback((key: string, callback: () => void, delay: number = 300) => {
    // إلغاء أي timer سابق لنفس المفتاح
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key])
    }

    // إنشاء timer جديد
    debounceTimers.current[key] = setTimeout(() => {
      callback()
      delete debounceTimers.current[key]
    }, delay)
  }, [])

  // دالة لإعادة تحميل جميع البيانات
  const refreshAllTables = useCallback(async () => {
    console.log('🔄 Refreshing all tables...')
    try {
      await Promise.all([
        loadAppointments(),
        loadPayments(),
        loadPatients(),
        loadPrescriptions(),
        loadInventoryItems()
      ])
      console.log('✅ All tables refreshed successfully')
    } catch (error) {
      console.error('❌ Error refreshing tables:', error)
    }
  }, [loadAppointments, loadPayments, loadPatients, loadPrescriptions, loadInventoryItems])

  // دالة لإعادة تحميل جدول محدد
  const refreshTable = useCallback(async (tableType: string) => {
    console.log(`🔄 Refreshing ${tableType} table...`)
    try {
      switch (tableType) {
        case 'appointments':
          await loadAppointments()
          break
        case 'payments':
          await loadPayments()
          break
        case 'patients':
          await loadPatients()
          break
        case 'prescriptions':
          await loadPrescriptions()
          break
        case 'inventory':
          await loadInventoryItems()
          break
        default:
          console.warn('Unknown table type:', tableType)
      }
      console.log(`✅ ${tableType} table refreshed successfully`)
    } catch (error) {
      console.error(`❌ Error refreshing ${tableType} table:`, error)
    }
  }, [loadAppointments, loadPayments, loadPatients, loadPrescriptions, loadInventoryItems])

  useEffect(() => {
    console.log('🔔 Setting up real-time table sync listeners...')

    // دوال معالجة الأحداث مع debouncing
    const handleAppointmentChange = async (event: any) => {
      console.log('📅 Appointment changed, scheduling refresh...', event.detail?.type)
      debounce('appointments', () => refreshTable('appointments'), 300)
    }

    const handlePaymentChange = async (event: any) => {
      console.log('💰 Payment changed, scheduling refresh...', event.detail?.type)
      debounce('payments', () => refreshTable('payments'), 300)
    }

    const handlePatientChange = async (event: any) => {
      console.log('👤 Patient changed, scheduling refresh...', event.detail?.type)
      // تحديث جدول المرضى فقط - إزالة التحديثات غير الضرورية
      debounce('patients', () => refreshTable('patients'), 300)
    }

    const handlePrescriptionChange = async (event: any) => {
      console.log('💊 Prescription changed, scheduling refresh...', event.detail?.type)
      debounce('prescriptions', () => refreshTable('prescriptions'), 300)
    }

    const handleInventoryChange = async (event: any) => {
      console.log('📦 Inventory changed, scheduling refresh...', event.detail?.type)
      debounce('inventory', () => refreshTable('inventory'), 300)
    }

    // تسجيل المستمعين لأحداث تغيير البيانات
    const appointmentEvents = ['appointment-added', 'appointment-updated', 'appointment-deleted', 'appointment-changed']
    const paymentEvents = ['payment-added', 'payment-updated', 'payment-deleted', 'payment-changed']
    const patientEvents = ['patient-added', 'patient-updated', 'patient-deleted', 'patient-changed']
    const prescriptionEvents = ['prescription-added', 'prescription-updated', 'prescription-deleted', 'prescription-changed']
    const inventoryEvents = ['inventory-added', 'inventory-updated', 'inventory-deleted', 'inventory-changed']

    // إضافة المستمعين
    appointmentEvents.forEach(eventName => {
      window.addEventListener(eventName, handleAppointmentChange)
    })

    paymentEvents.forEach(eventName => {
      window.addEventListener(eventName, handlePaymentChange)
    })

    patientEvents.forEach(eventName => {
      window.addEventListener(eventName, handlePatientChange)
    })

    prescriptionEvents.forEach(eventName => {
      window.addEventListener(eventName, handlePrescriptionChange)
    })

    inventoryEvents.forEach(eventName => {
      window.addEventListener(eventName, handleInventoryChange)
    })

    // دالة التنظيف
    return () => {
      console.log('🔔 Cleaning up real-time table sync listeners...')

      appointmentEvents.forEach(eventName => {
        window.removeEventListener(eventName, handleAppointmentChange)
      })

      paymentEvents.forEach(eventName => {
        window.removeEventListener(eventName, handlePaymentChange)
      })

      patientEvents.forEach(eventName => {
        window.removeEventListener(eventName, handlePatientChange)
      })

      prescriptionEvents.forEach(eventName => {
        window.removeEventListener(eventName, handlePrescriptionChange)
      })

      inventoryEvents.forEach(eventName => {
        window.removeEventListener(eventName, handleInventoryChange)
      })

      // إلغاء جميع timers المعلقة عند cleanup
      Object.values(debounceTimers.current).forEach(timer => {
        clearTimeout(timer)
      })
      debounceTimers.current = {}
    }
  }, [refreshTable, debounce])

  return {
    refreshAllTables,
    refreshTable
  }
}

/**
 * Hook مبسط لتحديث جدول محدد
 */
export function useTableRefresh(tableType: string) {
  const { refreshTable } = useRealTimeTableSync()

  const refresh = useCallback(() => {
    refreshTable(tableType)
  }, [refreshTable, tableType])

  return { refresh }
}

/**
 * Hook لتحديث جداول متعددة
 */
export function useMultiTableRefresh(tableTypes: string[]) {
  const { refreshTable } = useRealTimeTableSync()

  const refresh = useCallback(() => {
    tableTypes.forEach(tableType => {
      refreshTable(tableType)
    })
  }, [refreshTable, tableTypes])

  return { refresh }
}
