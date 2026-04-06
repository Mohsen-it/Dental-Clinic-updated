import { useState, useEffect } from 'react'
import { useBackupStore } from '@/store/backupStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useTheme } from '@/contexts/ThemeContext'
import { useStableClinicLogo } from '@/hooks/useStableSettings'
import { formatDate } from '@/lib/utils'
import { SUPPORTED_CURRENCIES } from '@/lib/utils'
import { useCurrency } from '@/contexts/CurrencyContext'
import SecuritySettings from '@/components/settings/SecuritySettings'
import ElegantShortcutsDisplay from '@/components/help/ElegantShortcutsDisplay'
import { DatabaseDiagnostics } from '@/components/DatabaseDiagnostics'
import { ExportService } from '@/services/exportService'
import { useDentalTreatmentStore } from '@/store/dentalTreatmentStore'
import {
  Download,
  Upload,
  Settings as SettingsIcon,
  Trash2,
  Clock,
  Shield,
  Database,
  Calendar,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  Palette,
  Moon,
  Sun,
  Key,
  Users,
  Phone,
  Mail,
  Info,
  Image,
  Keyboard,
  DollarSign
} from 'lucide-react'


export default function Settings() {
  const [activeTab, setActiveTab] = useState('backup')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const [notification, setNotification] = useState<{
    message: string
    type: 'success' | 'error' | 'info'
    show: boolean
  }>({ message: '', type: 'success', show: false })

  const {
    backups,
    isLoading,
    error,
    isCreatingBackup,
    isRestoringBackup,
    autoBackupEnabled,
    backupFrequency,
    loadBackups,
    createBackup,
    restoreBackup,
    deleteBackup,
    setAutoBackupEnabled,
    setBackupFrequency,
    selectBackupFile,
    clearError,
    formatBackupSize,
    formatBackupDate,
    getBackupStatus
  } = useBackupStore()

  const { settings, updateSettings, loadSettings } = useSettingsStore()
  const { isDarkMode, toggleDarkMode } = useTheme()
  const { currentCurrency, setCurrency } = useCurrency()
  const stableClinicLogo = useStableClinicLogo()
  const { refreshAllImages } = useDentalTreatmentStore()

  // State محلي لإدارة الشعار لضمان التحديث الفوري
  const [localClinicLogo, setLocalClinicLogo] = useState<string>('')

  useEffect(() => {
    loadBackups()
    loadSettings()
  }, [loadBackups, loadSettings])

  // تحديث الشعار المحلي عند تغيير الشعار المستقر
  useEffect(() => {
    setLocalClinicLogo(stableClinicLogo)
  }, [stableClinicLogo])

  useEffect(() => {
    if (error) {
      showNotification(error, 'error')
      clearError()
    }
  }, [error, clearError])

  // Debug: Monitor showDeleteConfirm state changes
  useEffect(() => {
    if (showDeleteConfirm) {
      console.log('🔍 Delete confirmation dialog opened for:', showDeleteConfirm)
    } else {
      console.log('🔍 Delete confirmation dialog closed')
    }
  }, [showDeleteConfirm])

  // Handle keyboard events for modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (showDeleteConfirm && event.key === 'Escape') {
        setShowDeleteConfirm(null)
      }
    }

    if (showDeleteConfirm) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [showDeleteConfirm])

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type, show: true })
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }))
    }, 3000)
  }

  const handleCreateBackup = async (withImages = false) => {
    try {
      await createBackup(null, withImages)
      const message = withImages
        ? 'تم إنشاء النسخة الاحتياطية مع الصور بنجاح'
        : 'تم إنشاء النسخة الاحتياطية بنجاح'
      showNotification(message, 'success')
    } catch (error) {
      showNotification('فشل في إنشاء النسخة الاحتياطية', 'error')
    }
  }

  const handleRestoreBackup = async () => {
    try {
      const filePath = await selectBackupFile()
      if (!filePath) return

      const confirmed = window.confirm(
        'هل أنت متأكد من استعادة هذه النسخة الاحتياطية؟ سيتم استبدال جميع البيانات الحالية.'
      )

      if (confirmed) {
        await restoreBackup(filePath)

        // Refresh all images after restore
        try {
          await refreshAllImages()
        } catch (error) {
          console.warn('Could not refresh images after restore:', error)
        }

        showNotification('تم استعادة النسخة الاحتياطية بنجاح', 'success')
        // Reload the page to reflect changes
        window.location.reload()
      }
    } catch (error) {
      showNotification('فشل في استعادة النسخة الاحتياطية', 'error')
    }
  }

  const handleRestoreFromPath = async (backupPath: string) => {
    try {
      const confirmed = window.confirm(
        'هل أنت متأكد من استعادة هذه النسخة الاحتياطية؟ سيتم استبدال جميع البيانات الحالية.'
      )

      if (confirmed) {
        await restoreBackup(backupPath)

        // Refresh all images after restore
        try {
          await refreshAllImages()
        } catch (error) {
          console.warn('Could not refresh images after restore:', error)
        }

        showNotification('تم استعادة النسخة الاحتياطية بنجاح', 'success')
        // Reload the page to reflect changes
        window.location.reload()
      }
    } catch (error) {
      showNotification('فشل في استعادة النسخة الاحتياطية', 'error')
    }
  }

  const handleDeleteBackup = async (backupName: string) => {
    try {
      console.log('🗑️ Attempting to delete backup:', backupName)
      await deleteBackup(backupName)
      showNotification('تم حذف النسخة الاحتياطية بنجاح', 'success')
      setShowDeleteConfirm(null)
      console.log('✅ Backup deleted successfully:', backupName)
    } catch (error) {
      console.error('❌ Failed to delete backup:', error)
      showNotification(`فشل في حذف النسخة الاحتياطية: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`, 'error')
      setShowDeleteConfirm(null) // Close dialog even on error
    }
  }







  const handleUpdateSettings = async (settingsData: any) => {
    try {
      // تحديث الشعار المحلي فوراً إذا كان التحديث يتعلق بالشعار
      if (settingsData.clinic_logo !== undefined) {
        setLocalClinicLogo(settingsData.clinic_logo)
      }

      await updateSettings(settingsData)

      // إجبار إعادة تحميل الإعدادات لضمان التحديث الفوري في الواجهة
      await loadSettings()

      showNotification('تم حفظ إعدادات العيادة بنجاح', 'success')
    } catch (error) {
      console.error('Error updating settings:', error)
      showNotification('فشل في حفظ إعدادات العيادة', 'error')
    }
  }

  const backupStatus = getBackupStatus()

  return (
    <div className="space-y-6 rtl-layout page-container" dir="rtl">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-heading-1 text-foreground arabic-enhanced">الإعدادات</h1>
          <p className="text-body text-muted-foreground mt-2 arabic-enhanced">
            إدارة إعدادات العيادة والنسخ الاحتياطية
          </p>
        </div>
        <div className="flex items-center space-x-2 space-x-reverse">
          <button
            onClick={() => loadBackups()}
            disabled={isLoading}
            className="btn-modern btn-modern-ghost flex items-center space-x-2 space-x-reverse px-4 py-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
          <button
            onClick={async () => {
              // Export settings data
              const settingsData = {
                'الوضع المظلم': isDarkMode ? 'مفعل' : 'معطل',
                'النسخ التلقائية': autoBackupEnabled ? 'مفعلة' : 'معطلة',
                'تكرار النسخ': backupFrequency === 'daily' ? 'يومياً' : backupFrequency === 'weekly' ? 'أسبوعياً' : 'شهرياً',
                'إجمالي النسخ الاحتياطية': backupStatus.totalBackups,
                'آخر نسخة احتياطية': backupStatus.lastBackup || 'لا توجد',

                'تاريخ التصدير': formatDate(new Date())
              }

              const csvContent = '\uFEFF' + [
                'الإعداد,القيمة',
                ...Object.entries(settingsData).map(([key, value]) => `"${key}","${value}"`)
              ].join('\n')

              // تحويل إلى Excel مباشرة
              await ExportService.convertCSVToExcel(csvContent, 'settings', {
                format: 'csv',
                includeCharts: false,
                includeDetails: true,
                language: 'ar'
              })
            }}
            className="btn-modern btn-modern-ghost flex items-center space-x-2 space-x-reverse px-4 py-2"
          >
            <Download className="w-4 h-4" />
            <span>تصدير الإعدادات</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8 space-x-reverse">
          {[
            { id: 'backup', name: 'النسخ الاحتياطية', icon: Database },
            { id: 'diagnostics', name: 'تشخيص النظام', icon: AlertTriangle },
            { id: 'appearance', name: 'المظهر', icon: Palette },
            // { id: 'shortcuts', name: 'اختصارات لوحة المفاتيح', icon: Keyboard },
            { id: 'security', name: 'الأمان', icon: Key },
            { id: 'clinic', name: 'إعدادات العيادة', icon: SettingsIcon },
            { id: 'development', name: 'فريق التطوير', icon: Users }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 space-x-reverse py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}

      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Backup Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card rounded-lg shadow border border-border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <HardDrive className="w-6 h-6 text-primary" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-muted-foreground">إجمالي النسخ</p>
                  <p className="text-2xl font-bold text-foreground">{backupStatus.totalBackups}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg shadow border border-border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-muted-foreground">آخر نسخة احتياطية</p>
                  <p className="text-sm font-bold text-foreground">
                    {backupStatus.lastBackup || 'لا توجد نسخ'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg shadow border border-border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-muted-foreground">النسخة التالية</p>
                  <p className="text-sm font-bold text-foreground">
                    {backupStatus.nextScheduledBackup || 'غير محدد'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Manual Backup Actions */}
          <div className="bg-card rounded-lg shadow border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-medium text-foreground">النسخ الاحتياطية اليدوية</h3>
              <p className="text-sm text-muted-foreground mt-1">
                إنشاء واستعادة النسخ الاحتياطية يدوياً (تنسيق SQLite)
              </p>
            </div>
            <div className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => handleCreateBackup(false)}
                  disabled={isCreatingBackup}
                  className="flex items-center justify-center space-x-2 space-x-reverse px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  <span>{isCreatingBackup ? 'جاري الإنشاء...' : 'إنشاء نسخة احتياطية'}</span>
                </button>

                <button
                  onClick={() => handleCreateBackup(true)}
                  disabled={isCreatingBackup}
                  className="flex items-center justify-center space-x-2 space-x-reverse px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Image className="w-5 h-5" />
                  <span>{isCreatingBackup ? 'جاري الإنشاء...' : 'إنشاء نسخة احتياطية مع صور'}</span>
                </button>

                <button
                  onClick={handleRestoreBackup}
                  disabled={isRestoringBackup}
                  className="flex items-center justify-center space-x-2 space-x-reverse px-6 py-3 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-5 h-5" />
                  <span>{isRestoringBackup ? 'جاري الاستعادة...' : 'استعادة نسخة احتياطية'}</span>
                </button>


              </div>

              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 ml-2" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">تنبيه مهم</h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      استعادة النسخة الاحتياطية ستستبدل جميع البيانات الحالية. تأكد من إنشاء نسخة احتياطية حديثة قبل الاستعادة.
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                      <strong>أنواع النسخ الاحتياطية:</strong>
                    </p>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 mr-4">
                      <li>• <strong>نسخة عادية (.db):</strong> قاعدة البيانات فقط - سريعة وحجم صغير</li>
                      <li>• <strong>نسخة مع صور (.zip):</strong> قاعدة البيانات + جميع الصور - حماية شاملة</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Auto Backup Settings - Hidden */}
          {false && (
            <div className="bg-card rounded-lg shadow border border-border">
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-medium text-foreground">النسخ الاحتياطية التلقائية</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  إعدادات النسخ الاحتياطية التلقائية
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-foreground">تفعيل النسخ التلقائية</label>
                    <p className="text-sm text-muted-foreground">إنشاء نسخ احتياطية تلقائياً حسب الجدولة المحددة</p>
                  </div>
                  <button
                    onClick={() => setAutoBackupEnabled(!autoBackupEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      autoBackupEnabled ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                        autoBackupEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {autoBackupEnabled && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      تكرار النسخ الاحتياطية
                    </label>
                    <select
                      value={backupFrequency}
                      onChange={(e) => setBackupFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                      className="w-full p-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="daily">يومياً</option>
                      <option value="weekly">أسبوعياً</option>
                      <option value="monthly">شهرياً</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Backup List */}
          <div className="bg-card rounded-lg shadow border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-medium text-foreground">النسخ الاحتياطية المحفوظة</h3>
              <p className="text-sm text-muted-foreground mt-1">
                قائمة بجميع النسخ الاحتياطية المتاحة - اضغط على أي نسخة لاستعادتها
              </p>
            </div>
            <div className="p-6">
              {isLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
                </div>
              ) : backups.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="w-12 h-12 mx-auto text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium text-foreground">لا توجد نسخ احتياطية</h3>
                  <p className="mt-1 text-sm text-muted-foreground">ابدأ بإنشاء أول نسخة احتياطية</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {backups.map((backup, index) => (
                    <div
                      key={`${backup.name}-${index}`}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent cursor-pointer"
                      onClick={() => handleRestoreFromPath(backup.path)}
                    >
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Shield className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <h4 className="text-sm font-medium text-foreground">{backup.name}</h4>
                            {backup.isSqliteOnly && (
                              <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full">
                                SQLite
                              </span>
                            )}
                            {backup.includesImages && (
                              <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-full flex items-center gap-1">
                                <Image className="w-3 h-3" />
                                مع صور
                              </span>
                            )}
                            {backup.isLegacy && (
                              <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200 rounded-full">
                                قديم
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 space-x-reverse text-sm text-muted-foreground">
                            <span>{formatBackupDate(backup.created_at)}</span>
                            <span>{formatBackupSize(backup.size)}</span>
                            {backup.version && <span>إصدار {backup.version}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRestoreFromPath(backup.path)
                          }}
                          className="p-2 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20 rounded-lg"
                          title="استعادة"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            console.log('🗑️ Delete button clicked for backup:', backup.name)
                            setShowDeleteConfirm(backup.name)
                          }}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="حذف"
                          type="button"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Diagnostics Tab */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6">
          <div className="bg-card rounded-lg shadow border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-medium text-foreground">تشخيص النظام</h3>
              <p className="text-sm text-muted-foreground mt-1">
                فحص حالة قاعدة البيانات والنظام
              </p>
            </div>
            <div className="p-6">
              <DatabaseDiagnostics />
            </div>
          </div>
        </div>
      )}

      {/* Appearance Settings Tab */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          <div className="bg-card rounded-lg shadow border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-medium text-foreground">إعدادات المظهر</h3>
              <p className="text-sm text-muted-foreground mt-1">
                تخصيص مظهر التطبيق وفقاً لتفضيلاتك
              </p>
            </div>
            <div className="p-6 space-y-6">
              {/* Dark Mode Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {isDarkMode ? (
                      <Moon className="w-5 h-5 text-primary" />
                    ) : (
                      <Sun className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">الوضع المظلم</label>
                    <p className="text-sm text-muted-foreground">
                      تبديل بين الوضع الفاتح والمظلم للتطبيق
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isDarkMode ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                      isDarkMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Theme Preview */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-foreground">معاينة المظهر</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Light Theme Preview */}
                  <div className="p-4 border border-border rounded-lg bg-background">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-medium text-foreground">
                          {isDarkMode ? 'الوضع المظلم' : 'الوضع الفاتح'}
                        </h5>
                        <div className="w-3 h-3 rounded-full bg-primary"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 bg-muted rounded"></div>
                        <div className="h-2 bg-muted rounded w-3/4"></div>
                        <div className="h-2 bg-muted rounded w-1/2"></div>
                      </div>
                      <div className="flex space-x-2 space-x-reverse">
                        <div className="w-8 h-6 bg-primary rounded text-xs"></div>
                        <div className="w-8 h-6 bg-secondary rounded text-xs"></div>
                      </div>
                    </div>
                  </div>

                  {/* Theme Info */}
                  <div className="p-4 border border-border rounded-lg bg-muted/50">
                    <h5 className="text-sm font-medium text-foreground mb-2">مميزات المظهر</h5>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• تحسين قراءة النصوص العربية</li>
                      <li>• ألوان مناسبة للتطبيقات الطبية</li>
                      <li>• حفظ تلقائي للتفضيلات</li>
                      <li>• تباين عالي للوضوح</li>
                    </ul>
                  </div>
                </div>
              </div>


            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Tab */}
      {activeTab === 'shortcuts' && (
        <div className="space-y-6">
          <div className="bg-card rounded-lg shadow border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-medium text-foreground">اختصارات لوحة المفاتيح</h3>
              <p className="text-sm text-muted-foreground mt-1">
                تعرف على جميع اختصارات لوحة المفاتيح المتاحة لتسريع عملك
              </p>
            </div>
            <div className="p-6">
              <ElegantShortcutsDisplay />
            </div>
          </div>

          {/* Tips Section */}
          <div className="bg-card rounded-lg shadow border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-medium text-foreground">نصائح للاستخدام</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">الأحرف العربية</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    يمكنك استخدام الأحرف العربية أو الإنجليزية للاختصارات. مثلاً: A أو ش لإضافة مريض جديد.
                  </p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">التنقل السريع</h4>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    استخدم الأرقام 0-9 أو ٠-٩ للتنقل السريع بين الصفحات المختلفة.
                  </p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                  <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">الإجراءات السريعة</h4>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    استخدم A/S/D أو ش/س/ي لإضافة مريض أو موعد أو دفعة بسرعة.
                  </p>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <h4 className="font-medium text-orange-800 dark:text-orange-200 mb-2">العمليات العامة</h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    F1 للإعدادات، R/ق للتحديث، F/ب للبحث، ESC للإغلاق.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Settings Tab */}
      {activeTab === 'security' && (
        <SecuritySettings showNotification={showNotification} />
      )}

      {/* Clinic Settings Tab */}
      {activeTab === 'clinic' && (
        <div className="space-y-6">
          <div className="bg-card rounded-lg shadow border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-medium text-foreground">معلومات العيادة</h3>
              <p className="text-sm text-muted-foreground mt-1">
                إعدادات العيادة الأساسية والمعلومات التي تظهر في الإيصالات
              </p>
            </div>
            <div className="p-6">
              <form className="space-y-6" onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const clinicData = {
                  clinic_name: formData.get('clinic_name') as string,
                  doctor_name: formData.get('doctor_name') as string,
                  clinic_address: formData.get('clinic_address') as string,
                  clinic_phone: formData.get('clinic_phone') as string,
                  clinic_email: formData.get('clinic_email') as string,
                  currency: formData.get('currency') as string,
                }
                handleUpdateSettings(clinicData)
              }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="clinic_name" className="text-sm font-medium text-foreground">
                      اسم العيادة *
                    </label>
                    <input
                      type="text"
                      id="clinic_name"
                      name="clinic_name"
                      defaultValue={settings?.clinic_name || ''}
                      className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="doctor_name" className="text-sm font-medium text-foreground">
                      اسم الدكتور *
                    </label>
                    <input
                      type="text"
                      id="doctor_name"
                      name="doctor_name"
                      defaultValue={settings?.doctor_name || ''}
                      placeholder="د. محمد أحمد"
                      className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="clinic_phone" className="text-sm font-medium text-foreground">
                      رقم الهاتف
                    </label>
                    <input
                      type="tel"
                      id="clinic_phone"
                      name="clinic_phone"
                      defaultValue={settings?.clinic_phone || ''}
                      placeholder="+963 95 966 9628"
                      className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="clinic_email" className="text-sm font-medium text-foreground">
                      البريد الإلكتروني
                    </label>
                    <input
                      type="email"
                      id="clinic_email"
                      name="clinic_email"
                      defaultValue={settings?.clinic_email || ''}
                      placeholder="clinic@example.com"
                      className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="clinic_address" className="text-sm font-medium text-foreground">
                    عنوان العيادة
                  </label>
                  <textarea
                    id="clinic_address"
                    name="clinic_address"
                    defaultValue={settings?.clinic_address || ''}
                    placeholder="حلب، الجمهورية العربية السورية"
                    rows={3}
                    className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Currency Selection */}
                <div className="space-y-2">
                  <label htmlFor="currency" className="text-sm font-medium text-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    العملة المستخدمة
                  </label>
                  <select
                    id="currency"
                    name="currency"
                    defaultValue={settings?.currency || currentCurrency || 'USD'}
                    className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    onChange={(e) => {
                      // Update currency immediately when changed
                      setCurrency(e.target.value)
                    }}
                  >
                    {Object.entries(SUPPORTED_CURRENCIES).map(([code, config]) => (
                      <option key={code} value={code}>
                        {config.nameAr} ({config.symbol}) - {config.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    العملة المختارة ستظهر في جميع أنحاء التطبيق (المدفوعات، التقارير، الإحصائيات)
                  </p>
                </div>

                {/* Clinic Logo Section */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <h4 className="text-sm font-medium text-foreground">شعار العيادة</h4>
                  <div className="flex items-start space-x-4 space-x-reverse">
                    {/* Logo Preview */}
                    <div className="flex-shrink-0">
                      <div className="w-20 h-20 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/50">
                        {localClinicLogo ? (
                          <img
                            src={localClinicLogo}
                            alt="شعار العيادة"
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="text-center">
                            <div className="w-8 h-8 mx-auto mb-1 text-muted-foreground">
                              📷
                            </div>
                            <span className="text-xs text-muted-foreground">لا يوجد شعار</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Logo Upload */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <input
                          type="file"
                          id="clinic_logo"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              // Convert to base64
                              const reader = new FileReader()
                              reader.onload = async (event) => {
                                const base64 = event.target?.result as string
                                await handleUpdateSettings({ clinic_logo: base64 })
                              }
                              reader.readAsDataURL(file)
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById('clinic_logo')?.click()}
                          className="px-3 py-2 text-sm border border-input bg-background text-foreground rounded-md hover:bg-accent"
                        >
                          اختيار شعار
                        </button>
                        {localClinicLogo && (
                          <button
                            type="button"
                            onClick={() => handleUpdateSettings({ clinic_logo: '' })}
                            className="px-3 py-2 text-sm border border-red-200 bg-red-50 text-red-700 rounded-md hover:bg-red-100"
                          >
                            حذف الشعار
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        يُفضل استخدام صورة مربعة بحجم 200x200 بكسل أو أكبر. الصيغ المدعومة: JPG, PNG, GIF
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* External Estimate Settings */}
          <div className="bg-card rounded-lg shadow border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-medium text-foreground">إعدادات الفاتورة التقديرية</h3>
              <p className="text-sm text-muted-foreground mt-1">
                إعدادات خاصة بالفواتير التقديرية الخارجية
              </p>
            </div>
            <div className="p-6">
              <form className="space-y-6" onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const estimateData = {
                  estimate_default_validity_days: parseInt(formData.get('estimate_default_validity_days') as string) || 30,
                  estimate_default_tax_rate: parseFloat(formData.get('estimate_default_tax_rate') as string) || 0,
                  estimate_default_notes: formData.get('estimate_default_notes') as string || '',
                  estimate_show_clinic_stamp: formData.get('estimate_show_clinic_stamp') === 'on',
                }
                handleUpdateSettings(estimateData)
              }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="estimate_default_validity_days" className="text-sm font-medium text-foreground">
                      مدة صلاحية التقدير (بالأيام)
                    </label>
                    <input
                      type="number"
                      id="estimate_default_validity_days"
                      name="estimate_default_validity_days"
                      defaultValue={settings?.estimate_default_validity_days || 30}
                      min="1"
                      max="365"
                      className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground">
                      عدد الأيام التي يكون فيها التقدير صالحاً (افتراضي: 30 يوم)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="estimate_default_tax_rate" className="text-sm font-medium text-foreground">
                      معدل الضريبة الافتراضي (%)
                    </label>
                    <input
                      type="number"
                      id="estimate_default_tax_rate"
                      name="estimate_default_tax_rate"
                      defaultValue={settings?.estimate_default_tax_rate || 0}
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground">
                      معدل الضريبة الذي سيتم تطبيقه افتراضياً على التقديرات
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="estimate_default_notes" className="text-sm font-medium text-foreground">
                    الملاحظات الافتراضية
                  </label>
                  <textarea
                    id="estimate_default_notes"
                    name="estimate_default_notes"
                    defaultValue={settings?.estimate_default_notes || ''}
                    placeholder="ملاحظات تظهر في جميع التقديرات..."
                    rows={3}
                    className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    نص افتراضي يظهر في قسم الملاحظات لجميع التقديرات الجديدة
                  </p>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <input
                    type="checkbox"
                    id="estimate_show_clinic_stamp"
                    name="estimate_show_clinic_stamp"
                    defaultChecked={settings?.estimate_show_clinic_stamp !== false}
                    className="w-4 h-4 text-primary bg-background border-input rounded focus:ring-primary focus:ring-2"
                  />
                  <label htmlFor="estimate_show_clinic_stamp" className="text-sm font-medium text-foreground">
                    إظهار منطقة ختم العيادة في التقديرات
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'جاري الحفظ...' : 'حفظ إعدادات التقدير'}
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      )}

      {/* Development Team Tab */}
      {activeTab === 'development' && (
        <div className="space-y-6">
          <div className="bg-card rounded-lg shadow border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-medium text-foreground">معلومات فريق التطوير</h3>
              <p className="text-sm text-muted-foreground mt-1">
                تواصل مع فريق التطوير للدعم الفني والاستفسارات
              </p>
            </div>
            <div className="p-6 space-y-6">
              {/* Team Name */}
              <div className="flex items-center space-x-4 space-x-reverse p-4 bg-muted/50 rounded-lg">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground">اسم الفريق</h4>
                  <p className="text-lg font-bold text-foreground">AgorraCode</p>
                  <p className="text-sm text-muted-foreground">فريق تطوير تطبيقات إدارة العيادات</p>
                </div>
              </div>

              {/* Contact Phone */}
              <div className="flex items-center space-x-4 space-x-reverse p-4 bg-muted/50 rounded-lg">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Phone className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-foreground">رقم التواصل</h4>
                  <p className="text-lg font-bold text-foreground">00963959669628</p>
                  <p className="text-sm text-muted-foreground">متاح للدعم الفني من 9 صباحاً إلى 6 مساءً</p>
                </div>
                <button
                  onClick={async () => {
                    const whatsappUrl = `https://api.whatsapp.com/send/?phone=963959669628`;

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
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  تواصل عبر واتساب
                </button>
              </div>

              {/* Contact Email */}
              <div className="flex items-center space-x-4 space-x-reverse p-4 bg-muted/50 rounded-lg">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-foreground">البريد الإلكتروني</h4>
                  <p className="text-lg font-bold text-foreground">AgorraCode@gmail.com</p>
                  <p className="text-sm text-muted-foreground">للاستفسارات والدعم الفني</p>
                </div>
                <button
                  onClick={() => window.open('mailto:AgorraCode@gmail.com', '_blank')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  إرسال إيميل
                </button>
              </div>

              {/* Additional Info */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Info className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">معلومات إضافية</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• نقدم دعماً فنياً شاملاً لجميع مستخدمي التطبيق</li>
                      <li>• نستقبل اقتراحاتكم لتطوير وتحسين التطبيق</li>
                      <li>• نوفر تدريباً مجانياً على استخدام التطبيق</li>
                      <li>• نضمن الاستجابة السريعة لجميع الاستفسارات</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(null)}
            style={{ zIndex: 9998 }}
          />

          {/* Dialog */}
          <div
            className="relative bg-card border border-border rounded-lg shadow-2xl max-w-md w-full mx-4"
            style={{ zIndex: 10000 }}
            dir="rtl"
          >
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center ml-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">تأكيد الحذف</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    هل أنت متأكد من حذف هذه النسخة الاحتياطية؟
                  </p>
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <div className="flex">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 ml-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                      تحذير: لا يمكن التراجع عن هذا الإجراء
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      سيتم حذف النسخة الاحتياطية "{showDeleteConfirm}" نهائياً من النظام.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 space-x-reverse">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 border border-input bg-background text-foreground rounded-lg hover:bg-accent transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => handleDeleteBackup(showDeleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  تأكيد الحذف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
          notification.type === 'success'
            ? 'bg-green-500 text-white'
            : notification.type === 'error'
            ? 'bg-red-500 text-white'
            : 'bg-blue-500 text-white'
        }`}>
          <div className="flex items-center space-x-2 space-x-reverse">
            <span className="text-lg">
              {notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span>{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  )
}