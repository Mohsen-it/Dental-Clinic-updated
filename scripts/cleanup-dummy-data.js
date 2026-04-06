#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')

// Usage: node scripts/cleanup-dummy-data.js [path/to/dental_clinic.db]

function getDefaultDbPath() {
  const appData = process.env.APPDATA || path.join(process.env.HOME || process.env.USERPROFILE || '', 'AppData', 'Roaming')
  return path.join(appData, 'dental-clinic-management-aggoracode', 'dental_clinic.db')
}

const dbPath = process.argv[2] || getDefaultDbPath()

if (!fs.existsSync(dbPath)) {
  console.error('Database file not found at', dbPath)
  process.exit(1)
}

// Create a timestamped backup
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupPath = `${dbPath}.${timestamp}.backup`
try {
  fs.copyFileSync(dbPath, backupPath)
  console.log('Backup created at', backupPath)
} catch (err) {
  console.error('Failed to create backup:', err)
  process.exit(1)
}

const db = new Database(dbPath)
db.pragma('foreign_keys = ON')
db.pragma('busy_timeout = 5000')

// Patterns considered "dummy"
const namePatterns = ['%test%', '%demo%', '%dummy%']
const emailPatterns = ['test@%', '%example%']
const serialPatterns = ['test%', 'tmp%']
const phonePatterns = ['000%', '%1234567890%']

function findDummyPatients() {
  const stmt = db.prepare(`
    SELECT id, full_name, email, phone, serial_number
    FROM patients
    WHERE (
      ${namePatterns.map(() => 'lower(full_name) LIKE ?').join(' OR ')}
    )
    OR (
      ${emailPatterns.map(() => 'lower(email) LIKE ?').join(' OR ')}
    )
    OR (
      ${serialPatterns.map(() => 'lower(serial_number) LIKE ?').join(' OR ')}
    )
    OR phone IS NULL OR trim(phone) = '' OR (${phonePatterns.map(() => 'phone LIKE ?').join(' OR ')})
  `)

  const params = [...namePatterns.map(p => p), ...emailPatterns.map(p => p), ...serialPatterns.map(p => p), ...phonePatterns.map(p => p)]
  return stmt.all(...params)
}

const dummyPatients = findDummyPatients()
console.log('Found', dummyPatients.length, 'patient(s) matching dummy patterns')
if (dummyPatients.length > 0) {
  console.log('Sample records:')
  dummyPatients.slice(0, 20).forEach(p => console.log(p))
}

// Additional standalone tables to scan for dummy-like rows
const textScans = [
  { table: 'appointments', column: 'title' },
  { table: 'treatments', column: 'name' },
  { table: 'payments', column: 'description' },
  { table: 'labs', column: 'name' },
  { table: 'lab_orders', column: 'service_name' }
]

function scanTextTables() {
  const results = []
  for (const { table, column } of textScans) {
    try {
      const q = `SELECT COUNT(*) as cnt FROM ${table} WHERE ${namePatterns.map(() => `lower(${column}) LIKE ?`).join(' OR ')}`
      const stmt = db.prepare(q)
      const row = stmt.get(...namePatterns.map(p => p))
      results.push({ table, column, count: row ? row.cnt : 0 })
    } catch (e) {
      // table/column might not exist
    }
  }
  return results
}

const scans = scanTextTables()
scans.forEach(s => console.log(`Table ${s.table} (col ${s.column}): ${s.count} matching rows`))

// Proceed to delete: delete patients (will cascade where FK configured)
if (dummyPatients.length === 0 && scans.every(s => s.count === 0)) {
  console.log('No dummy data found for configured patterns. Exiting.')
  process.exit(0)
}

// Perform deletions in a transaction
const deletePatientsStmt = db.prepare('DELETE FROM patients WHERE id = ?')
const deleteTextStmtCache = {}

const deleteTx = db.transaction((patientIds) => {
  let deletedPatients = 0
  for (const id of patientIds) {
    const info = deletePatientsStmt.run(id)
    deletedPatients += info.changes
  }

  let deletedTextRows = {}
  for (const { table, column } of textScans) {
    try {
      const delSql = `DELETE FROM ${table} WHERE ${namePatterns.map(() => `lower(${column}) LIKE ?`).join(' OR ')}`
      const info = db.prepare(delSql).run(...namePatterns.map(p => p))
      deletedTextRows[table] = info.changes
    } catch (e) {
      // ignore if table/column doesn't exist
    }
  }

  return { deletedPatients, deletedTextRows }
})

try {
  const patientIds = dummyPatients.map(p => p.id)
  const result = deleteTx(patientIds)
  console.log('Deletion completed. Summary:')
  console.log('Patients deleted:', result.deletedPatients)
  Object.keys(result.deletedTextRows || {}).forEach(t => console.log(`Table ${t}: ${result.deletedTextRows[t]} rows deleted`))
  console.log('All changes committed to DB. Backup is available at', backupPath)
} catch (err) {
  console.error('Error during deletion transaction:', err)
  process.exit(1)
} finally {
  db.close()
}

process.exit(0)
