import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  DollarSign,
  Activity,
  PieChart,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  RefreshCw
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { usePatientStore } from '@/store/patientStore'
import { useAppointmentStore } from '@/store/appointmentStore'
import { usePaymentStore } from '@/store/paymentStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useTheme } from '@/contexts/ThemeContext'
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { ar } from 'date-fns/locale'

interface DashboardAnalyticsProps {
  onNavigateToPatients?: () => void
  onNavigateToAppointments?: () => void
  onNavigateToPayments?: () => void
  onNavigateToTreatments?: () => void
}

interface AnalyticsData {
  overview: {
    totalPatients: number
    totalAppointments: number
    totalRevenue: number
    growthRate: number
  }
  trends: {
    patientGrowth: Array<{ date: string; count: number }>
    revenueGrowth: Array<{ date: string; amount: number }>
    appointmentTrend: Array<{ date: string; count: number }>
  }
  distributions: {
    appointmentStatus: Array<{ name: string; value: number; color: string }>
    paymentMethods: Array<{ name: string; value: number; color: string }>
    ageGroups: Array<{ name: string; value: number; color: string }>
  }
  kpis: {
    patientRetention: number
    appointmentUtilization: number
    averageRevenue: number
    noShowRate: number
  }
}

export default function DashboardAnalytics({
  onNavigateToPatients,
  onNavigateToAppointments,
  onNavigateToPayments,
  onNavigateToTreatments
}: DashboardAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [timeRange, setTimeRange] = useState('30d')

  const { patients } = usePatientStore()
  const { appointments } = useAppointmentStore()
  const { payments, totalRevenue } = usePaymentStore()
  const { items: inventoryItems } = useInventoryStore()
  const { currency } = useSettingsStore()
  const { isDarkMode } = useTheme()

  // Calculate analytics data
  useEffect(() => {
    calculateAnalytics()
  }, [patients, appointments, payments, timeRange])

  const calculateAnalytics = () => {
    setIsLoading(true)

    try {
      // Calculate date range
      const endDate = new Date()
      const startDate = subDays(endDate, timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90)

      // Filter data by time range
      const filteredAppointments = appointments.filter(apt =>
        isWithinInterval(new Date(apt.date), { start: startDate, end: endDate })
      )
      const filteredPayments = payments.filter(payment =>
        isWithinInterval(new Date(payment.payment_date), { start: startDate, end: endDate })
      )

      // Calculate overview metrics
      const overview = {
        totalPatients: patients.length,
        totalAppointments: filteredAppointments.length,
        totalRevenue: filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
        growthRate: calculateGrowthRate()
      }

      // Calculate trends
      const trends = {
        patientGrowth: calculatePatientGrowth(startDate, endDate),
        revenueGrowth: calculateRevenueGrowth(startDate, endDate),
        appointmentTrend: calculateAppointmentTrend(startDate, endDate)
      }

      // Calculate distributions
      const distributions = {
        appointmentStatus: calculateAppointmentStatusDistribution(filteredAppointments),
        paymentMethods: calculatePaymentMethodDistribution(filteredPayments),
        ageGroups: calculateAgeGroupDistribution()
      }

      // Calculate KPIs
      const kpis = {
        patientRetention: calculatePatientRetention(),
        appointmentUtilization: calculateAppointmentUtilization(filteredAppointments),
        averageRevenue: overview.totalRevenue / Math.max(overview.totalPatients, 1),
        noShowRate: calculateNoShowRate(filteredAppointments)
      }

      setAnalyticsData({
        overview,
        trends,
        distributions,
        kpis
      })
    } catch (error) {
      console.error('Error calculating analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateGrowthRate = (): number => {
    const currentMonth = new Date()
    const lastMonth = subDays(currentMonth, 30)

    const currentMonthPatients = patients.filter(p =>
      new Date(p.created_at || p.registration_date) >= lastMonth
    ).length

    const previousMonthPatients = patients.length - currentMonthPatients

    if (previousMonthPatients === 0) return 100
    return ((currentMonthPatients - previousMonthPatients) / previousMonthPatients) * 100
  }

  const calculatePatientGrowth = (startDate: Date, endDate: Date) => {
    const days = []
    const current = new Date(startDate)

    while (current <= endDate) {
      const dayPatients = patients.filter(p => {
        const patientDate = new Date(p.created_at || p.registration_date)
        return patientDate.toDateString() === current.toDateString()
      }).length

      days.push({
        date: format(current, 'MM/dd', { locale: ar }),
        count: dayPatients
      })

      current.setDate(current.getDate() + 1)
    }

    return days
  }

  const calculateRevenueGrowth = (startDate: Date, endDate: Date) => {
    const days = []
    const current = new Date(startDate)

    while (current <= endDate) {
      const dayRevenue = payments.filter(p => {
        const paymentDate = new Date(p.payment_date)
        return paymentDate.toDateString() === current.toDateString()
      }).reduce((sum, p) => sum + (p.amount || 0), 0)

      days.push({
        date: format(current, 'MM/dd', { locale: ar }),
        amount: dayRevenue
      })

      current.setDate(current.getDate() + 1)
    }

    return days
  }

  const calculateAppointmentTrend = (startDate: Date, endDate: Date) => {
    const days = []
    const current = new Date(startDate)

    while (current <= endDate) {
      const dayAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.date)
        return aptDate.toDateString() === current.toDateString()
      }).length

      days.push({
        date: format(current, 'MM/dd', { locale: ar }),
        count: dayAppointments
      })

      current.setDate(current.getDate() + 1)
    }

    return days
  }

  const calculateAppointmentStatusDistribution = (filteredAppointments: any[]) => {
    const statusCounts = filteredAppointments.reduce((acc, apt) => {
      acc[apt.status] = (acc[apt.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const colors = {
      'scheduled': '#3b82f6',
      'completed': '#10b981',
      'cancelled': '#ef4444',
      'no-show': '#f59e0b'
    }

    const statusNames = {
      'scheduled': 'مجدول',
      'completed': 'مكتمل',
      'cancelled': 'ملغي',
      'no-show': 'لم يحضر'
    }

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: statusNames[status as keyof typeof statusNames] || status,
      value: count,
      color: colors[status as keyof typeof colors] || '#6b7280'
    }))
  }

  const calculatePaymentMethodDistribution = (filteredPayments: any[]) => {
    const methodCounts = filteredPayments.reduce((acc, payment) => {
      const method = payment.payment_method || 'نقدي'
      acc[method] = (acc[method] || 0) + (payment.amount || 0)
      return acc
    }, {} as Record<string, number>)

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

    return Object.entries(methodCounts).map(([method, amount], index) => ({
      name: method,
      value: amount,
      color: colors[index % colors.length]
    }))
  }

  const calculateAgeGroupDistribution = () => {
    const ageGroups = {
      '0-18': 0,
      '19-35': 0,
      '36-50': 0,
      '51-65': 0,
      '65+': 0
    }

    patients.forEach(patient => {
      if (patient.date_of_birth) {
        const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()
        if (age <= 18) ageGroups['0-18']++
        else if (age <= 35) ageGroups['19-35']++
        else if (age <= 50) ageGroups['36-50']++
        else if (age <= 65) ageGroups['51-65']++
        else ageGroups['65+']++
      }
    })

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

    return Object.entries(ageGroups).map(([group, count], index) => ({
      name: group,
      value: count,
      color: colors[index]
    }))
  }

  const calculatePatientRetention = (): number => {
    const threeMonthsAgo = subDays(new Date(), 90)
    const oldPatients = patients.filter(p =>
      new Date(p.created_at || p.registration_date) < threeMonthsAgo
    )

    const recentAppointments = appointments.filter(apt =>
      new Date(apt.date) >= threeMonthsAgo
    )

    const activeOldPatients = oldPatients.filter(patient =>
      recentAppointments.some(apt => apt.patient_id === patient.id)
    )

    return oldPatients.length > 0 ? (activeOldPatients.length / oldPatients.length) * 100 : 0
  }

  const calculateAppointmentUtilization = (filteredAppointments: any[]): number => {
    const completedAppointments = filteredAppointments.filter(apt => apt.status === 'completed')
    return filteredAppointments.length > 0 ? (completedAppointments.length / filteredAppointments.length) * 100 : 0
  }

  const calculateNoShowRate = (filteredAppointments: any[]): number => {
    const noShowAppointments = filteredAppointments.filter(apt => apt.status === 'no-show')
    return filteredAppointments.length > 0 ? (noShowAppointments.length / filteredAppointments.length) * 100 : 0
  }

  if (isLoading || !analyticsData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">التحليلات والإحصائيات</h2>
          <p className="text-muted-foreground">تحليل شامل لأداء العيادة والاتجاهات</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant={timeRange === '7d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('7d')}
            >
              7 أيام
            </Button>
            <Button
              variant={timeRange === '30d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('30d')}
            >
              30 يوم
            </Button>
            <Button
              variant={timeRange === '90d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('90d')}
            >
              90 يوم
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={calculateAnalytics}>
            <RefreshCw className="w-4 h-4 mr-2" />
            تحديث
          </Button>
        </div>
      </div>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="trends">الاتجاهات</TabsTrigger>
          <TabsTrigger value="distributions">التوزيعات</TabsTrigger>
          <TabsTrigger value="kpis">المؤشرات الرئيسية</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onNavigateToPatients}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">إجمالي المرضى</p>
                    <p className="text-2xl font-bold">{analyticsData.overview.totalPatients}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
                <div className="flex items-center mt-2">
                  {analyticsData.overview.growthRate >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm ${analyticsData.overview.growthRate >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {Math.abs(analyticsData.overview.growthRate).toFixed(1)}%
                  </span>
                  <span className="text-sm text-muted-foreground mr-1">من الشهر الماضي</span>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onNavigateToAppointments}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">المواعيد</p>
                    <p className="text-2xl font-bold">{analyticsData.overview.totalAppointments}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-green-500" />
                </div>
                <div className="flex items-center mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {timeRange === '7d' ? 'آخر 7 أيام' : timeRange === '30d' ? 'آخر 30 يوم' : 'آخر 90 يوم'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onNavigateToPayments}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">الإيرادات</p>
                    <p className="text-2xl font-bold">{analyticsData.overview.totalRevenue.toFixed(2)} {currency}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-yellow-500" />
                </div>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-muted-foreground">
                    متوسط: {analyticsData.kpis.averageRevenue.toFixed(2)} {currency}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">معدل الاستفادة</p>
                    <p className="text-2xl font-bold">{analyticsData.kpis.appointmentUtilization.toFixed(1)}%</p>
                  </div>
                  <Activity className="w-8 h-8 text-purple-500" />
                </div>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-muted-foreground">
                    من المواعيد المجدولة
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Patient Growth Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  نمو المرضى
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData.trends.patientGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue Growth Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  نمو الإيرادات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={analyticsData.trends.revenueGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} ${currency}`, 'الإيرادات']} />
                    <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Appointment Trend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  اتجاه المواعيد
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.trends.appointmentTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Distributions Tab */}
        <TabsContent value="distributions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Appointment Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  حالة المواعيد
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={analyticsData.distributions.appointmentStatus}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {analyticsData.distributions.appointmentStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Payment Methods Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  طرق الدفع
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={analyticsData.distributions.paymentMethods}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {analyticsData.distributions.paymentMethods.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} ${currency}`, 'المبلغ']} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Age Groups Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  الفئات العمرية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={analyticsData.distributions.ageGroups}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {analyticsData.distributions.ageGroups.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* KPIs Tab */}
        <TabsContent value="kpis" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">معدل الاحتفاظ بالمرضى</p>
                    <p className="text-3xl font-bold text-green-600">{analyticsData.kpis.patientRetention.toFixed(1)}%</p>
                  </div>
                  <Users className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  المرضى النشطين من إجمالي المرضى القدامى
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">معدل استغلال المواعيد</p>
                    <p className="text-3xl font-bold text-blue-600">{analyticsData.kpis.appointmentUtilization.toFixed(1)}%</p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-500" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  المواعيد المكتملة من إجمالي المواعيد
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">متوسط الإيرادات لكل مريض</p>
                    <p className="text-3xl font-bold text-yellow-600">{analyticsData.kpis.averageRevenue.toFixed(0)} {currency}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-yellow-500" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  إجمالي الإيرادات ÷ عدد المرضى
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">معدل عدم الحضور</p>
                    <p className="text-3xl font-bold text-red-600">{analyticsData.kpis.noShowRate.toFixed(1)}%</p>
                  </div>
                  <Activity className="w-8 h-8 text-red-500" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  المواعيد التي لم يحضر إليها المرضى
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>إجراءات سريعة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button onClick={onNavigateToPatients} className="h-12 justify-start">
                  <Users className="w-4 h-4 mr-2" />
                  إدارة المرضى
                </Button>
                <Button onClick={onNavigateToAppointments} variant="outline" className="h-12 justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  إدارة المواعيد
                </Button>
                <Button onClick={onNavigateToPayments} variant="outline" className="h-12 justify-start">
                  <DollarSign className="w-4 h-4 mr-2" />
                  إدارة المدفوعات
                </Button>
                <Button onClick={onNavigateToTreatments} variant="outline" className="h-12 justify-start">
                  <Activity className="w-4 h-4 mr-2" />
                  إدارة العلاجات
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
