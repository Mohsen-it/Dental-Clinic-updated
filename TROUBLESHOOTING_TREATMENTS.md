# 🔧 دليل استكشاف وإصلاح مشاكل نظام العلاجات

## 🎯 المشكلة الرئيسية

**الأعراض:** العلاجات لا تظهر عند اختيار المريض، رغم أنها موجودة في قاعدة البيانات.

## 🔍 خطوات التشخيص السريع

### الخطوة 1: فحص قاعدة البيانات

```bash
# تشغيل أداة التشخيص
node scripts/diagnose-treatments.js
```

هذا سيفحص:
- ✅ وجود قاعدة البيانات
- ✅ وجود الجداول المطلوبة
- ✅ عدد العلاجات والمرضى
- ✅ سلامة البيانات
- ✅ أداء الاستعلامات

### الخطوة 2: فحص من داخل التطبيق

1. افتح التطبيق
2. اضغط F12 لفتح Developer Tools
3. في Console، شغّل:

```javascript
// فحص قاعدة البيانات
async function quickCheck() {
  const treatments = await window.electronAPI.toothTreatments.getAll();
  console.log('Total treatments:', treatments.length);
  
  const patients = await window.electronAPI.patients.getAll();
  console.log('Total patients:', patients.length);
  
  if (patients.length > 0) {
    const patientTreatments = await window.electronAPI.toothTreatments.getByPatient(patients[0].id);
    console.log(`Treatments for ${patients[0].full_name}:`, patientTreatments.length);
  }
}

quickCheck();
```

## 🛠️ الحلول الشائعة

### الحل 1: مسح الـ Cache

```javascript
// في Developer Console
const store = window.__ZUSTAND_STORES__?.dentalTreatmentStore;
if (store) {
  const state = store.getState();
  state.treatmentCache = {};
  console.log('✅ Cache cleared');
}
```

ثم أعد تحميل الصفحة (F5).

### الحل 2: إعادة تحميل البيانات يدوياً

```javascript
// في Developer Console
async function forceReload(patientId) {
  const { loadToothTreatmentsByPatient } = useDentalTreatmentStore.getState();
  await loadToothTreatmentsByPatient(patientId);
  console.log('✅ Data reloaded');
}

// استخدام: forceReload('PATIENT_ID_HERE')
```

### الحل 3: إصلاح قاعدة البيانات

```bash
# تشغيل أداة الإصلاح التلقائي
node scripts/fix-treatments-system.js
```

هذا سيقوم بـ:
- ✅ إنشاء نسخة احتياطية
- ✅ إنشاء الجداول المفقودة
- ✅ إصلاح الفهارس
- ✅ حذف البيانات التالفة
- ✅ إعادة بناء الأولويات
- ✅ تحسين قاعدة البيانات

### الحل 4: إعادة تشغيل التطبيق

أحياناً، إعادة تشغيل التطبيق تحل المشكلة:
1. أغلق التطبيق بالكامل
2. أعد فتحه
3. جرّب اختيار مريض مرة أخرى

## 🐛 مشاكل محددة وحلولها

### المشكلة: "لا توجد علاجات في قاعدة البيانات"

**السبب:** الجدول فارغ فعلاً

**الحل:**
1. تأكد من إضافة علاجات من خلال الواجهة
2. تحقق من أن العلاجات تُحفظ بنجاح (راقب Console للأخطاء)

### المشكلة: "العلاجات موجودة ولكن لا تظهر"

**السبب:** مشكلة في التزامن أو الـ Cache

**الحل:**
```javascript
// امسح الـ Cache وأعد التحميل
const store = useDentalTreatmentStore.getState();
store.treatmentCache = {};
await store.loadToothTreatmentsByPatient(patientId);
```

### المشكلة: "خطأ: no such table: tooth_treatments"

**السبب:** الجدول غير موجود في قاعدة البيانات

**الحل:**
```bash
# شغّل أداة الإصلاح
node scripts/fix-treatments-system.js
```

أو أعد تشغيل التطبيق (سيتم إنشاء الجدول تلقائياً).

### المشكلة: "العلاجات تظهر بعد إعادة التشغيل فقط"

**السبب:** مشكلة في Events أو Real-time sync

**الحل:**
1. تحقق من Console للأخطاء
2. تأكد من أن Events تُرسل بشكل صحيح:

```javascript
// راقب Events
window.addEventListener('treatments-loaded', (e) => {
  console.log('✅ Treatments loaded:', e.detail);
});

window.addEventListener('treatment-updated', (e) => {
  console.log('✅ Treatment updated:', e.detail);
});
```

## 📊 معلومات تقنية

### بنية قاعدة البيانات

```sql
CREATE TABLE tooth_treatments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  tooth_number INTEGER NOT NULL,
  tooth_name TEXT NOT NULL,
  treatment_type TEXT NOT NULL,
  treatment_category TEXT NOT NULL,
  treatment_status TEXT DEFAULT 'planned',
  treatment_color TEXT NOT NULL,
  start_date DATE,
  completion_date DATE,
  cost DECIMAL(10,2) DEFAULT 0,
  priority INTEGER DEFAULT 1,
  notes TEXT,
  appointment_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);
```

### الفهارس المطلوبة

- `idx_tooth_treatments_patient` على `patient_id`
- `idx_tooth_treatments_tooth_number` على `tooth_number`
- `idx_tooth_treatments_patient_tooth` على `(patient_id, tooth_number)`
- `idx_tooth_treatments_status` على `treatment_status`
- `idx_tooth_treatments_priority` على `priority`

### مسار قاعدة البيانات

قاعدة البيانات موجودة في أحد هذه المسارات:
- `./dental-clinic.db`
- `./database/dental-clinic.db`
- `%APPDATA%/dental-clinic/dental-clinic.db`
- `~/.dental-clinic/dental-clinic.db`

## 🆘 الحصول على مساعدة إضافية

إذا لم تحل المشكلة بعد تجربة جميع الحلول:

1. **جمع المعلومات:**
   ```bash
   node scripts/diagnose-treatments.js > diagnosis.txt
   ```

2. **فحص Logs:**
   - افتح Developer Tools (F12)
   - انتقل إلى Console
   - ابحث عن رسائل الخطأ (باللون الأحمر)
   - انسخ أي رسائل خطأ

3. **معلومات النظام:**
   - نظام التشغيل
   - إصدار التطبيق
   - متى بدأت المشكلة

## ✅ قائمة التحقق النهائية

قبل طلب المساعدة، تأكد من:

- [ ] تشغيل `diagnose-treatments.js`
- [ ] تشغيل `fix-treatments-system.js`
- [ ] مسح الـ Cache
- [ ] إعادة تشغيل التطبيق
- [ ] فحص Console للأخطاء
- [ ] التحقق من وجود نسخة احتياطية

---

**آخر تحديث:** 2024
**الإصدار:** 1.0