# تحليل شامل لنظام العلاجات السنية

تاريخ التحليل: 2026-02-03

## 📋 نظرة عامة على النظام

### 1. بنية النظام

نظام العلاجات السنية في التطبيق يتكون من عدة طبقات:

```
┌─────────────────────────────────────────────────┐
│           صفحة العلاجات (DentalTreatments.tsx) │
│                                                 │
│  - اختيار المريض                               │
│  - عرض مخطط الأسنان التفاعلي                   │
│  - عرض تفاصيل العلاجات                        │
└──────────────────┬──────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────┐
│      مخزن الحالة (dentalTreatmentStore.ts)     │
│                                                 │
│  - إدارة حالة العلاجات في الذاكرة             │
│  - آلية التخزين المؤقت (Cache)                │
│  - تحميل وتحديث العلاجات                       │
└──────────────────┬──────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────┐
│          طبقة IPC (electron/main.js)           │
│                                                 │
│  - معالجة الطلبات بين الـ Renderer والـ Main   │
│  - نقطة اتصال بين الواجهة وقاعدة البيانات     │
└──────────────────┬──────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────┐
│      خدمة قاعدة البيانات (databaseService.js)  │
│                                                 │
│  - استعلامات SQL                               │
│  - إدارة الاتصال بـ SQLite                     │
│  - CRUD operations                             │
└──────────────────┬──────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────┐
│         قاعدة البيانات (SQLite)                │
│                                                 │
│  - tooth_treatments (جدول العلاجات)           │
│  - الفهارس (Indexes)                          │
└─────────────────────────────────────────────────┘
```

---

## 🗃️ 2. تخزين البيانات في قاعدة البيانات

### بنية جدول `tooth_treatments`:

```sql
CREATE TABLE IF NOT EXISTS tooth_treatments (
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
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
    UNIQUE(patient_id, tooth_number, priority)
);
```

### الفهارس (Indexes) للأداء:

```sql
CREATE INDEX idx_tooth_treatments_patient ON tooth_treatments(patient_id);
CREATE INDEX idx_tooth_treatments_tooth_number ON tooth_treatments(tooth_number);
CREATE INDEX idx_tooth_treatments_patient_tooth ON tooth_treatments(patient_id, tooth_number);
CREATE INDEX idx_tooth_treatments_status ON tooth_treatments(treatment_status);
CREATE INDEX idx_tooth_treatments_appointment ON tooth_treatments(appointment_id);
CREATE INDEX idx_tooth_treatments_priority ON tooth_treatments(priority);
CREATE INDEX idx_tooth_treatments_patient_priority ON tooth_treatments(patient_id, priority);
CREATE INDEX idx_tooth_treatments_category ON tooth_treatments(treatment_category);
CREATE INDEX idx_tooth_treatments_dates ON tooth_treatments(start_date, completion_date);
```

---

## 🔄 3. آلية استعلام البيانات

### أ) الاستعلام من قاعدة البيانات:

الدالة في `databaseService.js`:

```javascript
async getToothTreatmentsByPatient(patientId) {
    const stmt = this.db.prepare(`
      SELECT tt.*,
             a.title as appointment_title,
             a.start_time as appointment_start_time
      FROM tooth_treatments tt
      LEFT JOIN appointments a ON tt.appointment_id = a.id
      WHERE tt.patient_id = ?
      ORDER BY tt.tooth_number ASC, tt.priority ASC
    `)
    return stmt.all(patientId)
}
```

**الملاحظات:**
- استعلام محسّن باستخدام الفهرس `idx_tooth_treatments_patient`
- LEFT JOIN مع `appointments` للحصول على معلومات الموعد إذا كان موجوداً
- الترتيب حسب رقم السن ثم الأولوية

### ب) التدفق من الواجهة إلى قاعدة البيانات:

```javascript
// 1. الصفحة تطلب تحميل العلاجات
await loadToothTreatmentsByPatient(patientId)
         ↓
// 2. Store يتحقق من الكاش أولاً
if (cachedEntry && (now - cachedEntry.timestamp) < CACHE_DURATION) {
    return cachedEntry.data  // ⚠️ هنا المشكلة!
}
         ↓
// 3. إذا لم يكن في الكاش، يطلب من قاعدة البيانات
const toothTreatments = await window.electronAPI.toothTreatments.getByPatient(patientId)
         ↓
// 4. IPC يرسل الطلب إلى Main Process
ipcRenderer.invoke('db:toothTreatments:getByPatient', patientId)
         ↓
// 5. Main Process يستدعي databaseService
return await databaseService.getToothTreatmentsByPatient(patientId)
         ↓
// 6. databaseService ينفذ استعلام SQL
return stmt.all(patientId)
         ↓
// 7. النتائج ترجع إلى الصفحة وتُخزن في الكاش
```

---

## 🐛 4. تحليل المشكلة: اختفاء البيانات المؤقت

### الأعراض:
- العلاجات تختفي من صفحة العلاجات بشكل مؤقت
- عند التنقل في التطبيق، تعود العلاجات للظهور
- المشكلة تحدث بشكل عشوائي

### السبب الجذري:

#### 📦 **آلية الكاش (Cache Mechanism)**

في `dentalTreatmentStore.ts`:

```typescript
// مدة صلاحية الكاش: 5 دقائق
const CACHE_DURATION = 5 * 60 * 1000

interface TreatmentCache {
  [patientId: string]: CacheEntry<ToothTreatment[]>
}

interface CacheEntry<T> {
  data: T
  timestamp: number
}
```

**المشكلة الرئيسية:**

```typescript
loadToothTreatmentsByPatient: async (patientId: string) => {
    const state = get()
    const cachedEntry = state.treatmentCache[patientId]
    const now = Date.now()

    // ⚠️ المشكلة: إذا كانت البيانات في الكاش ما زالت "صالحة"
    if (cachedEntry && (now - cachedEntry.timestamp) < CACHE_DURATION) {
      console.log('🦷 Using cached treatments')
      set({
        toothTreatments: cachedEntry.data,  // ⚠️ قد تكون بيانات قديمة!
        isLoading: false
      })
      return
    }

    // فقط إذا انتهت صلاحية الكاش، نحمّل من قاعدة البيانات
    const toothTreatments = await window.electronAPI.toothTreatments.getByPatient(patientId)
}
```

### 📝 سيناريوهات المشكلة:

#### السيناريو 1: التحديث بدون تحديث الكاش
```
1. المستخدم يفتح المريض A → تُحمّل العلاجات وتُخزن في الكاش
2. المستخدم يضيف علاج جديد → يُضاف للذاكرة المحلية
3. المستخدم يتنقل لمريض آخر ثم يعود لـ A
4. الكود يجد البيانات في الكاش (ما زالت صالحة لمدة 5 دقائق)
5. ⚠️ يعرض البيانات القديمة من الكاش بدون العلاج الجديد!
```

#### السيناريو 2: الكاش ينتهي في وقت غير متوقع
```
1. المستخدم يفتح المريض → البيانات في الكاش (عمرها 4 دقائق)
2. بعد دقيقة واحدة → ينتهي الكاش (5 دقائق)
3. أي إجراء يطلب العلاجات → يحمّل من قاعدة البيانات
4. البيانات تظهر من جديد
```

#### السيناريو 3: مشاكل التزامن (Race Conditions)
```
1. المستخدم يضغط "تحديث" مرتين بسرعة
2. كلا الطلبين يفحصان الكاش في نفس الوقت
3. كلاهما يجدان أن الكاش منتهي
4. كلاهما يحمّلان من قاعدة البيانات
5. ⚠️ قد يحدث تضارب في تحديث الحالة
```

---

## 🔍 5. الأدلة على المشكلة

### من الكود الموجود:

#### في `DentalTreatments.tsx`:

```typescript
// السطر 78-87: التهيئة الأولية
useEffect(() => {
    const initializeData = async () => {
      try {
        await Promise.all([
          loadPatients(),
          loadPrescriptions(),
          loadToothTreatments(), // تحميل جميع العلاجات
          loadAllToothTreatmentImages()
        ])
      } catch (error) {
        notify.error('فشل في تحميل البيانات الأولية')
      }
    }
    initializeData()
}, [])
```

**المشكلة:** هذا التحميل الأولي يملأ الكاش، لكن عند اختيار مريض:

```typescript
// السطر 322-368
const handlePatientSelect = async (patientId: string) => {
    setSelectedPatientId(patientId)
    
    if (patientId) {
        setIsLoading(true)
        
        // ⚠️ هنا قد يستخدم بيانات من الكاش بدلاً من قاعدة البيانات
        await loadToothTreatmentsByPatient(patientId)
        await loadAllToothTreatmentImagesByPatient(patientId)
        
        setIsLoading(false)
    }
}
```

#### في `dentalTreatmentStore.ts`:

```typescript
// السطر 210-261: إنشاء علاج جديد
createToothTreatment: async (treatmentData) => {
    const newTreatment = await window.electronAPI.toothTreatments.create(treatmentData)
    
    // ✅ يمسح الكاش للمريض المعني
    const updatedCache = { ...treatmentCache }
    if (treatmentData.patient_id) {
        delete updatedCache[treatmentData.patient_id]
    }
    
    // ✅ يضيف العلاج للذاكرة المحلية
    set({
        toothTreatments: [...toothTreatments, newTreatment],
        treatmentCache: updatedCache
    })
    
    // ✅ يعيد تحميل كل العلاجات للمريض
    if (selectedPatientId) {
        const refreshedTreatments = await window.electronAPI.toothTreatments.getByPatient(selectedPatientId)
        set({ toothTreatments: refreshedTreatments })
    }
}
```

**الملاحظة:** عملية الإنشاء تمسح الكاش وتعيد التحميل، لكن المشكلة تحدث في حالات أخرى.

---

## 🎯 6. الحلول المقترحة

### الحل 1: تقليل مدة الكاش ✅ (سهل، سريع)

```typescript
// من 5 دقائق إلى 30 ثانية
const CACHE_DURATION = 30 * 1000  // 30 ثانية
```

**المزايا:**
- سهل التطبيق
- يقلل من فرص عرض بيانات قديمة

**العيوب:**
- لا يحل المشكلة بالكامل
- يزيد من عدد الاستعلامات لقاعدة البيانات

---

### الحل 2: مسح الكاش عند أي تغيير ✅✅ (موصى به)

```typescript
// إضافة دالة لمسح كاش مريض معين
const clearPatientCache = (patientId: string) => {
    const state = get()
    const updatedCache = { ...state.treatmentCache }
    delete updatedCache[patientId]
    set({ treatmentCache: updatedCache })
}

// استخدامها في جميع عمليات التحديث
createToothTreatment: async (treatmentData) => {
    const newTreatment = await window.electronAPI.toothTreatments.create(treatmentData)
    
    // ✅ مسح الكاش فوراً
    clearPatientCache(treatmentData.patient_id)
    
    // ثم إعادة التحميل
    const refreshedTreatments = await window.electronAPI.toothTreatments.getByPatient(treatmentData.patient_id)
    set({ toothTreatments: refreshedTreatments })
}

updateToothTreatment: async (id, updates) => {
    await window.electronAPI.toothTreatments.update(id, updates)
    
    // ✅ مسح الكاش
    const treatment = get().toothTreatments.find(t => t.id === id)
    if (treatment) {
        clearPatientCache(treatment.patient_id)
    }
    
    // إعادة التحميل
    // ...
}

deleteToothTreatment: async (id) => {
    // ✅ مسح الكاش قبل الحذف
    const treatment = get().toothTreatments.find(t => t.id === id)
    if (treatment) {
        clearPatientCache(treatment.patient_id)
    }
    
    await window.electronAPI.toothTreatments.delete(id)
    // ...
}
```

**المزايا:**
- يضمن أن البيانات دائماً محدّثة
- يعمل مع جميع العمليات

**العيوب:**
- يزيد قليلاً من عدد الاستعلامات

---

### الحل 3: إضافة خيار "تجاهل الكاش" ✅✅✅ (الأفضل)

```typescript
loadToothTreatmentsByPatient: async (patientId: string, forceRefresh: boolean = false) => {
    const state = get()
    const cachedEntry = state.treatmentCache[patientId]
    const now = Date.now()

    // ✅ إضافة خيار لتجاهل الكاش
    if (!forceRefresh && cachedEntry && (now - cachedEntry.timestamp) < CACHE_DURATION) {
        set({ toothTreatments: cachedEntry.data })
        return
    }

    // تحميل من قاعدة البيانات
    const toothTreatments = await window.electronAPI.toothTreatments.getByPatient(patientId)
    
    // تحديث الكاش
    set({
        toothTreatments,
        treatmentCache: {
            ...state.treatmentCache,
            [patientId]: { data: toothTreatments, timestamp: now }
        }
    })
}

// الاستخدام:
// تحميل عادي (مع الكاش)
await loadToothTreatmentsByPatient(patientId)

// تحميل مع تجاهل الكاش (عند الضغط على "تحديث")
await loadToothTreatmentsByPatient(patientId, true)

// تحميل مع تجاهل الكاش (بعد إضافة/تحديث/حذف)
await loadToothTreatmentsByPatient(patientId, true)
```

**المزايا:**
- مرونة في الاستخدام
- يوازن بين الأداء والدقة
- يحل المشكلة بشكل كامل

**العيوب:**
- يتطلب تحديثات في عدة أماكن

---

### الحل 4: استخدام Real-Time Subscriptions ⭐⭐⭐ (الأمثل على المدى الطويل)

```typescript
// استخدام نظام الأحداث الموجود بالفعل
useEffect(() => {
    const handleTreatmentChange = (event: CustomEvent) => {
        const { patientId } = event.detail
        
        // إعادة تحميل العلاجات تلقائياً عند أي تغيير
        if (patientId === selectedPatientId) {
            loadToothTreatmentsByPatient(patientId, true)
        }
    }

    window.addEventListener('treatment-changed', handleTreatmentChange)
    window.addEventListener('treatment-added', handleTreatmentChange)
    window.addEventListener('treatment-updated', handleTreatmentChange)
    window.addEventListener('treatment-deleted', handleTreatmentChange)

    return () => {
        window.removeEventListener('treatment-changed', handleTreatmentChange)
        window.removeEventListener('treatment-added', handleTreatmentChange)
        window.removeEventListener('treatment-updated', handleTreatmentChange)
        window.removeEventListener('treatment-deleted', handleTreatmentChange)
    }
}, [selectedPatientId])
```

**المزايا:**
- تحديث تلقائي في الوقت الفعلي
- لا حاجة لمسح الكاش يدوياً
- تجربة مستخدم أفضل

**العيوب:**
- يتطلب إدارة دقيقة للأحداث
- قد يؤدي لتحميل زائد

---

### الحل 5: إزالة الكاش بالكامل ❌ (غير موصى به)

```typescript
// إزالة آلية الكاش تماماً
loadToothTreatmentsByPatient: async (patientId: string) => {
    set({ isLoading: true })
    
    // دائماً تحميل من قاعدة البيانات
    const toothTreatments = await window.electronAPI.toothTreatments.getByPatient(patientId)
    
    set({
        toothTreatments,
        isLoading: false
    })
}
```

**المزايا:**
- بسيط جداً
- لا مشاكل مع البيانات القديمة

**العيوب:**
- أداء أسوأ (استعلامات متكررة)
- يضع حمل أكبر على قاعدة البيانات

---

## 📊 7. مقارنة الحلول

| الحل | السهولة | الفعالية | الأداء | الموصى به |
|------|---------|----------|--------|-----------|
| تقليل مدة الكاش | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ✅ |
| مسح الكاش عند التغيير | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ✅✅ |
| خيار "تجاهل الكاش" | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ✅✅✅ |
| Real-Time Subscriptions | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| إزالة الكاش | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐ | ❌ |

---

## 🛠️ 8. التوصيات

### التوصية الفورية (يمكن تطبيقها الآن):

**الجمع بين الحل 2 والحل 3:**

1. تقليل مدة الكاش إلى 1 دقيقة
2. مسح الكاش عند أي عملية تحديث
3. إضافة خيار `forceRefresh` في جميع عمليات التحميل
4. استخدام `forceRefresh: true` عند:
   - الضغط على زر "تحديث"
   - بعد إنشاء علاج جديد
   - بعد تحديث علاج
   - بعد حذف علاج
   - عند اختيار مريض جديد

### التوصية طويلة المدى:

1. **تطبيق Real-Time Subscriptions:**
   - استخدام الأحداث الموجودة بالفعل
   - إضافة listeners في جميع الصفحات ذات الصلة
   - ضمان تحديث تلقائي في جميع الأماكن

2. **تحسين إدارة الحالة:**
   - استخدام مكتبة مثل React Query أو SWR
   - توفر إدارة ذكية للكاش
   - تحديث تلقائي عند تغيير البيانات

3. **إضافة مؤشرات تحميل أفضل:**
   - عرض حالة التحميل بوضوح
   - skeleton loaders عند تحميل البيانات
   - رسائل واضحة عند حدوث أخطاء

---

## 📝 9. ملاحظات إضافية

### نقاط القوة في النظام الحالي:
- ✅ استخدام SQLite مع better-sqlite3 (أداء عالي)
- ✅ فهارس مناسبة على قاعدة البيانات
- ✅ استعلامات محسّنة (تجنب N+1 queries)
- ✅ نظام أحداث موجود بالفعل (events system)
- ✅ Real-time sync مفعّل بالفعل

### نقاط تحتاج تحسين:
- ⚠️ إدارة الكاش بحاجة لتحسين
- ⚠️ عدم استخدام نظام الأحداث بشكل كامل
- ⚠️ عدم وجود مؤشرات تحميل كافية
- ⚠️ عدم وجود رسائل خطأ واضحة عند فشل التحميل

---

## 🎬 10. الخلاصة

### المشكلة باختصار:
العلاجات تختفي مؤقتاً بسبب استخدام بيانات قديمة من الكاش بدلاً من تحميلها من قاعدة البيانات.

### الحل الموصى به:
الجمع بين:
1. تقليل مدة الكاش (1 دقيقة)
2. مسح الكاش عند أي تغيير
3. إضافة خيار `forceRefresh`
4. استخدام نظام الأحداث الموجود

### التنفيذ:
- سهولة التطبيق: متوسطة
- الوقت المقدر: 2-3 ساعات
- التأثير: حل كامل للمشكلة

---

## 📞 للتواصل

إذا كان لديك أي أسئلة أو تحتاج لتوضيحات إضافية، أنا جاهز للمساعدة!
