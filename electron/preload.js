const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Patient operations
  patients: {
    getAll: () => ipcRenderer.invoke('db:patients:getAll'),
    getById: (id) => ipcRenderer.invoke('db:patients:getById', id),
    create: (patient) => ipcRenderer.invoke('db:patients:create', patient),
    update: (id, patient) => ipcRenderer.invoke('db:patients:update', id, patient),
    delete: (id) => ipcRenderer.invoke('db:patients:delete', id),
    search: (query) => ipcRenderer.invoke('db:patients:search', query)
  },

  // Appointment operations
  appointments: {
    getAll: () => ipcRenderer.invoke('db:appointments:getAll'),
    getByPatient: (patientId) => ipcRenderer.invoke('db:appointments:getByPatient', patientId),
    create: (appointment) => ipcRenderer.invoke('db:appointments:create', appointment),
    update: (id, appointment) => ipcRenderer.invoke('db:appointments:update', id, appointment),
    delete: (id) => ipcRenderer.invoke('db:appointments:delete', id),
    checkConflict: (startTime, endTime, excludeId) => ipcRenderer.invoke('db:appointments:checkConflict', startTime, endTime, excludeId),
    search: (query) => ipcRenderer.invoke('db:appointments:search', query)
  },

  // Payment operations
  payments: {
    getAll: () => ipcRenderer.invoke('db:payments:getAll'),
    getByPatient: (patientId) => ipcRenderer.invoke('db:payments:getByPatient', patientId),
    create: (payment) => ipcRenderer.invoke('db:payments:create', payment),
    update: (id, payment) => ipcRenderer.invoke('db:payments:update', id, payment),
    delete: (id) => ipcRenderer.invoke('db:payments:delete', id),
    search: (query) => ipcRenderer.invoke('db:payments:search', query),
    getByToothTreatment: (toothTreatmentId) => ipcRenderer.invoke('db:payments:getByToothTreatment', toothTreatmentId),
    getToothTreatmentSummary: (toothTreatmentId) => ipcRenderer.invoke('db:payments:getToothTreatmentSummary', toothTreatmentId)
  },

  // Treatment operations
  treatments: {
    getAll: () => ipcRenderer.invoke('db:treatments:getAll'),
    create: (treatment) => ipcRenderer.invoke('db:treatments:create', treatment),
    update: (id, treatment) => ipcRenderer.invoke('db:treatments:update', id, treatment),
    delete: (id) => ipcRenderer.invoke('db:treatments:delete', id),
    search: (query) => ipcRenderer.invoke('db:treatments:search', query)
  },

  // Inventory operations
  inventory: {
    getAll: () => ipcRenderer.invoke('db:inventory:getAll'),
    create: (item) => ipcRenderer.invoke('db:inventory:create', item),
    update: (id, item) => ipcRenderer.invoke('db:inventory:update', id, item),
    delete: (id) => ipcRenderer.invoke('db:inventory:delete', id),
    search: (query) => ipcRenderer.invoke('db:inventory:search', query)
  },

  // Inventory usage operations
  inventoryUsage: {
    getAll: () => ipcRenderer.invoke('db:inventoryUsage:getAll'),
    create: (usage) => ipcRenderer.invoke('db:inventoryUsage:create', usage),
    getByItem: (itemId) => ipcRenderer.invoke('db:inventoryUsage:getByItem', itemId),
    getByAppointment: (appointmentId) => ipcRenderer.invoke('db:inventoryUsage:getByAppointment', appointmentId)
  },

  // Settings operations
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings) => ipcRenderer.invoke('settings:update', settings)
  },

  // Lab operations
  labs: {
    getAll: () => ipcRenderer.invoke('db:labs:getAll'),
    create: (lab) => ipcRenderer.invoke('db:labs:create', lab),
    update: (id, lab) => ipcRenderer.invoke('db:labs:update', id, lab),
    delete: (id) => ipcRenderer.invoke('db:labs:delete', id),
    search: (query) => ipcRenderer.invoke('db:labs:search', query)
  },

  // Lab Order operations
  labOrders: {
    getAll: () => ipcRenderer.invoke('db:labOrders:getAll'),
    getByPatient: (patientId) => ipcRenderer.invoke('db:labOrders:getByPatient', patientId),
    create: (labOrder) => ipcRenderer.invoke('db:labOrders:create', labOrder),
    update: (id, labOrder) => ipcRenderer.invoke('db:labOrders:update', id, labOrder),
    delete: (id) => ipcRenderer.invoke('db:labOrders:delete', id),
    search: (query) => ipcRenderer.invoke('db:labOrders:search', query)
  },

  // Medication operations
  medications: {
    getAll: () => ipcRenderer.invoke('db:medications:getAll'),
    create: (medication) => ipcRenderer.invoke('db:medications:create', medication),
    update: (id, medication) => ipcRenderer.invoke('db:medications:update', id, medication),
    delete: (id) => ipcRenderer.invoke('db:medications:delete', id),
    search: (query) => ipcRenderer.invoke('db:medications:search', query)
  },

  // Prescription operations
  prescriptions: {
    getAll: () => ipcRenderer.invoke('db:prescriptions:getAll'),
    create: (prescription) => ipcRenderer.invoke('db:prescriptions:create', prescription),
    update: (id, prescription) => ipcRenderer.invoke('db:prescriptions:update', id, prescription),
    delete: (id) => ipcRenderer.invoke('db:prescriptions:delete', id),
    getByPatient: (patientId) => ipcRenderer.invoke('db:prescriptions:getByPatient', patientId),
    search: (query) => ipcRenderer.invoke('db:prescriptions:search', query)
  },

  // Dental Treatment operations
  dentalTreatments: {
    getAll: () => ipcRenderer.invoke('db:dentalTreatments:getAll'),
    getByPatient: (patientId) => ipcRenderer.invoke('db:dentalTreatments:getByPatient', patientId),
    getByTooth: (patientId, toothNumber) => ipcRenderer.invoke('db:dentalTreatments:getByTooth', patientId, toothNumber),
    create: (treatment) => ipcRenderer.invoke('db:dentalTreatments:create', treatment),
    update: (id, treatment) => ipcRenderer.invoke('db:dentalTreatments:update', id, treatment),
    delete: (id) => ipcRenderer.invoke('db:dentalTreatments:delete', id)
  },

  // NEW: Multiple treatments per tooth operations
  toothTreatments: {
    getAll: () => ipcRenderer.invoke('db:toothTreatments:getAll'),
    getByPatient: (patientId) => ipcRenderer.invoke('db:toothTreatments:getByPatient', patientId),
    getByTooth: (patientId, toothNumber) => ipcRenderer.invoke('db:toothTreatments:getByTooth', patientId, toothNumber),
    getByAppointment: (appointmentId) => ipcRenderer.invoke('db:toothTreatments:getByAppointment', appointmentId),
    create: (treatment) => ipcRenderer.invoke('db:toothTreatments:create', treatment),
    update: (id, treatment) => ipcRenderer.invoke('db:toothTreatments:update', id, treatment),
    delete: (id) => ipcRenderer.invoke('db:toothTreatments:delete', id),
    reorder: (patientId, toothNumber, treatmentIds) => ipcRenderer.invoke('db:toothTreatments:reorder', patientId, toothNumber, treatmentIds)
  },

  // NEW: Tooth Treatment Images operations
  toothTreatmentImages: {
    getAll: () => ipcRenderer.invoke('db:toothTreatmentImages:getAll'),
    getByTreatment: (treatmentId) => ipcRenderer.invoke('db:toothTreatmentImages:getByTreatment', treatmentId),
    getByTooth: (patientId, toothNumber) => ipcRenderer.invoke('db:toothTreatmentImages:getByTooth', patientId, toothNumber),
    create: (image) => ipcRenderer.invoke('db:toothTreatmentImages:create', image),
    delete: (id) => ipcRenderer.invoke('db:toothTreatmentImages:delete', id)
  },

  // Treatment Sessions operations
  treatmentSessions: {
    getAll: () => ipcRenderer.invoke('db:treatmentSessions:getAll'),
    getByTreatment: (treatmentId) => ipcRenderer.invoke('db:treatmentSessions:getByTreatment', treatmentId),
    create: (session) => ipcRenderer.invoke('db:treatmentSessions:create', session),
    update: (id, session) => ipcRenderer.invoke('db:treatmentSessions:update', id, session),
    delete: (id) => ipcRenderer.invoke('db:treatmentSessions:delete', id),
    getById: (id) => ipcRenderer.invoke('db:treatmentSessions:getById', id)
  },

  // Dental Treatment Images operations
  dentalTreatmentImages: {
    getAll: () => ipcRenderer.invoke('db:dentalTreatmentImages:getAll'),
    getByTreatment: (treatmentId) => ipcRenderer.invoke('db:dentalTreatmentImages:getByTreatment', treatmentId),
    create: (image) => ipcRenderer.invoke('db:dentalTreatmentImages:create', image),
    delete: (id) => ipcRenderer.invoke('db:dentalTreatmentImages:delete', id)
  },

  // Dental Treatment Prescriptions operations
  dentalTreatmentPrescriptions: {
    getAll: () => ipcRenderer.invoke('db:dentalTreatmentPrescriptions:getAll'),
    create: (link) => ipcRenderer.invoke('db:dentalTreatmentPrescriptions:create', link),
    deleteByIds: (treatmentId, prescriptionId) => ipcRenderer.invoke('db:dentalTreatmentPrescriptions:deleteByIds', treatmentId, prescriptionId)
  },

  // Dashboard operations
  dashboard: {
    getStats: () => ipcRenderer.invoke('db:dashboard:getStats')
  },



  // Backup operations
  backup: {
    create: (customPath, includeImages) => ipcRenderer.invoke('backup:create', customPath, includeImages),
    restore: (backupPath) => ipcRenderer.invoke('backup:restore', backupPath),
    list: () => ipcRenderer.invoke('backup:list'),
    delete: (backupName) => ipcRenderer.invoke('backup:delete', backupName),
    test: () => ipcRenderer.invoke('backup:test')
  },

  // File operations
  files: {
    selectFile: (options) => ipcRenderer.invoke('dialog:selectFile', options),
    selectDirectory: (options) => ipcRenderer.invoke('dialog:selectDirectory', options),
    saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
    uploadDentalImage: (fileBuffer, fileName, patientId, toothNumber, imageType, patientName, toothName) => ipcRenderer.invoke('files:uploadDentalImage', fileBuffer, fileName, patientId, toothNumber, imageType, patientName, toothName),
    saveDentalImage: (base64Data, fileName, patientId, toothNumber, imageType, patientName, toothName) => ipcRenderer.invoke('files:saveDentalImage', base64Data, fileName, patientId, toothNumber, imageType, patientName, toothName),
    getDentalImage: (imagePath) => ipcRenderer.invoke('files:getDentalImage', imagePath),
    checkImageExists: (imagePath) => ipcRenderer.invoke('files:checkImageExists', imagePath),
    openImagePreview: (imagePath) => ipcRenderer.invoke('files:openImagePreview', imagePath)
  },

  // Export operations
  export: {
    pdf: (data, type) => ipcRenderer.invoke('export:pdf', data, type),
    excel: (data, type) => ipcRenderer.invoke('export:excel', data, type)
  },

  // System operations
  system: {
    getVersion: () => ipcRenderer.invoke('system:getVersion'),
    getPath: (name) => ipcRenderer.invoke('system:getPath', name),
    openExternal: (url) => ipcRenderer.invoke('system:openExternal', url)
  },

  // Database operations
  database: {
    getStatus: () => ipcRenderer.invoke('database:getStatus')
  },

  // Authentication operations
  auth: {
    clearSession: () => ipcRenderer.invoke('auth:clearSession')
  },

  // License operations
  license: {
    checkStatus: () => ipcRenderer.invoke('license:checkStatus'),
    activate: (licenseKey) => ipcRenderer.invoke('license:activate', licenseKey),
    getMachineInfo: () => ipcRenderer.invoke('license:getMachineInfo'),
    getLicenseInfo: () => ipcRenderer.invoke('license:getLicenseInfo'),
    clearData: () => ipcRenderer.invoke('license:clearData'),
    getStorageInfo: () => ipcRenderer.invoke('license:getStorageInfo'),

    // Predefined licenses operations
    getPredefinedLicenses: (category) => ipcRenderer.invoke('license:getPredefinedLicenses', category),
    searchPredefinedLicenses: (searchTerm) => ipcRenderer.invoke('license:searchPredefinedLicenses', searchTerm),
    getRandomPredefinedLicense: (category) => ipcRenderer.invoke('license:getRandomPredefinedLicense', category),
    validatePredefinedLicense: (licenseKey) => ipcRenderer.invoke('license:validatePredefinedLicense', licenseKey)
  },

  // Shell operations (direct access)
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url)
  },

  // Dialog operations
  dialog: {
    showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options),
    showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSaveDialog', options)
  },



  // Clinic Needs operations
  clinicNeeds: {
    getAll: () => ipcRenderer.invoke('db:clinicNeeds:getAll'),
    create: (need) => ipcRenderer.invoke('db:clinicNeeds:create', need),
    update: (id, need) => ipcRenderer.invoke('db:clinicNeeds:update', id, need),
    delete: (id) => ipcRenderer.invoke('db:clinicNeeds:delete', id),
    search: (query) => ipcRenderer.invoke('db:clinicNeeds:search', query),
    getByStatus: (status) => ipcRenderer.invoke('db:clinicNeeds:getByStatus', status),
    getByPriority: (priority) => ipcRenderer.invoke('db:clinicNeeds:getByPriority', priority),
    getStatistics: () => ipcRenderer.invoke('db:clinicNeeds:getStatistics')
  },

  // Clinic Expenses operations
  clinicExpenses: {
    getAll: () => ipcRenderer.invoke('db:clinicExpenses:getAll'),
    create: (expense) => ipcRenderer.invoke('db:clinicExpenses:create', expense),
    update: (id, expense) => ipcRenderer.invoke('db:clinicExpenses:update', id, expense),
    delete: (id) => ipcRenderer.invoke('db:clinicExpenses:delete', id),
    search: (query) => ipcRenderer.invoke('db:clinicExpenses:search', query),
    getByType: (expenseType) => ipcRenderer.invoke('db:clinicExpenses:getByType', expenseType),
    getByStatus: (status) => ipcRenderer.invoke('db:clinicExpenses:getByStatus', status),
    getRecurring: () => ipcRenderer.invoke('db:clinicExpenses:getRecurring'),
    getStatistics: () => ipcRenderer.invoke('db:clinicExpenses:getStatistics')
  },

  // Reports operations
  reports: {
    generatePatientReport: (filter) => ipcRenderer.invoke('reports:generatePatientReport', filter),
    generateAppointmentReport: (filter) => ipcRenderer.invoke('reports:generateAppointmentReport', filter),
    generateFinancialReport: (filter) => ipcRenderer.invoke('reports:generateFinancialReport', filter),
    generateInventoryReport: (filter) => ipcRenderer.invoke('reports:generateInventoryReport', filter),
    generateTreatmentReport: (filter) => ipcRenderer.invoke('reports:generateTreatmentReport', filter),
    generateAnalyticsReport: (filter) => ipcRenderer.invoke('reports:generateAnalyticsReport', filter),
    generateOverviewReport: (filter) => ipcRenderer.invoke('reports:generateOverviewReport', filter),
    exportReport: (type, filter, options) => ipcRenderer.invoke('reports:exportReport', type, filter, options)
  },

  // Smart Alerts operations
  smartAlerts: {
    getAll: () => ipcRenderer.invoke('db:smartAlerts:getAll'),
    create: (alert) => ipcRenderer.invoke('db:smartAlerts:create', alert),
    update: (id, updates) => ipcRenderer.invoke('db:smartAlerts:update', id, updates),
    delete: (id) => ipcRenderer.invoke('db:smartAlerts:delete', id),
    getById: (id) => ipcRenderer.invoke('db:smartAlerts:getById', id),
    clearDismissed: () => ipcRenderer.invoke('db:smartAlerts:clearDismissed'),
    clearExpiredSnoozed: () => ipcRenderer.invoke('db:smartAlerts:clearExpiredSnoozed')
  }
})
