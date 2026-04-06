import React, { useState, useMemo } from 'react'
import { Patient } from '@/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Edit,
  Trash2,
  Eye,
  User,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MessageCircle,
  FileText,
  Printer,
  Download,
  MoreHorizontal
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { PatientIntegrationService } from '@/services/patientIntegrationService'
import { PdfService } from '@/services/pdfService'
import { useSettingsStore } from '@/store/settingsStore'
import { useToast } from '@/hooks/use-toast'

interface PatientTableProps {
  patients: Patient[]
  isLoading: boolean
  onEdit: (patient: Patient) => void
  onDelete: (patientId: string) => void
  onViewDetails: (patient: Patient) => void
  onViewPendingInvoice?: (patient: Patient) => void
}

type SortField = 'full_name' | 'patient_number' | 'gender' | 'age' | 'phone' | 'patient_condition' | 'date_added'
type SortDirection = 'asc' | 'desc' | null

export default function PatientTable({
  patients,
  isLoading,
  onEdit,
  onDelete,
  onViewDetails,
  onViewPendingInvoice
}: PatientTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { settings } = useSettingsStore()
  const { toast } = useToast()

  // دالة طباعة سجل المريض الشامل (تصدير PDF)
  const handleExportPatientRecord = async (patient: Patient) => {
    try {
      toast({
        title: "جاري إعداد التقرير...",
        description: "يتم تجميع بيانات المريض وإعداد التقرير للتصدير",
      })

      // جلب البيانات المتكاملة للمريض
      const integratedData = await PatientIntegrationService.getPatientIntegratedData(patient.id)

      if (!integratedData) {
        throw new Error('لا يمكن جلب بيانات المريض')
      }

      // تصدير سجل المريض كـ PDF
      await PdfService.exportIndividualPatientRecord(integratedData, settings)

      toast({
        title: "تم إنشاء التقرير بنجاح",
        description: `تم إنشاء سجل المريض ${patient.full_name} وحفظه كملف PDF`,
      })
    } catch (error) {
      console.error('Error exporting patient record:', error)
      toast({
        title: "خطأ في إنشاء التقرير",
        description: "فشل في إنشاء سجل المريض. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      })
    }
  }

  // دالة الطباعة المباشرة باستخدام window.print()
  const handleDirectPrint = async (patient: Patient) => {
    try {
      toast({
        title: "جاري إعداد الطباعة...",
        description: "يتم تجميع بيانات المريض وإعداد الطباعة المباشرة",
      })

      // جلب البيانات المتكاملة للمريض
      const integratedData = await PatientIntegrationService.getPatientIntegratedData(patient.id)

      if (!integratedData) {
        throw new Error('لا يمكن جلب بيانات المريض')
      }

      // إنشاء HTML للطباعة
      const htmlContent = PdfService.createPatientRecordHTMLForPrint(integratedData, settings)

      // إنشاء نافذة جديدة للطباعة
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        throw new Error('لا يمكن فتح نافذة الطباعة')
      }

      // كتابة المحتوى في النافذة الجديدة
      printWindow.document.write(htmlContent)
      printWindow.document.close()

      // انتظار تحميل المحتوى ثم الطباعة
      printWindow.onload = () => {
        printWindow.focus()
        printWindow.print()
        printWindow.close()
      }

      toast({
        title: "تم إعداد الطباعة",
        description: `تم إعداد طباعة سجل المريض ${patient.full_name}`,
      })
    } catch (error) {
      console.error('Error printing patient record:', error)
      toast({
        title: "خطأ في الطباعة",
        description: "فشل في إعداد طباعة سجل المريض. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      })
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortField(null)
        setSortDirection(null)
      } else {
        setSortDirection('asc')
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortedAndPaginatedPatients = useMemo(() => {
    let sortedPatients = patients

    // Apply sorting
    if (sortField && sortDirection) {
      sortedPatients = [...patients].sort((a, b) => {
        let aValue = a[sortField]
        let bValue = b[sortField]

        // Handle null/undefined values
        if (aValue == null && bValue == null) return 0
        if (aValue == null) return sortDirection === 'asc' ? 1 : -1
        if (bValue == null) return sortDirection === 'asc' ? -1 : 1

        // Special handling for patient_number (numeric sorting)
        if (sortField === 'patient_number') {
          const aNum = parseInt(String(aValue)) || 0
          const bNum = parseInt(String(bValue)) || 0
          if (aNum < bNum) return sortDirection === 'asc' ? -1 : 1
          if (aNum > bNum) return sortDirection === 'asc' ? 1 : -1
          return 0
        }

        // Convert to string for comparison
        aValue = String(aValue).toLowerCase()
        bValue = String(bValue).toLowerCase()

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    // Apply pagination
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedPatients = sortedPatients.slice(startIndex, endIndex)

    return {
      patients: paginatedPatients,
      totalPages: Math.ceil(sortedPatients.length / pageSize),
      totalCount: sortedPatients.length
    }
  }, [patients, sortField, sortDirection, currentPage, pageSize])

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 opacity-50" />
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="w-4 h-4" />
    }
    if (sortDirection === 'desc') {
      return <ArrowDown className="w-4 h-4" />
    }
    return <ArrowUpDown className="w-4 h-4 opacity-50" />
  }

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 select-none text-center"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-center space-x-1 space-x-reverse">
        <span>{children}</span>
        {getSortIcon(field)}
      </div>
    </TableHead>
  )

  if (isLoading) {
    return (
      <div className="border rounded-lg">
        <Table className="table-center-all">
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">#</TableHead>
              <SortableHeader field="full_name">الاسم الكامل للمريض</SortableHeader>
              <SortableHeader field="patient_number">رقم المريض</SortableHeader>
              <SortableHeader field="gender">الجنس</SortableHeader>
              <SortableHeader field="age">العمر</SortableHeader>
              <SortableHeader field="phone">رقم الهاتف</SortableHeader>
              <SortableHeader field="patient_condition">حالة المريض</SortableHeader>
              <SortableHeader field="date_added">تاريخ الإضافة</SortableHeader>
              <TableHead className="text-center">الاجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, index) => (
              <TableRow key={index}>
                <TableCell className="text-center w-12">
                  <div className="h-4 bg-muted animate-pulse rounded mx-auto w-6" />
                </TableCell>
                <TableCell className="text-center">
                  <div className="h-4 bg-muted animate-pulse rounded mx-auto w-32" />
                </TableCell>
                <TableCell className="text-center">
                  <div className="h-4 bg-muted animate-pulse rounded mx-auto w-16" />
                </TableCell>
                <TableCell className="text-center">
                  <div className="h-4 bg-muted animate-pulse rounded mx-auto w-12" />
                </TableCell>
                <TableCell className="text-center">
                  <div className="h-4 bg-muted animate-pulse rounded mx-auto w-14" />
                </TableCell>
                <TableCell className="text-center">
                  <div className="h-4 bg-muted animate-pulse rounded mx-auto w-24" />
                </TableCell>
                <TableCell className="text-center">
                  <div className="h-4 bg-muted animate-pulse rounded mx-auto w-20" />
                </TableCell>
                <TableCell className="text-center">
                  <div className="h-4 bg-muted animate-pulse rounded mx-auto w-18" />
                </TableCell>
                <TableCell className="text-center">
                  <div className="h-4 bg-muted animate-pulse rounded mx-auto w-24" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (patients.length === 0) {
    return (
      <div className="border rounded-lg">
        <Table className="table-center-all">
          <TableHeader>
            <TableRow>
              <TableHead className="text-center w-12 max-w-12 min-w-12">
                <span className="arabic-enhanced font-medium text-xs">#</span>
              </TableHead>
              <SortableHeader field="full_name">الاسم الكامل للمريض</SortableHeader>
              <SortableHeader field="patient_number">رقم المريض</SortableHeader>
              <SortableHeader field="gender">الجنس</SortableHeader>
              <SortableHeader field="age">العمر</SortableHeader>
              <SortableHeader field="phone">رقم الهاتف</SortableHeader>
              <SortableHeader field="patient_condition">حالة المريض</SortableHeader>
              <SortableHeader field="date_added">تاريخ الإضافة</SortableHeader>
              <TableHead className="text-center">الاجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8">
                <div className="flex flex-col items-center space-y-2">
                  <User className="w-12 h-12 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">لا توجد مرضى</p>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  const { patients: paginatedPatients, totalPages, totalCount } = getSortedAndPaginatedPatients

  // Calculate start index for serial numbers
  const startIndex = (currentPage - 1) * pageSize

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize))
    setCurrentPage(1) // Reset to first page when changing page size
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="table-center-all">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-center w-12 max-w-12 min-w-12">
                  <span className="arabic-enhanced font-medium text-xs">#</span>
                </TableHead>
                <SortableHeader field="full_name">
                  <span className="arabic-enhanced font-medium">الاسم الكامل للمريض</span>
                </SortableHeader>
                <SortableHeader field="patient_number">
                  <span className="arabic-enhanced font-medium">رقم المريض</span>
                </SortableHeader>
                <SortableHeader field="gender">
                  <span className="arabic-enhanced font-medium">الجنس</span>
                </SortableHeader>
                <SortableHeader field="age">
                  <span className="arabic-enhanced font-medium">العمر</span>
                </SortableHeader>
                <SortableHeader field="phone">
                  <span className="arabic-enhanced font-medium">رقم الهاتف</span>
                </SortableHeader>
                <SortableHeader field="patient_condition">
                  <span className="arabic-enhanced font-medium">حالة المريض</span>
                </SortableHeader>
                <SortableHeader field="date_added">
                  <span className="arabic-enhanced font-medium">تاريخ الإضافة</span>
                </SortableHeader>
                <TableHead className="text-center">
                  <span className="arabic-enhanced font-medium">الاجراءات</span>
                </TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {paginatedPatients.map((patient, index) => (
            <TableRow key={patient.id} className="hover:bg-muted/50">
              <TableCell className="font-medium text-center w-12 max-w-12 min-w-12 text-xs">
                {startIndex + index + 1}
              </TableCell>
              <TableCell className="font-medium text-center">
                <div className="flex items-center justify-center space-x-2 space-x-reverse">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                    {patient.full_name?.charAt(0) ?? ''}
                  </div>
                  <span>{patient.full_name}</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                {patient.patient_number ? (
                  <span className="text-sm arabic-enhanced font-medium">{patient.patient_number}</span>
                ) : (
                  <span className="text-muted-foreground text-sm arabic-enhanced">-</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={patient.gender === 'male' ? 'default' : 'secondary'}>
                  {patient.gender === 'male' ? 'ذكر' : 'أنثى'}
                </Badge>
              </TableCell>
              <TableCell className="text-center">{patient.age} سنة</TableCell>
              <TableCell className="min-w-[120px] text-center table-cell-wrap-truncate-sm">
                {patient.phone ? (
                  <div className="flex items-center justify-center">
                    <button
                      onClick={async () => {
                        const whatsappUrl = `https://api.whatsapp.com/send/?phone=${patient.phone}`;

                        // Try multiple methods to open external URL
                        try {
                          // Method 1: Try electronAPI system.openExternal
                          if (window.electronAPI && window.electronAPI.system && window.electronAPI.system.openExternal) {
                            await window.electronAPI.system.openExternal(whatsappUrl);
                            return;
                          }
                        } catch (error) {
                          console.log('Method 1 failed:', error);
                        }

                        try {
                          // Method 2: Try direct shell.openExternal via ipcRenderer
                          if (window.electronAPI) {
                            // @ts-ignore
                            await window.electronAPI.shell?.openExternal?.(whatsappUrl);
                            return;
                          }
                        } catch (error) {
                          console.log('Method 2 failed:', error);
                        }

                        // Method 3: Fallback to window.open
                        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
                      }}
                      className="text-sm arabic-enhanced text-green-600 hover:text-green-800 hover:underline cursor-pointer transition-colors bg-transparent border-none p-0 flex items-center gap-1"
                      title="فتح محادثة واتساب"
                    >
                      {patient.phone}
                      <MessageCircle className="w-3 h-3 text-green-600" />
                    </button>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm arabic-enhanced">غير محدد</span>
                )}
              </TableCell>
              <TableCell className="min-w-[150px] text-center">
                <Badge variant="outline" className="max-w-[150px] truncate arabic-enhanced" title={patient.patient_condition}>
                  {patient.patient_condition}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-sm arabic-enhanced">
                  {formatDate(patient.date_added)}
                </span>
              </TableCell>
              <TableCell className="w-auto text-center">
                <div className="flex items-center justify-center gap-1">
                  {/* الأزرار الرئيسية الثلاثة */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="action-btn-view h-8 px-2 min-w-0"
                    onClick={() => onViewDetails(patient)}
                    title="عرض تفاصيل المريض"
                  >
                    <Eye className="w-3 h-3" />
                    <span className="text-xs arabic-enhanced hidden sm:inline ml-1">عرض</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="action-btn-edit h-8 px-2 min-w-0"
                    onClick={() => onEdit(patient)}
                    title="تعديل بيانات المريض"
                  >
                    <Edit className="w-3 h-3" />
                    <span className="text-xs arabic-enhanced hidden sm:inline ml-1">تعديل</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="action-btn-delete text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2 min-w-0"
                    onClick={() => onDelete(patient.id)}
                    title="حذف المريض"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span className="text-xs arabic-enhanced hidden sm:inline ml-1">حذف</span>
                  </Button>

                  {/* قائمة مزيد للأزرار الإضافية */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 min-w-0"
                        title="المزيد من الخيارات"
                      >
                        <MoreHorizontal className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="patient-actions-dropdown">
                      {/* خيارات الطباعة */}
                      <DropdownMenuItem
                        onClick={() => handleDirectPrint(patient)}
                        className="dropdown-item"
                      >
                        <Printer className="w-4 h-4" />
                        <span className="arabic-enhanced">طباعة مباشرة</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleExportPatientRecord(patient)}
                        className="dropdown-item"
                      >
                        <Download className="w-4 h-4" />
                        <span className="arabic-enhanced">تصدير سجل المريض</span>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />

                      {onViewPendingInvoice && (
                        <DropdownMenuItem
                          onClick={() => onViewPendingInvoice(patient)}
                          className="dropdown-item"
                        >
                          <FileText className="w-4 h-4" />
                          <span className="arabic-enhanced">فاتورة المعلقات</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        </Table>
      </div>
    </div>

    {/* Pagination Controls */}
    {totalCount > 0 && (
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center space-x-2 space-x-reverse">
          <p className="text-sm text-muted-foreground arabic-enhanced">
            عرض {((currentPage - 1) * pageSize) + 1} إلى {Math.min(currentPage * pageSize, totalCount)} من {totalCount} مريض
          </p>
        </div>

        <div className="flex items-center space-x-6 space-x-reverse lg:space-x-8">
          <div className="flex items-center space-x-2 space-x-reverse">
            <p className="text-sm font-medium arabic-enhanced">عدد الصفوف لكل صفحة</p>
            <Select
              value={`${pageSize}`}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 50, 100].map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex w-[100px] items-center justify-center text-sm font-medium arabic-enhanced">
            صفحة {currentPage} من {totalPages}
          </div>

          <div className="flex items-center space-x-2 space-x-reverse">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              <span className="sr-only">الذهاب إلى الصفحة الأولى</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <span className="sr-only">الذهاب إلى الصفحة السابقة</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <span className="sr-only">الذهاب إلى الصفحة التالية</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              <span className="sr-only">الذهاب إلى الصفحة الأخيرة</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )}
    </div>
  )
}