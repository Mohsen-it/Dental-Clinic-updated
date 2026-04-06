import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle,
  Calendar,
  DollarSign,
  Activity,
  FileText,
  Package,
  Pill,
  UserCheck
} from 'lucide-react'
import { useGlobalStore } from '@/store/globalStore'
import { SmartAlertsService } from '@/services/smartAlertsService'
import { useRealTimeAlerts } from '@/hooks/useRealTimeAlerts'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/hooks/use-toast'
import type { SmartAlert } from '@/types'

// البيانات الحقيقية فقط - لا توجد بيانات تجريبية كما هو محدد في المتطلبات

interface SmartAlertsProps {
  maxVisible?: number
  showHeader?: boolean
  compact?: boolean
  onAlertClick?: (alert: SmartAlert) => void
  showReadAlerts?: boolean
}

// Helper function to format time distance
function formatTimeDistance(dateInput: string | Date): string {
  try {
    // Handle invalid input
    if (!dateInput) {
      return 'غير محدد'
    }

    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'تاريخ غير صحيح'
    }

    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return 'منذ لحظات'
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `منذ ${minutes} دقيقة`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `منذ ${hours} ساعة`
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400)
      return `منذ ${days} يوم`
    } else {
      const months = Math.floor(diffInSeconds / 2592000)
      return `منذ ${months} شهر`
    }
  } catch (error) {
    console.error('Error formatting time distance:', error)
    return 'خطأ في التاريخ'
  }
}

// Helper function to safely format date
function formatSafeDate(dateInput: string | Date): string {
  try {
    if (!dateInput) {
      return '--'
    }

    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '--'
    }

    // Format as DD/MM/YYYY
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()

    return `${day}/${month}/${year}`
  } catch (error) {
    console.error('Error formatting date:', error)
    return '--'
  }
}

export default function SmartAlerts({
  maxVisible = 5,
  showHeader = true,
  compact = false,
  onAlertClick,
  showReadAlerts = false
}: SmartAlertsProps) {
  const {
    alerts,
    unreadAlertsCount,
    isLoadingAlerts,
    loadAlerts,
    markAlertAsRead
  } = useGlobalStore()

  // إعداد التحديثات في الوقت الفعلي
  const { refreshAlerts } = useRealTimeAlerts()

  // إعداد الثيم
  const { isDarkMode } = useTheme()

  // إعداد Toast notifications
  const { toast } = useToast()

  const [showRead, setShowRead] = useState(showReadAlerts)

  useEffect(() => {
    // تحميل الإشعارات عند بدء تشغيل المكون
    console.log('🔔 SmartAlerts: Initial load')
    loadAlerts()

    // تحديث دوري أقل تكراراً (كل دقيقة) لضمان التزامن
    const interval = setInterval(() => {
      console.log('🔄 SmartAlerts: Periodic refresh (every minute)')
      loadAlerts()
    }, 60000) // دقيقة واحدة

    return () => {
      clearInterval(interval)
    }
  }, [loadAlerts])

  // تحديث showRead عند تغيير showReadAlerts prop
  useEffect(() => {
    setShowRead(showReadAlerts)
  }, [showReadAlerts])

  // Filter and sort alerts
  const visibleAlerts = alerts
    .filter(alert => !alert.isDismissed)
    .filter(alert => {
      // Hide snoozed alerts
      if (alert.snoozeUntil) {
        const snoozeDate = new Date(alert.snoozeUntil)
        return snoozeDate <= new Date()
      }
      return true
    })
    .filter(alert => {
      // Show read alerts only if showRead is true
      if (showRead) {
        return true // Show all alerts (read and unread)
      } else {
        return !alert.isRead // Show only unread alerts
      }
    })
    .slice(0, maxVisible)

  // Count read and unread alerts for display
  const readAlertsCount = alerts.filter(alert => alert.isRead && !alert.isDismissed).length
  const totalAlertsCount = alerts.filter(alert => !alert.isDismissed).length

  // Get alert icon
  const getAlertIcon = (alert: SmartAlert) => {
    switch (alert.type) {
      case 'appointment':
        return <Calendar className="w-4 h-4" />
      case 'payment':
        return <DollarSign className="w-4 h-4" />
      case 'treatment':
        return <Activity className="w-4 h-4" />
      case 'prescription':
        return <Pill className="w-4 h-4" />
      case 'follow_up':
        return <UserCheck className="w-4 h-4" />
      case 'lab_order':
        return <FileText className="w-4 h-4" />
      case 'inventory':
        return <Package className="w-4 h-4" />
      default:
        return <Bell className="w-4 h-4" />
    }
  }

  // Get priority color with dark mode support
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return isDarkMode
          ? 'text-red-400 bg-red-900/20 border-red-800/50'
          : 'text-red-500 bg-red-50 border-red-200'
      case 'medium':
        return isDarkMode
          ? 'text-yellow-400 bg-yellow-900/20 border-yellow-800/50'
          : 'text-yellow-500 bg-yellow-50 border-yellow-200'
      case 'low':
        return isDarkMode
          ? 'text-blue-400 bg-blue-900/20 border-blue-800/50'
          : 'text-blue-500 bg-blue-50 border-blue-200'
      default:
        return isDarkMode
          ? 'text-gray-400 bg-gray-900/20 border-gray-800/50'
          : 'text-gray-500 bg-gray-50 border-gray-200'
    }
  }

  // Get priority label
  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'عاجل'
      case 'medium': return 'متوسط'
      case 'low': return 'منخفض'
      default: return priority
    }
  }

  // Handle alert click
  const handleAlertClick = async (alert: SmartAlert) => {
    if (!alert.isRead) {
      await markAlertAsRead(alert.id)
    }



    // Show alert details in console for debugging
    console.log('🔔 Alert clicked:', {
      title: alert.title,
      description: alert.description,
      type: alert.type,
      priority: alert.priority,
      patientName: alert.patientName,
      relatedData: alert.relatedData
    })

    // Show a visual feedback toast (disabled for cleaner UI)
    // showAlertToast(alert)

    onAlertClick?.(alert)
  }







  // Mark alert as read function
  const markAsRead = async (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    console.log('🔔 Mark as read button clicked for alert:', alertId)

    try {
      console.log('🔄 Calling markAlertAsRead...')
      await markAlertAsRead(alertId)
      console.log('✅ markAlertAsRead completed successfully')

      // نظام الأحداث سيتولى التحديث تلقائياً
      console.log('📡 Real-time system will handle the update automatically')

      toast({
        title: "✅ تم التحديث",
        description: "تم تحديد الإشعار كمقروء",
        duration: 2000,
      })
    } catch (error) {
      console.error('❌ Error marking alert as read:', error)
      toast({
        title: "❌ خطأ",
        description: "فشل في تحديث الإشعار",
        variant: "destructive",
      })
    }
  }

  if (isLoadingAlerts) {
    return (
      <Card className={compact ? 'shadow-sm' : ''}>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5" />
              التنبيهات الذكية
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={compact ? 'shadow-sm' : ''}>
      {showHeader && (
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5" />
            التنبيهات الذكية
            {unreadAlertsCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadAlertsCount}
              </Badge>
            )}
          </CardTitle>
          {/* إحصائيات التنبيهات */}
          <div className="text-sm text-muted-foreground mt-2">
            المجموع: {totalAlertsCount} | غير مقروءة: {unreadAlertsCount} | مقروءة: {readAlertsCount}
          </div>
        </CardHeader>
      )}

      <CardContent className={showHeader ? '' : 'pt-6'}>
        {visibleAlerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {showRead
                ? (totalAlertsCount === 0 ? 'لا توجد تنبيهات' : 'لا توجد تنبيهات في هذا العرض')
                : 'لا توجد تنبيهات غير مقروءة'
              }
            </p>
            {!showRead && readAlertsCount > 0 && (
              <p className="text-xs mt-1">
                يوجد {readAlertsCount} تنبيه مقروء - اضغط "عرض المقروءة" لرؤيتها
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleAlerts.map((alert, index) => (
              <div key={alert.id}>
                <div
                  className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                    alert.isRead
                      ? isDarkMode
                        ? 'bg-muted/10 border-muted/30 hover:bg-muted/20 hover:border-muted/50'
                        : 'bg-muted/20 border-muted/40 hover:bg-muted/30 hover:border-muted/60'
                      : isDarkMode
                        ? `${getPriorityColor(alert.priority)} hover:opacity-90 hover:shadow-md`
                        : `${getPriorityColor(alert.priority)} hover:opacity-85 hover:shadow-lg`
                  }`}
                  onClick={() => handleAlertClick(alert)}
                >
                  <div className="flex items-start gap-3" dir="rtl">
                    <div className={`p-2 rounded-full ${
                      isDarkMode
                        ? `${getPriorityColor(alert.priority)} bg-opacity-20 border border-current border-opacity-30`
                        : `${getPriorityColor(alert.priority)} bg-opacity-10 border border-current border-opacity-20`
                    }`}>
                      {getAlertIcon(alert)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">{alert.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {getPriorityLabel(alert.priority)}
                        </Badge>
                        {!alert.isRead && (
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {alert.description}
                      </p>

                      {alert.patientName && (
                        <p className="text-xs font-medium text-primary mb-2">
                          👤 {alert.patientName}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {formatTimeDistance(alert.createdAt)}
                        </span>

                        {alert.dueDate && (
                          <span className="text-xs text-muted-foreground">
                            📅 {formatSafeDate(alert.dueDate)}
                          </span>
                        )}
                      </div>

                      {/* زر تحديد كمقروء فقط */}
                      {!alert.isRead && (
                        <div className="mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs"
                            onClick={(e) => markAsRead(alert.id, e)}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            تحديد كمقروء
                          </Button>
                        </div>
                      )}
                    </div>


                  </div>
                </div>

                {index < visibleAlerts.length - 1 && (
                  <Separator className={`my-2 ${isDarkMode ? 'bg-muted/30' : ''}`} />
                )}
              </div>
            ))}


          </div>
        )}
      </CardContent>
    </Card>
  )
}
