const { app } = require('electron')
const path = require('path')
const fs = require('fs')

/**
 * Diagnostic script for backup and restore system
 * Run this to check all paths and configurations
 */
function diagnoseBackupRestore() {
  console.log('🔍 ===== BACKUP & RESTORE DIAGNOSTIC =====')
  console.log('')
  
  // Environment info
  console.log('📋 ENVIRONMENT INFO:')
  console.log('  - Platform:', process.platform)
  console.log('  - Architecture:', process.arch)
  console.log('  - Node Version:', process.version)
  console.log('  - Electron Version:', process.versions.electron)
  console.log('  - Process CWD:', process.cwd())
  console.log('  - Process execPath:', process.execPath)
  console.log('  - NODE_ENV:', process.env.NODE_ENV)
  console.log('')
  
  // Development mode detection
  const isDevelopment = process.env.NODE_ENV === 'development' ||
                       process.execPath.includes('node') ||
                       process.execPath.includes('electron') ||
                       process.cwd().includes('dental-clinic') ||
                       process.cwd().includes('Dental-Clinic')
  
  console.log('🔧 MODE DETECTION:')
  console.log('  - Is Development:', isDevelopment)
  console.log('')
  
  // Electron paths
  try {
    console.log('📁 ELECTRON PATHS:')
    console.log('  - userData:', app.getPath('userData'))
    console.log('  - appData:', app.getPath('appData'))
    console.log('  - temp:', app.getPath('temp'))
    console.log('  - exe:', app.getPath('exe'))
    console.log('  - documents:', app.getPath('documents'))
    console.log('  - desktop:', app.getPath('desktop'))
    console.log('')
  } catch (error) {
    console.error('❌ Could not get Electron paths:', error.message)
    console.log('')
  }
  
  // Expected paths
  console.log('📍 EXPECTED PATHS:')
  
  let dbPath
  try {
    dbPath = path.join(app.getPath('userData'), 'dental_clinic.db')
    console.log('  - Database:', dbPath)
    console.log('    Exists:', fs.existsSync(dbPath))
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath)
      console.log('    Size:', stats.size, 'bytes')
    }
  } catch (error) {
    console.error('  - Database: ERROR -', error.message)
  }
  
  let backupDir
  try {
    const dbDir = path.dirname(dbPath)
    backupDir = path.join(dbDir, 'backups')
    console.log('  - Backups:', backupDir)
    console.log('    Exists:', fs.existsSync(backupDir))
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir)
      console.log('    Files:', files.length)
      files.slice(0, 5).forEach(file => console.log('      -', file))
    }
  } catch (error) {
    console.error('  - Backups: ERROR -', error.message)
  }
  
  let imagesPath
  try {
    if (isDevelopment) {
      imagesPath = path.join(process.cwd(), 'dental_images')
    } else {
      imagesPath = path.join(app.getPath('userData'), 'dental_images')
    }
    console.log('  - Images:', imagesPath)
    console.log('    Exists:', fs.existsSync(imagesPath))
    if (fs.existsSync(imagesPath)) {
      const files = fs.readdirSync(imagesPath)
      console.log('    Files:', files.length)
    }
  } catch (error) {
    console.error('  - Images: ERROR -', error.message)
  }
  
  console.log('')
  
  // WAL files
  console.log('🗄️ DATABASE FILES:')
  try {
    const walPath = `${dbPath}-wal`
    const shmPath = `${dbPath}-shm`
    console.log('  - Main DB:', fs.existsSync(dbPath))
    console.log('  - WAL file:', fs.existsSync(walPath))
    console.log('  - SHM file:', fs.existsSync(shmPath))
  } catch (error) {
    console.error('  - ERROR:', error.message)
  }
  
  console.log('')
  console.log('✅ Diagnostic complete')
  console.log('=====================================')
}

module.exports = { diagnoseBackupRestore }