import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  Settings, 
  Eye, 
  EyeOff, 
  Printer, 
  Download, 
  X,
  User,
  Calendar,
  Stethoscope,
  CreditCard,
  Clock
} from 'lucide-react'
import { useSettingsStore } from '@/store/settingsStore'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useStableClinicName, useStableDoctorName, useStableClinicLogo, useStableContactInfo } from '@/hooks/useStableSettings'
import { formatDate, formatDateTime } from '@/lib/utils'
import { getTreatmentByValue } from '@/data/teethData'

interface AppointmentPrintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment: any
  treatments: any[]
  payments: any[]
  nextAppointment?: any
  patient: any
}

export default function AppointmentPrintDialog({
  open,
  onOpenChange,
  appointment,
  treatments,
  payments,
  nextAppointment,
  patient
}: AppointmentPrintDialogProps) {
  const { settings, loadSettings } = useSettingsStore()
  const { getCurrencySymbol } = useCurrency()
  const clinicName = useStableClinicName()
  const doctorName = useStableDoctorName()
  const clinicLogo = useStableClinicLogo()
  const { phone, email, address } = useStableContactInfo()
  const receiptRef = useRef<HTMLDivElement>(null)

  // Load settings when component mounts or dialog opens
  useEffect(() => {
    if (open && !settings) {
      loadSettings()
    }
  }, [open, settings, loadSettings])

  // Print settings state
  const [printSettings, setPrintSettings] = useState({
    printerType: '80mm', // 58mm, 80mm, a4
    includeLogo: true,
    colorMode: 'color' // color, bw
  })

  const [showPreview, setShowPreview] = useState(true)


  const getTreatmentDisplayName = (treatmentType: string) => {
    const treatment = getTreatmentByValue(treatmentType)
    return treatment?.label || treatmentType
  }

  const getStatusInArabic = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'pending': 'معلق',
      'in_progress': 'قيد التنفيذ',
      'completed': 'مكتمل',
      'cancelled': 'ملغي',
      'planned': 'مخطط',
      'paid': 'مدفوع',
      'unpaid': 'غير مدفوع',
      'partial': 'مدفوع جزئياً',
      'refunded': 'مسترد',
      'active': 'نشط',
      'inactive': 'غير نشط',
      'scheduled': 'مجدول',
      'confirmed': 'مؤكد',
      'rescheduled': 'معاد جدولته'
    }
    return statusMap[status] || status
  }

  const currencySymbol = getCurrencySymbol()

  const handleThermalPrint = () => {
    console.log('Thermal print clicked')
    if (receiptRef.current) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        const printerWidth = printSettings.printerType === '58mm' ? '58mm' : '80mm'
        const contentWidth = printSettings.printerType === '58mm' ? '50mm' : '68mm'
        
        printWindow.document.write(`
          <html>
            <head>
              <title>تقرير موعد - ${appointment.id.slice(-6)}</title>
              <style>
                @page {
                  size: ${printerWidth} auto;
                  margin: 0;
                }
                body {
                  font-family: 'Arial', 'Tahoma', sans-serif;
                  direction: rtl;
                  margin: 0;
                  padding: 6mm;
                  font-size: 11px;
                  line-height: 1.3;
                  color: #000;
                  background: white;
                  width: ${contentWidth};
                  text-align: right;
                  overflow-wrap: break-word;
                  word-wrap: break-word;
                }
                .receipt {
                  width: 100%;
                  font-size: 9px;
                  text-align: right;
                }
                .header {
                  text-align: center;
                  margin-bottom: 6px;
                  border-bottom: 2px solid #000;
                  padding-bottom: 4px;
                }
                .clinic-logo {
                  width: 60px;
                  height: 60px;
                  margin: 0 auto 6px;
                  border-radius: 50%;
                  overflow: hidden;
                  border: 2px solid #e0e0e0;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                  flex-shrink: 0;
                }
                .clinic-logo img {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                  border-radius: 50%;
                  max-width: 60px;
                  max-height: 60px;
                }
                .clinic-name {
                  font-size: 12px;
                  font-weight: bold;
                  margin-bottom: 2px;
                }
                .doctor-name {
                  font-size: 9px;
                  font-weight: bold;
                  margin-bottom: 1px;
                }
                .appointment-title {
                  font-size: 10px;
                  font-weight: bold;
                  margin: 4px 0;
                  text-decoration: underline;
                }
                .section {
                  margin: 4px 0;
                  padding: 2px 0;
                  text-align: right;
                }
                .patient-info {
                  border: 1px solid #000;
                  padding: 3px;
                  margin: 4px 0;
                  text-align: right;
                }
                .treatments-list {
                  border: 1px solid #000;
                  padding: 3px;
                  margin: 4px 0;
                  text-align: right;
                }
                .treatment-item {
                  margin: 2px 0;
                  padding: 2px 0;
                  border-bottom: 1px dotted #666;
                  text-align: right;
                }
                .treatment-item:last-child {
                  border-bottom: none;
                }
                .treatment-name {
                  font-weight: bold;
                  font-size: 9px;
                  text-align: right;
                }
                .treatment-details {
                  font-size: 8px;
                  color: #333;
                  margin-top: 1px;
                  text-align: right;
                }
                .payments-list {
                  border: 1px solid #000;
                  padding: 3px;
                  margin: 4px 0;
                  text-align: right;
                }
                .payment-item {
                  margin: 2px 0;
                  padding: 2px 0;
                  border-bottom: 1px dotted #666;
                  text-align: right;
                }
                .payment-item:last-child {
                  border-bottom: none;
                }
                .payment-amount {
                  font-weight: bold;
                  font-size: 9px;
                  text-align: right;
                }
                .separator {
                  text-align: center;
                  margin: 4px 0;
                  font-size: 10px;
                }
                .footer {
                  text-align: center;
                  margin-top: 6px;
                  padding-top: 4px;
                  border-top: 1px solid #000;
                  font-size: 7px;
                }
                .signature-section {
                  text-align: center;
                  margin: 8px 0;
                }
                .no-data {
                  color: #9ca3af;
                  font-style: italic;
                  text-align: center;
                  padding: 10px;
                  font-size: 12px;
                }
                .signature-line {
                  width: 60px;
                  height: 1px;
                  border-bottom: 1px solid #000;
                  margin: 0 auto 2px;
                }
                .signature-label {
                  font-size: 7px;
                  margin-bottom: 3px;
                }
                .stamp-area {
                  width: 45px;
                  height: 35px;
                  border: 1px dashed #000;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto;
                  background: rgba(0,0,0,0.02);
                }
                .stamp-placeholder {
                  font-size: 6px;
                  text-align: center;
                  line-height: 1.1;
                }
              </style>
            </head>
            <body>
              ${receiptRef.current.innerHTML}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  const handlePrint = () => {
    console.log('Smart print clicked')
    if (receiptRef.current) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        const isColorMode = printSettings.colorMode === 'color'
        const printerWidth = printSettings.printerType === 'a4' ? '210mm' : printSettings.printerType

        printWindow.document.write(`
          <html>
            <head>
              <title>تقرير موعد - ${appointment.id.slice(-6)}</title>
              <style>
                body {
                  font-family: 'Arial', 'Tahoma', sans-serif;
                  direction: rtl;
                  margin: 0;
                  padding: 0;
                  font-size: ${printSettings.printerType === 'a4' ? '14px' : '12px'};
                  line-height: 1.4;
                  color: #000;
                  background: white;
                  text-align: center;
                }

                .receipt {
                  width: ${printerWidth === 'a4' ? '100%' : printerWidth};
                  max-width: ${printerWidth === 'a4' ? '210mm' : printerWidth};
                  margin: 0 auto;
                  background: white;
                  font-size: ${printSettings.printerType === 'a4' ? '12px' : '11px'};
                  padding: ${printSettings.printerType === 'a4' ? '20px' : '0'};
                  text-align: center;
                }

                .header {
                  text-align: center;
                  margin-bottom: 15px;
                  border-bottom: 2px solid #000;
                  padding-bottom: 10px;
                }

                .clinic-logo {
                  width: 60px;
                  height: 60px;
                  margin: 0 auto 8px;
                  border-radius: 50%;
                  overflow: hidden;
                  border: 2px solid #e0e0e0;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                  flex-shrink: 0;
                }

                .clinic-logo img {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                  border-radius: 50%;
                  max-width: 60px;
                  max-height: 60px;
                }

                .clinic-name {
                  font-size: ${printSettings.printerType === 'a4' ? '20px' : '16px'};
                  font-weight: bold;
                  margin-bottom: 4px;
                  color: ${isColorMode ? '#2563eb' : '#000'};
                }

                .doctor-name {
                  font-size: ${printSettings.printerType === 'a4' ? '16px' : '12px'};
                  font-weight: bold;
                  margin-bottom: 6px;
                  color: ${isColorMode ? '#059669' : '#000'};
                }

                .appointment-title {
                  font-size: ${printSettings.printerType === 'a4' ? '18px' : '14px'};
                  font-weight: bold;
                  margin: 8px 0;
                  text-decoration: underline;
                  color: ${isColorMode ? '#dc2626' : '#000'};
                }

                .section {
                  margin: 8px 0;
                  padding: 4px 0;
                  text-align: center;
                }

                .patient-info {
                  border: 1px solid #000;
                  padding: 8px;
                  margin: 8px 0;
                  background: ${isColorMode ? '#f0f9ff' : '#f9f9f9'};
                  text-align: center;
                }

                .treatments-list {
                  border: 1px solid #000;
                  padding: 8px;
                  margin: 8px 0;
                  background: ${isColorMode ? '#f0fdf4' : '#f9f9f9'};
                  text-align: center;
                }

                .treatment-item {
                  margin: 4px 0;
                  padding: 4px 0;
                  border-bottom: 1px dotted #666;
                  text-align: center;
                }

                .treatment-item:last-child {
                  border-bottom: none;
                }

                .treatment-name {
                  font-weight: bold;
                  font-size: ${printSettings.printerType === 'a4' ? '14px' : '12px'};
                  text-align: center;
                }

                .treatment-details {
                  font-size: ${printSettings.printerType === 'a4' ? '12px' : '10px'};
                  color: #333;
                  margin-top: 2px;
                  text-align: center;
                }

                .payments-list {
                  border: 1px solid #000;
                  padding: 8px;
                  margin: 8px 0;
                  background: ${isColorMode ? '#fef3c7' : '#f9f9f9'};
                  text-align: center;
                }

                .payment-item {
                  margin: 4px 0;
                  padding: 4px 0;
                  border-bottom: 1px dotted #666;
                  text-align: center;
                }

                .payment-item:last-child {
                  border-bottom: none;
                }

                .payment-amount {
                  font-weight: bold;
                  font-size: ${printSettings.printerType === 'a4' ? '14px' : '12px'};
                  color: ${isColorMode ? '#059669' : '#000'};
                  text-align: center;
                }

                .separator {
                  text-align: center;
                  margin: 8px 0;
                  font-size: ${printSettings.printerType === 'a4' ? '12px' : '10px'};
                }

                .footer {
                  text-align: center;
                  margin-top: 15px;
                  padding-top: 10px;
                  border-top: 1px solid #000;
                  font-size: ${printSettings.printerType === 'a4' ? '11px' : '9px'};
                }

                .signature-section {
                  text-align: center;
                  margin: 15px 0;
                }

                .no-data {
                  color: #9ca3af;
                  font-style: italic;
                  text-align: center;
                  padding: 10px;
                  font-size: 12px;
                }

                .signature-line {
                  width: 80px;
                  height: 1px;
                  border-bottom: 1px solid #000;
                  margin: 0 auto 4px;
                }

                .signature-label {
                  font-size: ${printSettings.printerType === 'a4' ? '9px' : '7px'};
                  margin-bottom: 6px;
                }

                .stamp-area {
                  width: ${printSettings.printerType === 'a4' ? '60px' : '45px'};
                  height: ${printSettings.printerType === 'a4' ? '45px' : '35px'};
                  border: 1px dashed #000;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto;
                  background: rgba(0,0,0,0.02);
                }

                .stamp-placeholder {
                  font-size: ${printSettings.printerType === 'a4' ? '8px' : '6px'};
                  text-align: center;
                  line-height: 1.1;
                }

                @media print {
                  body { margin: 0; padding: 0; }
                  .receipt { border: none; }
                }
              </style>
            </head>
            <body>
              ${receiptRef.current.innerHTML}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  const handleDownloadPDF = () => {
    // TODO: Implement PDF download functionality
    console.log('PDF download not implemented yet')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-blue-600">
                طباعة تقرير الموعد
              </DialogTitle>
              <p className="text-sm text-blue-500 mt-1">
                معاينة وطباعة تقرير الموعد للمريض {patient?.full_name}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Print Settings */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Settings className="w-4 h-4" />
                إعدادات الطباعة
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs h-8 px-3"
              >
                {showPreview ? <EyeOff className="w-4 h-4 ml-1" /> : <Eye className="w-4 h-4 ml-1" />}
                {showPreview ? 'إخفاء المعاينة' : 'إظهار المعاينة'}
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Checkbox
                  id="includeLogo"
                  checked={printSettings.includeLogo}
                  onCheckedChange={(checked) => 
                    setPrintSettings(prev => ({ ...prev, includeLogo: checked as boolean }))
                  }
                />
                <Label htmlFor="includeLogo" className="text-xs">تضمين الشعار</Label>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">نمط الألوان</Label>
                <Select
                  value={printSettings.colorMode}
                  onValueChange={(value) => setPrintSettings(prev => ({ ...prev, colorMode: value }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="color">ملون</SelectItem>
                    <SelectItem value="bw">أبيض وأسود</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">نوع الطابعة</Label>
                <Select
                  value={printSettings.printerType}
                  onValueChange={(value) => setPrintSettings(prev => ({ ...prev, printerType: value }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58mm">حرارية 58mm</SelectItem>
                    <SelectItem value="80mm">حرارية 80mm</SelectItem>
                    <SelectItem value="a4">عادية A4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Document Preview */}
          {showPreview && (
            <Card className="p-4">
              <div className="border-2 border-blue-200 rounded-lg p-4 bg-white">
                <div ref={receiptRef} className="receipt">
                  {/* Header */}
                  <div className="header">
                    {printSettings.includeLogo && clinicLogo && (
                      <div className="clinic-logo" style={{ width: '60px', height: '60px', margin: '0 auto 8px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', flexShrink: 0 }}>
                        <img 
                          src={clinicLogo} 
                          alt="شعار العيادة" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', maxWidth: '60px', maxHeight: '60px' }}
                          onError={(e) => {
                            console.log('Logo failed to load:', clinicLogo)
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                    <div className="clinic-name">{clinicName}</div>
                    {doctorName && <div className="doctor-name">د. {doctorName}</div>}
                    <div className="appointment-title">تقرير الموعد الطبي</div>
                    <div className="separator">━━━━━━━━━━━━━━━━━━━━</div>
                  </div>

                  {/* Appointment Info */}
                  <div className="section">
                    <div className="text-xs text-gray-600">
                      التاريخ: {new Date().toLocaleDateString('en-GB')}
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div className="patient-info">
                    <div className="text-xs font-bold mb-2 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      معلومات المريض
                    </div>
                    <div className="text-xs space-y-1">
                      <div>الاسم: {patient?.full_name || 'غير محدد'}</div>
                      <div>الجنس: {patient?.gender === 'male' ? 'ذكر' : patient?.gender === 'female' ? 'أنثى' : 'غير محدد'}</div>
                      <div>العمر: {patient?.age || 'غير محدد'} سنة</div>
                    </div>
                  </div>

                  {/* Current Appointment */}
                  <div className="section">
                    <div className="text-xs font-bold mb-2 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      تفاصيل الموعد الحالي
                    </div>
                    <div className="text-xs">
                      تاريخ الموعد: {formatDateTime(appointment.start_time)}
                    </div>
                  </div>

                  {/* Treatments */}
                  <div className="treatments-list">
                    <div className="text-xs font-bold mb-2 flex items-center gap-1">
                      <Stethoscope className="w-3 h-3" />
                      العلاجات المرتبطة بالموعد ({treatments.length})
                    </div>
                    {treatments.length > 0 ? (
                      treatments.map((treatment, index) => (
                        <div key={index} className="treatment-item">
                          <div className="treatment-name">
                            {getTreatmentDisplayName(treatment.treatment_type)}
                          </div>
                          <div className="treatment-details">
                            السن: {treatment.tooth_name} | 
                            التصنيف: {treatment.treatment_category} | 
                            الحالة: {getStatusInArabic(treatment.treatment_status)} | 
                            التكلفة: {treatment.cost || 0} {currencySymbol}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 text-center py-2">
                        لا توجد علاجات مرتبطة بهذا الموعد
                      </div>
                    )}
                  </div>

                  {/* Payments */}
                  <div className="payments-list">
                    <div className="text-xs font-bold mb-2 flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      المدفوعات المرتبطة بالعلاجات ({payments.length})
                    </div>
                    {payments.length > 0 ? (
                      payments.map((payment, index) => (
                        <div key={index} className="payment-item">
                          <div className="payment-amount">
                            {payment.amount} {currencySymbol}
                          </div>
                          <div className="treatment-details">
                            طريقة الدفع: {payment.payment_method} | 
                            تاريخ الدفع: {formatDate(payment.payment_date)} | 
                            الحالة: {getStatusInArabic(payment.status)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 text-center py-2">
                        لا توجد مدفوعات مرتبطة بهذا الموعد
                      </div>
                    )}
                  </div>

                  {/* Next Appointment */}
                  {nextAppointment && (
                    <div className="section">
                      <div className="text-xl font-bold mb-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        الموعد القادم
                      </div>
                      <div className="text-xl">
                        تاريخ الموعد القادم: {formatDateTime(nextAppointment.start_time)}
                      </div>
                    </div>
                  )}

                  <Separator className="my-3" />

                  {/* Footer */}
                  <div className="footer">
                    <div>تم إنشاء هذا التقرير تلقائياً من نظام إدارة العيادة</div>
                    <div>للاستفسارات يرجى التواصل مع العيادة</div>
                    {phone && <div>الهاتف: {phone}</div>}
                    {email && <div>البريد الإلكتروني: {email}</div>}
                    {address && <div>العنوان: {address}</div>}
                  </div>

                  {/* Doctor Signature Section */}
                  <div className="signature-section" style={{ textAlign: 'center', marginTop: '20px' }}>
                    <div className="text-xs font-bold mb-2">توقيع الطبيب</div>
                    <div className="signature-line" style={{ width: '100px', height: '1px', borderBottom: '1px solid #000', margin: '0 auto 10px' }}></div>
                    <div className="signature-label" style={{ fontSize: '10px', marginBottom: '10px' }}>د. {doctorName}</div>
                    <div className="stamp-area" style={{ width: '60px', height: '45px', border: '1px dashed #000', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', background: 'rgba(0,0,0,0.02)' }}>
                      <div className="stamp-placeholder" style={{ fontSize: '8px', textAlign: 'center', lineHeight: '1.1' }}>
                        ختم<br/>الطبيب
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              إغلاق
            </Button>
            {/* <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="w-4 h-4 ml-1" />
              تحميل PDF
            </Button> */}
            <Button onClick={handleThermalPrint} className="bg-blue-500 hover:bg-blue-600">
              <Printer className="w-4 h-4 ml-1" />
              طباعة حرارية
            </Button>
            <Button onClick={handlePrint} className="bg-green-500 hover:bg-green-600">
              <Printer className="w-4 h-4 ml-1" />
              طباعة A4 
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
