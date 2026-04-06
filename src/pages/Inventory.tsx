import React, { useState, useEffect } from 'react'
import { useInventoryStore } from '../store/inventoryStore'
import { useAppointmentStore } from '../store/appointmentStore'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getCardStyles, getIconStyles } from '@/lib/cardStyles'
import { useRealTimeSync } from '@/hooks/useRealTimeSync'
import { notify } from '@/services/notificationService'
import { ExportService } from '@/services/exportService'
import {
  Package,
  Plus,
  AlertTriangle,
  Calendar,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Bell,
  Download
} from 'lucide-react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import AddInventoryDialog from '../components/AddInventoryDialog'
import EditInventoryDialog from '../components/EditInventoryDialog'
import ConfirmDeleteInventoryDialog from '../components/ConfirmDeleteInventoryDialog'
import UsageDialog from '../components/UsageDialog'
import InventoryAlerts from '../components/InventoryAlerts'
import UsageHistoryDialog from '../components/UsageHistoryDialog'
import InventoryTable from '../components/inventory/InventoryTable'
import { useCurrency } from '@/contexts/CurrencyContext'
import CurrencyDisplay from '@/components/ui/currency-display'

export default function Inventory() {
  // Enable real-time synchronization for automatic updates
  useRealTimeSync()

  const [showAddItem, setShowAddItem] = useState(false)
  const [showEditItem, setShowEditItem] = useState(false)
  const [showDeleteItem, setShowDeleteItem] = useState(false)
  const [showUsageDialog, setShowUsageDialog] = useState(false)
  const [showUsageHistory, setShowUsageHistory] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('inventory')

  const {
    items,
    filteredItems,
    isLoading,
    error,
    categories,
    suppliers,
    totalValue,
    lowStockCount,
    expiredCount,
    expiringSoonCount,
    loadItems,
    createItem,
    updateItem,
    deleteItem,
    recordUsage,
    clearError
  } = useInventoryStore()

  const { appointments, loadAppointments } = useAppointmentStore()

  useEffect(() => {
    loadItems()
    loadAppointments()
  }, [loadItems, loadAppointments])



  // Handler functions
  const handleAddItem = async (data: any) => {
    await createItem(data)
  }

  const handleEditItem = async (id: string, data: any) => {
    await updateItem(id, data)
  }

  const handleDeleteItem = async (id: string) => {
    await deleteItem(id)
  }

  const handleRecordUsage = async (data: any) => {
    await recordUsage(data)
  }

  const handleItemClick = (item: any) => {
    setSelectedItem(item)
    setShowEditItem(true)
  }

  const handleViewDetails = (item: any) => {
    setSelectedItem(item)
    setShowUsageHistory(true)
  }

  const handleEditFromTable = (item: any) => {
    setSelectedItem(item)
    setShowEditItem(true)
  }

  const handleDeleteFromTable = (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (item) {
      setSelectedItem(item)
      setShowDeleteItem(true)
    }
  }







  const StatCard = ({ title, value, icon, color = "blue", trend, delay = 0 }: any) => {
    const colorClasses: { [key: string]: string } = {
      blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
      red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    }
    
    return (
      <Card className={`interactive-card animate-fade-in-up ${delay > 0 ? `delay-${delay * 100}` : ''}`}>
        <CardContent className="p-3 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{value}</p>
              {trend && (
                <div className="flex items-center mt-1">
                  {trend > 0 ? (
                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 sm:mr-1" />
                  ) : (
                    <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 sm:mr-1" />
                  )}
                  <span className={`text-xs ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {Math.abs(trend)}%
                  </span>
                </div>
              )}
            </div>
            <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl flex-shrink-0 ${colorClasses[color] || colorClasses.blue}`}>
              {React.cloneElement(icon as React.ReactElement, { className: "h-4 w-4 sm:h-5 sm:w-5" })}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 rtl-layout page-container w-full overflow-x-hidden">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">إدارة المخزون</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
            تتبع المواد والمعدات ومستويات المخزون
          </p>
        </div>
        <div className="flex items-center gap-2 sm:space-x-2 space-x-reverse flex-wrap">
          <Button
            variant="outline"
            className="btn-modern btn-modern-ghost text-sm"
            onClick={async () => {
              // Export inventory data
              if (filteredItems.length === 0) {
                notify.noDataToExport('لا توجد بيانات مخزون للتصدير')
                return
              }

              try {
                // التحقق من العناصر التي لا تحتوي على أسعار
                const itemsWithoutCost = filteredItems.filter(item => {
                  const costPerUnit = parseFloat(String(item.cost_per_unit || 0)) || 0
                  const unitPrice = parseFloat(String(item.unit_price || 0)) || 0
                  return costPerUnit === 0 && unitPrice === 0
                })

                // تصدير إلى Excel مع التنسيق الجميل والمقروء
                await ExportService.exportInventoryToExcel(filteredItems)

                let successMessage = `تم تصدير ${filteredItems.length} عنصر مخزون بنجاح إلى ملف Excel مع التنسيق الجميل!`

                if (itemsWithoutCost.length > 0) {
                  successMessage += ` (تنبيه: ${itemsWithoutCost.length} عنصر لا يحتوي على سعر - يمكنك تعديل العناصر لإضافة الأسعار)`
                }

                notify.exportSuccess(successMessage)
              } catch (error) {
                console.error('Error exporting inventory:', error)
                notify.exportError('فشل في تصدير بيانات المخزون')
              }
            }}
          >
            <Download className="w-4 h-4 sm:ml-2" />
            <span className="hidden sm:inline">تصدير</span>
          </Button>
          <Button onClick={() => setShowAddItem(true)} className="btn-modern btn-modern-primary text-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">إضافة عنصر جديد</span>
            <span className="sm:hidden">إضافة</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inventory" className="flex items-center gap-1.5 sm:gap-2 text-sm">
            <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">المخزون</span>
            <span className="sm:hidden">المخزون</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-1.5 sm:gap-2 text-sm">
            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">التنبيهات</span>
            <span className="sm:hidden">التنبيهات</span>
            {(lowStockCount + expiredCount + expiringSoonCount) > 0 && (
              <Badge variant="destructive" className="ml-0.5 sm:ml-1 text-[10px] sm:text-xs">
                {lowStockCount + expiredCount + expiringSoonCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4 sm:space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <StatCard
              title="إجمالي العناصر"
              value={items.length}
              icon={<Package />}
              color="blue"
              delay={0}
            />
            <StatCard
              title="قيمة المخزون"
              value={<CurrencyDisplay amount={totalValue} />}
              icon={<DollarSign />}
              color="green"
              delay={1}
            />
            <StatCard
              title="مخزون منخفض"
              value={lowStockCount}
              icon={<AlertTriangle />}
              color="yellow"
              delay={2}
            />
            <StatCard
              title="منتهي الصلاحية"
              value={expiredCount + expiringSoonCount}
              icon={<Calendar />}
              color="red"
              delay={3}
            />
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-destructive">خطأ: {error}</p>
              <Button variant="outline" size="sm" onClick={clearError} className="mt-2">
                إغلاق
              </Button>
            </div>
          )}

          {/* Inventory Table */}
          <InventoryTable
            items={filteredItems}
            isLoading={isLoading}
            onEdit={handleEditFromTable}
            onDelete={handleDeleteFromTable}
            onViewDetails={handleViewDetails}
          />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <InventoryAlerts
            items={items}
            onRefresh={loadItems}
            onItemClick={handleItemClick}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddInventoryDialog
        isOpen={showAddItem}
        onClose={() => setShowAddItem(false)}
        onSave={handleAddItem}
        categories={categories}
        suppliers={suppliers}
      />

      <EditInventoryDialog
        isOpen={showEditItem}
        onClose={() => setShowEditItem(false)}
        onSave={handleEditItem}
        item={selectedItem}
        categories={categories}
        suppliers={suppliers}
      />

      <ConfirmDeleteInventoryDialog
        isOpen={showDeleteItem}
        onClose={() => setShowDeleteItem(false)}
        onConfirm={handleDeleteItem}
        item={selectedItem}
        isLoading={isLoading}
      />

      <UsageDialog
        isOpen={showUsageDialog}
        onClose={() => setShowUsageDialog(false)}
        onSave={handleRecordUsage}
        item={selectedItem}
        appointments={appointments}
      />

      <UsageHistoryDialog
        isOpen={showUsageHistory}
        onClose={() => setShowUsageHistory(false)}
        item={selectedItem}
      />
    </div>
  )
}
