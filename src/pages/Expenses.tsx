import React, { useState, useEffect } from 'react'
import { useExpensesStore } from '../store/expensesStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import {
  DollarSign,
  Plus,
  Receipt,
  TrendingUp,
  AlertTriangle,
  Clock,
  Download,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react'
import { useCurrency } from '@/contexts/CurrencyContext'
import CurrencyDisplay from '@/components/ui/currency-display'
import { getCardStyles, getIconStyles } from '../lib/cardStyles'
import { useToast } from '@/hooks/use-toast'
import { notify } from '../services/notificationService'
import { ExportService } from '../services/exportService'
import type { ClinicExpense } from '../types'

import AddExpenseDialog from '../components/expenses/AddExpenseDialog'
import DeleteExpenseDialog from '../components/expenses/DeleteExpenseDialog'
// import ExpensesTable from '../components/expenses/ExpensesTable'
// import ExpensesFilters from '../components/expenses/ExpensesFilters'

const Expenses: React.FC = () => {
  const {
    expenses,
    filteredExpenses,
    isLoading,
    error,
    searchQuery,
    filters,
    categories,
    vendors,
    expenseTypes,
    analytics,
    loadExpenses,
    deleteExpense,
    updateExpense,
    setSearchQuery,
    setFilters,
    clearError
  } = useExpensesStore()

  const { formatAmount } = useCurrency()
  const { toast } = useToast()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ClinicExpense | null>(null)
  const [deletingExpense, setDeletingExpense] = useState<ClinicExpense | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    loadExpenses()
  }, [loadExpenses])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleFilterChange = (newFilters: any) => {
    setFilters({ ...filters, ...newFilters })
  }

  // Pagination
  const totalCount = filteredExpenses.length
  const totalPages = Math.ceil(totalCount / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedExpenses = filteredExpenses.slice(startIndex, startIndex + pageSize)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (value: string) => {
    setPageSize(parseInt(value))
    setCurrentPage(1) // Reset to first page when changing page size
  }

  const handleClearFilters = () => {
    setFilters({
      status: '',
      expenseType: '',
      category: '',
      vendor: '',
      isRecurring: null,
      dateRange: { start: '', end: '' }
    })
    setSearchQuery('')
  }

  const handleEdit = (expense: ClinicExpense) => {
    setEditingExpense(expense)
    setShowAddDialog(true)
  }

  const handleDelete = (expense: ClinicExpense) => {
    setDeletingExpense(expense)
    setShowDeleteDialog(true)
  }

  const handleCloseAddDialog = () => {
    setShowAddDialog(false)
    setEditingExpense(null)
  }

  const handleCloseDeleteDialog = () => {
    setShowDeleteDialog(false)
    setDeletingExpense(null)
  }

  const handleMarkAsPaid = async (expense: ClinicExpense) => {
    try {
      await updateExpense(expense.id, { status: 'paid' })
      toast({
        title: 'تم تحديث الحالة',
        description: 'تم تحديث حالة المصروف إلى مدفوع بنجاح',
      })
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث حالة المصروف',
        variant: 'destructive',
      })
    }
  }

  const handleExport = async () => {
    try {
      if (filteredExpenses.length === 0) {
        notify.noDataToExport('لا توجد بيانات مصروفات للتصدير')
        return
      }

      // تصدير إلى Excel مع التنسيق الجميل والمقروء
      await ExportService.exportClinicExpensesToExcel(filteredExpenses)

      notify.exportSuccess(`تم تصدير ${filteredExpenses.length} مصروف بنجاح إلى ملف Excel مع التنسيق الجميل!`)
    } catch (error) {
      console.error('Error exporting clinic expenses:', error)
      notify.exportError('فشل في تصدير بيانات المصروفات')
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">خطأ في تحميل البيانات</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => { clearError(); loadExpenses() }}>
            إعادة المحاولة
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 rtl-layout page-container" dir="rtl">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Receipt className="w-8 h-8 text-primary" />
            مصروفات العيادة
          </h1>
          <p className="text-muted-foreground mt-1">
            إدارة المصروفات التشغيلية للعيادة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="btn-modern btn-modern-ghost"
            onClick={handleExport}
            disabled={filteredExpenses.length === 0}
          >
            <Download className="w-4 h-4 ml-2" />
            تصدير
          </Button>
          <Button onClick={() => setShowAddDialog(true)} className="btn-modern btn-modern-primary">
            <Plus className="w-4 h-4 ml-2" />
            إضافة مصروف
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="إجمالي المصروفات"
          value={<CurrencyDisplay amount={analytics.totalAmount} />}
          icon={<DollarSign />}
          color="blue"
        />
        <StatCard
          title="المدفوع"
          value={<CurrencyDisplay amount={analytics.paidAmount} />}
          icon={<CreditCard />}
          color="green"
        />
        <StatCard
          title="المعلق"
          value={<CurrencyDisplay amount={analytics.pendingAmount} />}
          icon={<Clock />}
          color="yellow"
        />
        <StatCard
          title="المتأخر"
          value={<CurrencyDisplay amount={analytics.overdueAmount} />}
          icon={<AlertTriangle />}
          color="red"
        />
      </div>

      {/* Filters - Placeholder for now */}
      <Card>
        <CardHeader>
          <CardTitle>البحث والفلاتر</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="البحث في المصروفات..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground"
            />
            <Button variant="outline" onClick={handleClearFilters}>
              مسح الفلاتر
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List - Placeholder for now */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة المصروفات</CardTitle>
          <CardDescription>
            عرض جميع مصروفات العيادة مع إمكانية التعديل والحذف
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">جاري التحميل...</div>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد مصروفات</h3>
              <p className="text-muted-foreground mb-4">
                لم يتم العثور على أي مصروفات. ابدأ بإضافة مصروف جديد.
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 ml-2" />
                إضافة مصروف جديد
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg bg-card"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{expense.expense_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {expense.expense_type} • {expense.status} • <CurrencyDisplay amount={expense.amount} />
                    </p>
                    {expense.description && (
                      <p className="text-sm text-muted-foreground mt-1">{expense.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {expense.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkAsPaid(expense)}
                      >
                        تحديد كمدفوع
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(expense)}
                    >
                      تعديل
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(expense)}
                    >
                      حذف
                    </Button>
                  </div>
                </div>
                ))}
              </div>

              {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 py-4 mt-6 border-t">
                <div className="flex items-center space-x-6 space-x-reverse lg:space-x-8">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <p className="text-sm font-medium arabic-enhanced">عدد العناصر لكل صفحة</p>
                    <Select
                      value={`${pageSize}`}
                      onValueChange={handlePageSizeChange}
                    >
                      <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue placeholder={pageSize} />
                      </SelectTrigger>
                      <SelectContent side="top">
                        {[5, 10, 20, 30, 50].map((size) => (
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

                <div className="flex items-center space-x-2 space-x-reverse text-sm text-muted-foreground arabic-enhanced">
                  عرض {startIndex + 1} إلى {Math.min(startIndex + pageSize, totalCount)} من {totalCount} نتيجة
                </div>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddExpenseDialog
        open={showAddDialog}
        onOpenChange={handleCloseAddDialog}
        editingExpense={editingExpense}
      />

      <DeleteExpenseDialog
        open={showDeleteDialog}
        onOpenChange={handleCloseDeleteDialog}
        expense={deletingExpense}
      />
    </div>
  )
}

// Stat Card Component
interface StatCardProps {
  title: string
  value: string | number | React.ReactNode
  icon: React.ReactNode
  color: 'blue' | 'green' | 'yellow' | 'red'
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    red: 'text-red-600 dark:text-red-400'
  }

  return (
    <Card className="interactive-card animate-fade-in-up">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
          <div className={`text-2xl ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default Expenses
