import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  Bell,
  TrendingUp,
  Settings,
  RefreshCw,
  LayoutDashboard,
  Zap,
  Users,
  Calendar,
  DollarSign
} from 'lucide-react'
import GlobalSearch from '@/components/globalThis/GlobalSearch'
// import SmartAlerts from '@/components/globalThis/SmartAlerts' // معطل - نظام التنبيهات الذكية غير نشط
import QuickAccessDashboard from '@/components/globalThis/QuickAccessDashboard'
import ElegantShortcutsDisplay from '@/components/help/ElegantShortcutsDisplay'

import { useGlobalStore } from '@/store/globalStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useStableClinicName } from '@/hooks/useStableSettings'
import type { SearchResult } from '@/types'
import { enhanceKeyboardEvent } from '@/utils/arabicKeyboardMapping'

interface EnhancedDashboardProps {
  onNavigateToPatients?: () => void
  onNavigateToAppointments?: () => void
  onNavigateToPayments?: () => void
  onNavigateToTreatments?: () => void
  onAddPatient?: () => void
  onAddAppointment?: () => void
  onAddPayment?: () => void
}

export default function EnhancedDashboard({
  onNavigateToPatients,
  onNavigateToAppointments,
  onNavigateToPayments,
  onNavigateToTreatments,
  onAddPatient,
  onAddAppointment,
  onAddPayment
}: EnhancedDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)

  const {
    syncAllData,
    isGlobalLoading,
    lastSyncTime,
    unreadAlertsCount
  } = useGlobalStore()

  const { settings } = useSettingsStore()
  const clinicName = useStableClinicName()

  // Initialize data on mount
  useEffect(() => {
    syncAllData()
  }, [syncAllData])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // تجاهل الاختصارات إذا كان Ctrl مضغوطاً
      if (event.ctrlKey) {
        return
      }

      // تجاهل الاختصارات إذا كان المستخدم يكتب في input أو textarea
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true' ||
        target.getAttribute('type') === 'number' ||
        target.closest('[data-prevent-shortcuts="true"]')
      ) {
        return
      }

      // Close modals (Escape)
      if (event.key === 'Escape') {
        setShowGlobalSearch(false)
      }

      // Tab navigation (1-4)
      // if (['1', '2', '3', '4'].includes(event.key)) {
      //   event.preventDefault()
      //   const tabs = ['overview', 'quick-access', 'alerts', 'analytics']
      //   const tabIndex = parseInt(event.key) - 1
      //   if (tabs[tabIndex]) {
      //     setActiveTab(tabs[tabIndex])
      //   }
      // }

      // استخدام الدالة المحسنة لمعالجة أحداث لوحة المفاتيح
      const enhanced = enhanceKeyboardEvent(event)

      // Quick actions shortcuts - ASD (دعم محسن للعربية والإنجليزية)
      // if (enhanced.mappedKey.toLowerCase() === 'a') {
      //   enhanced.preventDefault()
      //   onAddPatient?.()
      // } else if (enhanced.mappedKey.toLowerCase() === 's') {
      //   enhanced.preventDefault()
      //   onAddAppointment?.()
      // } else if (enhanced.mappedKey.toLowerCase() === 'd') {
      //   enhanced.preventDefault()
      //   onAddPayment?.()
      // }

      // Refresh (R/ق)
      // if (enhanced.mappedKey.toLowerCase() === 'r') {
      //   enhanced.preventDefault()
      //   syncAllData()
      // }

      // Search (F/ب)
      // if (enhanced.mappedKey.toLowerCase() === 'f') {
      //   enhanced.preventDefault()
      //   setShowGlobalSearch(true)
      // }



      // Refresh (R/ر)
      // if (enhanced.mappedKey.toLowerCase() === 'r') {
      //   enhanced.preventDefault()
      //   syncAllData()
      // }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [syncAllData, onAddPatient, onAddAppointment, onAddPayment])

  // Handle global search result selection
  const handleSearchResultSelect = (result: SearchResult) => {
    console.log('Selected search result:', result)

    // Navigate based on result type and open details
    switch (result.type) {
      case 'patient':
        // Store patient data for details modal
        localStorage.setItem('selectedPatientForDetails', JSON.stringify({
          patient: result.data,
          openDetailsModal: true
        }))
        onNavigateToPatients?.()
        break
      case 'appointment':
        // Store appointment data for details
        localStorage.setItem('selectedAppointmentForDetails', JSON.stringify({
          appointment: result.data,
          openDetailsModal: true
        }))
        onNavigateToAppointments?.()
        break
      case 'payment':
        // Store payment data for details
        localStorage.setItem('selectedPaymentForDetails', JSON.stringify({
          payment: result.data,
          openDetailsModal: true
        }))
        onNavigateToPayments?.()
        break
      case 'treatment':
        // Store treatment data for details
        localStorage.setItem('selectedTreatmentForDetails', JSON.stringify({
          treatment: result.data,
          patientId: result.relatedData?.patientId,
          openDetailsModal: true
        }))
        onNavigateToTreatments?.()
        break
      case 'prescription':
        // Store prescription data for details
        localStorage.setItem('selectedPrescriptionForDetails', JSON.stringify({
          prescription: result.data,
          openDetailsModal: true
        }))
        onNavigateToTreatments?.() // Prescriptions are handled in treatments page
        break
      default:
        break
    }

    setShowGlobalSearch(false)
  }

  // Handle alert clicks with smart navigation
  const handleAlertClick = (alert: any) => {
    console.log('Alert clicked:', alert)

    // Navigate based on alert type and context
    if (alert.type === 'appointment') {
      if (alert.context?.includes('upcoming') || alert.context?.includes('today')) {
        onNavigateToAppointments?.()
      }
    } else if (alert.type === 'payment') {
      if (alert.context?.includes('overdue') || alert.context?.includes('pending')) {
        onNavigateToPayments?.()
      }
    } else if (alert.type === 'patient') {
      onNavigateToPatients?.()
    } else if (alert.type === 'inventory') {
      // Navigate to inventory if we have that function
      console.log('Navigate to inventory for:', alert.title)
    }

    // Switch to alerts tab to show alert details
    setActiveTab('alerts')
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F for global search (دعم الحرف العربي ب)
      if ((e.key === 'f' || e.key === 'F' || e.key === 'ب') && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault()
        setShowGlobalSearch(true)
      }

      // Escape to close search
      if (e.key === 'Escape' && showGlobalSearch) {
        setShowGlobalSearch(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showGlobalSearch])

  // Handle refresh
  const handleRefresh = async () => {
    await syncAllData()
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">
              مرحباً بك في تطبيق {clinicName}
            </h1>
          </div>
          <p className="text-muted-foreground">
            نظام إدارة سريع ومتكامل  
          </p>
          {/* {lastSyncTime && (
            <p className="text-xs text-muted-foreground mt-1">
              آخر تحديث: {new Date(lastSyncTime).toLocaleString('ar-EG')}
            </p>
          )} */}
        </div>

        <div className="flex items-center gap-3">
          {/* Global Search Toggle */}
          <Button
            variant="outline"
            onClick={() => setShowGlobalSearch(!showGlobalSearch)}
            className="relative"
          >
            <Search className="w-4 h-4 mr-2" />
            بحث شامل
            <span className="text-xs text-muted-foreground ml-2">(F)</span>
          </Button>

          {/* Alerts Indicator */}
          {/* <Button
            variant="outline"
            onClick={() => setActiveTab('alerts')}
            className="relative"
          >
            <Bell className="w-4 h-4 mr-2" />
            التنبيهات
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadAlertsCount}
              </span>
            )}
          </Button> */}

          {/* Refresh Button */}
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isGlobalLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isGlobalLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Global Search Overlay */}
      {showGlobalSearch && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20"
          onClick={(e) => {
            // إغلاق البحث عند الضغط على الخلفية
            if (e.target === e.currentTarget) {
              setShowGlobalSearch(false)
            }
          }}
        >
          <div className="w-full max-w-2xl mx-4">
            <GlobalSearch
              onResultSelect={handleSearchResultSelect}
              onClose={() => setShowGlobalSearch(false)}
              autoFocus={true}
            />
          </div>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        {/* <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="quick-access" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            الوصول السريع
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2 relative">
            <Bell className="w-4 h-4" />
            التنبيهات
            {unreadAlertsCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {unreadAlertsCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList> */}

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Access Dashboard - Takes full width */}
          <QuickAccessDashboard
            onNavigateToPatients={onNavigateToPatients}
            onNavigateToAppointments={onNavigateToAppointments}
            onNavigateToPayments={onNavigateToPayments}
            onNavigateToTreatments={onNavigateToTreatments}
            onAddPatient={onAddPatient}
            onAddAppointment={onAddAppointment}
            onAddPayment={onAddPayment}
          />

          {/* Smart Alerts - معطل */}
          {/* <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <QuickAccessDashboard
                onNavigateToPatients={onNavigateToPatients}
                onNavigateToAppointments={onNavigateToAppointments}
                onNavigateToPayments={onNavigateToPayments}
                onNavigateToTreatments={onNavigateToTreatments}
                onAddPatient={onAddPatient}
                onAddAppointment={onAddAppointment}
                onAddPayment={onAddPayment}
              />
            </div>
            <div className="lg:col-span-1">
              <SmartAlerts
                maxVisible={8}
                showHeader={true}
                compact={false}
                onAlertClick={(alert) => {
                  handleAlertClick(alert)
                }}
              />
            </div>
          </div> */}
        </TabsContent>

        {/* Quick Access Tab */}
        <TabsContent value="quick-access" className="space-y-6">
          <QuickAccessDashboard
            onNavigateToPatients={onNavigateToPatients}
            onNavigateToAppointments={onNavigateToAppointments}
            onNavigateToPayments={onNavigateToPayments}
            onNavigateToTreatments={onNavigateToTreatments}
            onAddPatient={onAddPatient}
            onAddAppointment={onAddAppointment}
            onAddPayment={onAddPayment}
          />
        </TabsContent>

        {/* Alerts Tab - معطل */}
        <TabsContent value="alerts" className="space-y-6">
          <div className="text-center p-8 text-gray-500">
            نظام التنبيهات الذكية معطل حالياً
          </div>
        </TabsContent>


      </Tabs>

      {/* Elegant Shortcuts Display */}
      <ElegantShortcutsDisplay compact />

    </div>
  )
}
