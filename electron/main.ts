import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { DatabaseService } from '../src/services/databaseService'
import { DataMigrationService } from '../src/services/dataMigrationService'
import { BackupService } from '../src/services/backupService'
import { AutoSaveService } from '../src/services/autoSaveService'
import { ReportsService } from '../src/services/reportsService'

const isDev = process.env.IS_DEV === 'true'

let mainWindow: BrowserWindow | null = null
let databaseService: DatabaseService
let backupService: BackupService
let autoSaveService: AutoSaveService
let reportsService: ReportsService

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
  icon: join(__dirname, '../assets/icon.ico'),
    titleBarStyle: 'default',
    show: false,
  })

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  try {
    // Check if migration is needed and perform it
    const migrationService = new DataMigrationService()
    const migrationStatus = await migrationService.getMigrationStatus()

    console.log('Migration status:', migrationStatus)

    if (migrationStatus.migrationNeeded) {
      console.log('🔄 Starting data migration from LowDB to SQLite...')
      const migrationResult = await migrationService.migrateData()

      if (migrationResult.success) {
        console.log('✅ Migration completed successfully:', migrationResult.stats)
      } else {
        console.error('❌ Migration failed:', migrationResult.message)
        throw new Error(`Migration failed: ${migrationResult.message}`)
      }
    } else {
      console.log('✅ No migration needed, using existing SQLite database')
    }

    // Initialize services with SQLite
    databaseService = new DatabaseService()
    backupService = new BackupService(databaseService)
    autoSaveService = new AutoSaveService(databaseService)
    reportsService = new ReportsService()

    // Clean up migration service
    migrationService.close()

    console.log('✅ All services initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize services:', error)
    throw error
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // Start auto-save service
  autoSaveService.start()

  // Start automatic backup scheduling
  const initializeAutoBackup = async () => {
    try {
      const settings = await databaseService.getSettings()
      if (settings?.backup_frequency) {
        await backupService.scheduleAutomaticBackups(settings.backup_frequency as 'hourly' | 'daily' | 'weekly')
        console.log(`Automatic backup scheduled: ${settings.backup_frequency}`)
      }
    } catch (error) {
      console.error('Failed to initialize automatic backup:', error)
    }
  }

  initializeAutoBackup()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    autoSaveService?.stop()
    app.quit()
  }
})

// IPC Handlers for Database Operations
ipcMain.handle('db:patients:getAll', async () => {
  try {
    return await databaseService.getAllPatients()
  } catch (error) {
    console.error('Error getting all patients:', error)
    throw error
  }
})

ipcMain.handle('db:patients:create', async (_, patient) => {
  try {
    console.log('Creating patient:', patient)
    const result = await databaseService.createPatient(patient)
    console.log('Patient created successfully:', result.id)
    return result
  } catch (error) {
    console.error('Error creating patient:', error)
    throw error
  }
})

ipcMain.handle('db:patients:update', async (_, id, patient) => {
  try {
    console.log('Updating patient:', id, patient)
    const result = await databaseService.updatePatient(id, patient)
    console.log('Patient updated successfully:', id)
    return result
  } catch (error) {
    console.error('Error updating patient:', error)
    throw error
  }
})

ipcMain.handle('db:patients:delete', async (_, id) => {
  try {
    console.log('Deleting patient:', id)
    const result = await databaseService.deletePatient(id)
    console.log('Patient deleted successfully:', id)
    return result
  } catch (error) {
    console.error('Error deleting patient:', error)
    throw error
  }
})

ipcMain.handle('db:patients:search', async (_, query) => {
  try {
    return await databaseService.searchPatients(query)
  } catch (error) {
    console.error('Error searching patients:', error)
    throw error
  }
})

// Appointment IPC Handlers
ipcMain.handle('db:appointments:getAll', async () => {
  try {
    return await databaseService.getAllAppointments()
  } catch (error) {
    console.error('Error getting all appointments:', error)
    throw error
  }
})

ipcMain.handle('db:appointments:create', async (_, appointment) => {
  try {
    console.log('Creating appointment:', appointment)
    const result = await databaseService.createAppointment(appointment)
    console.log('Appointment created successfully:', result.id)
    return result
  } catch (error) {
    console.error('Error creating appointment:', error)
    throw error
  }
})

ipcMain.handle('db:appointments:update', async (_, id, appointment) => {
  try {
    console.log('Updating appointment:', id, appointment)
    const result = await databaseService.updateAppointment(id, appointment)
    console.log('Appointment updated successfully:', id)
    return result
  } catch (error) {
    console.error('Error updating appointment:', error)
    throw error
  }
})

ipcMain.handle('db:appointments:delete', async (_, id) => {
  try {
    console.log('Deleting appointment:', id)
    const result = await databaseService.deleteAppointment(id)
    console.log('Appointment deleted successfully:', id)
    return result
  } catch (error) {
    console.error('Error deleting appointment:', error)
    throw error
  }
})

ipcMain.handle('db:appointments:checkConflict', async (_, startTime, endTime, excludeId) => {
  try {
    console.log('Checking appointment conflict:', { startTime, endTime, excludeId })
    const result = await databaseService.checkAppointmentConflict(startTime, endTime, excludeId)
    console.log('Conflict check result:', result)
    return result
  } catch (error) {
    console.error('Error checking appointment conflict:', error)
    throw error
  }
})

// Payment IPC Handlers
ipcMain.handle('db:payments:getAll', async () => {
  try {
    return await databaseService.getAllPayments()
  } catch (error) {
    console.error('Error getting all payments:', error)
    throw error
  }
})

ipcMain.handle('db:payments:getByPatient', async (_, patientId) => {
  try {
    return await databaseService.getPaymentsByPatient(patientId)
  } catch (error) {
    console.error('Error getting payments by patient:', error)
    throw error
  }
})

ipcMain.handle('db:payments:create', async (_, payment) => {
  try {
    console.log('Creating payment:', payment)
    const result = await databaseService.createPayment(payment)
    console.log('Payment created successfully:', result.id)
    return result
  } catch (error) {
    console.error('Error creating payment:', error)
    throw error
  }
})

ipcMain.handle('db:payments:update', async (_, id, payment) => {
  try {
    console.log('Updating payment:', id, payment)
    const result = await databaseService.updatePayment(id, payment)
    console.log('Payment updated successfully:', id)
    return result
  } catch (error) {
    console.error('Error updating payment:', error)
    throw error
  }
})

ipcMain.handle('db:payments:delete', async (_, id) => {
  try {
    console.log('Deleting payment:', id)
    const result = await databaseService.deletePayment(id)
    console.log('Payment deleted successfully:', id)
    return result
  } catch (error) {
    console.error('Error deleting payment:', error)
    throw error
  }
})

ipcMain.handle('db:payments:search', async (_, query) => {
  try {
    return await databaseService.searchPayments(query)
  } catch (error) {
    console.error('Error searching payments:', error)
    throw error
  }
})

// Treatment IPC Handlers
ipcMain.handle('db:treatments:getAll', async () => {
  return await databaseService.getAllTreatments()
})

ipcMain.handle('db:treatments:create', async (_, treatment) => {
  return await databaseService.createTreatment(treatment)
})

// Inventory IPC Handlers
ipcMain.handle('db:inventory:getAll', async () => {
  try {
    return await databaseService.getAllInventoryItems()
  } catch (error) {
    console.error('Error getting all inventory items:', error)
    throw error
  }
})

ipcMain.handle('db:inventory:create', async (_, item) => {
  try {
    console.log('Creating inventory item:', item)
    const result = await databaseService.createInventoryItem(item)
    console.log('Inventory item created successfully:', result.id)
    return result
  } catch (error) {
    console.error('Error creating inventory item:', error)
    throw error
  }
})

ipcMain.handle('db:inventory:update', async (_, id, item) => {
  try {
    console.log('Updating inventory item:', id, item)
    const result = await databaseService.updateInventoryItem(id, item)
    console.log('Inventory item updated successfully:', id)
    return result
  } catch (error) {
    console.error('Error updating inventory item:', error)
    throw error
  }
})

ipcMain.handle('db:inventory:delete', async (_, id) => {
  try {
    console.log('Deleting inventory item:', id)
    const result = await databaseService.deleteInventoryItem(id)
    console.log('Inventory item deleted successfully:', id)
    return result
  } catch (error) {
    console.error('Error deleting inventory item:', error)
    throw error
  }
})

// Backup IPC Handlers
ipcMain.handle('backup:create', async () => {
  return await backupService.createBackup()
})

ipcMain.handle('backup:restore', async (_, backupPath) => {
  return await backupService.restoreBackup(backupPath)
})

ipcMain.handle('backup:list', async () => {
  return await backupService.listBackups()
})

ipcMain.handle('backup:delete', async (_, backupName) => {
  return await backupService.deleteBackup(backupName)
})

// File Dialog Handlers
ipcMain.handle('dialog:showOpenDialog', async (_, options) => {
  const result = await dialog.showOpenDialog(mainWindow!, options)
  return result
})

ipcMain.handle('dialog:showSaveDialog', async (_, options) => {
  const result = await dialog.showSaveDialog(mainWindow!, options)
  return result
})

// Lab IPC Handlers
ipcMain.handle('db:labs:getAll', async () => {
  try {
    return await databaseService.getAllLabs()
  } catch (error) {
    console.error('Error getting all labs:', error)
    throw error
  }
})

ipcMain.handle('db:labs:create', async (_, lab) => {
  try {
    console.log('Creating lab:', lab)
    const result = await databaseService.createLab(lab)
    console.log('Lab created successfully:', result.id)
    return result
  } catch (error) {
    console.error('Error creating lab:', error)
    throw error
  }
})

ipcMain.handle('db:labs:update', async (_, id, lab) => {
  try {
    console.log('Updating lab:', id, lab)
    const result = await databaseService.updateLab(id, lab)
    console.log('Lab updated successfully:', id)
    return result
  } catch (error) {
    console.error('Error updating lab:', error)
    throw error
  }
})

ipcMain.handle('db:labs:delete', async (_, id) => {
  try {
    console.log('Deleting lab:', id)
    const result = await databaseService.deleteLab(id)
    console.log('Lab deleted successfully:', id)
    return result
  } catch (error) {
    console.error('Error deleting lab:', error)
    throw error
  }
})

ipcMain.handle('db:labs:search', async (_, query) => {
  try {
    return await databaseService.searchLabs(query)
  } catch (error) {
    console.error('Error searching labs:', error)
    throw error
  }
})

// Lab Order IPC Handlers
ipcMain.handle('db:labOrders:getAll', async () => {
  try {
    return await databaseService.getAllLabOrders()
  } catch (error) {
    console.error('Error getting all lab orders:', error)
    throw error
  }
})

ipcMain.handle('db:labOrders:create', async (_, labOrder) => {
  try {
    console.log('Creating lab order:', labOrder)
    const result = await databaseService.createLabOrder(labOrder)
    console.log('Lab order created successfully:', result.id)
    return result
  } catch (error) {
    console.error('Error creating lab order:', error)
    throw error
  }
})

ipcMain.handle('db:labOrders:update', async (_, id, labOrder) => {
  try {
    console.log('Updating lab order:', id, labOrder)
    const result = await databaseService.updateLabOrder(id, labOrder)
    console.log('Lab order updated successfully:', id)
    return result
  } catch (error) {
    console.error('Error updating lab order:', error)
    throw error
  }
})

ipcMain.handle('db:labOrders:delete', async (_, id) => {
  try {
    console.log('Deleting lab order:', id)
    const result = await databaseService.deleteLabOrder(id)
    console.log('Lab order deleted successfully:', id)
    return result
  } catch (error) {
    console.error('Error deleting lab order:', error)
    throw error
  }
})

ipcMain.handle('db:labOrders:search', async (_, query) => {
  try {
    return await databaseService.searchLabOrders(query)
  } catch (error) {
    console.error('Error searching lab orders:', error)
    throw error
  }
})

// Lab Monthly Balances IPC Handlers
ipcMain.handle('db:labMonthlyBalances:getAll', async () => {
  try {
    return await databaseService.getAllLabMonthlyBalances()
  } catch (error) {
    console.error('Error getting all lab monthly balances:', error)
    throw error
  }
})

ipcMain.handle('db:labMonthlyBalances:getByLab', async (_, labId) => {
  try {
    return await databaseService.getLabMonthlyBalancesByLab(labId)
  } catch (error) {
    console.error('Error getting lab monthly balances by lab:', error)
    throw error
  }
})

ipcMain.handle('db:labMonthlyBalances:getByLabAndMonth', async (_, labId, year, month) => {
  try {
    return await databaseService.getLabMonthlyBalanceByLabAndMonth(labId, year, month)
  } catch (error) {
    console.error('Error getting lab monthly balance by lab and month:', error)
    throw error
  }
})

ipcMain.handle('db:labMonthlyBalances:create', async (_, balance) => {
  try {
    console.log('Creating lab monthly balance:', balance)
    const result = await databaseService.createLabMonthlyBalance(balance)
    console.log('Lab monthly balance created successfully:', result.id)
    return result
  } catch (error) {
    console.error('Error creating lab monthly balance:', error)
    throw error
  }
})

ipcMain.handle('db:labMonthlyBalances:update', async (_, id, balance) => {
  try {
    console.log('Updating lab monthly balance:', id, balance)
    const result = await databaseService.updateLabMonthlyBalance(id, balance)
    console.log('Lab monthly balance updated successfully:', id)
    return result
  } catch (error) {
    console.error('Error updating lab monthly balance:', error)
    throw error
  }
})

ipcMain.handle('db:labMonthlyBalances:updateOrCreate', async (_, labId, year, month, data) => {
  try {
    console.log('Updating or creating lab monthly balance:', labId, year, month)
    const result = await databaseService.updateOrCreateLabMonthlyBalance(labId, year, month, data)
    console.log('Lab monthly balance updated or created successfully')
    return result
  } catch (error) {
    console.error('Error updating or creating lab monthly balance:', error)
    throw error
  }
})

ipcMain.handle('db:labMonthlyBalances:delete', async (_, id) => {
  try {
    console.log('Deleting lab monthly balance:', id)
    const result = await databaseService.deleteLabMonthlyBalance(id)
    console.log('Lab monthly balance deleted successfully:', id)
    return result
  } catch (error) {
    console.error('Error deleting lab monthly balance:', error)
    throw error
  }
})

// Medication IPC Handlers
ipcMain.handle('db:medications:getAll', async () => {
  try {
    return await databaseService.getAllMedications()
  } catch (error) {
    console.error('Error getting all medications:', error)
    throw error
  }
})

ipcMain.handle('db:medications:create', async (_, medication) => {
  try {
    console.log('Creating medication:', medication)
    const result = await databaseService.createMedication(medication)
    console.log('Medication created successfully:', result.id)
    return result
  } catch (error) {
    console.error('Error creating medication:', error)
    throw error
  }
})

ipcMain.handle('db:medications:update', async (_, id, medication) => {
  try {
    console.log('Updating medication:', id, medication)
    const result = await databaseService.updateMedication(id, medication)
    console.log('Medication updated successfully:', id)
    return result
  } catch (error) {
    console.error('Error updating medication:', error)
    throw error
  }
})

ipcMain.handle('db:medications:delete', async (_, id) => {
  try {
    console.log('Deleting medication:', id)
    const result = await databaseService.deleteMedication(id)
    console.log('Medication deleted successfully:', id)
    return result
  } catch (error) {
    console.error('Error deleting medication:', error)
    throw error
  }
})

ipcMain.handle('db:medications:search', async (_, query) => {
  try {
    return await databaseService.searchMedications(query)
  } catch (error) {
    console.error('Error searching medications:', error)
    throw error
  }
})

// Prescription IPC Handlers
ipcMain.handle('db:prescriptions:getAll', async () => {
  try {
    return await databaseService.getAllPrescriptions()
  } catch (error) {
    console.error('Error getting all prescriptions:', error)
    throw error
  }
})

ipcMain.handle('db:prescriptions:create', async (_, prescription) => {
  try {
    console.log('Creating prescription:', prescription)
    const result = await databaseService.createPrescription(prescription)
    console.log('Prescription created successfully:', result.id)
    return result
  } catch (error) {
    console.error('Error creating prescription:', error)
    throw error
  }
})

ipcMain.handle('db:prescriptions:update', async (_, id, prescription) => {
  try {
    console.log('Updating prescription:', id, prescription)
    const result = await databaseService.updatePrescription(id, prescription)
    console.log('Prescription updated successfully:', id)
    return result
  } catch (error) {
    console.error('Error updating prescription:', error)
    throw error
  }
})

ipcMain.handle('db:prescriptions:delete', async (_, id) => {
  try {
    console.log('Deleting prescription:', id)
    const result = await databaseService.deletePrescription(id)
    console.log('Prescription deleted successfully:', id)
    return result
  } catch (error) {
    console.error('Error deleting prescription:', error)
    throw error
  }
})

ipcMain.handle('db:prescriptions:getByPatient', async (_, patientId) => {
  try {
    return await databaseService.getPrescriptionsByPatient(patientId)
  } catch (error) {
    console.error('Error getting prescriptions by patient:', error)
    throw error
  }
})

ipcMain.handle('db:prescriptions:search', async (_, query) => {
  try {
    return await databaseService.searchPrescriptions(query)
  } catch (error) {
    console.error('Error searching prescriptions:', error)
    throw error
  }
})

// Search IPC Handlers
ipcMain.handle('db:appointments:search', async (_, query) => {
  try {
    return await databaseService.searchAppointments(query)
  } catch (error) {
    console.error('Error searching appointments:', error)
    throw error
  }
})

ipcMain.handle('db:treatments:search', async (_, query) => {
  try {
    return await databaseService.searchTreatments(query)
  } catch (error) {
    console.error('Error searching treatments:', error)
    throw error
  }
})

// Settings IPC Handlers
ipcMain.handle('settings:get', async () => {
  return await databaseService.getSettings()
})

ipcMain.handle('settings:update', async (_, settings) => {
  return await databaseService.updateSettings(settings)
})

// Reports IPC Handlers
ipcMain.handle('reports:generatePatientReport', async (_, filter) => {
  try {
    const patients = await databaseService.getAllPatients()
    const appointments = await databaseService.getAllAppointments()

    return await reportsService.generatePatientReport(patients, appointments, filter)
  } catch (error) {
    console.error('Error generating patient report:', error)
    throw error
  }
})

ipcMain.handle('reports:generateAppointmentReport', async (_, filter) => {
  try {
    const appointments = await databaseService.getAllAppointments()
    const treatments = await databaseService.getAllTreatments()

    return await reportsService.generateAppointmentReport(appointments, treatments, filter)
  } catch (error) {
    console.error('Error generating appointment report:', error)
    throw error
  }
})

ipcMain.handle('reports:generateFinancialReport', async (_, filter) => {
  try {
    const payments = await databaseService.getAllPayments()
    const treatments = await databaseService.getAllTreatments()
    const expenses = await databaseService.getAllClinicExpenses()

    return await reportsService.generateFinancialReport(payments, treatments, filter, expenses)
  } catch (error) {
    console.error('Error generating financial report:', error)
    throw error
  }
})

ipcMain.handle('reports:generateInventoryReport', async (_, filter) => {
  try {
    const inventory = await databaseService.getAllInventoryItems()
    const inventoryUsage = [] // TODO: Implement inventory usage tracking

    return await reportsService.generateInventoryReport(inventory, inventoryUsage, filter)
  } catch (error) {
    console.error('Error generating inventory report:', error)
    throw error
  }
})

ipcMain.handle('reports:generateTreatmentReport', async (_, filter) => {
  try {
    const toothTreatments = await databaseService.getAllToothTreatments()
    const treatments = await databaseService.getAllTreatments()

    return await reportsService.generateTreatmentReport(toothTreatments, treatments, filter)
  } catch (error) {
    console.error('Error generating treatment report:', error)
    throw error
  }
})

ipcMain.handle('reports:generateAnalyticsReport', async (_, filter) => {
  try {
    // TODO: Implement analytics report generation
    return {
      kpis: {
        patientGrowthRate: 15.5,
        revenueGrowthRate: 22.3,
        appointmentUtilization: 85.2,
        averageRevenuePerPatient: 450,
        patientRetentionRate: 78.9,
        appointmentNoShowRate: 12.1
      },
      trends: {
        patientTrend: [],
        revenueTrend: [],
        appointmentTrend: []
      },
      comparisons: {
        currentPeriod: {},
        previousPeriod: {},
        changePercentage: 0
      },
      predictions: {
        nextMonthRevenue: 25000,
        nextMonthAppointments: 120,
        confidence: 85
      }
    }
  } catch (error) {
    console.error('Error generating analytics report:', error)
    throw error
  }
})

ipcMain.handle('reports:generateOverviewReport', async (_, filter) => {
  try {
    const patients = await databaseService.getAllPatients()
    const appointments = await databaseService.getAllAppointments()
    const payments = await databaseService.getAllPayments()
    const treatments = await databaseService.getAllTreatments()
    const inventory = await databaseService.getAllInventoryItems()

    const expenses = await databaseService.getAllClinicExpenses()
    const [patientReport, appointmentReport, financialReport, inventoryReport] = await Promise.all([
      reportsService.generatePatientReport(patients, appointments, filter),
      reportsService.generateAppointmentReport(appointments, treatments, filter),
      reportsService.generateFinancialReport(payments, treatments, filter, expenses),
      reportsService.generateInventoryReport(inventory, [], filter)
    ])

    return {
      patients: patientReport,
      appointments: appointmentReport,
      financial: financialReport,
      inventory: inventoryReport,
      generatedAt: new Date().toISOString(),
      filter
    }
  } catch (error) {
    console.error('Error generating overview report:', error)
    throw error
  }
})

ipcMain.handle('reports:exportReport', async (_, type, filter, options) => {
  try {
    const { dialog } = require('electron')

    // Get report data based on type
    let reportData
    switch (type) {
      case 'patients':
        reportData = await reportsService.generatePatientReport(
          await databaseService.getAllPatients(),
          await databaseService.getAllAppointments(),
          filter
        )
        break
      case 'appointments':
        reportData = await reportsService.generateAppointmentReport(
          await databaseService.getAllAppointments(),
          await databaseService.getAllTreatments(),
          filter
        )
        break
      case 'financial':
        reportData = await reportsService.generateFinancialReport(
          await databaseService.getAllPayments(),
          await databaseService.getAllTreatments(),
          filter
        )
        break
      case 'inventory':
        reportData = await reportsService.generateInventoryReport(
          await databaseService.getAllInventoryItems(),
          [],
          filter
        )
        break
      case 'overview':
        const [patients, appointments, payments, treatments, inventory] = await Promise.all([
          databaseService.getAllPatients(),
          databaseService.getAllAppointments(),
          databaseService.getAllPayments(),
          databaseService.getAllTreatments(),
          databaseService.getAllInventoryItems()
        ])

        const expenses = await databaseService.getAllClinicExpenses()
        reportData = {
          patients: await reportsService.generatePatientReport(patients, appointments, filter),
          appointments: await reportsService.generateAppointmentReport(appointments, treatments, filter),
          financial: await reportsService.generateFinancialReport(payments, treatments, filter, expenses),
          inventory: await reportsService.generateInventoryReport(inventory, [], filter)
        }
        break
      default:
        throw new Error(`Unsupported report type: ${type}`)
    }

    // Show save dialog
    const fileExtensions = {
      pdf: 'pdf',
      excel: 'xlsx',
      csv: 'csv'
    }

    const extension = fileExtensions[options.format as keyof typeof fileExtensions]
    const defaultFileName = `${type}_report_${new Date().toISOString().split('T')[0]}.${extension}`

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'حفظ التقرير',
      defaultPath: defaultFileName,
      filters: [
        { name: `${options.format.toUpperCase()} Files`, extensions: [extension] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return { success: false, message: 'تم إلغاء العملية' }
    }

    // Export the report
    const ExportService = require('../src/services/exportService').ExportService
    const fileName = await ExportService.exportReport(type, reportData, {
      ...options,
      filePath: result.filePath
    })

    return {
      success: true,
      message: 'تم تصدير التقرير بنجاح',
      filePath: result.filePath
    }
  } catch (error) {
    console.error('Error exporting report:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'فشل في تصدير التقرير'
    }
  }
})



// Dental Treatment Images IPC Handlers
ipcMain.handle('db:dentalTreatmentImages:getAll', async () => {
  try {
    return await databaseService.getAllDentalTreatmentImages()
  } catch (error) {
    console.error('Error getting all dental treatment images:', error)
    throw error
  }
})

ipcMain.handle('db:dentalTreatmentImages:getByTreatment', async (_, treatmentId) => {
  try {
    return await databaseService.getDentalTreatmentImagesByTreatment(treatmentId)
  } catch (error) {
    console.error('Error getting dental treatment images by treatment:', error)
    throw error
  }
})

ipcMain.handle('db:dentalTreatmentImages:create', async (_, imageData) => {
  try {
    console.log('Creating dental treatment image:', imageData)
    const result = await databaseService.createDentalTreatmentImage(imageData)
    console.log('Dental treatment image created successfully:', result.id)
    return result
  } catch (error) {
    console.error('Error creating dental treatment image:', error)
    throw error
  }
})

ipcMain.handle('db:dentalTreatmentImages:delete', async (_, id) => {
  try {
    console.log('Deleting dental treatment image:', id)

    // First get the image record to find the file path
    const imageRecord = databaseService.db.prepare('SELECT * FROM dental_treatment_images WHERE id = ?').get(id)
    console.log('Image record to delete:', imageRecord)

    if (imageRecord && imageRecord.image_path) {
      // Try to delete the physical file
      try {
        const fs = require('fs')
        const path = require('path')

        console.log('Attempting to delete image file:', imageRecord.image_path)

        let fileDeleted = false

        // Check if image_path is a directory path (new format: dental_images/patient_id/tooth_number/image_type/)
        if (imageRecord.image_path.endsWith('/')) {
          console.log('Directory path detected, searching for images to delete in:', imageRecord.image_path)

          // Search for images in the directory and delete them
          const searchPaths = [
            path.join(app.getPath('userData'), imageRecord.image_path),
            path.join(__dirname, '..', 'public', 'upload', imageRecord.image_path)
          ]

          for (const searchPath of searchPaths) {
            if (fs.existsSync(searchPath)) {
              try {
                const files = fs.readdirSync(searchPath)
                const imageFiles = files.filter(file => {
                  const ext = path.extname(file).toLowerCase()
                  return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)
                })

                for (const imageFile of imageFiles) {
                  const fullImagePath = path.join(searchPath, imageFile)
                  fs.unlinkSync(fullImagePath)
                  console.log('✅ Physical image file deleted:', fullImagePath)
                  fileDeleted = true
                }
              } catch (dirError) {
                console.warn('Error deleting images from directory:', searchPath, dirError.message)
              }
            }
          }
        } else {
          // Legacy handling for full file paths
          const possiblePaths = [
            path.join(app.getPath('userData'), imageRecord.image_path),
            path.join(__dirname, '..', 'public', 'upload', imageRecord.image_path),
            path.isAbsolute(imageRecord.image_path) ? imageRecord.image_path : null
          ].filter(Boolean)

          for (const fullPath of possiblePaths) {
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath)
              console.log('✅ Physical image file deleted:', fullPath)
              fileDeleted = true
              break
            }
          }
        }

        if (!fileDeleted) {
          console.warn('⚠️ Physical image file not found at any location:', imageRecord.image_path)
        }
      } catch (fileError) {
        console.error('❌ Error deleting physical image file:', fileError.message)
        console.error('File path was:', imageRecord.image_path)
        // Continue with database deletion even if file deletion fails
      }
    } else {
      console.warn('⚠️ No image record found or no image_path for ID:', id)
    }

    // Delete from database
    const result = await databaseService.deleteDentalTreatmentImage(id)
    console.log('Dental treatment image deleted successfully:', id)
    return result
  } catch (error) {
    console.error('Error deleting dental treatment image:', error)
    throw error
  }
})

// File Upload Handler for Dental Images
ipcMain.handle('files:uploadDentalImage', async (_, fileBuffer, fileName, patientId, toothNumber, imageType, patientName, toothName) => {
  try {
    console.log('Uploading dental image:', { fileName, patientId, toothNumber, imageType, patientName, toothName, bufferSize: fileBuffer.byteLength })

    const fs = require('fs')
    const path = require('path')

    // Validate required parameters
    if (!patientId || !toothNumber || !imageType) {
      throw new Error('Missing required parameters: patientId, toothNumber, or imageType')
    }

    // Validate tooth number (FDI numbering system)
    const isValidToothNumber = (
      (toothNumber >= 11 && toothNumber <= 18) ||
      (toothNumber >= 21 && toothNumber <= 28) ||
      (toothNumber >= 31 && toothNumber <= 38) ||
      (toothNumber >= 41 && toothNumber <= 48) ||
      (toothNumber >= 51 && toothNumber <= 55) ||
      (toothNumber >= 61 && toothNumber <= 65) ||
      (toothNumber >= 71 && toothNumber <= 75) ||
      (toothNumber >= 81 && toothNumber <= 85)
    )

    if (!isValidToothNumber) {
      throw new Error('Invalid tooth number. Must be a valid FDI tooth number (11-18, 21-28, 31-38, 41-48, 51-55, 61-65, 71-75, 81-85)')
    }

    // Validate image type
    const validImageTypes = ['before', 'after', 'xray', 'clinical', 'other']
    if (!validImageTypes.includes(imageType)) {
      throw new Error(`Invalid image type. Must be one of: ${validImageTypes.join(', ')}`)
    }

    // Create upload directory organized by patient_id/tooth_number/image_type
    const uploadDir = path.join(app.getPath('userData'), 'dental_images', patientId, toothNumber.toString(), imageType)
    console.log('Upload directory:', uploadDir)

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
      console.log('Created upload directory:', uploadDir)
    }

    // Generate meaningful filename with original name and timestamp
    const extension = path.extname(fileName) || '.jpg'
    const timestamp = Date.now()
    const baseName = path.basename(fileName, extension)

    // Clean filename to remove invalid characters
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9\u0600-\u06FF\s\-_]/g, '').replace(/\s+/g, '_')

    // Create filename: originalname-timestamp.extension
    const meaningfulFileName = `${cleanBaseName || 'image'}-${timestamp}${extension}`
    const filePath = path.join(uploadDir, meaningfulFileName)

    console.log('Saving file to:', filePath)
    console.log('Generated filename:', meaningfulFileName)
    console.log('Patient ID:', patientId)
    console.log('Tooth number:', toothNumber)
    console.log('Image type:', imageType)

    // Convert ArrayBuffer to Buffer and write file to disk
    const buffer = Buffer.from(fileBuffer)
    fs.writeFileSync(filePath, buffer)

    // Return relative path for database storage (WITH filename)
    const relativePath = `dental_images/${patientId}/${toothNumber}/${imageType}/${meaningfulFileName}`
    console.log('Dental image uploaded successfully:', relativePath)

    return relativePath
  } catch (error) {
    console.error('Error uploading dental image:', error)
    throw error
  }
})

// Alternative simpler upload handler (fallback for base64 data)
ipcMain.handle('files:saveDentalImage', async (_, base64Data, fileName, patientId, toothNumber, imageType, patientName, toothName) => {
  try {
    console.log('Saving dental image (base64):', { fileName, patientId, toothNumber, imageType, patientName, toothName })

    const fs = require('fs')
    const path = require('path')

    // Validate required parameters
    if (!patientId || !toothNumber || !imageType) {
      throw new Error('Missing required parameters: patientId, toothNumber, or imageType')
    }

    // Validate tooth number (FDI numbering system)
    const isValidToothNumber = (
      (toothNumber >= 11 && toothNumber <= 18) ||
      (toothNumber >= 21 && toothNumber <= 28) ||
      (toothNumber >= 31 && toothNumber <= 38) ||
      (toothNumber >= 41 && toothNumber <= 48) ||
      (toothNumber >= 51 && toothNumber <= 55) ||
      (toothNumber >= 61 && toothNumber <= 65) ||
      (toothNumber >= 71 && toothNumber <= 75) ||
      (toothNumber >= 81 && toothNumber <= 85)
    )

    if (!isValidToothNumber) {
      throw new Error('Invalid tooth number. Must be a valid FDI tooth number (11-18, 21-28, 31-38, 41-48, 51-55, 61-65, 71-75, 81-85)')
    }

    // Validate image type
    const validImageTypes = ['before', 'after', 'xray', 'clinical', 'other']
    if (!validImageTypes.includes(imageType)) {
      throw new Error(`Invalid image type. Must be one of: ${validImageTypes.join(', ')}`)
    }

    // Create upload directory organized by patient_id/tooth_number/image_type in public/upload (fallback)
    const uploadDir = path.join(__dirname, '..', 'public', 'upload', 'dental_images', patientId, toothNumber.toString(), imageType)
    console.log('Upload directory (fallback):', uploadDir)

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
      console.log('Created upload directory:', uploadDir)
    }

    // Generate meaningful filename with original name and timestamp
    const extension = path.extname(fileName) || '.jpg'
    const timestamp = Date.now()
    const baseName = path.basename(fileName, extension)

    // Clean filename to remove invalid characters
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9\u0600-\u06FF\s\-_]/g, '').replace(/\s+/g, '_')

    // Create filename: originalname-timestamp.extension
    const meaningfulFileName = `${cleanBaseName || 'image'}-${timestamp}${extension}`
    const filePath = path.join(uploadDir, meaningfulFileName)

    console.log('Saving file to (fallback):', filePath)
    console.log('Generated filename:', meaningfulFileName)
    console.log('Patient ID:', patientId)
    console.log('Tooth number:', toothNumber)
    console.log('Image type:', imageType)

    // Remove data URL prefix if present
    const base64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '')

    // Write file to disk
    fs.writeFileSync(filePath, base64, 'base64')

    // Return relative path for database storage (WITH filename)
    const relativePath = `dental_images/${patientId}/${toothNumber}/${imageType}/${meaningfulFileName}`
    console.log('Dental image saved successfully:', relativePath)

    return relativePath
  } catch (error) {
    console.error('Error saving dental image:', error)
    throw error
  }
})

// File serving IPC Handlers
ipcMain.handle('files:getDentalImage', async (_, imagePath) => {
  try {
    console.log('Getting dental image:', imagePath)
    const fs = require('fs')
    const path = require('path')

    // Helper function to load and return image
    const loadImage = (fullPath: string) => {
      const imageBuffer = fs.readFileSync(fullPath)
      const mimeType = getMimeType(path.extname(fullPath))
      const base64 = imageBuffer.toString('base64')
      return `data:${mimeType};base64,${base64}`
    }

    // Check if imagePath is a directory path (new format: dental_images/patient_id/tooth_number/image_type/)
    if (imagePath.endsWith('/')) {
      console.log('Directory path detected, searching for images in:', imagePath)

      // Search for images in the directory
      const searchPaths = [
        path.join(app.getPath('userData'), imagePath),
        path.join(__dirname, '..', 'public', 'upload', imagePath)
      ]

      for (const searchPath of searchPaths) {
        if (fs.existsSync(searchPath)) {
          console.log('Searching in directory:', searchPath)

          try {
            const files = fs.readdirSync(searchPath)
            const imageFiles = files.filter(file => {
              const ext = path.extname(file).toLowerCase()
              return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)
            })

            if (imageFiles.length > 0) {
              // Return the first image found (or you could return the most recent)
              const imageFile = imageFiles.sort().reverse()[0] // Get most recent by name
              const fullImagePath = path.join(searchPath, imageFile)
              console.log('Found image in directory:', fullImagePath)
              return loadImage(fullImagePath)
            }
          } catch (dirError) {
            console.warn('Error reading directory:', searchPath, dirError.message)
          }
        }
      }
    } else {
      // Legacy handling for full file paths
      const possiblePaths = [
        // 1. New structure: userData/dental_images/patient_id/tooth_number/image_type/filename
        path.join(app.getPath('userData'), imagePath),

        // 2. Fallback structure: public/upload/dental_images/patient_id/tooth_number/image_type/filename
        path.join(__dirname, '..', 'public', 'upload', imagePath),

        // 3. Direct absolute path
        path.isAbsolute(imagePath) ? imagePath : null
      ].filter(Boolean) // Remove null values

      // Try each path until we find the image
      for (const fullPath of possiblePaths) {
        if (fs.existsSync(fullPath)) {
          console.log('Found image at path:', fullPath)
          return loadImage(fullPath)
        }
      }
    }

    // If not found in standard locations, try to search for any image by directory or filename
    const searchPaths = [
      path.join(app.getPath('userData'), 'dental_images'),
      path.join(__dirname, '..', 'public', 'upload', 'dental_images')
    ]

    // Extract directory path if it's a directory format
    let searchDir = imagePath
    if (imagePath.endsWith('/')) {
      searchDir = imagePath.slice(0, -1) // Remove trailing slash
    } else {
      searchDir = path.dirname(imagePath)
    }

    for (const basePath of searchPaths) {
      const fullSearchPath = path.join(basePath, searchDir)
      if (fs.existsSync(fullSearchPath)) {
        try {
          const files = fs.readdirSync(fullSearchPath)
          const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase()
            return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)
          })

          if (imageFiles.length > 0) {
            const imageFile = imageFiles.sort().reverse()[0] // Get most recent by name
            const fullImagePath = path.join(fullSearchPath, imageFile)
            console.log('Found image by directory search:', fullImagePath)
            return loadImage(fullImagePath)
          }
        } catch (dirError) {
          console.warn('Error searching directory:', fullSearchPath, dirError.message)
        }
      }
    }

    console.warn('Image not found at any path:', imagePath)
    throw new Error(`Image not found: ${imagePath}`)
  } catch (error) {
    console.error('Error getting dental image:', error)
    throw error
  }
})

// Helper function to recursively search for a file
function findFileRecursively(dir: string, fileName: string): string[] {
  const fs = require('fs')
  const path = require('path')
  const results: string[] = []

  try {
    const items = fs.readdirSync(dir)
    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        results.push(...findFileRecursively(fullPath, fileName))
      } else if (item === fileName) {
        results.push(fullPath)
      }
    }
  } catch (error) {
    // Ignore errors (e.g., permission denied)
  }

  return results
}

// Helper function to get MIME type
function getMimeType(extension: string): string {
  const mimeTypes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.webp': 'image/webp'
  }
  return mimeTypes[extension.toLowerCase()] || 'image/jpeg'
}

// Check if image exists
ipcMain.handle('files:checkImageExists', async (_, imagePath) => {
  try {
    const fs = require('fs')
    const path = require('path')

    // Check if imagePath is a directory path (new format: dental_images/patient_id/tooth_number/image_type/)
    if (imagePath.endsWith('/')) {
      // Search for any images in the directory
      const searchPaths = [
        path.join(app.getPath('userData'), imagePath),
        path.join(__dirname, '..', 'public', 'upload', imagePath)
      ]

      for (const searchPath of searchPaths) {
        if (fs.existsSync(searchPath)) {
          try {
            const files = fs.readdirSync(searchPath)
            const imageFiles = files.filter(file => {
              const ext = path.extname(file).toLowerCase()
              return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)
            })

            if (imageFiles.length > 0) {
              return true
            }
          } catch (dirError) {
            // Continue to next path
          }
        }
      }
    } else {
      // Legacy handling for full file paths
      const possiblePaths = [
        path.join(app.getPath('userData'), imagePath),
        path.join(__dirname, '..', 'public', 'upload', imagePath),
        path.isAbsolute(imagePath) ? imagePath : null
      ].filter(Boolean)

      for (const fullPath of possiblePaths) {
        if (fs.existsSync(fullPath)) {
          return true
        }
      }
    }

    // If not found in standard locations, try to search for any image by directory
    const searchPaths = [
      path.join(app.getPath('userData'), 'dental_images'),
      path.join(__dirname, '..', 'public', 'upload', 'dental_images')
    ]

    let searchDir = imagePath
    if (imagePath.endsWith('/')) {
      searchDir = imagePath.slice(0, -1)
    } else {
      searchDir = path.dirname(imagePath)
    }

    for (const basePath of searchPaths) {
      const fullSearchPath = path.join(basePath, searchDir)
      if (fs.existsSync(fullSearchPath)) {
        try {
          const files = fs.readdirSync(fullSearchPath)
          const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase()
            return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)
          })

          if (imageFiles.length > 0) {
            return true
          }
        } catch (dirError) {
          // Continue to next path
        }
      }
    }

    return false
  } catch (error) {
    console.error('Error checking image exists:', error)
    return false
  }
})

// Image preview handler
ipcMain.handle('files:openImagePreview', async (_, imagePath) => {
  try {
    console.log('Opening image preview for:', imagePath)
    const { shell } = require('electron')
    const fs = require('fs')
    const path = require('path')

    // Helper function to find the actual image path
    const findImagePath = (imagePath: string) => {
      // If it's a directory path, find the first image in it
      if (!path.extname(imagePath) || imagePath.endsWith('/')) {
        // Check if we're in development mode
        const isDevelopment = process.env.NODE_ENV === 'development' ||
                             process.execPath.includes('node') ||
                             process.execPath.includes('electron') ||
                             process.cwd().includes('dental-clinic')

        let baseDir
        if (isDevelopment) {
          // Development: use project directory
          baseDir = process.cwd()
        } else {
          // Production: use app directory
          baseDir = path.dirname(process.execPath)
        }

        const searchPaths = [
          // 1. Project directory (development/production)
          path.join(baseDir, imagePath.endsWith('/') ? imagePath : imagePath + '/'),
          // 2. User data directory
          path.join(app.getPath('userData'), imagePath.endsWith('/') ? imagePath : imagePath + '/'),
          // 3. Public upload directory
          path.join(__dirname, '..', 'public', 'upload', imagePath.endsWith('/') ? imagePath : imagePath + '/')
        ]

        console.log('Searching for images in paths:', searchPaths)

        for (const searchPath of searchPaths) {
          if (fs.existsSync(searchPath)) {
            try {
              const files = fs.readdirSync(searchPath)
              const imageFiles = files.filter(file => {
                const ext = path.extname(file).toLowerCase()
                return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)
              })

              if (imageFiles.length > 0) {
                // Return the first image found (or you could return the most recent)
                const imageFile = imageFiles.sort().reverse()[0] // Get most recent by name
                const fullImagePath = path.join(searchPath, imageFile)
                console.log('Found image:', fullImagePath)
                return fullImagePath
              }
            } catch (dirError) {
              console.warn('Error reading directory:', searchPath, dirError.message)
            }
          } else {
            console.log('Directory does not exist:', searchPath)
          }
        }
      } else {
        // Legacy handling for full file paths
        const possiblePaths = [
          // 1. Project directory
          path.join(process.cwd(), imagePath),
          // 2. New structure: userData/dental_images/patient_id/tooth_number/image_type/filename
          path.join(app.getPath('userData'), imagePath),
          // 3. Fallback structure: public/upload/dental_images/patient_id/tooth_number/image_type/filename
          path.join(__dirname, '..', 'public', 'upload', imagePath),
          // 4. Direct absolute path
          path.isAbsolute(imagePath) ? imagePath : null
        ].filter(Boolean) // Remove null values

        // Try each path until we find the image
        for (const fullPath of possiblePaths) {
          if (fs.existsSync(fullPath)) {
            return fullPath
          }
        }
      }

      return null
    }

    const actualImagePath = findImagePath(imagePath)

    if (actualImagePath && fs.existsSync(actualImagePath)) {
      console.log('Opening image at path:', actualImagePath)
      await shell.openPath(actualImagePath)
    } else {
      console.error('Image not found for preview:', imagePath)
      throw new Error(`Image not found: ${imagePath}`)
    }
  } catch (error) {
    console.error('Error opening image preview:', error)
    throw error
  }
})

// NEW: Tooth Treatments IPC Handlers
ipcMain.handle('db:toothTreatments:getAll', async () => {
  try {
    if (databaseService) {
      return await databaseService.getAllToothTreatments()
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting all tooth treatments:', error)
    throw error
  }
})

ipcMain.handle('db:toothTreatments:getByPatient', async (_, patientId) => {
  try {
    if (databaseService) {
      return await databaseService.getToothTreatmentsByPatient(patientId)
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting tooth treatments by patient:', error)
    throw error
  }
})

ipcMain.handle('db:toothTreatments:getByTooth', async (_, patientId, toothNumber) => {
  try {
    if (databaseService) {
      return await databaseService.getToothTreatmentsByTooth(patientId, toothNumber)
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting tooth treatments by tooth:', error)
    throw error
  }
})

ipcMain.handle('db:toothTreatments:getByAppointment', async (_, appointmentId) => {
  try {
    if (databaseService) {
      return await databaseService.getToothTreatmentsByAppointment(appointmentId)
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting tooth treatments by appointment:', error)
    throw error
  }
})

ipcMain.handle('db:toothTreatments:create', async (_, treatment) => {
  try {
    if (databaseService) {
      console.log('Creating tooth treatment:', treatment)
      const result = await databaseService.createToothTreatment(treatment)
      console.log('Tooth treatment created successfully:', result.id)
      return result
    } else {
      console.log('Creating tooth treatment (mock):', treatment)
      return { ...treatment, id: 'mock-id', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    }
  } catch (error) {
    console.error('Error creating tooth treatment:', error)
    throw error
  }
})

ipcMain.handle('db:toothTreatments:update', async (_, id, treatment) => {
  try {
    if (databaseService) {
      console.log('Updating tooth treatment:', id, treatment)
      await databaseService.updateToothTreatment(id, treatment)
      console.log('Tooth treatment updated successfully:', id)
      return true
    } else {
      console.log('Updating tooth treatment (mock):', id, treatment)
      return true
    }
  } catch (error) {
    console.error('Error updating tooth treatment:', error)
    throw error
  }
})

ipcMain.handle('db:toothTreatments:delete', async (_, id) => {
  try {
    if (databaseService) {
      console.log('Deleting tooth treatment:', id)
      await databaseService.deleteToothTreatment(id)
      console.log('Tooth treatment deleted successfully:', id)
      return true
    } else {
      console.log('Deleting tooth treatment (mock):', id)
      return true
    }
  } catch (error) {
    console.error('Error deleting tooth treatment:', error)
    throw error
  }
})

ipcMain.handle('db:toothTreatments:reorder', async (_, patientId, toothNumber, treatmentIds) => {
  try {
    if (databaseService) {
      console.log('Reordering tooth treatments:', patientId, toothNumber, treatmentIds)
      await databaseService.reorderToothTreatments(patientId, toothNumber, treatmentIds)
      console.log('Tooth treatments reordered successfully')
      return true
    } else {
      console.log('Reordering tooth treatments (mock):', patientId, toothNumber, treatmentIds)
      return true
    }
  } catch (error) {
    console.error('Error reordering tooth treatments:', error)
    throw error
  }
})

// NEW: Tooth Treatment Images IPC Handlers
ipcMain.handle('db:toothTreatmentImages:getAll', async () => {
  try {
    if (databaseService) {
      return await databaseService.getAllToothTreatmentImages()
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting all tooth treatment images:', error)
    throw error
  }
})

ipcMain.handle('db:toothTreatmentImages:getByTreatment', async (_, treatmentId) => {
  try {
    if (databaseService) {
      return await databaseService.getToothTreatmentImagesByTreatment(treatmentId)
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting tooth treatment images by treatment:', error)
    throw error
  }
})

ipcMain.handle('db:toothTreatmentImages:getByTooth', async (_, patientId, toothNumber) => {
  try {
    if (databaseService) {
      return await databaseService.getToothTreatmentImagesByTooth(patientId, toothNumber)
    } else {
      return []
    }
  } catch (error) {
    console.error('Error getting tooth treatment images by tooth:', error)
    throw error
  }
})

ipcMain.handle('db:toothTreatmentImages:create', async (_, image) => {
  try {
    if (databaseService) {
      console.log('Creating tooth treatment image:', image)
      const result = await databaseService.createToothTreatmentImage(image)
      console.log('Tooth treatment image created successfully:', result.id)
      return result
    } else {
      console.log('Creating tooth treatment image (mock):', image)
      return { ...image, id: 'mock-id', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    }
  } catch (error) {
    console.error('Error creating tooth treatment image:', error)
    throw error
  }
})

ipcMain.handle('db:toothTreatmentImages:delete', async (_, id) => {
  try {
    if (databaseService) {
      console.log('Deleting tooth treatment image:', id)

      // First get the image record to find the file path
      const imageRecord = databaseService.db.prepare('SELECT * FROM tooth_treatment_images WHERE id = ?').get(id)
      console.log('Tooth treatment image record to delete:', imageRecord)

      if (imageRecord && imageRecord.image_path) {
        // Try to delete the physical file
        try {
          const fs = require('fs')
          const path = require('path')

          console.log('Attempting to delete tooth treatment image file:', imageRecord.image_path)

          let fileDeleted = false

          // Check if image_path is a directory path (new format: dental_images/patient_id/tooth_number/image_type/)
          if (imageRecord.image_path.endsWith('/')) {
            console.log('Directory path detected, searching for images to delete in:', imageRecord.image_path)

            // Search for images in the directory and delete them
            const searchPaths = [
              path.join(app.getPath('userData'), imageRecord.image_path),
              path.join(__dirname, '..', 'public', 'upload', imageRecord.image_path)
            ]

            for (const searchPath of searchPaths) {
              if (fs.existsSync(searchPath)) {
                try {
                  const files = fs.readdirSync(searchPath)
                  const imageFiles = files.filter(file => {
                    const ext = path.extname(file).toLowerCase()
                    return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)
                  })

                  console.log(`Found ${imageFiles.length} tooth treatment image(s) to delete in directory:`, searchPath)
                  for (const imageFile of imageFiles) {
                    const fullImagePath = path.join(searchPath, imageFile)
                    fs.unlinkSync(fullImagePath)
                    console.log('✅ Physical tooth treatment image file deleted:', fullImagePath)
                    fileDeleted = true
                  }
                  console.log(`✅ Successfully deleted ${imageFiles.length} tooth treatment image(s) from directory`)
                } catch (dirError) {
                  console.warn('Error deleting tooth treatment images from directory:', searchPath, dirError.message)
                }
              }
            }
          } else {
            // Direct file path (old format)
            const searchPaths = [
              path.join(app.getPath('userData'), imageRecord.image_path),
              path.join(__dirname, '..', 'public', 'upload', imageRecord.image_path)
            ]

            for (const searchPath of searchPaths) {
              if (fs.existsSync(searchPath)) {
                fs.unlinkSync(searchPath)
                console.log('✅ Physical tooth treatment image file deleted:', searchPath)
                fileDeleted = true
                break
              }
            }
          }

          if (!fileDeleted) {
            console.warn('⚠️ Physical tooth treatment image file not found or already deleted:', imageRecord.image_path)
          }
        } catch (fileError) {
          console.error('❌ Error deleting physical tooth treatment image file:', fileError.message)
          console.error('File path was:', imageRecord.image_path)
          // Continue with database deletion even if file deletion fails
        }
      } else {
        console.warn('⚠️ No tooth treatment image record found or no image_path for ID:', id)
      }

      // Delete from database
      await databaseService.deleteToothTreatmentImage(id)
      console.log('Tooth treatment image deleted successfully:', id)
      return true
    } else {
      console.log('Deleting tooth treatment image (mock):', id)
      return true
    }
  } catch (error) {
    console.error('Error deleting tooth treatment image:', error)
    throw error
  }
})
