import { useEffect } from 'react'
import { useReportsStore } from '../store/reportsStore'

/**
 * Custom hook for real-time reports data synchronization
 * Automatically refreshes reports when data changes occur
 */
export const useRealTimeReports = (reportTypes: string[] = ['overview']) => {
  const { generateReport, generateAllReports, clearCache } = useReportsStore()

  useEffect(() => {
    const handleDataChange = async (eventType: string) => {
      console.log(`🔄 Real-time Reports: ${eventType} detected, refreshing reports...`)

      // Clear cache to ensure fresh data
      clearCache()

      try {
        if (reportTypes.includes('overview') || reportTypes.length === 0) {
          // Refresh all reports for overview
          await generateAllReports()
        } else {
          // Refresh specific report types
          await Promise.all(
            reportTypes.map(type => generateReport(type as any))
          )
        }

        console.log('✅ Real-time Reports: Refresh completed successfully')
      } catch (error) {
        console.error('❌ Real-time Reports: Refresh failed:', error)
      }
    }

    // Define all possible data change events
    const dataChangeEvents = [
      'patient-added',
      'patient-updated',
      'patient-deleted',
      'patient-changed',
      'appointment-added',
      'appointment-updated',
      'appointment-deleted',
      'appointment-changed',
      'payment-added',
      'payment-updated',
      'payment-deleted',
      'payment-changed',
      'inventory-added',
      'inventory-updated',
      'inventory-deleted',
      'inventory-changed',
      'clinic-needs-added',
      'clinic-needs-updated',
      'clinic-needs-deleted',
      'clinic-needs-changed'
    ]

    // Create event handlers for each event type
    const eventHandlers = dataChangeEvents.map(eventType => {
      const handler = () => handleDataChange(eventType)
      return { eventType, handler }
    })

    // Add event listeners
    eventHandlers.forEach(({ eventType, handler }) => {
      window.addEventListener(eventType, handler)
    })

    // Cleanup event listeners
    return () => {
      eventHandlers.forEach(({ eventType, handler }) => {
        window.removeEventListener(eventType, handler)
      })
    }
  }, [generateReport, generateAllReports, clearCache, reportTypes])

  // Return manual refresh functions
  return {
    refreshReports: async () => {
      clearCache()
      if (reportTypes.includes('overview') || reportTypes.length === 0) {
        await generateAllReports()
      } else {
        await Promise.all(
          reportTypes.map(type => generateReport(type as any))
        )
      }
    },

    refreshSpecificReport: async (reportType: string) => {
      clearCache()
      await generateReport(reportType as any)
    }
  }
}

/**
 * Hook for specific report types with optimized event filtering
 */
export const useRealTimeReportsByType = (reportType: 'patients' | 'appointments' | 'financial' | 'inventory' | 'clinicNeeds') => {
  const { generateReport, clearCache } = useReportsStore()

  useEffect(() => {
    const handleDataChange = async () => {
      console.log(`🔄 Real-time ${reportType} Reports: Data changed, refreshing...`)
      clearCache()

      try {
        await generateReport(reportType)
        console.log(`✅ Real-time ${reportType} Reports: Refresh completed`)
      } catch (error) {
        console.error(`❌ Real-time ${reportType} Reports: Refresh failed:`, error)
      }
    }

    // Define relevant events for each report type
    const eventMap = {
      patients: ['patient-added', 'patient-updated', 'patient-deleted', 'patient-changed'],
      appointments: ['appointment-added', 'appointment-updated', 'appointment-deleted', 'appointment-changed'],
      financial: ['payment-added', 'payment-updated', 'payment-deleted', 'payment-changed'],
      inventory: ['inventory-added', 'inventory-updated', 'inventory-deleted', 'inventory-changed'],
      clinicNeeds: ['clinic-needs-added', 'clinic-needs-updated', 'clinic-needs-deleted', 'clinic-needs-changed']
    }

    const relevantEvents = eventMap[reportType] || []

    // Add event listeners
    relevantEvents.forEach(event => {
      window.addEventListener(event, handleDataChange)
    })

    // Cleanup event listeners
    return () => {
      relevantEvents.forEach(event => {
        window.removeEventListener(event, handleDataChange)
      })
    }
  }, [reportType, generateReport, clearCache])

  return {
    refreshReport: async () => {
      clearCache()
      await generateReport(reportType)
    }
  }
}

/**
 * Hook for dashboard real-time updates
 */
export const useRealTimeDashboard = () => {
  const { generateAllReports, clearCache } = useReportsStore()

  useEffect(() => {
    const handleDataChange = async () => {
      console.log('🔄 Real-time Dashboard: Data changed, refreshing...')
      clearCache()

      try {
        await generateAllReports()
        console.log('✅ Real-time Dashboard: Refresh completed')
      } catch (error) {
        console.error('❌ Real-time Dashboard: Refresh failed:', error)
      }
    }

    // Listen to all data change events for dashboard
    const allEvents = [
      'patient-added', 'patient-updated', 'patient-deleted', 'patient-changed',
      'appointment-added', 'appointment-updated', 'appointment-deleted', 'appointment-changed',
      'payment-added', 'payment-updated', 'payment-deleted', 'payment-changed',
      'inventory-added', 'inventory-updated', 'inventory-deleted', 'inventory-changed',
      'clinic-needs-added', 'clinic-needs-updated', 'clinic-needs-deleted', 'clinic-needs-changed'
    ]

    allEvents.forEach(event => {
      window.addEventListener(event, handleDataChange)
    })

    // Cleanup event listeners
    return () => {
      allEvents.forEach(event => {
        window.removeEventListener(event, handleDataChange)
      })
    }
  }, [generateAllReports, clearCache])

  return {
    refreshDashboard: async () => {
      clearCache()
      await generateAllReports()
    }
  }
}
