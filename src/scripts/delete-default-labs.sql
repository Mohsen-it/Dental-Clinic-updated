-- سكريبت حذف المختبرات الافتراضية من قاعدة البيانات
-- هذا السكريبت يحذف المختبرات التي تم إنشاؤها افتراضياً في النظام

DELETE FROM labs WHERE id IN ('lab_1', 'lab_2', 'lab_3', 'lab_4', 'lab_5');

-- التحقق من النتائج
SELECT 'تم حذف المختبرات الافتراضية بنجاح' as status;

-- عرض المختبرات المتبقية
SELECT COUNT(*) as remaining_labs_count FROM labs;