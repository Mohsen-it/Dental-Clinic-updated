import type {
  PatientIntegratedData,
  Patient,
  Appointment,
  ToothTreatment,
  Payment,
  Prescription,
  LabOrder,
  PatientTreatmentTimeline,
  TreatmentPlan
} from '@/types'

/**
 * خدمة التكامل الشامل للمريض
 * تجمع جميع البيانات المرتبطة بالمريض من مختلف الجداول
 */
export class PatientIntegrationService {

  /**
   * جلب جميع البيانات المتكاملة للمريض
   */
  static async getPatientIntegratedData(patientId: string): Promise<PatientIntegratedData | null> {
    try {
      // جلب بيانات المريض الأساسية من جميع المرضى
      const allPatients = await window.electronAPI?.patients?.getAll?.() || []
      const patient = allPatients.find(p => p.id === patientId)

      if (!patient) {
        throw new Error('المريض غير موجود')
      }

      // جلب جميع البيانات المرتبطة بالمريض بشكل متوازي
      const [
        appointments,
        treatments,
        payments,
        prescriptions,
        labOrders,
        timeline,
        treatmentPlans
      ] = await Promise.all([
        this.getPatientAppointments(patientId),
        this.getPatientTreatments(patientId),
        this.getPatientPayments(patientId),
        this.getPatientPrescriptions(patientId),
        this.getPatientLabOrders(patientId),
        this.getPatientTimeline(patientId),
        this.getPatientTreatmentPlans(patientId)
      ])

      // حساب الإحصائيات
      const stats = this.calculatePatientStats({
        appointments,
        treatments,
        payments,
        prescriptions,
        labOrders
      })

      return {
        patient,
        appointments,
        treatments,
        payments,
        prescriptions,
        labOrders,
        timeline,
        treatmentPlans,
        stats
      }
    } catch (error) {
      console.error('خطأ في جلب البيانات المتكاملة للمريض:', error)
      return null
    }
  }

  /**
   * جلب مواعيد المريض
   */
  private static async getPatientAppointments(patientId: string): Promise<Appointment[]> {
    try {
      return await window.electronAPI?.appointments?.getByPatient?.(patientId) || []
    } catch (error) {
      console.error('خطأ في جلب مواعيد المريض:', error)
      return []
    }
  }

  /**
   * جلب علاجات المريض
   */
  private static async getPatientTreatments(patientId: string): Promise<ToothTreatment[]> {
    try {
      return await window.electronAPI?.toothTreatments?.getByPatient?.(patientId) || []
    } catch (error) {
      console.error('خطأ في جلب علاجات المريض:', error)
      return []
    }
  }

  /**
   * جلب دفعات المريض
   */
  private static async getPatientPayments(patientId: string): Promise<Payment[]> {
    try {
      return await window.electronAPI?.payments?.getByPatient?.(patientId) || []
    } catch (error) {
      console.error('خطأ في جلب دفعات المريض:', error)
      return []
    }
  }

  /**
   * جلب وصفات المريض
   */
  private static async getPatientPrescriptions(patientId: string): Promise<Prescription[]> {
    try {
      return await window.electronAPI?.prescriptions?.getByPatient?.(patientId) || []
    } catch (error) {
      console.error('خطأ في جلب وصفات المريض:', error)
      return []
    }
  }

  /**
   * جلب طلبات المختبر للمريض
   */
  private static async getPatientLabOrders(patientId: string): Promise<LabOrder[]> {
    try {
      return await window.electronAPI?.labOrders?.getByPatient?.(patientId) || []
    } catch (error) {
      console.error('خطأ في جلب طلبات المختبر للمريض:', error)
      return []
    }
  }

  /**
   * جلب الجدول الزمني للمريض
   */
  private static async getPatientTimeline(patientId: string): Promise<PatientTreatmentTimeline[]> {
    try {
      return await window.electronAPI?.patientTimeline?.getByPatient?.(patientId) || []
    } catch (error) {
      console.error('خطأ في جلب الجدول الزمني للمريض:', error)
      return []
    }
  }

  /**
   * جلب خطط العلاج للمريض
   */
  private static async getPatientTreatmentPlans(patientId: string): Promise<TreatmentPlan[]> {
    try {
      return await window.electronAPI?.treatmentPlans?.getByPatient?.(patientId) || []
    } catch (error) {
      console.error('خطأ في جلب خطط العلاج للمريض:', error)
      return []
    }
  }

  /**
   * حساب إحصائيات المريض
   */
  private static calculatePatientStats(data: {
    appointments: Appointment[]
    treatments: ToothTreatment[]
    payments: Payment[]
    prescriptions: Prescription[]
    labOrders: LabOrder[]
  }) {
    const { appointments, treatments, payments } = data

    // حساب إجمالي المواعيد
    const totalAppointments = appointments.length

    // حساب العلاجات المكتملة والمعلقة
    const completedTreatments = treatments.filter(t => t.treatment_status === 'completed').length
    const pendingTreatments = treatments.filter(t => t.treatment_status === 'planned' || t.treatment_status === 'in_progress').length

    // حساب المبالغ المالية بالطريقة الصحيحة
    let totalPaid = 0
    let totalDue = 0

    // حساب المدفوعات المرتبطة بالمواعيد
    appointments.forEach(appointment => {
      if (appointment.cost) {
        const appointmentPayments = payments.filter(p => p.appointment_id === appointment.id)
        const appointmentTotalPaid = appointmentPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
        totalDue += appointment.cost
        totalPaid += appointmentTotalPaid
      }
    })

    // إضافة المدفوعات العامة غير المرتبطة بمواعيد
    const generalPayments = payments.filter(payment => !payment.appointment_id)
    generalPayments.forEach(payment => {
      totalPaid += payment.amount || 0
      if (payment.total_amount_due) {
        totalDue += payment.total_amount_due
      }
    })

    // حساب المبلغ المتبقي بشكل صحيح: الإجمالي المطلوب - الإجمالي المدفوع
    const remainingBalance = Math.max(0, totalDue - totalPaid)

    // آخر زيارة
    const lastVisit = appointments
      .filter(apt => apt.status === 'completed')
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0]?.start_time

    // الموعد القادم
    const nextAppointment = appointments
      .filter(apt => apt.status === 'scheduled' && new Date(apt.start_time) > new Date())
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0]?.start_time

    return {
      totalAppointments,
      completedTreatments,
      pendingTreatments,
      totalPaid,
      remainingBalance,
      lastVisit,
      nextAppointment
    }
  }

  /**
   * إنشاء حدث في الجدول الزمني للمريض
   */
  static async createTimelineEvent(event: Omit<PatientTreatmentTimeline, 'id' | 'created_at' | 'updated_at'>): Promise<PatientTreatmentTimeline | null> {
    try {
      return await window.electronAPI?.patientTimeline?.create?.(event) || null
    } catch (error) {
      console.error('خطأ في إنشاء حدث الجدول الزمني:', error)
      return null
    }
  }

  /**
   * ربط الوصفة بعلاج سن محدد
   */
  static async linkPrescriptionToTreatment(prescriptionId: string, toothTreatmentId: string): Promise<boolean> {
    try {
      const result = await window.electronAPI?.prescriptions?.update?.(prescriptionId, {
        tooth_treatment_id: toothTreatmentId
      })
      return !!result
    } catch (error) {
      console.error('خطأ في ربط الوصفة بالعلاج:', error)
      return false
    }
  }

  /**
   * ربط طلب المختبر بعلاج سن محدد
   */
  static async linkLabOrderToTreatment(labOrderId: string, toothTreatmentId: string, appointmentId?: string): Promise<boolean> {
    try {
      const updateData: any = { tooth_treatment_id: toothTreatmentId }
      if (appointmentId) {
        updateData.appointment_id = appointmentId
      }

      const result = await window.electronAPI?.labOrders?.update?.(labOrderId, updateData)
      return !!result
    } catch (error) {
      console.error('خطأ في ربط طلب المختبر بالعلاج:', error)
      return false
    }
  }

  /**
   * الحصول على تقرير شامل للمريض
   */
  static async generatePatientReport(patientId: string): Promise<any> {
    const integratedData = await this.getPatientIntegratedData(patientId)
    if (!integratedData) {
      throw new Error('لا يمكن جلب بيانات المريض')
    }

    return {
      patient: integratedData.patient,
      summary: integratedData.stats,
      treatmentHistory: integratedData.treatments,
      appointmentHistory: integratedData.appointments,
      financialSummary: {
        totalPaid: integratedData.stats.totalPaid,
        remainingBalance: integratedData.stats.remainingBalance,
        paymentHistory: integratedData.payments
      },
      prescriptionHistory: integratedData.prescriptions,
      labOrderHistory: integratedData.labOrders,
      timeline: integratedData.timeline,
      treatmentPlans: integratedData.treatmentPlans,
      generatedAt: new Date().toISOString()
    }
  }
}
