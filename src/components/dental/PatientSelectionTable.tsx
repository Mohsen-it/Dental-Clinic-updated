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
  Phone,
  User,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar,
  Activity,
  Camera
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface PatientSelectionTableProps {
  patients: Patient[]
  selectedPatientId: string | null
  onPatientSelect: (patientId: string) => void
  getPatientTreatmentCount: (patientId: string) => number
  getLastTreatmentDate: (patientId: string) => string | null
  getPatientImagesCount?: (patientId: string) => number
  isLoading?: boolean
  isCompact?: boolean
  // ✅ RACE CONDITION FIX: Callback to ensure all treatments are loaded when showing all patients
  onShowAllPatients?: () => void
}

type SortField = 'full_name' | 'gender' | 'age' | 'phone' | 'patient_condition'
type SortDirection = 'asc' | 'desc' | null

export default function PatientSelectionTable({
  patients,
  selectedPatientId,
  onPatientSelect,
  getPatientTreatmentCount,
  getLastTreatmentDate,
  getPatientImagesCount,
  isLoading = false,
  isCompact = false,
  onShowAllPatients
}: PatientSelectionTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(isCompact ? 5 : 10)
  const [showAllPatients, setShowAllPatients] = useState(false)

  // If a patient is selected and we're in compact mode, show only selected patient unless showAllPatients is true
  const displayPatients = useMemo(() => {
    if (isCompact && selectedPatientId && !showAllPatients) {
      return patients.filter(p => p.id === selectedPatientId)
    }
    return patients
  }, [patients, isCompact, selectedPatientId, showAllPatients])

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
    let sortedPatients = displayPatients

    // Apply sorting
    if (sortField && sortDirection) {
      sortedPatients = [...displayPatients].sort((a, b) => {
        let aValue = a[sortField]
        let bValue = b[sortField]

        // Handle null/undefined values
        if (aValue == null && bValue == null) return 0
        if (aValue == null) return sortDirection === 'asc' ? 1 : -1
        if (bValue == null) return sortDirection === 'asc' ? -1 : 1

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
  }, [displayPatients, sortField, sortDirection, currentPage, pageSize])

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
            <TableRow className="bg-muted/50">
              <TableHead className="text-center w-16">#</TableHead>
              <TableHead className="text-center">اسم المريض</TableHead>
              <TableHead className="text-center">الجنس</TableHead>
              <TableHead className="text-center">العمر</TableHead>
              <TableHead className="text-center">رقم الهاتف</TableHead>
              <TableHead className="text-center">عدد العلاجات</TableHead>
              <TableHead className="text-center">آخر زيارة</TableHead>
              <TableHead className="text-center">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, index) => (
              <TableRow key={index}>
                {[...Array(8)].map((_, cellIndex) => (
                  <TableCell key={cellIndex}>
                    <div className="h-4 bg-muted animate-pulse rounded" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (patients.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>لا توجد مرضى مطابقين لبحثك</p>
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
      {/* Table Header Info */}
      <div className="bg-muted/30 dark:bg-muted/50 px-4 py-2 border border-border rounded-t-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            عرض {paginatedPatients.length} من أصل {totalCount} مريض
          </span>
          <div className="flex items-center gap-3">
            {selectedPatientId && (
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                المريض المحدد: {patients.find(p => p.id === selectedPatientId)?.full_name}
              </span>
            )}
            {isCompact && selectedPatientId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newShowAllState = !showAllPatients
                  setShowAllPatients(newShowAllState)
                  // ✅ RACE CONDITION FIX: Trigger loading all treatments when showing all patients
                  if (newShowAllState && onShowAllPatients) {
                    onShowAllPatients()
                  }
                }}
                className="text-xs"
              >
                {showAllPatients ? 'إخفاء المرضى الآخرين' : 'عرض جميع المرضى'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-b-lg overflow-hidden bg-card dark:bg-card">
        <div className="overflow-x-auto bg-card dark:bg-card">
          <Table className="table-center-all bg-card dark:bg-card">
            <TableHeader className="bg-muted/50 dark:bg-muted/70">
              <TableRow className="bg-muted/50 dark:bg-muted/70 border-b border-border hover:bg-muted/50 dark:hover:bg-muted/70">
                <TableHead className="text-center w-16 text-foreground">
                  <span className="font-medium">#</span>
                </TableHead>
                <SortableHeader field="full_name">
                  <span className="font-medium">اسم المريض</span>
                </SortableHeader>
                <SortableHeader field="gender">
                  <span className="font-medium">الجنس</span>
                </SortableHeader>
                <SortableHeader field="age">
                  <span className="font-medium">العمر</span>
                </SortableHeader>
                <SortableHeader field="phone">
                  <span className="font-medium">رقم الهاتف</span>
                </SortableHeader>
                <TableHead className="text-center text-foreground">
                  <span className="font-medium">عدد العلاجات</span>
                </TableHead>
                <TableHead className="text-center text-foreground">
                  <span className="font-medium">آخر زيارة</span>
                </TableHead>
                <TableHead className="text-center text-foreground">
                  <span className="font-medium">الإجراءات</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-card dark:bg-card">
              {paginatedPatients.map((patient, index) => (
                <TableRow
                  key={patient.id}
                  className={`hover:bg-muted/50 dark:hover:bg-muted/70 transition-colors border-b border-border ${
                    selectedPatientId === patient.id ? 'bg-blue-100/30 dark:bg-blue-900/20 border-blue-300/50 dark:border-blue-600/50' : 'bg-card dark:bg-card'
                  }`}
                >
                  <TableCell className="font-medium text-muted-foreground">
                    {startIndex + index + 1}
                  </TableCell>
                  <TableCell className="font-medium table-cell-wrap-truncate-md">
                    <div className="flex items-center justify-center space-x-2 space-x-reverse">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                        {patient.full_name?.charAt(0) ?? ''}
                      </div>
                      <span className="text-foreground">{patient.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={patient.gender === 'male' ? 'default' : 'secondary'}>
                      {patient.gender === 'male' ? 'ذكر' : 'أنثى'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span className="text-foreground">{patient.age} سنة</span>
                    </div>
                  </TableCell>
                  <TableCell className="table-cell-wrap-truncate-sm">
                    {patient.phone ? (
                      <a
                        href={`https://wa.me/${patient.phone?.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 dark:text-green-400 hover:underline flex items-center justify-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        {patient.phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">غير محدد</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-600">
                        <Activity className="w-3 h-3 ml-1" />
                        {getPatientTreatmentCount(patient.id)} علاج
                      </Badge>
                      {getPatientImagesCount && getPatientImagesCount(patient.id) > 0 && (
                        <Badge variant="outline" className="bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-200 dark:border-green-600">
                          <Camera className="w-3 h-3 ml-1" />
                          {getPatientImagesCount(patient.id)} صورة
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getLastTreatmentDate(patient.id) ? (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(getLastTreatmentDate(patient.id)!)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">لا توجد زيارات</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant={selectedPatientId === patient.id ? "default" : "outline"}
                      onClick={() => onPatientSelect(patient.id)}
                      className={`text-xs ${selectedPatientId === patient.id ? 'bg-primary text-primary-foreground' : 'border-border hover:bg-muted'}`}
                    >
                      {selectedPatientId === patient.id ? 'محدد' : 'اختيار'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalCount > pageSize && (
        <div className="flex items-center justify-between px-2 py-2 bg-background dark:bg-card border border-border rounded-lg">
          <div className="flex items-center space-x-2 space-x-reverse">
            <p className="text-sm text-muted-foreground">
              عرض {((currentPage - 1) * pageSize) + 1} إلى {Math.min(currentPage * pageSize, totalCount)} من {totalCount} مريض
            </p>
          </div>

          <div className="flex items-center space-x-6 space-x-reverse lg:space-x-8">
            <div className="flex items-center space-x-2 space-x-reverse">
              <p className="text-sm font-medium text-foreground">عدد الصفوف لكل صفحة</p>
              <Select
                value={`${pageSize}`}
                onValueChange={handlePageSizeChange}
              >
                <SelectTrigger className="h-8 w-[70px] border-border">
                  <SelectValue placeholder={pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[5, 10, 15, 20].map((size) => (
                    <SelectItem key={size} value={`${size}`}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex w-[100px] items-center justify-center text-sm font-medium text-foreground">
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
