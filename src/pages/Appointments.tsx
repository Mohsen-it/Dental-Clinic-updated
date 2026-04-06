import React, { useState, useCallback, useEffect } from 'react'
import { Calendar as BigCalendar, momentLocalizer, View, Views } from 'react-big-calendar'
import moment from 'moment'
import { MOMENT_GREGORIAN_CONFIG } from '@/lib/gregorianCalendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useAppointmentStore } from '@/store/appointmentStore'
import { usePatientStore } from '@/store/patientStore'
import { useDentalTreatmentStore } from '@/store/dentalTreatmentStore'
import { useToast } from '@/hooks/use-toast'
import { formatDate, formatDateTime, formatTime, getStatusColor } from '@/lib/utils'
import { getTreatmentByValue } from '@/data/teethData'
import { useRealTimeSync } from '@/hooks/useRealTimeSync'
import { useRealTimeTableSync } from '@/hooks/useRealTimeTableSync'
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, User, RefreshCw, Download, Table, Search, Filter, X, CalendarDays } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import AppointmentTable from '@/components/appointments/AppointmentTable'
import { notify } from '@/services/notificationService'
import { ExportService } from '@/services/exportService'
import AddAppointmentDialog from '@/components/AddAppointmentDialog'
import DeleteAppointmentDialog from '@/components/appointments/DeleteAppointmentDialog'
import PatientDetailsModal from '@/components/patients/PatientDetailsModal'
import 'react-big-calendar/lib/css/react-big-calendar.css'

// Configure moment.js to use Gregorian calendar explicitly with Arabic locale
// استخدام التقويم الميلادي فقط مع اللغة العربية
moment.locale('ar', MOMENT_GREGORIAN_CONFIG)

// Ensure we're using Gregorian calendar system
moment.updateLocale('ar', MOMENT_GREGORIAN_CONFIG)

const localizer = momentLocalizer(moment)

// Function to translate appointment status to Arabic
const getStatusInArabic = (status: string) => {
  switch (status) {
    case 'scheduled':
      return 'مجدول'
    case 'completed':
      return 'مكتمل'
    case 'cancelled':
      return 'ملغي'
    case 'no_show':
      return 'لم يحضر'
    default:
      return status
  }
}

const getTreatmentDisplayName = (treatmentType: string) => {
  const treatment = getTreatmentByValue(treatmentType)
  return treatment?.label || treatmentType
}

export default function Appointments() {
  // Enable real-time synchronization for automatic updates
  useRealTimeSync()
  useRealTimeTableSync()

  const {
    appointments,
    calendarEvents,
    selectedAppointment,
    calendarView,
    selectedDate,
    setSelectedAppointment,
    setCalendarView,
    setSelectedDate,
    loadAppointments,
    deleteAppointment,
    updateAppointment,
    createAppointment
  } = useAppointmentStore()

  const { patients, loadPatients } = usePatientStore()
  const { loadToothTreatmentsByAppointment } = useDentalTreatmentStore()
  const { toast } = useToast()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [appointmentTreatments, setAppointmentTreatments] = useState<{ [appointmentId: string]: any[] }>({})
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPatientDetails, setShowPatientDetails] = useState(false)
  const [selectedPatientForDetails, setSelectedPatientForDetails] = useState<any>(null)
  const [selectedSlotInfo, setSelectedSlotInfo] = useState<{date: Date, time: string} | null>(null)
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false)

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [patientFilter, setPatientFilter] = useState('all')
  const [dateRangeFilter, setDateRangeFilter] = useState({ start: '', end: '' })

  // Load appointments and patients on component mount
  useEffect(() => {
    loadAppointments()
    loadPatients()
  }, [loadAppointments, loadPatients])

  // Load treatments for each appointment
  useEffect(() => {
    const loadTreatmentsForAppointments = async () => {
      const treatmentsMap: { [appointmentId: string]: any[] } = {}
      
      for (const appointment of appointments) {
        try {
          const treatments = await loadToothTreatmentsByAppointment(appointment.id)
          treatmentsMap[appointment.id] = treatments
        } catch (error) {
          console.error(`Error loading treatments for appointment ${appointment.id}:`, error)
          treatmentsMap[appointment.id] = []
        }
      }
      
      setAppointmentTreatments(treatmentsMap)
    }

    if (appointments.length > 0) {
      loadTreatmentsForAppointments()
    }
  }, [appointments, loadToothTreatmentsByAppointment])

  // Check for search result navigation
  useEffect(() => {
    const searchResultData = localStorage.getItem('selectedAppointmentForDetails')
    if (searchResultData) {
      try {
        const { appointment, openDetailsModal } = JSON.parse(searchResultData)
        if (openDetailsModal && appointment) {
          setSelectedAppointment(appointment)
          setShowAddDialog(true) // Open edit dialog for appointment details
          localStorage.removeItem('selectedAppointmentForDetails')
        }
      } catch (error) {
        console.error('Error parsing search result data:', error)
        localStorage.removeItem('selectedAppointmentForDetails')
      }
    }
  }, [])

  // Apply advanced filters to appointments
  const filteredAppointments = React.useMemo(() => {
    let filtered = [...appointments]

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(appointment => {
        const patientName = appointment.patient?.full_name?.toLowerCase() || ''
        const title = appointment.title?.toLowerCase() || ''
        const description = appointment.description?.toLowerCase() || ''

        return patientName.includes(query) ||
               title.includes(query) ||
               description.includes(query)
      })
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(appointment => appointment.status === statusFilter)
    }

    // Patient filter
    if (patientFilter !== 'all') {
      filtered = filtered.filter(appointment => appointment.patient_id === patientFilter)
    }

    // Date range filter
    if (dateRangeFilter.start && dateRangeFilter.end) {
      const startDate = new Date(dateRangeFilter.start)
      const endDate = new Date(dateRangeFilter.end)
      endDate.setHours(23, 59, 59, 999) // Include the entire end date

      filtered = filtered.filter(appointment => {
        const appointmentDate = new Date(appointment.start_time)
        return appointmentDate >= startDate && appointmentDate <= endDate
      })
    }

    return filtered
  }, [appointments, searchQuery, statusFilter, patientFilter, dateRangeFilter])

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setPatientFilter('all')
    setDateRangeFilter({ start: '', end: '' })
    setShowFilters(false)
  }

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!appointmentToDelete) return

    setIsLoading(true)
    try {
      await deleteAppointment(appointmentToDelete)
      toast({
        title: 'نجح',
        description: 'تم حذف الموعد بنجاح',
        variant: 'default',
      })
      setShowDeleteDialog(false)
      setAppointmentToDelete(null)
    } catch (error) {
      console.error('Error deleting appointment:', error)
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حذف الموعد',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectEvent = useCallback((event: any) => {
    setSelectedAppointment(event.resource)
  }, [setSelectedAppointment])

  const handleSelectSlot = useCallback((slotInfo: any) => {
    console.log('Selected slot:', slotInfo)

    // Extract date and time from slotInfo
    const selectedDate = slotInfo.start || new Date()
    const timeString = selectedDate.toTimeString().slice(0, 5) // HH:MM format

    // Store selected slot information
    setSelectedSlotInfo({
      date: selectedDate,
      time: timeString
    })

    // Clear selection for new appointment and open dialog with selected time
    setSelectedAppointment(null)
    setShowAddDialog(true)
  }, [])

  const handleNavigate = useCallback((newDate: Date) => {
    setSelectedDate(newDate)
  }, [setSelectedDate])

  const handleViewChange = useCallback((view: View) => {
    setCalendarView(view as 'month' | 'week' | 'day' | 'agenda')
  }, [setCalendarView])

  const eventStyleGetter = (event: any) => {
    const appointment = event.resource
    let backgroundColor = '#3174ad'

    switch (appointment?.status) {
      case 'completed':
        backgroundColor = '#10b981'
        break
      case 'cancelled':
        backgroundColor = '#ef4444'
        break
      case 'no_show':
        backgroundColor = '#6b7280'
        break
      default:
        backgroundColor = '#3b82f6'
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.95,
        color: 'white',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        display: 'block',
        fontSize: '13px',
        fontWeight: '500',
        padding: '6px 8px',
        textAlign: 'right' as const,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s ease',
        minHeight: '50px',
        margin: '2px'
      }
    }
  }

  // Custom event component for better display
  const CustomEvent = ({ event }: { event: any }) => {
    const appointment = event.resource

    // Try multiple sources for patient name
    const patientName = appointment?.patient?.full_name ||
                        appointment?.patient_name ||
                        (appointment as any)?.patient_name ||
                        'مريض غير معروف'

    // Check if patient was deleted
    const isDeletedPatient = patientName === 'مريض محذوف'

    const startTime = new Date(appointment?.start_time || event.start)
    const endTime = new Date(appointment?.end_time || event.end)
    const timeStr = `${startTime.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })} - ${endTime.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })}`

    // Get status color indicator
    const getStatusIndicator = (status: string) => {
      switch (status) {
        case 'completed':
          return '✓'
        case 'cancelled':
          return '✗'
        case 'no_show':
          return '⚠'
        default:
          return '●'
      }
    }

    // Get treatments for this appointment
    const treatments = appointmentTreatments[appointment?.id] || []

    return (
      <div 
        className="w-full h-full flex flex-col p-2 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer rounded" 
        dir="rtl"
        onClick={(e) => {
          e.stopPropagation()
          setSelectedAppointment(appointment)
          setShowAppointmentDetails(true)
        }}
      >
        <div className={`font-medium text-sm w-full flex items-center justify-between ${isDeletedPatient ? 'opacity-60' : ''}`} title={`${patientName} - ${getStatusInArabic(appointment?.status || 'scheduled')}`}>
          <span className="text-sm">{getStatusIndicator(appointment?.status || 'scheduled')}</span>
          <span className="truncate flex-1 mr-2">{patientName}</span>
        </div>
        <div className="text-xs opacity-90 mt-1" title={timeStr}>
          {timeStr}
        </div>
        {treatments.length > 0 && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {treatments.slice(0, 3).map((treatment, idx) => (
              <div 
                key={idx}
                className="w-2.5 h-2.5 rounded-full border border-white" 
                style={{ backgroundColor: treatment.treatment_color }}
                title={`${treatment.treatment_type} - ${treatment.tooth_name}`}
              />
            ))}
            {treatments.length > 3 && (
              <span className="text-xs bg-white/20 px-1 rounded">+{treatments.length - 3}</span>
            )}
          </div>
        )}
      </div>
    )
  }

  const CustomToolbar = ({ label, onNavigate, onView }: any) => (
    <div className="flex items-center justify-between mb-4 p-4 bg-card rounded-lg border" dir="rtl">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('NEXT')}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('TODAY')}
          className="arabic-enhanced"
        >
          اليوم
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('PREV')}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      <h2 className="text-lg font-semibold arabic-enhanced">{label}</h2>

      <div className="flex items-center gap-2">
        <Button
          variant={calendarView === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onView('month')}
          className="arabic-enhanced"
        >
          شهر
        </Button>
        <Button
          variant={calendarView === 'week' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onView('week')}
          className="arabic-enhanced"
        >
          أسبوع
        </Button>
        <Button
          variant={calendarView === 'day' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onView('day')}
          className="arabic-enhanced"
        >
          يوم
        </Button>
        <Button
          variant={calendarView === 'agenda' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onView('agenda')}
          className="arabic-enhanced"
        >
          جدول أعمال
        </Button>
      </div>
    </div>
  )

  // Appointment Details Modal
  const AppointmentDetailsModal = () => {
    if (!selectedAppointment) return null

    const treatments = appointmentTreatments[selectedAppointment.id] || []
    const patient = patients.find(p => p.id === selectedAppointment.patient_id)

    return (
      <Dialog open={showAppointmentDetails} onOpenChange={setShowAppointmentDetails}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">تفاصيل الموعد</DialogTitle>
            <DialogDescription>
              عرض جميع التفاصيل الخاصة بالموعد المحدد
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">اسم المريض</label>
                <div className="font-medium">
                  {selectedAppointment.patient?.full_name || 
                   selectedAppointment.patient_name || 
                   patient?.full_name || 
                   'مريض غير معروف'}
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">الحالة</label>
                <div>
                  <Badge 
                    className={
                      selectedAppointment.status === 'completed' ? 'bg-green-500' :
                      selectedAppointment.status === 'cancelled' ? 'bg-red-500' :
                      selectedAppointment.status === 'no_show' ? 'bg-gray-500' :
                      'bg-blue-500'
                    }
                  >
                    {getStatusInArabic(selectedAppointment.status)}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground">الوقت</label>
              <div className="font-medium">
                {formatDateTime(selectedAppointment.start_time)} - {formatDateTime(selectedAppointment.end_time)}
              </div>
            </div>

            {selectedAppointment.title && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">العنوان</label>
                <div className="font-medium">{selectedAppointment.title}</div>
              </div>
            )}

            {selectedAppointment.description && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">الوصف</label>
                <div className="font-medium">{selectedAppointment.description}</div>
              </div>
            )}

            {treatments.length > 0 && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">العلاجات</label>
                <div className="grid grid-cols-1 gap-2">
                  {treatments.map((treatment, idx) => (
                    <div key={idx} className="bg-accent/50 px-3 py-2 rounded-lg">
                      <div className="font-medium">
                        {getTreatmentDisplayName(treatment.treatment_type)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        السن: {treatment.tooth_name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAppointmentDetails(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="space-y-6 rtl-layout page-container">
      <div className="page-header">
        <div className="animate-fade-in-up">
          <h1 className="text-3xl font-bold text-foreground">إدارة المواعيد</h1>
          <p className="text-muted-foreground mt-2">
            جدولة ومتابعة مواعيد المرضى
          </p>
        </div>
        <div className="flex items-center gap-3 animate-fade-in-up delay-100">
          <Button
            variant="outline"
            onClick={async () => {
              if (filteredAppointments.length === 0) {
                notify.noDataToExport('لا توجد بيانات مواعيد للتصدير')
                return
              }

              try {
                await ExportService.exportAppointmentsToExcel(filteredAppointments)
                notify.exportSuccess(`تم تصدير ${filteredAppointments.length} موعد بنجاح!`)
              } catch (error) {
                console.error('Error exporting appointments:', error)
                notify.exportError('فشل في تصدير بيانات المواعيد')
              }
            }}
            className="btn-modern btn-modern-ghost"
          >
            <Download className="w-4 h-4" />
            تصدير
          </Button>
          <Button onClick={() => {
            setSelectedAppointment(null)
            setShowAddDialog(true)
          }} className="btn-modern btn-modern-primary">
            <Plus className="w-4 h-4" />
            موعد جديد
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="animate-fade-in-up delay-200">
        <CardContent className="pt-6">
          <div className="space-y-4" dir="rtl">
            <div className="flex items-center gap-4 flex-wrap" dir="rtl">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder="البحث في المواعيد..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-modern pr-12 text-right"
                  dir="rtl"
                />
              </div>
              <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="btn-modern btn-modern-ghost">
                    <Filter className="w-4 h-4" />
                    تصفية
                    {(statusFilter !== 'all' || patientFilter !== 'all' || dateRangeFilter.start || dateRangeFilter.end) && (
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                    )}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
              {(searchQuery || statusFilter !== 'all' || patientFilter !== 'all' || dateRangeFilter.start || dateRangeFilter.end) && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="btn-modern btn-modern-ghost">
                  <X className="w-4 h-4" />
                  مسح الكل
                </Button>
              )}
            </div>

            {/* Advanced Filters */}
            <Collapsible open={showFilters} onOpenChange={setShowFilters}>
              <CollapsibleContent className="space-y-4" dir="rtl">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg" dir="rtl">
                  {/* Status Filter */}
                  <div className="space-y-2 text-right">
                    <label className="text-sm font-medium">حالة الموعد</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter} dir="rtl">
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="جميع الحالات" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الحالات</SelectItem>
                        <SelectItem value="scheduled">مجدول</SelectItem>
                        <SelectItem value="completed">مكتمل</SelectItem>
                        <SelectItem value="cancelled">ملغي</SelectItem>
                        <SelectItem value="no_show">لم يحضر</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Patient Filter */}
                  <div className="space-y-2 text-right">
                    <label className="text-sm font-medium">المريض</label>
                    <Select value={patientFilter} onValueChange={setPatientFilter} dir="rtl">
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="جميع المرضى" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع المرضى</SelectItem>
                        {patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.full_name}
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
                      value={dateRangeFilter.start}
                      onChange={(e) => setDateRangeFilter(prev => ({ ...prev, start: e.target.value }))}
                      className="text-right"
                      dir="rtl"
                    />
                  </div>

                  <div className="space-y-2 text-right">
                    <label className="text-sm font-medium">إلى تاريخ</label>
                    <Input
                      type="date"
                      value={dateRangeFilter.end}
                      onChange={(e) => setDateRangeFilter(prev => ({ ...prev, end: e.target.value }))}
                      className="text-right"
                      dir="rtl"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {/* Main Content Area */}
        <div className="w-full">
          <Tabs defaultValue="table" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="calendar" className="flex items-center space-x-2 space-x-reverse">
                <Calendar className="w-4 h-4" />
                <span className="arabic-enhanced">عرض التقويم</span>
              </TabsTrigger>
              <TabsTrigger value="table" className="flex items-center space-x-2 space-x-reverse">
                <Table className="w-4 h-4" />
                <span className="arabic-enhanced">عرض الجدول</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <div style={{ height: '600px' }}>
                    <style>{`
                      .rbc-event {
                        border-radius: 6px !important;
                        border: none !important;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
                      }
                      .rbc-event:hover {
                        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
                        transform: translateY(-1px);
                        transition: all 0.2s ease;
                      }
                      .rbc-event-content {
                        padding: 2px 4px !important;
                      }
                      .rbc-month-view .rbc-event {
                        margin: 1px !important;
                      }
                      .rbc-agenda-view .rbc-event {
                        border-radius: 4px !important;
                      }
                    `}</style>
                    <BigCalendar
                      localizer={localizer}
                      events={calendarEvents}
                      startAccessor="start"
                      endAccessor="end"
                      view={calendarView}
                      onView={handleViewChange}
                      date={selectedDate}
                      onNavigate={handleNavigate}
                      onSelectEvent={handleSelectEvent}
                      onSelectSlot={handleSelectSlot}
                      selectable
                      eventPropGetter={eventStyleGetter}
                      components={{
                        toolbar: CustomToolbar,
                        event: CustomEvent
                      }}
                      step={30}
                      timeslots={2}
                      min={new Date(2024, 0, 1, 8, 0)}
                      max={new Date(2024, 0, 1, 18, 0)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="table" className="mt-6">
              <AppointmentTable
                appointments={filteredAppointments}
                patients={patients}
                isLoading={isLoading}
                onEdit={(appointment) => {
                  setSelectedAppointment(appointment)
                  setShowAddDialog(true)
                }}
                onDelete={(appointmentId) => {
                  setAppointmentToDelete(appointmentId)
                  setShowDeleteDialog(true)
                }}
                onViewPatient={(patient) => {
                  console.log('View patient:', patient)
                  setSelectedPatientForDetails(patient)
                  setShowPatientDetails(true)
                }}
                onSelectAppointment={(appointment) => {
                  setSelectedAppointment(appointment)
                }}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Bottom Cards - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Appointment Details - Compact Card */}
          {selectedAppointment && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg arabic-enhanced">تفاصيل الموعد</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3" dir="rtl">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium mb-1 arabic-enhanced text-sm">{selectedAppointment.title}</h4>
                    <div className="space-y-1">
                      <div className="flex items-center text-xs gap-2">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span>{formatDateTime(selectedAppointment.start_time)}</span>
                      </div>
                      <div className="flex items-center text-xs gap-2">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <span className="arabic-enhanced">{selectedAppointment.patient?.full_name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-3">
                    <Badge className={`${getStatusColor(selectedAppointment.status)} text-xs`}>
                      {getStatusInArabic(selectedAppointment.status)}
                    </Badge>
                  </div>
                </div>

                {(selectedAppointment.description || selectedAppointment.treatment || selectedAppointment.cost) && (
                  <div className="grid grid-cols-1 gap-2 pt-2 border-t">
                    {selectedAppointment.description && (
                      <div>
                        <span className="text-xs font-medium arabic-enhanced">الوصف: </span>
                        <span className="text-xs text-muted-foreground arabic-enhanced">
                          {selectedAppointment.description}
                        </span>
                      </div>
                    )}
                    {selectedAppointment.treatment && (
                      <div>
                        <span className="text-xs font-medium arabic-enhanced">العلاج: </span>
                        <span className="text-xs text-muted-foreground arabic-enhanced">
                          {selectedAppointment.treatment.name}
                        </span>
                      </div>
                    )}
                    {selectedAppointment.cost && (
                      <div>
                        <span className="text-xs font-medium arabic-enhanced">التكلفة: </span>
                        <span className="text-xs text-muted-foreground">
                          {selectedAppointment.cost} $
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 arabic-enhanced"
                    size="sm"
                    onClick={() => {
                      setShowAddDialog(true)
                    }}
                  >
                    تعديل
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 arabic-enhanced"
                    size="sm"
                    disabled={isLoading || selectedAppointment?.status === 'completed'}
                    onClick={async () => {
                      if (!selectedAppointment) return

                      setIsLoading(true)
                      try {
                        await updateAppointment(selectedAppointment.id, { status: 'completed' })
                        const updatedAppointment = { ...selectedAppointment, status: 'completed' as const }
                        setSelectedAppointment(updatedAppointment)
                        toast({
                          title: 'نجح',
                          description: 'تم تحديد الموعد كمكتمل',
                          variant: 'default',
                        })
                      } catch (error) {
                        console.error('Error updating appointment:', error)
                        toast({
                          title: 'خطأ',
                          description: 'حدث خطأ أثناء تحديث الموعد',
                          variant: 'destructive',
                        })
                      } finally {
                        setIsLoading(false)
                      }
                    }}
                  >
                    {isLoading ? 'جاري...' :
                     selectedAppointment?.status === 'completed' ? 'مكتمل ✓' : 'مكتمل'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Today's Appointments Summary - Compact */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg arabic-enhanced">جدول اليوم</CardTitle>
              <CardDescription className="text-sm arabic-enhanced">
                {formatDate(new Date(), 'long')}
              </CardDescription>
            </CardHeader>
            <CardContent dir="rtl">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filteredAppointments
                  .filter(apt => {
                    const today = new Date().toDateString()
                    const aptDate = new Date(apt.start_time).toDateString()
                    return today === aptDate
                  })
                  .slice(0, 5)
                  .map(appointment => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-2 rounded border cursor-pointer hover:bg-muted/50 gap-2"
                      onClick={() => setSelectedAppointment(appointment)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium arabic-enhanced truncate" title={appointment.patient?.full_name || appointment.patient_name || 'مريض غير معروف'}>
                          {appointment.patient?.full_name || appointment.patient_name || 'مريض غير معروف'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(appointment.start_time)}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`${getStatusColor(appointment.status)} whitespace-nowrap flex-shrink-0 text-xs`}
                      >
                        {getStatusInArabic(appointment.status)}
                      </Badge>
                    </div>
                  ))}

                {appointments.filter(apt => {
                  const today = new Date().toDateString()
                  const aptDate = new Date(apt.start_time).toDateString()
                  return today === aptDate
                }).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4 arabic-enhanced">
                    لا توجد مواعيد اليوم
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tomorrow's Appointments Summary - Compact */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg arabic-enhanced">جدول الغد</CardTitle>
              <CardDescription className="text-sm arabic-enhanced">
                {formatDate(new Date(Date.now() + 24 * 60 * 60 * 1000), 'long')}
              </CardDescription>
            </CardHeader>
            <CardContent dir="rtl">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filteredAppointments
                  .filter(apt => {
                    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString()
                    const aptDate = new Date(apt.start_time).toDateString()
                    return tomorrow === aptDate
                  })
                  .slice(0, 5)
                  .map(appointment => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-2 rounded border cursor-pointer hover:bg-muted/50 gap-2"
                      onClick={() => setSelectedAppointment(appointment)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium arabic-enhanced truncate" title={appointment.patient?.full_name || appointment.patient_name || 'مريض غير معروف'}>
                          {appointment.patient?.full_name || appointment.patient_name || 'مريض غير معروف'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(appointment.start_time)}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`${getStatusColor(appointment.status)} whitespace-nowrap flex-shrink-0 text-xs`}
                      >
                        {getStatusInArabic(appointment.status)}
                      </Badge>
                    </div>
                  ))}

                {appointments.filter(apt => {
                  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString()
                  const aptDate = new Date(apt.start_time).toDateString()
                  return tomorrow === aptDate
                }).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4 arabic-enhanced">
                    لا توجد مواعيد غداً
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add/Edit Appointment Dialog */}
      <AddAppointmentDialog
        isOpen={showAddDialog}
        onClose={() => {
          setShowAddDialog(false)
          setSelectedSlotInfo(null) // Clear selected slot info when closing
          // Don't clear selectedAppointment when closing dialog
          // Only clear it when explicitly needed (like after successful save)
        }}
        onSave={async (appointmentData) => {
          try {
            if (selectedAppointment) {
              // Edit existing appointment
              console.log('🔄 Updating appointment:', {
                id: selectedAppointment.id,
                data: appointmentData
              })
              await updateAppointment(selectedAppointment.id, appointmentData)
              console.log('✅ Appointment updated successfully')
              toast({
                title: 'نجح',
                description: 'تم تحديث الموعد بنجاح',
                variant: 'default',
              })
            } else {
              // Create new appointment
              console.log('➕ Creating new appointment:', appointmentData)
              await createAppointment(appointmentData)
              console.log('✅ Appointment created successfully')
              toast({
                title: 'نجح',
                description: 'تم إضافة الموعد بنجاح',
                variant: 'default',
              })
            }
            setShowAddDialog(false)
            setSelectedAppointment(null)
            setSelectedSlotInfo(null) // Clear selected slot info after successful save
          } catch (error) {
            console.error('❌ Error saving appointment:', error)
            toast({
              title: 'خطأ',
              description: 'حدث خطأ أثناء حفظ الموعد',
              variant: 'destructive',
            })
          }
        }}
        patients={patients}
        treatments={[]} // You can add treatments here if needed
        selectedDate={selectedSlotInfo?.date}
        selectedTime={selectedSlotInfo?.time}
        initialData={selectedAppointment}
      />

      {/* Delete Appointment Dialog */}
      <DeleteAppointmentDialog
        isOpen={showDeleteDialog}
        appointment={appointmentToDelete ? appointments.find(apt => apt.id === appointmentToDelete) || null : null}
        patient={appointmentToDelete ? patients.find(p => p.id === appointments.find(apt => apt.id === appointmentToDelete)?.patient_id) || null : null}
        onClose={() => {
          setShowDeleteDialog(false)
          setAppointmentToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        isLoading={isLoading}
      />

      {/* Patient Details Modal */}
      <PatientDetailsModal
        open={showPatientDetails}
        patient={selectedPatientForDetails}
        onOpenChange={(open) => {
          setShowPatientDetails(open)
          if (!open) {
            setSelectedPatientForDetails(null)
          }
        }}
      />

      {/* Appointment Details Modal */}
      <AppointmentDetailsModal />
    </div>
  )
}
