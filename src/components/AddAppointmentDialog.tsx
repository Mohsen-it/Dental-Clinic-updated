import React, { useState, useEffect } from 'react'
import { X, Calendar, Clock, User } from 'lucide-react'
import { Appointment, Patient, Treatment } from '../types'
import { useThemeClasses } from '../contexts/ThemeContext'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface AddAppointmentDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>) => void
  patients: Patient[]
  treatments: Treatment[]
  selectedDate?: Date
  selectedTime?: string
  initialData?: Appointment
  preSelectedPatientId?: string
}

export default function AddAppointmentDialog({
  isOpen,
  onClose,
  onSave,
  patients,
  treatments,
  selectedDate,
  selectedTime,
  initialData,
  preSelectedPatientId
}: AddAppointmentDialogProps) {
  const [formData, setFormData] = useState({
    patient_id: '',
    gender: '',
    description: '',
    start_time: '',
    end_time: '',
    status: 'scheduled' as 'scheduled' | 'completed' | 'cancelled' | 'no_show',
    notes: ''
  })

  const { toast } = useToast()

  useEffect(() => {
    if (!isOpen) return // Don't update form when dialog is closed

    if (initialData) {
      // Populate form with existing appointment data for editing
      const selectedPatient = patients.find(p => p.id === initialData.patient_id)

      // Safe date parsing - use simple approach for editing
      const startDate = new Date(initialData.start_time)
      const endDate = new Date(initialData.end_time)

      // Format dates for datetime-local input (YYYY-MM-DDTHH:MM)
      const formatForInput = (date: Date) => {
        if (isNaN(date.getTime())) return ''
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}`
      }

      setFormData({
        patient_id: initialData.patient_id || '',
        gender: selectedPatient?.gender === 'male' ? 'ذكر' : selectedPatient?.gender === 'female' ? 'أنثى' : '',
        description: initialData.description || '',
        start_time: formatForInput(startDate),
        end_time: formatForInput(endDate),
        status: initialData.status || 'scheduled',
        notes: initialData.notes || ''
      })
    } else if (selectedDate) {
      const startDateTime = new Date(selectedDate)

      // If selectedTime is provided, use it; otherwise use the time from selectedDate
      if (selectedTime) {
        const [hours, minutes] = selectedTime.split(':')
        startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      }

      const endDateTime = new Date(startDateTime)
      endDateTime.setHours(startDateTime.getHours() + 1) // Default 1 hour duration

      // Format dates for datetime-local input (YYYY-MM-DDTHH:MM)
      const formatForInput = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}`
      }

      setFormData(prev => ({
        ...prev,
        start_time: formatForInput(startDateTime),
        end_time: formatForInput(endDateTime)
      }))
    } else {
      // Reset form when opening for new appointment
      // Set default time to current time
      const now = new Date()
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000) // +1 hour from start

      // Format dates for datetime-local input (YYYY-MM-DDTHH:MM)
      const formatForInput = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}`
      }

      setFormData({
        patient_id: '',
        gender: '',
        description: '',
        start_time: formatForInput(now),
        end_time: formatForInput(oneHourLater),
        status: 'scheduled',
        notes: ''
      })
    }
  }, [selectedDate, selectedTime, initialData, isOpen])

  // Separate useEffect for pre-selected patient
  useEffect(() => {
    if (isOpen && preSelectedPatientId && patients.length > 0) {
      const preSelectedPatient = patients.find(p => p.id === preSelectedPatientId)
      setFormData(prev => ({
        ...prev,
        patient_id: preSelectedPatientId,
        gender: preSelectedPatient?.gender === 'male' ? 'ذكر' : preSelectedPatient?.gender === 'female' ? 'أنثى' : ''
      }))
    }
  }, [isOpen, preSelectedPatientId, patients.length])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields (end_time is now optional)
    if (!formData.patient_id || !formData.start_time) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      })
      return
    }

    // Validate start date
    const startDate = new Date(formData.start_time)
    if (isNaN(startDate.getTime())) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال تاريخ ووقت بداية صحيح",
        variant: "destructive",
      })
      return
    }

    // Calculate end date/time
    let endDate: Date
    if (formData.end_time) {
      // Parse end time as datetime-local format (YYYY-MM-DDTHH:MM)
      endDate = new Date(formData.end_time)

      // If parsing failed or end time is invalid, default to 1 hour after start
      if (isNaN(endDate.getTime())) {
        endDate = new Date(startDate.getTime() + 60 * 60 * 1000)
      }
    } else {
      // Default to 1 hour after start time
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000)
    }

    if (endDate <= startDate) {
      toast({
        title: "خطأ",
        description: "يجب أن يكون وقت النهاية بعد وقت البداية",
        variant: "destructive",
      })
      return
    }

    // Check for appointment conflicts
    try {
      const hasConflict = await window.electronAPI.appointments.checkConflict(
        startDate.toISOString(),
        endDate.toISOString(),
        initialData?.id // Exclude current appointment when editing
      )

      if (hasConflict) {
        toast({
          title: "تعارض في المواعيد",
          description: "يوجد موعد آخر في نفس الوقت المحدد. يرجى اختيار وقت آخر.",
          variant: "destructive",
        })
        return
      }
    } catch (error) {
      console.error('Error checking appointment conflict:', error)
      // Continue with saving if conflict check fails
    }

    // Generate a title automatically based on patient and date
    const selectedPatient = patients.find(p => p.id === formData.patient_id)
    const appointmentDate = new Date(formData.start_time)
    const day = appointmentDate.getDate().toString().padStart(2, '0')
    const month = (appointmentDate.getMonth() + 1).toString().padStart(2, '0')
    const year = appointmentDate.getFullYear()
    const dateStr = `${day}/${month}/${year}`
    const timeStr = appointmentDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    const generatedTitle = selectedPatient
      ? `موعد ${selectedPatient.full_name} - ${dateStr} ${timeStr}`
      : `موعد جديد - ${dateStr} ${timeStr}`

    // Create appointment data without gender field
    const { gender, ...appointmentDataWithoutGender } = formData

    const appointmentData = {
      ...appointmentDataWithoutGender,
      // Add generated title
      title: generatedTitle,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString()
    }

    console.log('📝 Submitting appointment data:', {
      isEdit: !!initialData,
      appointmentId: initialData?.id,
      appointmentData
    })

    onSave(appointmentData)

    // Don't reset form or close dialog here
    // Let the parent component handle closing after successful save
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    if (name === 'start_time') {
      // When start time changes, automatically calculate end time (1 hour later)
      const startDate = new Date(value)
      if (!isNaN(startDate.getTime())) {
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000) // +1 hour

        // Format end date for datetime-local input
        const formatForInput = (date: Date) => {
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          const hours = String(date.getHours()).padStart(2, '0')
          const minutes = String(date.getMinutes()).padStart(2, '0')
          return `${year}-${month}-${day}T${hours}:${minutes}`
        }

        setFormData(prev => ({
          ...prev,
          [name]: value,
          end_time: formatForInput(endDate)
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }))
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="2xl" className="overflow-y-auto max-h-[90vh]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {initialData ? 'تعديل الموعد' : 'إضافة موعد جديد'}
          </DialogTitle>
          <DialogDescription>
            {initialData ? 'تعديل بيانات الموعد المحدد' : 'إضافة موعد جديد للمريض'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Required Fields Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">
              الحقول المطلوبة
            </h3>

            {/* Patient and Gender Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center">
                  <User className="w-4 h-4 ml-1" />
                  المريض *
                </Label>
                <Select
                  value={formData.patient_id}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, patient_id: value }))
                    const patient = patients.find(p => p.id === value)
                    if (patient) {
                      setFormData(prev => ({
                        ...prev,
                        patient_id: value,
                        gender: patient.gender === 'male' ? 'ذكر' : patient.gender === 'female' ? 'أنثى' : ''
                      }))
                    }
                  }}
                >
                  <SelectTrigger className="bg-background border-input text-foreground">
                    <SelectValue placeholder="اختر المريض" className="text-muted-foreground" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(patient => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>الجنس</Label>
                <Input
                  value={formData.gender}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                  placeholder="سيتم ملؤه تلقائياً"
                />
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center">
                  <Calendar className="w-4 h-4 ml-1" />
                  تاريخ ووقت البداية *
                </Label>
                <Input
                  type="datetime-local"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center">
                  <Clock className="w-4 h-4 ml-1" />
                  وقت النهاية
                </Label>
                <Input
                  type="datetime-local"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleChange}
                  placeholder="سيتم حساب الوقت تلقائياً (ساعة واحدة)"
                />
                <p className="text-xs text-muted-foreground">
                  اتركه فارغاً لحساب ساعة واحدة تلقائياً من وقت البداية
                </p>
              </div>
            </div>

            {/* Appointment Status */}
            <div className="space-y-2">
              <Label>حالة الموعد *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'scheduled' | 'cancelled' | 'completed' | 'no_show') =>
                  setFormData(prev => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر حالة الموعد" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">مجدول</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                  <SelectItem value="completed">مكتمل</SelectItem>
                  <SelectItem value="no_show">لم يحضر</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Optional Fields Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">
              الحقول الاختيارية
            </h3>



            {/* Description */}
            <div className="space-y-2">
              <Label>وصف الموعد</Label>
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="أدخل وصف الموعد"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>ملاحظات إضافية</Label>
              <Textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={2}
                placeholder="أي ملاحظات إضافية"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-end space-x-4 space-x-reverse">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              إلغاء
            </Button>
            <Button type="submit">
              حفظ الموعد
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
