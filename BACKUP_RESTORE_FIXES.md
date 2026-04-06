# إصلاحات نظام النسخ الاحتياطي والاستعادة
# Backup & Restore System Fixes

## المشاكل التي تم حلها (Problems Fixed)

### 1. مشكلة مسارات قاعدة البيانات في وضع الإنتاج
**Problem:** Database paths were inconsistent between development and production modes.

**الحل (Solution):**
- استخدام `databaseService.dbPath` المخزن بدلاً من إعادة حساب المسار
- Using stored `databaseService.dbPath` instead of recalculating the path
- إعطاء الأولوية لـ `app.getPath('userData')` في وضع الإنتاج
- Prioritizing `app.getPath('userData')` in production mode

**الملفات المعدلة (Modified Files):**
- `src/services/backupService.js` - Constructor path detection
- `src/services/databaseService.js` - Store dbPath in constructor

### 2. مشكلة عدم تشغيل الترحيلات بعد الاستعادة
**Problem:** Migrations were not running after database restoration, causing missing tables.

**الحل (Solution):**
- إضافة `runMigrations()` في طريقة `reinitialize()`
- Added `runMigrations()` call in `reinitialize()` method
- التأكد من وجود جميع الجداول المطلوبة بعد الاستعادة
- Ensuring all required tables exist after restoration

**الملفات المعدلة (Modified Files):**
- `src/services/databaseService.js` - `reinitialize()` method

### 3. مشكلة القيود على جدول dental_treatments
**Problem:** `ensureDentalTreatmentTablesExist()` was trying to fix constraints before checking if table exists.

**الحل (Solution):**
- التحقق من وجود الجدول قبل محاولة إصلاح القيود
- Check if table exists before attempting to fix constraints
- تجنب الأخطاء عند استعادة نسخ احتياطية قديمة
- Avoid errors when restoring old backups

**الملفات المعدلة (Modified Files):**
- `src/services/databaseService.js` - `ensureDentalTreatmentTablesExist()` method

### 4. مشكلة ملفات WAL و SHM
**Problem:** WAL and SHM files were not being properly handled during restoration.

**الحل (Solution):**
- إجراء checkpoint قبل إغلاق قاعدة البيانات
- Perform checkpoint before closing database
- حذف ملفات WAL و SHM قبل استبدال قاعدة البيانات
- Delete WAL and SHM files before replacing database
- انتظار أطول لضمان تحرير مقابض الملفات
- Longer wait times to ensure file handles are released

**الملفات المعدلة (Modified Files):**
- `src/services/databaseService.js` - `close()` method
- `src/services/backupService.js` - `restoreFromSqliteBackup()` method

### 5. مشكلة مسارات الصور في وضع الإنتاج
**Problem:** Image paths were using executable directory instead of userData.

**الحل (Solution):**
- استخدام `app.getPath('userData')` للصور في وضع الإنتاج
- Use `app.getPath('userData')` for images in production
- توحيد منطق اكتشاف وضع التطوير
- Unified development mode detection logic

**الملفات المعدلة (Modified Files):**
- `src/services/backupService.js` - Constructor and restore methods

### 6. تحسين السجلات والتشخيص
**Problem:** Insufficient logging made it hard to diagnose production issues.

**الحل (Solution):**
- إضافة سجلات مفصلة في جميع العمليات الحرجة
- Added detailed logging in all critical operations
- إنشاء سكريبت تشخيصي شامل
- Created comprehensive diagnostic script
- تحسين رسائل الأخطاء
- Improved error messages

**الملفات الجديدة (New Files):**
- `scripts/diagnose-backup-restore.js` - Diagnostic script

**الملفات المعدلة (Modified Files):**
- `src/services/backupService.js` - Enhanced logging
- `electron/main.js` - Added diagnostic call

## التغييرات الرئيسية (Key Changes)

### في backupService.js:
1. ✅ تحسين اكتشاف مسار قاعدة البيانات
2. ✅ استخدام `app.getPath('userData')` في الإنتاج
3. ✅ حذف ملفات WAL/SHM قبل الاستعادة
4. ✅ انتظار أطول لتحرير مقابض الملفات
5. ✅ سجلات مفصلة لكل خطوة

### في databaseService.js:
1. ✅ تخزين `dbPath` في المُنشئ
2. ✅ استخدام المسار المخزن في `reinitialize()`
3. ✅ تشغيل الترحيلات بعد `reinitialize()`
4. ✅ إجراء checkpoint قبل الإغلاق
5. ✅ التحقق من وجود الجدول قبل إصلاح القيود

### في main.js:
1. ✅ إضافة استدعاء التشخيص في الإنتاج

## كيفية الاختبار (How to Test)

### في وضع التطوير:
```bash
npm run dev
```
1. إنشاء نسخة احتياطية
2. استعادة النسخة الاحتياطية
3. التحقق من البيانات

### في وضع الإنتاج:
```bash
npm run build
npm run dist
```
1. تثبيت التطبيق
2. إنشاء نسخة احتياطية
3. استعادة النسخة الاحتياطية
4. التحقق من السجلات في DevTools

## السجلات المتوقعة (Expected Logs)

### عند الإنشاء:
```
📍 Backup service paths:
   Database: C:\Users\...\AppData\Roaming\dental-clinic\dental_clinic.db
   Backups: C:\Users\...\AppData\Roaming\dental-clinic\backups
   Images: C:\Users\...\AppData\Roaming\dental-clinic\dental_images
   Development mode: false
```

### عند الاستعادة:
```
🔄 Starting SQLite database restoration...
📍 Backup file path: ...
📍 Target database path: ...
📋 Backup contains X tables
📁 Closing current database connection...
✅ Database connection closed successfully
⏳ Waiting for file handles to be released...
🗑️ Deleted WAL file
🗑️ Deleted SHM file
📋 Replacing database file with backup...
✅ Database file replaced successfully
🔄 Reinitializing database service...
🔄 Running migrations after reinitialize...
✅ Migrations completed after reinitialize
✅ Database service reinitialized successfully
```

## الملاحظات المهمة (Important Notes)

1. ⚠️ جميع المسارات في الإنتاج تستخدم `app.getPath('userData')`
2. ⚠️ يتم تشغيل الترحيلات تلقائياً بعد الاستعادة
3. ⚠️ يتم حذف ملفات WAL/SHM قبل استبدال قاعدة البيانات
4. ⚠️ يتم إجراء checkpoint قبل إغلاق قاعدة البيانات
5. ⚠️ السجلات المفصلة تساعد في تشخيص المشاكل

## في حالة استمرار المشاكل (If Issues Persist)

1. تحقق من السجلات في DevTools
2. شغل السكريبت التشخيصي
3. تأكد من الصلاحيات على مجلد userData
4. تحقق من عدم وجود برامج مكافحة فيروسات تمنع الوصول
5. تأكد من عدم فتح قاعدة البيانات في برنامج آخر