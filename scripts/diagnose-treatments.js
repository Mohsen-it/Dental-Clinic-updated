/**
 * أداة تشخيص شاملة لنظام العلاجات السنية
 * 
 * الاستخدام:
 * node scripts/diagnose-treatments.js
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// ألوان للطباعة
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
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

async function diagnose() {
  try {
    section('🔍 بدء التشخيص الشامل لنظام العلاجات السنية');

    // 1. البحث عن ملف قاعدة البيانات
    section('📁 الخطوة 1: البحث عن قاعدة البيانات');
    
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
      log('❌ لم يتم العثور على قاعدة البيانات في المسارات المعتادة', 'red');
      log('المسارات التي تم البحث فيها:', 'yellow');
      possiblePaths.forEach(p => log(`  - ${p}`, 'yellow'));
      return;
    }

    // 2. فتح قاعدة البيانات
    section('🔌 الخطوة 2: الاتصال بقاعدة البيانات');
    const db = new Database(dbPath, { readonly: true });
    log('✅ تم الاتصال بقاعدة البيانات بنجاح', 'green');

    // 3. فحص الجداول
    section('📊 الخطوة 3: فحص الجداول');
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
    `).all();
    
    log(`عدد الجداول: ${tables.length}`, 'cyan');
    
    const requiredTables = ['patients', 'tooth_treatments', 'tooth_treatment_images'];
    const missingTables = [];
    
    for (const tableName of requiredTables) {
      const exists = tables.some(t => t.name === tableName);
      if (exists) {
        log(`  ✅ ${tableName}`, 'green');
      } else {
        log(`  ❌ ${tableName} - غير موجود!`, 'red');
        missingTables.push(tableName);
      }
    }

    if (missingTables.length > 0) {
      log('\n⚠️ تحذير: بعض الجداول المطلوبة غير موجودة!', 'red');
      log('الجداول المفقودة:', 'yellow');
      missingTables.forEach(t => log(`  - ${t}`, 'yellow'));
      log('\nالحل: قم بإعادة تشغيل التطبيق لإنشاء الجداول تلقائياً', 'cyan');
      db.close();
      return;
    }

    // 4. فحص بنية جدول tooth_treatments
    section('🏗️ الخطوة 4: فحص بنية جدول tooth_treatments');
    const tableInfo = db.prepare(`PRAGMA table_info(tooth_treatments)`).all();
    log('الأعمدة الموجودة:', 'cyan');
    tableInfo.forEach(col => {
      log(`  - ${col.name} (${col.type})${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`, 'blue');
    });

    // 5. فحص البيانات
    section('📈 الخطوة 5: فحص البيانات');
    
    // عدد المرضى
    const patientCount = db.prepare('SELECT COUNT(*) as count FROM patients').get();
    log(`عدد المرضى: ${patientCount.count}`, 'cyan');

    // عدد العلاجات
    const treatmentCount = db.prepare('SELECT COUNT(*) as count FROM tooth_treatments').get();
    log(`عدد العلاجات: ${treatmentCount.count}`, 'cyan');

    // عدد الصور
    const imageCount = db.prepare('SELECT COUNT(*) as count FROM tooth_treatment_images').get();
    log(`عدد الصور: ${imageCount.count}`, 'cyan');

    // 6. فحص العلاجات حسب المريض
    section('👥 الخطوة 6: فحص توزيع العلاجات على المرضى');
    const treatmentsByPatient = db.prepare(`
      SELECT 
        p.id,
        p.full_name,
        COUNT(tt.id) as treatment_count
      FROM patients p
      LEFT JOIN tooth_treatments tt ON p.id = tt.patient_id
      GROUP BY p.id
      HAVING treatment_count > 0
      ORDER BY treatment_count DESC
      LIMIT 10
    `).all();

    if (treatmentsByPatient.length === 0) {
      log('⚠️ لا توجد علاجات مسجلة لأي مريض', 'yellow');
    } else {
      log('أكثر 10 مرضى لديهم علاجات:', 'cyan');
      treatmentsByPatient.forEach((row, index) => {
        log(`  ${index + 1}. ${row.full_name}: ${row.treatment_count} علاج`, 'blue');
      });
    }

    // 7. فحص حالات العلاجات
    section('📊 الخطوة 7: فحص حالات العلاجات');
    const treatmentsByStatus = db.prepare(`
      SELECT 
        treatment_status,
        COUNT(*) as count
      FROM tooth_treatments
      GROUP BY treatment_status
      ORDER BY count DESC
    `).all();

    if (treatmentsByStatus.length === 0) {
      log('⚠️ لا توجد علاجات', 'yellow');
    } else {
      log('توزيع العلاجات حسب الحالة:', 'cyan');
      treatmentsByStatus.forEach(row => {
        const statusAr = {
          'planned': 'مخطط',
          'in_progress': 'قيد التنفيذ',
          'completed': 'مكتمل',
          'cancelled': 'ملغي'
        };
        log(`  - ${statusAr[row.treatment_status] || row.treatment_status}: ${row.count}`, 'blue');
      });
    }

    // 8. فحص الفهارس
    section('🔍 الخطوة 8: فحص الفهارس (Indexes)');
    const indexes = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND tbl_name='tooth_treatments'
      ORDER BY name
    `).all();
    
    log(`عدد الفهارس على tooth_treatments: ${indexes.length}`, 'cyan');
    if (indexes.length > 0) {
      indexes.forEach(idx => {
        log(`  - ${idx.name}`, 'blue');
      });
    }

    // 9. اختبار استعلام نموذجي
    section('🧪 الخطوة 9: اختبار استعلام نموذجي');
    if (patientCount.count > 0) {
      const firstPatient = db.prepare('SELECT id, full_name FROM patients LIMIT 1').get();
      log(`اختبار جلب علاجات المريض: ${firstPatient.full_name}`, 'cyan');
      
      const start = Date.now();
      const treatments = db.prepare(`
        SELECT tt.*,
               a.title as appointment_title,
               a.start_time as appointment_start_time
        FROM tooth_treatments tt
        LEFT JOIN appointments a ON tt.appointment_id = a.id
        WHERE tt.patient_id = ?
        ORDER BY tt.tooth_number ASC, tt.priority ASC
      `).all(firstPatient.id);
      const duration = Date.now() - start;
      
      log(`✅ تم جلب ${treatments.length} علاج في ${duration}ms`, 'green');
      
      if (treatments.length > 0) {
        log('أول 3 علاجات:', 'cyan');
        treatments.slice(0, 3).forEach((t, i) => {
          log(`  ${i + 1}. السن ${t.tooth_number} - ${t.treatment_type} (${t.treatment_status})`, 'blue');
        });
      }
    }

    // 10. فحص سلامة البيانات
    section('🔒 الخطوة 10: فحص سلامة البيانات');
    
    // علاجات بدون مريض
    const orphanTreatments = db.prepare(`
      SELECT COUNT(*) as count 
      FROM tooth_treatments tt
      LEFT JOIN patients p ON tt.patient_id = p.id
      WHERE p.id IS NULL
    `).get();
    
    if (orphanTreatments.count > 0) {
      log(`⚠️ وجدت ${orphanTreatments.count} علاج بدون مريض مرتبط`, 'yellow');
    } else {
      log('✅ جميع العلاجات مرتبطة بمرضى صحيحين', 'green');
    }

    // علاجات بأرقام أسنان غير صحيحة
    const invalidToothNumbers = db.prepare(`
      SELECT COUNT(*) as count 
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
    `).get();
    
    if (invalidToothNumbers.count > 0) {
      log(`⚠️ وجدت ${invalidToothNumbers.count} علاج بأرقام أسنان غير صحيحة`, 'yellow');
    } else {
      log('✅ جميع أرقام الأسنان صحيحة', 'green');
    }

    // إغلاق قاعدة البيانات
    db.close();

    // 11. الخلاصة والتوصيات
    section('📋 الخلاصة والتوصيات');
    
    log('\n✅ نتائج التشخيص:', 'green');
    log(`  - قاعدة البيانات: موجودة وتعمل`, 'green');
    log(`  - الجداول المطلوبة: موجودة`, 'green');
    log(`  - عدد المرضى: ${patientCount.count}`, 'cyan');
    log(`  - عدد العلاجات: ${treatmentCount.count}`, 'cyan');
    log(`  - عدد الصور: ${imageCount.count}`, 'cyan');

    if (treatmentCount.count === 0) {
      log('\n⚠️ تنبيه: لا توجد علاجات في قاعدة البيانات', 'yellow');
      log('هذا قد يكون السبب في عدم ظهور العلاجات في الواجهة', 'yellow');
      log('\nالحل:', 'cyan');
      log('  1. تأكد من إضافة علاجات للمرضى من خلال الواجهة', 'blue');
      log('  2. تحقق من أن العلاجات تُحفظ بشكل صحيح', 'blue');
    } else if (treatmentsByPatient.length === 0) {
      log('\n⚠️ تنبيه: العلاجات موجودة ولكن غير مرتبطة بمرضى', 'yellow');
      log('هذا يشير إلى مشكلة في سلامة البيانات', 'yellow');
    } else {
      log('\n✅ النظام يعمل بشكل صحيح من ناحية قاعدة البيانات', 'green');
      log('\nإذا كانت المشكلة مستمرة في الواجهة:', 'cyan');
      log('  1. افتح Developer Tools (F12) في التطبيق', 'blue');
      log('  2. راقب رسائل Console للأخطاء', 'blue');
      log('  3. تحقق من تحميل البيانات باستخدام:', 'blue');
      log('     checkDatabase() في Console', 'magenta');
      log('  4. امسح الـ Cache وأعد تحميل البيانات', 'blue');
    }

    section('✅ انتهى التشخيص');

  } catch (error) {
    log('\n❌ حدث خطأ أثناء التشخيص:', 'red');
    console.error(error);
  }
}

// تشغيل التشخيص
diagnose().catch(console.error);