import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { KeyboardShortcut, ShortcutTooltip } from '@/components/ui/KeyboardShortcut'
import {
  Users,
  Calendar,
  DollarSign,
  Activity,
  Plus,
  Eye,
  RefreshCw,
  TrendingUp,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { useGlobalStore } from '@/store/globalStore'
import { useCurrency } from '@/contexts/CurrencyContext'
import type { Patient, Appointment, Payment, ToothTreatment } from '@/types'
import AddPatientDialog from '@/components/patients/AddPatientDialog'
interface QuickAccessDashboardProps {
  onNavigateToPatients?: () => void
  onNavigateToAppointments?: () => void
  onNavigateToPayments?: () => void
  onNavigateToTreatments?: () => void
  onAddPatient?: () => void
  onAddAppointment?: () => void
  onAddPayment?: () => void
}

export default function QuickAccessDashboard({
  onNavigateToPatients,
  onNavigateToAppointments,
  onNavigateToPayments,
  onNavigateToTreatments,
  onAddPatient,
  onAddAppointment,
  onAddPayment
}: QuickAccessDashboardProps) {

  const {
    quickAccessData,
    isLoadingQuickAccess,
    loadQuickAccessData,
    refreshQuickAccessData
  } = useGlobalStore()

  useEffect(() => {
    loadQuickAccessData()
  }, [loadQuickAccessData])

  // Handle refresh
  const handleRefresh = async () => {
    await refreshQuickAccessData()
  }

  // Format currency - now using centralized currency management
  const { formatAmount } = useCurrency()

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-EG')
  }

  // Format time
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoadingQuickAccess) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!quickAccessData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>فشل في تحميل بيانات الوصول السريع</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              إعادة المحاولة
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 rtl-layout">
      {/* Quick Stats */}
      <div className="dashboard-grid">
        {/* Total Patients */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onNavigateToPatients}>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">إجمالي المرضى</p>
                <p className="text-xl sm:text-2xl font-bold truncate">{quickAccessData.quickStats.totalPatients}</p>
              </div>
              <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                <Users className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today Appointments */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onNavigateToAppointments}>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">مواعيد اليوم</p>
                <p className="text-xl sm:text-2xl font-bold truncate">{quickAccessData.quickStats.todayAppointments}</p>
              </div>
              <div className="p-1.5 sm:p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex-shrink-0">
                <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onNavigateToPayments}>
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">دفعات معلقة</p>
                <p className="text-xl sm:text-2xl font-bold truncate">{quickAccessData.quickStats.pendingPayments}</p>
              </div>
              <div className="p-1.5 sm:p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex-shrink-0">
                <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            إجراءات سريعة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* <ShortcutTooltip shortcut="A" description="إضافة مريض جديد">
              <Button
                onClick={() => {
                  
                  onAddPatient?.()
                }}
                className="h-10 sm:h-12 justify-between hover:shadow-lg transition-all duration-200 active:scale-95 text-xs sm:text-sm"
              >
                <div className="flex items-center">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:mr-2" />
                  <span className="hidden sm:inline">إضافة مريض جديد</span>
                  <span className="sm:hidden">إضافة مريض</span>
                </div>
                <KeyboardShortcut shortcut="A" size="sm" />
              </Button>
            </ShortcutTooltip> */}

            <ShortcutTooltip shortcut="S" description="حجز موعد جديد">
              <Button
                onClick={() => {
                  console.log('📅 Add Appointment button clicked!')
                  onAddAppointment?.()
                }}
                variant="outline"
                className="h-10 sm:h-12 justify-between hover:shadow-lg transition-all duration-200 active:scale-95 text-xs sm:text-sm"
              >
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:mr-2" />
                  <span className="hidden sm:inline">حجز موعد جديد</span>
                  <span className="sm:hidden">موعد جديد</span>
                </div>
                <KeyboardShortcut shortcut="S" size="sm" />
              </Button>
            </ShortcutTooltip>

            <ShortcutTooltip shortcut="D" description="تسجيل دفعة جديدة">
              <Button
                onClick={() => {
                  console.log('💰 Add Payment button clicked!')
                  onAddPayment?.()
                }}
                variant="outline"
                className="h-10 sm:h-12 justify-between hover:shadow-lg transition-all duration-200 active:scale-95 text-xs sm:text-sm"
              >
                <div className="flex items-center">
                  <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:mr-2" />
                  <span className="hidden sm:inline">تسجيل دفعة جديدة</span>
                  <span className="sm:hidden">دفعة جديدة</span>
                </div>
                <KeyboardShortcut shortcut="D" size="sm" />
              </Button>
            </ShortcutTooltip>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Patients */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                المرضى الأخيرون
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log('👥 Navigate to Patients clicked!')
                  // showButtonFeedback('الانتقال للمرضى', 'سيتم الانتقال لصفحة المرضى')
                  onNavigateToPatients?.()
                }}
                className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <Eye className="w-4 h-4 mr-1" />
                عرض الكل
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {quickAccessData.recentPatients.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">لا توجد مرضى حديثون</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quickAccessData.recentPatients.map((patient: Patient) => (
                  <div key={patient.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{patient.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          #{patient.serial_number} | {patient.age} سنة
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {patient.gender === 'male' ? 'ذكر' : 'أنثى'}
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Eye className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Appointments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                مواعيد اليوم
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log('📅 Navigate to Appointments clicked!')
                  // showButtonFeedback('الانتقال للمواعيد', 'سيتم الانتقال لصفحة المواعيد')
                  onNavigateToAppointments?.()
                }}
                className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <Eye className="w-4 h-4 mr-1" />
                عرض الكل
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {quickAccessData.todayAppointments.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">لا توجد مواعيد اليوم</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quickAccessData.todayAppointments.slice(0, 5).map((appointment: Appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{appointment.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {appointment.patient?.full_name || 'مريض غير محدد'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {formatTime(appointment.start_time)}
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Eye className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Payments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                الدفعات المعلقة
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log('💰 Navigate to Payments clicked!')
                  // showButtonFeedback('الانتقال للمدفوعات', 'سيتم الانتقال لصفحة المدفوعات')
                  onNavigateToPayments?.()
                }}
                className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <Eye className="w-4 h-4 mr-1" />
                عرض الكل
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {quickAccessData.pendingPayments.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">لا توجد دفعات معلقة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quickAccessData.pendingPayments.slice(0, 5).map((payment: Payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {payment.patient?.full_name || 'مريض غير محدد'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(payment.payment_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">
                        {formatAmount(
                          payment.total_amount_due ||
                          payment.remaining_balance ||
                          payment.amount ||
                          0
                        )}
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Eye className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Urgent Treatments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                العلاجات العاجلة
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={onNavigateToTreatments}>
                عرض الكل
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {quickAccessData.urgentTreatments.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">لا توجد علاجات عاجلة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quickAccessData.urgentTreatments.slice(0, 5).map((treatment: ToothTreatment) => (
                  <div key={treatment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <Activity className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {treatment.treatment_type} - السن {treatment.tooth_number}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {treatment.patient?.full_name || 'مريض غير محدد'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {treatment.treatment_status === 'planned' ? 'مخطط' : 'قيد التنفيذ'}
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Eye className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
