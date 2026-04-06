/**
 * Dashboard Page - جميع المخططات تستخدم التقويم الميلادي فقط
 * All charts use ONLY Gregorian calendar system
 */
import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePatientStore } from '@/store/patientStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import { usePaymentStore } from '@/store/paymentStore'
import { useExpensesStore } from '@/store/expensesStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useStableClinicName } from '@/hooks/useStableSettings'
import { useInventoryStore } from '@/store/inventoryStore'
import { formatCurrency, formatDate, formatTime, getChartColors, getChartConfig, getChartColorsWithFallback, formatChartValue, parseAndFormatGregorianMonth } from '@/lib/utils'
import { useCurrency } from '@/contexts/CurrencyContext'
import { validateNumericData, validateDateData, transformToChartData, groupDataByPeriod, processFinancialData } from '@/lib/chartDataHelpers'
import { getCardStyles, getIconStyles } from '@/lib/cardStyles'
import { useTheme } from '@/contexts/ThemeContext'
import { useRealTimeSync } from '@/hooks/useRealTimeSync'
import { useRealTimeDashboard } from '@/hooks/useRealTimeReports'
import TimeFilter, { TimeFilterOptions } from '@/components/ui/time-filter'
import useTimeFilteredStats from '@/hooks/useTimeFilteredStats'
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  Plus,
  Eye,
  Package,
  Minus
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'

interface DashboardStats {
  totalPatients: number
  totalAppointments: number
  totalRevenue: number
  pendingPayments: number
  todayAppointments: number
  thisMonthRevenue: number
  lowStockItems: number
  totalExpenses: number
  netProfit: number
  profitMargin: number
}

interface DashboardProps {
  onAddPatient?: () => void
  onAddAppointment?: () => void
}

export default function Dashboard({ onAddPatient, onAddAppointment }: DashboardProps) {
  const { patients, loadPatients } = usePatientStore()
  const { appointments, getAppointmentsForDate, loadAppointments } = useAppointmentStore()
  const { payments, totalRevenue, pendingAmount, monthlyRevenue, loadPayments } = usePaymentStore()
  const { expenses, analytics: expensesAnalytics, loadExpenses } = useExpensesStore()
  const { settings, currency } = useSettingsStore()
  const { formatAmount } = useCurrency()
  const clinicName = useStableClinicName()
  const {
    items: inventoryItems,
    lowStockCount,
    expiredCount,
    expiringSoonCount,
    loadItems: loadInventoryItems
  } = useInventoryStore()
  const { isDarkMode } = useTheme()

  // Enable real-time synchronization for automatic updates
  useRealTimeSync()
  useRealTimeDashboard()

  // Time filtering for patients, appointments, and payments
  const patientStats = useTimeFilteredStats({
    data: patients,
    dateField: 'created_at',
    initialFilter: { preset: 'all', startDate: '', endDate: '' } // Show all data by default
  })

  const appointmentStats = useTimeFilteredStats({
    data: appointments,
    dateField: 'start_time',
    initialFilter: { preset: 'all', startDate: '', endDate: '' } // Show all data by default
  })

  const paymentStats = useTimeFilteredStats({
    data: payments,
    dateField: 'payment_date',
    initialFilter: { preset: 'all', startDate: '', endDate: '' } // Show all data by default
  })

  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    todayAppointments: 0,
    thisMonthRevenue: 0,
    lowStockItems: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0
  })

  useEffect(() => {
    // Load all required data when component mounts
    const loadAllData = async () => {
      try {
        await Promise.all([
          loadPatients(),
          loadAppointments(),
          loadPayments(),
          loadExpenses(),
          loadInventoryItems()
        ])
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      }
    }

    loadAllData()
  }, [loadPatients, loadAppointments, loadPayments, loadExpenses, loadInventoryItems])



  useEffect(() => {
    // Calculate dashboard statistics with validation using filtered data
    const today = new Date()
    const todayAppointments = getAppointmentsForDate(today)
    const thisMonth = today.toISOString().slice(0, 7)
    const thisMonthRevenue = typeof monthlyRevenue[thisMonth] === 'number' ? monthlyRevenue[thisMonth] : 0

    // Use filtered data for statistics
    const filteredPatientCount = patientStats.filteredData.length
    const filteredAppointmentCount = appointmentStats.filteredData.length

    // Validate all numeric values
    const validatedStats: DashboardStats = {
      totalPatients: Math.max(0, filteredPatientCount),
      totalAppointments: Math.max(0, filteredAppointmentCount),
      totalRevenue: Math.max(0, totalRevenue || 0),
      pendingPayments: Math.max(0, pendingAmount || 0),
      todayAppointments: Math.max(0, todayAppointments.length),
      thisMonthRevenue: Math.max(0, thisMonthRevenue),
      lowStockItems: Math.max(0, (lowStockCount || 0) + (expiredCount || 0) + (expiringSoonCount || 0)),
      totalExpenses: 0,
      netProfit: 0,
      profitMargin: 0
    }

    // Round financial values to 2 decimal places
    validatedStats.totalRevenue = Math.round(validatedStats.totalRevenue * 100) / 100
    validatedStats.pendingPayments = Math.round(validatedStats.pendingPayments * 100) / 100
    validatedStats.thisMonthRevenue = Math.round(validatedStats.thisMonthRevenue * 100) / 100

    setStats(validatedStats)
  }, [patientStats.filteredData, appointmentStats.filteredData, paymentStats.financialStats, pendingAmount, monthlyRevenue, getAppointmentsForDate, lowStockCount, expiredCount, expiringSoonCount])

  // Enhanced revenue data preparation with comprehensive validation
  const revenueData = (() => {
    try {
      const entries = Object.entries(monthlyRevenue)
        .filter(([month, revenue]) => {
          // Enhanced validation for month format and revenue value
          const isValidMonth = month.match(/^\d{4}-\d{2}$/)
          const isValidRevenue = typeof revenue === 'number' && !isNaN(revenue) && isFinite(revenue) && revenue >= 0
          return isValidMonth && isValidRevenue
        })
        .slice(-6) // Last 6 months
        .map(([month, revenue]) => {
          // Convert to Gregorian calendar format with Arabic month names
          const monthName = parseAndFormatGregorianMonth(month)

          return {
            month: monthName,
            revenue: Math.round(revenue * 100) / 100, // Round to 2 decimal places
            formattedRevenue: formatAmount(revenue)
          }
        })
        .sort((a, b) => {
          // Sort by actual date for proper chronological order
          const dateA = new Date(a.month)
          const dateB = new Date(b.month)
          return dateA.getTime() - dateB.getTime()
        })

      // Validate the final data
      if (!validateNumericData(entries)) {
        console.warn('Dashboard: Invalid revenue data detected')
        return []
      }

      return entries
    } catch (error) {
      console.error('Dashboard: Error processing revenue data:', error)
      return []
    }
  })()

  // Get professional chart colors
  const categoricalColors = getChartColors('categorical', isDarkMode)
  const primaryColors = getChartColors('primary', isDarkMode)
  const statusColors = getChartColorsWithFallback('status', isDarkMode, 8)
  const financialColors = getChartColorsWithFallback('financial', isDarkMode, 4)
  const chartConfiguration = getChartConfig(isDarkMode)

  // Enhanced appointment status data with comprehensive validation
  const appointmentStatusData = (() => {
    try {
      // Define status mapping with proper Arabic labels and colors
      const statusMapping = [
        { status: 'completed', name: 'مكتمل', color: statusColors[0] }, // Green for completed
        { status: 'scheduled', name: 'مجدول', color: statusColors[4] }, // Purple for scheduled
        { status: 'cancelled', name: 'ملغي', color: statusColors[2] }, // Red for cancelled
        { status: 'no_show', name: 'لم يحضر', color: statusColors[3] } // Gray for no show
      ]

      const statusData = statusMapping.map(({ status, name, color }) => {
        const count = appointments.filter(a => a && a.status === status).length
        return {
          name,
          value: Math.max(0, count),
          color,
          percentage: appointments.length > 0 ? Math.round((count / appointments.length) * 100) : 0
        }
      }).filter(item => item.value > 0) // Only include statuses with data

      // Enhanced validation
      const totalStatusCount = statusData.reduce((sum, item) => sum + item.value, 0)
      const validAppointments = appointments.filter(a => a && typeof a === 'object')

      if (totalStatusCount !== validAppointments.length && validAppointments.length > 0) {
        console.warn('Dashboard appointment status counts mismatch:', {
          totalStatusCount,
          validAppointmentsLength: validAppointments.length,
          statusBreakdown: statusData.map(s => ({ name: s.name, value: s.value }))
        })
      }

      return statusData
    } catch (error) {
      console.error('Dashboard: Error processing appointment status data:', error)
      return []
    }
  })()

  const todayAppointments = getAppointmentsForDate(new Date())

  return (
    <div className="space-y-6 rtl-layout page-container">
      {/* Welcome Section */}
      <div className="flex items-center justify-between flex-wrap gap-4 page-header">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground animate-fade-in-up">
              مرحباً بك في {clinicName}
            </h1>
          </div>
          <p className="text-muted-foreground animate-fade-in-up delay-100">
            إليك ما يحدث في عيادتك - تحديث تلقائي في الوقت الفعلي
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={onAddAppointment} className="btn-modern btn-modern-primary">
            <Plus className="w-4 h-4" />
            موعد جديد
          </Button>
          <Button variant="outline" onClick={onAddPatient} className="btn-modern btn-modern-ghost">
            <Plus className="w-4 h-4" />
            مريض جديد
          </Button>
        </div>
      </div>

      {/* Time Filter Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in-up delay-200">
        <TimeFilter
          value={appointmentStats.timeFilter}
          onChange={appointmentStats.handleFilterChange}
          onClear={appointmentStats.resetFilter}
          title="فلترة زمنية - المواعيد"
          className="lg:col-span-1"
          defaultOpen={false}
        />
        <TimeFilter
          value={paymentStats.timeFilter}
          onChange={paymentStats.handleFilterChange}
          onClear={paymentStats.resetFilter}
          title="فلترة زمنية - المدفوعات"
          className="lg:col-span-1"
          defaultOpen={false}
        />
      </div>

      {/* Stats Cards */}
      <div className="dashboard-grid stagger-children">
        <Card className="interactive-card animate-fade-in-up">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي المرضى
            </CardTitle>
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="stats-content">
            <div className="text-3xl font-bold text-foreground">
              {patients.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              إجمالي المرضى المسجلين
            </p>
          </CardContent>
        </Card>

        <Card className="interactive-card animate-fade-in-up delay-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {appointmentStats.timeFilter.preset === 'all' || (!appointmentStats.timeFilter.startDate && !appointmentStats.timeFilter.endDate) ? 'إجمالي المواعيد' : 'المواعيد المفلترة'}
            </CardTitle>
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30">
              <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent className="stats-content">
            <div className="text-3xl font-bold text-foreground">
              {appointmentStats.timeFilter.preset === 'all' || (!appointmentStats.timeFilter.startDate && !appointmentStats.timeFilter.endDate)
                ? appointments.length
                : appointmentStats.filteredData.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {appointmentStats.timeFilter.preset === 'all' || (!appointmentStats.timeFilter.startDate && !appointmentStats.timeFilter.endDate)
                ? 'إجمالي المواعيد المسجلة'
                : `من إجمالي ${appointments.length} موعد`}
            </p>
            {appointmentStats.trend && (
              <div className={`text-xs mt-2 flex items-center gap-1 badge-modern ${appointmentStats.trend.isPositive ? 'badge-modern-success' : 'badge-modern-danger'}`}>
                <span>{appointmentStats.trend.isPositive ? '↗' : '↘'}</span>
                <span>{Math.abs(appointmentStats.trend.changePercent)}%</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="interactive-card animate-fade-in-up delay-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {appointmentStats.timeFilter.preset === 'all' || (!appointmentStats.timeFilter.startDate && !appointmentStats.timeFilter.endDate) ? 'المواعيد المكتملة' : 'المواعيد المكتملة المفلترة'}
            </CardTitle>
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent className="stats-content">
            <div className="text-3xl font-bold text-foreground">
              {appointmentStats.timeFilter.preset === 'all' || (!appointmentStats.timeFilter.startDate && !appointmentStats.timeFilter.endDate)
                ? appointments.filter(a => a.status === 'completed').length
                : appointmentStats.filteredData.filter(a => a.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {appointmentStats.timeFilter.preset === 'all' || (!appointmentStats.timeFilter.startDate && !appointmentStats.timeFilter.endDate)
                ? 'إجمالي المواعيد المكتملة'
                : 'المواعيد المكتملة في الفترة المحددة'}
            </p>
          </CardContent>
        </Card>

        <Card className="interactive-card animate-fade-in-up delay-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate) ? 'إيرادات الشهر' : 'الإيرادات المفلترة'}
            </CardTitle>
            <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="stats-content">
            <div className="text-3xl font-bold text-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate)
                ? formatAmount(stats.thisMonthRevenue)
                : formatAmount(paymentStats.financialStats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate)
                ? 'أرباح هذا الشهر'
                : 'الإيرادات في الفترة المحددة'}
            </p>
            {paymentStats.trend && (
              <div className={`text-xs mt-2 flex items-center gap-1 badge-modern ${paymentStats.trend.isPositive ? 'badge-modern-success' : 'badge-modern-danger'}`}>
                <span>{paymentStats.trend.isPositive ? '↗' : '↘'}</span>
                <span className="ml-1">{Math.abs(paymentStats.trend.changePercent)}%</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Row Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 stagger-children">
        <Card className="interactive-card animate-fade-in-up delay-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate) ? 'إجمالي الإيرادات' : 'إجمالي الإيرادات المفلترة'}
            </CardTitle>
            <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="stats-content">
            <div className="text-3xl font-bold text-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate)
                ? formatAmount(stats.totalRevenue)
                : formatAmount(paymentStats.financialStats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate)
                ? 'إجمالي الإيرادات المحققة'
                : 'إجمالي الإيرادات في الفترة المحددة'}
            </p>
          </CardContent>
        </Card>

        <Card className="interactive-card animate-fade-in-up delay-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate) ? 'المدفوعات المعلقة' : 'المدفوعات المعلقة المفلترة'}
            </CardTitle>
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent className="stats-content">
            <div className="text-3xl font-bold text-foreground">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate)
                ? formatAmount(stats.pendingPayments)
                : formatAmount(paymentStats.financialStats.pendingAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {paymentStats.timeFilter.preset === 'all' || (!paymentStats.timeFilter.startDate && !paymentStats.timeFilter.endDate)
                ? 'مدفوعات في انتظار التحصيل'
                : 'مدفوعات معلقة في الفترة المحددة'}
            </p>
          </CardContent>
        </Card>

        <Card className="interactive-card animate-fade-in-up delay-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">تنبيهات المخزون</CardTitle>
            <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-900/30">
              <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent className="stats-content">
            <div className="text-3xl font-bold text-foreground">{stats.lowStockItems}</div>
            <p className="text-xs text-muted-foreground mt-1">
              عناصر تحتاج انتباه
            </p>
            {stats.lowStockItems > 0 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                <span className="badge-modern badge-modern-warning">مخزون منخفض: {lowStockCount}</span>
                <span className="badge-modern badge-modern-danger">منتهي: {expiredCount + expiringSoonCount}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <TrendingUp className="w-5 h-5" />
              <span>اتجاه الإيرادات</span>
            </CardTitle>
            <CardDescription>
              الإيرادات الشهرية خلال آخر 6 أشهر ({formatAmount(stats.totalRevenue)} إجمالي)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {revenueData.length === 0 ? (
              <div className="flex items-center justify-center h-80 text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد بيانات إيرادات متاحة</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={chartConfiguration.responsive.desktop.height}>
                <LineChart
                  data={revenueData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray={chartConfiguration.grid.strokeDasharray}
                    stroke={chartConfiguration.grid.stroke}
                    strokeOpacity={chartConfiguration.grid.strokeOpacity}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                    axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                    tickLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: isDarkMode ? '#9ca3af' : '#6b7280' }}
                    axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                    tickLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                    tickFormatter={(value) => formatChartValue(value, 'currency', currency)}
                    domain={[0, 'dataMax + 100']}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value), currency), 'الإيرادات']}
                    labelFormatter={(label) => `الشهر: ${label}`}
                    contentStyle={chartConfiguration.tooltip}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke={financialColors[0]}
                    strokeWidth={chartConfiguration.line.strokeWidth}
                    dot={{
                      fill: financialColors[0],
                      strokeWidth: chartConfiguration.line.dot.strokeWidth,
                      r: chartConfiguration.line.dot.r
                    }}
                    activeDot={{
                      r: chartConfiguration.line.activeDot.r,
                      stroke: financialColors[0],
                      strokeWidth: chartConfiguration.line.activeDot.strokeWidth
                    }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Appointment Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 space-x-reverse">
              <Calendar className="w-5 h-5" />
              <span>حالة المواعيد</span>
            </CardTitle>
            <CardDescription>
              توزيع حالات المواعيد ({appointments.length} موعد إجمالي)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {appointmentStatusData.length === 0 ? (
              <div className="flex items-center justify-center h-80 text-muted-foreground">
                <div className="text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد مواعيد متاحة</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={chartConfiguration.responsive.desktop.height}>
                <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <Pie
                    data={appointmentStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent, value }) =>
                      value > 0 ? `${name}: ${value} (${(percent * 100).toFixed(0)}%)` : ''
                    }
                    outerRadius={120}
                    innerRadius={50}
                    fill="#8884d8"
                    dataKey="value"
                    stroke={isDarkMode ? '#1f2937' : '#ffffff'}
                    strokeWidth={2}
                    paddingAngle={2}
                  >
                    {appointmentStatusData.map((entry, index) => (
                      <Cell
                        key={`appointment-status-${index}`}
                        fill={entry.color}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [
                      `${value} موعد`,
                      'العدد'
                    ]}
                    labelFormatter={(label) => `الحالة: ${label}`}
                    contentStyle={chartConfiguration.tooltip}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}

            {/* Status Legend */}
            {appointmentStatusData.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {appointmentStatusData.map((status, index) => (
                  <div key={`legend-${index}`} className="flex items-center space-x-2 space-x-reverse">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="text-muted-foreground">
                      {status.name}: {status.value} ({status.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>مواعيد اليوم</CardTitle>
          <CardDescription>
            {todayAppointments.length} موعد مجدول لتاريخ {formatDate(new Date(), 'long')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todayAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد مواعيد مجدولة لليوم</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todayAppointments.slice(0, 5).map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <div>
                      <p className="font-medium arabic-enhanced">{appointment.patient?.full_name || appointment.patient_name || 'مريض غير معروف'}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                      appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {appointment.status === 'scheduled' ? 'مجدول' :
                       appointment.status === 'completed' ? 'مكتمل' :
                       appointment.status === 'cancelled' ? 'ملغي' :
                       appointment.status === 'no_show' ? 'لم يحضر' : appointment.status}
                    </span>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {todayAppointments.length > 5 && (
                <div className="text-center">
                  <Button variant="outline">
                    عرض جميع المواعيد ({todayAppointments.length})
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}