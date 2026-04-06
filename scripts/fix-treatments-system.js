/**
 * أداة إصلاح تلقائي لنظام العلاجات السنية
 * 
 * الاستخدام:
 * node scripts/fix-treatments-system.js
 * 
 * تحذير: قم بعمل نسخة احتياطية قبل تشغيل هذا السكريبت
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60));
}

async function fix() {
  try {
    section('🔧 بدء إصلاح نظام العلاجات السنية');

    // 1. البحث عن قاعدة البيانات
    const possiblePaths = [
      path.join(process.cwd(), 'dental-clinic.db'),
      path.join(process.cwd(), 'database', 'dental-clinic.db'),
      path.join(require('os').homedir(), 'AppData', 'Roaming', 'dental-clinic', 'dental-clinic.db'),
      path.join(require('os').homedir(), '.dental-clinic', 'dental-clinic.db'),
    ];

    let dbPath = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        dbPath = p;
        log(`✅ وجدت قاعدة البيانات في: ${p}`, 'green');
        break;
      }
    }

    if (!dbPath) {
      log('❌ لم يتم العثور على قاعدة البيانات', 'red');
      return;
    }

    // 2. عمل نسخة احتياطية
    section('💾 إنشاء نسخة احتياطية');
    const backupPath = dbPath + '.backup.' + Date.now();
    fs.copyFileSync(dbPath, backupPath);
    log(`✅ تم إنشاء نسخة احتياطية: ${backupPath}`, 'green');

    // 3. فتح قاعدة البيانات
    const db = new Database(dbPath);
    log('✅ تم الاتصال بقاعدة البيانات', 'green');

    let fixCount = 0;

    // 4. التحقق من وجود جدول tooth_treatments
    section('🏗️ التحقق من جدول tooth_treatments');
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='tooth_treatments'
    `).get();

    if (!tableExists) {
      log('⚠️ جدول tooth_treatments غير موجود، سيتم إنشاؤه...', 'yellow');
      
      // قراءة schema من ملف schema.sql
      const schemaPath = path.join(process.cwd(), 'src', 'database', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // استخراج CREATE TABLE لـ tooth_treatments
        const tableMatch = schema.match(/CREATE TABLE IF NOT EXISTS tooth_treatments[\s\S]*?(?=CREATE TABLE|CREATE INDEX|$)/i);
        
        if (tableMatch) {
          db.exec(tableMatch[0]);
          log('✅ تم إنشاء جدول tooth_treatments', 'green');
          fixCount++;
        } else {
          log('❌ لم يتم العثور على تعريف الجدول في schema.sql', 'red');
        }
      } else {
        log('❌ ملف schema.sql غير موجود', 'red');
      }
    } else {
      log('✅ جدول tooth_treatments موجود', 'green');
    }

    // 5. التحقق من الفهارس
    section('🔍 التحقق من الفهارس');
    const requiredIndexes = [
      'idx_tooth_treatments_patient',
      'idx_tooth_treatments_tooth_number',
      'idx_tooth_treatments_patient_tooth',
      'idx_tooth_treatments_status',
      'idx_tooth_treatments_priority'
    ];

    const existingIndexes = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND tbl_name='tooth_treatments'
    `).all().map(i => i.name);

    for (const indexName of requiredIndexes) {
      if (!existingIndexes.includes(indexName)) {
        log(`⚠️ الفهرس ${indexName} غير موجود، سيتم إنشاؤه...`, 'yellow');
        
        const indexQueries = {
          'idx_tooth_treatments_patient': 'CREATE INDEX IF NOT EXISTS idx_tooth_treatments_patient ON tooth_treatments(patient_id)',
          'idx_tooth_treatments_tooth_number': 'CREATE INDEX IF NOT EXISTS idx_tooth_treatments_tooth_number ON tooth_treatments(tooth_number)',
          'idx_tooth_treatments_patient_tooth': 'CREATE INDEX IF NOT EXISTS idx_tooth_treatments_patient_tooth ON tooth_treatments(patient_id, tooth_number)',
          'idx_tooth_treatments_status': 'CREATE INDEX IF NOT EXISTS idx_tooth_treatments_status ON tooth_treatments(treatment_status)',
          'idx_tooth_treatments_priority': 'CREATE INDEX IF NOT EXISTS idx_tooth_treatments_priority ON tooth_treatments(priority)'
        };
        
        if (indexQueries[indexName]) {
          db.exec(indexQueries[indexName]);
          log(`✅ تم إنشاء الفهرس ${indexName}`, 'green');
          fixCount++;
        }
      } else {
        log(`✅ الفهرس ${indexName} موجود`, 'green');
      }
    }

    // 6. إصلاح العلاجات اليتيمة (بدون مريض)
    section('🔧 إصلاح العلاجات اليتيمة');
    const orphanTreatments = db.prepare(`
      SELECT tt.id, tt.patient_id
      FROM tooth_treatments tt
      LEFT JOIN patients p ON tt.patient_id = p.id
      WHERE p.id IS NULL
    `).all();

    if (orphanTreatments.length > 0) {
      log(`⚠️ وجدت ${orphanTreatments.length} علاج يتيم`, 'yellow');
      log('سيتم حذف هذه العلاجات...', 'yellow');
      
      const deleteStmt = db.prepare('DELETE FROM tooth_treatments WHERE id = ?');
      const transaction = db.transaction((treatments) => {
        for (const t of treatments) {
          deleteStmt.run(t.id);
        }
      });
      
      transaction(orphanTreatments);
      log(`✅ تم حذف ${orphanTreatments.length} علاج يتيم`, 'green');
      fixCount++;
    } else {
      log('✅ لا توجد علاجات يتيمة', 'green');
    }

    // 7. إصلاح أرقام الأسنان الخاطئة
    section('🔧 إصلاح أرقام الأسنان');
    const invalidToothNumbers = db.prepare(`
      SELECT id, tooth_number
      FROM tooth_treatments
      WHERE NOT (
        (tooth_number >= 11 AND tooth_number <= 18) OR
        (tooth_number >= 21 AND tooth_number <= 28) OR
        (tooth_number >= 31 AND tooth_number <= 38) OR
        (tooth_number >= 41 AND tooth_number <= 48) OR
        (tooth_number >= 51 AND tooth_number <= 55) OR
        (tooth_number >= 61 AND tooth_number <= 65) OR
        (tooth_number >= 71 AND tooth_number <= 75) OR
        (tooth_number >= 81 AND tooth_number <= 85)
      )
    `).all();

    if (invalidToothNumbers.length > 0) {
      log(`⚠️ وجدت ${invalidToothNumbers.length} علاج بأرقام أسنان خاطئة`, 'yellow');
      log('سيتم حذف هذه العلاجات...', 'yellow');
      
      const deleteStmt = db.prepare('DELETE FROM tooth_treatments WHERE id = ?');
      const transaction = db.transaction((treatments) => {
        for (const t of treatments) {
          deleteStmt.run(t.id);
        }
      });
      
      transaction(invalidToothNumbers);
      log(`✅ تم حذف ${invalidToothNumbers.length} علاج بأرقام خاطئة`, 'green');
      fixCount++;
    } else {
      log('✅ جميع أرقام الأسنان صحيحة', 'green');
    }

    // 8. إعادة بناء الأولويات
    section('🔧 إعادة بناء الأولويات');
    const patientsWithTreatments = db.prepare(`
      SELECT DISTINCT patient_id, tooth_number
      FROM tooth_treatments
      ORDER BY patient_id, tooth_number
    `).all();

    log(`سيتم إعادة بناء الأولويات لـ ${patientsWithTreatments.length} سن...`, 'cyan');
    
    const updatePriorityStmt = db.prepare(`
      UPDATE tooth_treatments 
      SET priority = ? 
      WHERE id = ?
    `);
    
    const transaction = db.transaction((items) => {
      for (const item of items) {
        const treatments = db.prepare(`
          SELECT id 
          FROM tooth_treatments 
          WHERE patient_id = ? AND tooth_number = ?
          ORDER BY created_at ASC
        `).all(item.patient_id, item.tooth_number);
        
        treatments.forEach((t, index) => {
          updatePriorityStmt.run(index + 1, t.id);
        });
      }
    });
    
    transaction(patientsWithTreatments);
    log(`✅ تم إعادة بناء الأولويات`, 'green');
    fixCount++;

    // 9. تحسين قاعدة البيانات
    section('⚡ تحسين قاعدة البيانات');
    db.exec('VACUUM');
    db.exec('ANALYZE');
    log('✅ تم تحسين قاعدة البيانات', 'green');

    // إغلاق قاعدة البيانات
    db.close();

    // 10. الخلاصة
    section('📋 الخلاصة');
    if (fixCount > 0) {
      log(`\n✅ تم إجراء ${fixCount} إصلاح بنجاح`, 'green');
      log(`💾 النسخة الاحتياطية محفوظة في: ${backupPath}`, 'cyan');
      log('\n🔄 يُنصح بإعادة تشغيل التطبيق الآن', 'yellow');
    } else {
      log('\n✅ لم يتم العثور على مشاكل تحتاج للإصلاح', 'green');
      log('النظام يعمل بشكل صحيح', 'cyan');
    }

  } catch (error) {
    log('\n❌ حدث خطأ أثناء الإصلاح:', 'red');
    console.error(error);
    log('\n⚠️ يُنصح باستعادة النسخة الاحتياطية', 'yellow');
  }
}

// تشغيل الإصلاح
fix().catch(console.error);