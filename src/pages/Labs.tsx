import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useLabStore } from '@/store/labStore'
import { useLabOrderStore } from '@/store/labOrderStore'
import { usePatientStore } from '@/store/patientStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getCardStyles, getIconStyles } from '@/lib/cardStyles'
import { useRealTimeSync } from '@/hooks/useRealTimeSync'
import TimeFilter, { TimeFilterOptions } from '@/components/ui/time-filter'
import useTimeFilteredStats from '@/hooks/useTimeFilteredStats'
import { notify } from '@/services/notificationService'
import { ExportService } from '@/services/exportService'
import LabTable from '@/components/labs/LabTable'
import AddLabDialog from '@/components/labs/AddLabDialog'
import DeleteLabDialog from '@/components/labs/DeleteLabDialog'
import LabOrderTable from '@/components/labs/LabOrderTable'
import AddLabOrderDialog from '@/components/labs/AddLabOrderDialog'
import DeleteLabOrderDialog from '@/components/labs/DeleteLabOrderDialog'
import LabPaymentDialog from '@/components/labs/LabPaymentDialog'
import {
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  Microscope,
  Building2,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  X,
  CreditCard
} from 'lucide-react'
import type { Lab, LabOrder } from '@/types'

export default function Labs() {
  const { labs, loadLabs, isLoading: labsLoading } = useLabStore()
  const {
    labOrders,
    filteredLabOrders,
    totalOrders,
    totalCost,
    totalPaid,
    totalRemaining,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    loadLabOrders,
    setSearchQuery: setOrderSearchQuery,
    setStatusFilter,
    setLabFilter,
    setDateRangeFilter,
    clearFilters,
    isLoading: ordersLoading
  } = useLabOrderStore()
  const { patients, loadPatients } = usePatientStore()

  // Time filtering for lab orders
  const labOrderStats = useTimeFilteredStats({
    data: labOrders,
    dateField: 'order_date',
    initialFilter: { preset: 'all', startDate: '', endDate: '' } // Show all data by default
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilterLocal] = useState('all')
  const [labFilterLocal, setLabFilterLocal] = useState('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [showAddLabDialog, setShowAddLabDialog] = useState(false)
  const [showAddOrderDialog, setShowAddOrderDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showDeleteLabDialog, setShowDeleteLabDialog] = useState(false)
  const [showDeleteOrderDialog, setShowDeleteOrderDialog] = useState(false)
  const [editingLab, setEditingLab] = useState<Lab | null>(null)
  const [deletingLab, setDeletingLab] = useState<Lab | null>(null)
  const [editingOrder, setEditingOrder] = useState<LabOrder | null>(null)
  const [deletingOrder, setDeletingOrder] = useState<LabOrder | null>(null)
  const [activeTab, setActiveTab] = useState('orders')

  // Enable real-time synchronization for automatic updates
  useRealTimeSync()

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load labs first, then lab orders to ensure proper lab name resolution
        await loadLabs()
        await loadLabOrders()
        await loadPatients()
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }
    loadData()
  }, [loadLabs, loadLabOrders, loadPatients])

  // Sync search query with store
  useEffect(() => {
    if (activeTab === 'orders') {
      setOrderSearchQuery(searchQuery)
    }
  }, [searchQuery, activeTab, setOrderSearchQuery])

  // Sync filters with store
  useEffect(() => {
    setStatusFilter(statusFilter)
  }, [statusFilter, setStatusFilter])

  useEffect(() => {
    setLabFilter(labFilterLocal)
  }, [labFilterLocal, setLabFilter])

  useEffect(() => {
    setDateRangeFilter(dateRange)
  }, [dateRange, setDateRangeFilter])

  const handleExportCSV = async () => {
    try {
      let csvContent = ''

      if (activeTab === 'orders') {
        // Export lab orders
        const headers = [
          'رقم الطلب',
          'اسم المختبر',
          'اسم الخدمة/التحليل',
          'اسم المريض',
          'التكلفة',
          'المبلغ المدفوع',
          'المبلغ المتبقي',
          'تاريخ الطلب',
          'الحالة',
          'الملاحظات'
        ]

        csvContent = headers.join(',') + '\n'

        filteredLabOrders.forEach((order, index) => {
          const row = [
            index + 1,
            `"${order.lab?.name || 'غير محدد'}"`,
            `"${order.service_name}"`,
            `"${order.patient?.full_name || 'غير محدد'}"`,
            order.cost,
            order.paid_amount || 0,
            order.remaining_balance || 0,
            formatDate(order.order_date),
            `"${order.status}"`,
            `"${order.notes || ''}"`
          ]
          csvContent += row.join(',') + '\n'
        })
      } else {
        // Export labs
        const headers = [
          'اسم المختبر',
          'معلومات الاتصال',
          'العنوان',
          'عدد الطلبات',
          'تاريخ الإضافة'
        ]

        csvContent = headers.join(',') + '\n'

        labs.forEach((lab) => {
          const ordersCount = labOrders.filter(order => order.lab_id === lab.id).length
          const row = [
            `"${lab.name}"`,
            `"${lab.contact_info || ''}"`,
            `"${lab.address || ''}"`,
            ordersCount,
            formatDate(lab.created_at)
          ]
          csvContent += row.join(',') + '\n'
        })
      }

      // تصدير إلى Excel مع التنسيق الجميل والمقروء
      if (activeTab === 'orders') {
        await ExportService.exportLabsToExcel(labs, filteredLabOrders)
      } else {
        await ExportService.exportLabsToExcel(labs, labOrders)
      }

      notify.success('تم تصدير البيانات بنجاح إلى ملف Excel مع التنسيق الجميل')
    } catch (error) {
      console.error('Export error:', error)
      notify.error('فشل في تصدير البيانات')
    }
  }

  const handleRefresh = async () => {
    try {
      await Promise.all([loadLabs(), loadLabOrders(), loadPatients()])
      notify.success('تم تحديث البيانات بنجاح')
    } catch (error) {
      notify.error('فشل في تحديث البيانات')
    }
  }

  const handleEditLab = (lab: Lab) => {
    setEditingLab(lab)
    setShowAddLabDialog(true)
  }

  const handleDeleteLab = (lab: Lab) => {
    setDeletingLab(lab)
    setShowDeleteLabDialog(true)
  }

  const handleAddNewLab = () => {
    setEditingLab(null)
    setShowAddLabDialog(true)
  }

  const handleCloseAddLabDialog = () => {
    setShowAddLabDialog(false)
    setEditingLab(null)
  }

  const handleCloseDeleteLabDialog = () => {
    setShowDeleteLabDialog(false)
    setDeletingLab(null)
  }

  const handleEditLabOrder = (order: LabOrder) => {
    setEditingOrder(order)
    setShowAddOrderDialog(true)
  }

  const handleDeleteLabOrder = (order: LabOrder) => {
    setDeletingOrder(order)
    setShowDeleteOrderDialog(true)
  }

  const handleAddNewLabOrder = () => {
    setEditingOrder(null)
    setShowAddOrderDialog(true)
  }

  const handleCloseAddOrderDialog = () => {
    setShowAddOrderDialog(false)
    setEditingOrder(null)
  }

  const handleCloseDeleteOrderDialog = () => {
    setShowDeleteOrderDialog(false)
    setDeletingOrder(null)
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setStatusFilterLocal('all')
    setLabFilterLocal('all')
    setDateRange({ start: '', end: '' })
    clearFilters()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'معلق':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            معلق
          </Badge>
        )
      case 'مكتمل':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            مكتمل
          </Badge>
        )
      case 'ملغي':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            ملغي
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 rtl-layout page-container w-full overflow-x-hidden" dir="rtl">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4" dir="rtl">
        <div className="text-right">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">إدارة المخابر</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            إدارة المخابر
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            className="btn-modern btn-modern-ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={labsLoading || ordersLoading}
          >
            <RefreshCw className={`w-4 h-4 sm:mr-2 ${(labsLoading || ordersLoading) ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">تحديث</span>
          </Button>
          <Button
            variant="outline"
            className="btn-modern btn-modern-ghost"
            size="sm"
            onClick={handleExportCSV}
          >
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">تصدير اكسل</span>
          </Button>
        </div>
      </div>

      {/* Time Filter Section */}
      <TimeFilter
        value={labOrderStats.timeFilter}
        onChange={labOrderStats.handleFilterChange}
        onClear={labOrderStats.resetFilter}
        title="فلترة زمنية - طلبات المخابر"
        defaultOpen={false}
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4" dir="rtl">
        {/* Total Orders */}
        <Card className="interactive-card animate-fade-in-up card-enhanced border-0 shadow-sm hover:shadow-md transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2" dir="rtl">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground text-right line-clamp-1">
              {labOrderStats.timeFilter.preset === 'all' || (!labOrderStats.timeFilter.startDate && !labOrderStats.timeFilter.endDate) ? 'إجمالي الطلبات' : 'الطلبات المفلترة'}
            </CardTitle>
            <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500/20 to-sky-600/10 group-hover:scale-110 transition-transform duration-300">
              <Microscope className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            </div>
          </CardHeader>
          <CardContent className="text-right">
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {labOrderStats.timeFilter.preset === 'all' || (!labOrderStats.timeFilter.startDate && !labOrderStats.timeFilter.endDate)
                ? labOrders.length
                : labOrderStats.filteredData.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {labOrderStats.timeFilter.preset === 'all' || (!labOrderStats.timeFilter.startDate && !labOrderStats.timeFilter.endDate)
                ? 'طلبات إجمالية'
                : 'طلبات في الفترة المحددة'}
            </p>
            {labOrderStats.trend && (
              <div className={`text-xs flex items-center mt-1 ${labOrderStats.trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                <span>{Math.abs(labOrderStats.trend.changePercent)}% من الفترة السابقة</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Cost */}
        <Card className="interactive-card animate-fade-in-up card-enhanced border-0 shadow-sm hover:shadow-md transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2" dir="rtl">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground text-right line-clamp-1">
              {labOrderStats.timeFilter.preset === 'all' || (!labOrderStats.timeFilter.startDate && !labOrderStats.timeFilter.endDate) ? 'إجمالي التكلفة' : 'التكلفة المفلترة'}
            </CardTitle>
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent className="text-right">
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {formatCurrency(
                labOrderStats.timeFilter.preset === 'all' || (!labOrderStats.timeFilter.startDate && !labOrderStats.timeFilter.endDate)
                  ? totalCost
                  : labOrderStats.filteredData.reduce((sum, order) => sum + (order.cost || 0), 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {labOrderStats.timeFilter.preset === 'all' || (!labOrderStats.timeFilter.startDate && !labOrderStats.timeFilter.endDate)
                ? 'تكلفة جميع الطلبات'
                : 'تكلفة الطلبات في الفترة المحددة'}
            </p>
            {labOrderStats.trend && (
              <div className={`text-xs flex items-center mt-1 ${labOrderStats.trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                <span>{Math.abs(labOrderStats.trend.changePercent)}% من الفترة السابقة</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Payments */}
        <Card className="interactive-card animate-fade-in-up card-enhanced border-0 shadow-sm hover:shadow-md transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2" dir="rtl">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground text-right line-clamp-1">
              {labOrderStats.timeFilter.preset === 'all' || (!labOrderStats.timeFilter.startDate && !labOrderStats.timeFilter.endDate) ? 'إجمالي الدفعات' : 'الدفعات المفلترة'}
            </CardTitle>
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 group-hover:scale-110 transition-transform duration-300">
              <CheckCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent className="text-right">
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {formatCurrency(
                labOrderStats.timeFilter.preset === 'all' || (!labOrderStats.timeFilter.startDate && !labOrderStats.timeFilter.endDate)
                  ? totalPaid
                  : labOrderStats.filteredData.reduce((sum, order) => sum + (order.paid_amount || 0), 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {labOrderStats.timeFilter.preset === 'all' || (!labOrderStats.timeFilter.startDate && !labOrderStats.timeFilter.endDate)
                ? 'جميع الدفعات المسجلة'
                : 'دفعات في الفترة المحددة'}
            </p>
          </CardContent>
        </Card>

        {/* Remaining Payments */}
        <Card className="interactive-card animate-fade-in-up card-enhanced border-0 shadow-sm hover:shadow-md transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2" dir="rtl">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground text-right line-clamp-1">
              {labOrderStats.timeFilter.preset === 'all' || (!labOrderStats.timeFilter.startDate && !labOrderStats.timeFilter.endDate) ? 'الدفعات المتبقية' : 'المتبقية المفلترة'}
            </CardTitle>
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 group-hover:scale-110 transition-transform duration-300">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent className="text-right">
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {formatCurrency(
                labOrderStats.timeFilter.preset === 'all' || (!labOrderStats.timeFilter.startDate && !labOrderStats.timeFilter.endDate)
                  ? totalRemaining
                  : labOrderStats.filteredData.reduce((sum, order) => sum + (order.remaining_balance || 0), 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {(() => {
                const remainingCount = labOrderStats.timeFilter.preset === 'all' || (!labOrderStats.timeFilter.startDate && !labOrderStats.timeFilter.endDate)
                  ? labOrders.filter(order => (order.remaining_balance || 0) > 0).length
                  : labOrderStats.filteredData.filter(order => (order.remaining_balance || 0) > 0).length;
                return `${remainingCount} طلب غير مكتمل الدفع`;
              })()}
            </p>
          </CardContent>
        </Card>

        {/* Pending Orders */}
        <Card className="interactive-card animate-fade-in-up card-enhanced border-0 shadow-sm hover:shadow-md transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2" dir="rtl">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground text-right line-clamp-1">
              {labOrderStats.timeFilter.preset === 'all' || (!labOrderStats.timeFilter.startDate && !labOrderStats.timeFilter.endDate) ? 'طلبات معلقة' : 'طلبات معلقة مفلترة'}
            </CardTitle>
            <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 group-hover:scale-110 transition-transform duration-300">
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent className="text-right">
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {labOrderStats.timeFilter.preset === 'all' || (!labOrderStats.timeFilter.startDate && !labOrderStats.timeFilter.endDate)
                ? pendingOrders
                : labOrderStats.filteredData.filter(order => order.status === 'معلق').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {labOrderStats.timeFilter.preset === 'all' || (!labOrderStats.timeFilter.startDate && !labOrderStats.timeFilter.endDate)
                ? 'في انتظار الإنجاز'
                : 'معلقة في الفترة المحددة'}
            </p>
          </CardContent>
        </Card>

        {/* Completed Orders */}
        <Card className="interactive-card animate-fade-in-up card-enhanced border-0 shadow-sm hover:shadow-md transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2" dir="rtl">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground text-right line-clamp-1">
              {labOrderStats.timeFilter.preset === 'all' || (!labOrderStats.timeFilter.startDate && !labOrderStats.timeFilter.endDate) ? 'طلبات مكتملة' : 'طلبات مكتملة مفلترة'}
            </CardTitle>
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10 group-hover:scale-110 transition-transform duration-300">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="text-right">
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {labOrderStats.timeFilter.preset === 'all' || (!labOrderStats.timeFilter.startDate && !labOrderStats.timeFilter.endDate)
                ? completedOrders
                : labOrderStats.filteredData.filter(order => order.status === 'مكتمل').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {labOrderStats.timeFilter.preset === 'all' || (!labOrderStats.timeFilter.startDate && !labOrderStats.timeFilter.endDate)
                ? 'تم إنجازها بنجاح'
                : 'مكتملة في الفترة المحددة'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4" dir="rtl">
        <div className="flex items-center justify-between" dir="rtl">
          <TabsList className="grid w-fit grid-cols-2">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Microscope className="w-4 h-4" />
              طلبات المخابر
            </TabsTrigger>
            <TabsTrigger value="labs" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              إدارة المخابر
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
              {activeTab === 'orders' && (
                <>
                  <Button 
                    variant="success"
                    className="btn-modern btn-modern-primary"
                    onClick={() => setShowPaymentDialog(true)}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    دفعة عامة
                  </Button>
                  <Button onClick={handleAddNewLabOrder} className="btn-modern btn-modern-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    طلب جديد
                  </Button>
                </>
              )}
              {activeTab === 'labs' && (
                <Button onClick={handleAddNewLab} className="btn-modern btn-modern-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  مخبر جديد
                </Button>
              )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4" dir="rtl">
          <div className="flex items-center gap-4" dir="rtl">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={activeTab === 'orders' ? 'البحث في طلبات المختبرات...' : 'البحث في المختبرات...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-modern pr-10 text-right"
                dir="rtl"
              />
            </div>
            {activeTab === 'orders' && (
              <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    تصفية
                    <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            )}
            {(statusFilter || labFilterLocal || dateRange.start || dateRange.end) && (
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                <X className="w-4 h-4 mr-2" />
                مسح التصفية
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          {activeTab === 'orders' && (
            <Collapsible open={showFilters} onOpenChange={setShowFilters}>
              <CollapsibleContent className="space-y-4" dir="rtl">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg" dir="rtl">
                  {/* Status Filter */}
                  <div className="space-y-2 text-right">
                    <label className="text-sm font-medium">الحالة</label>
                    <Select value={statusFilter} onValueChange={setStatusFilterLocal} dir="rtl">
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="جميع الحالات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الحالات</SelectItem>
                        <SelectItem value="معلق">معلق</SelectItem>
                        <SelectItem value="مكتمل">مكتمل</SelectItem>
                        <SelectItem value="ملغي">ملغي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lab Filter */}
                  <div className="space-y-2 text-right">
                    <label className="text-sm font-medium">المختبر</label>
                    <Select value={labFilterLocal} onValueChange={setLabFilterLocal} dir="rtl">
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="جميع المختبرات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع المختبرات</SelectItem>
                        {labs.map((lab) => (
                          <SelectItem key={lab.id} value={lab.id}>
                            {lab.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Range Filter */}
                  <div className="space-y-2 text-right">
                    <label className="text-sm font-medium">من تاريخ</label>
                    <Input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="text-right"
                      dir="rtl"
                    />
                  </div>

                  <div className="space-y-2 text-right">
                    <label className="text-sm font-medium">إلى تاريخ</label>
                    <Input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="text-right"
                      dir="rtl"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        {/* Lab Orders Tab */}
        <TabsContent value="orders" className="space-y-4" dir="rtl">
          <Card>
            <CardHeader dir="rtl">
              <CardTitle className="flex items-center gap-2 text-right">
                <Microscope className="w-5 h-5" />
                طلبات المخابر
              </CardTitle>
              <CardDescription className="text-right">
                إدارة جميع طلبات التلبيسات والجسور والخ..   
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LabOrderTable
                labOrders={filteredLabOrders}
                onEdit={handleEditLabOrder}
                onDelete={handleDeleteLabOrder}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Labs Management Tab */}
        <TabsContent value="labs" className="space-y-4" dir="rtl">
          <Card>
            <CardHeader dir="rtl">
              <CardTitle className="flex items-center gap-2 text-right">
                <Building2 className="w-5 h-5" />
                إدارة المخابر
              </CardTitle>
              {/* <CardDescription className="text-right">
                إدارة معلومات المخابر المتعاونة
              </CardDescription> */}
            </CardHeader>
            <CardContent>
              <LabTable
                labs={labs}
                onEdit={handleEditLab}
                onDelete={handleDeleteLab}
                searchQuery={searchQuery}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddLabDialog
        open={showAddLabDialog}
        onOpenChange={handleCloseAddLabDialog}
        editingLab={editingLab}
      />

      <DeleteLabDialog
        open={showDeleteLabDialog}
        onOpenChange={handleCloseDeleteLabDialog}
        lab={deletingLab}
      />

      <AddLabOrderDialog
        open={showAddOrderDialog}
        onOpenChange={handleCloseAddOrderDialog}
        editingOrder={editingOrder}
      />

      <DeleteLabOrderDialog
        open={showDeleteOrderDialog}
        onOpenChange={handleCloseDeleteOrderDialog}
        labOrder={deletingOrder}
      />

      <LabPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
      />
    </div>
  )
}
