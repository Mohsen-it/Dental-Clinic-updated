import { create } from 'zustand'
import { DentalTreatmentImage, ToothTreatment } from '@/types'

// آلية تخزين مؤقت بسيطة
interface CacheEntry<T> {
  data: T
  timestamp: number
}

interface TreatmentCache {
  [patientId: string]: CacheEntry<ToothTreatment[]>
}

// ✅ CACHE FIX: Reduced TTL from 5 minutes to 1 minute to minimize stale data
// Cache duration: 1 minute
const CACHE_DURATION = 1 * 60 * 1000

interface DentalTreatmentState {
  // ✅ RACE CONDITION FIX: Separate state for different contexts
  allToothTreatments: ToothTreatment[] // All treatments (used by reports, counts)
  patientToothTreatments: ToothTreatment[] // Patient-specific treatments (dental chart)
  toothTreatments: ToothTreatment[] // DEPRECATED: Legacy field for backward compatibility
  images: DentalTreatmentImage[]
  toothTreatmentImages: any[] // Images for tooth treatments
  isLoading: boolean
  error: string | null
  selectedPatientId: string | null
  selectedToothNumber: number | null
  // كاش للعلاجات حسب المريض
  treatmentCache: TreatmentCache
  // ✅ RACE CONDITION FIX: Request guards
  allTreatmentsRequestId: number // Monotonically increasing request ID for loadToothTreatments
  patientTreatmentsRequestId: number // Monotonically increasing request ID for loadToothTreatmentsByPatient
  appointmentTreatmentsRequestId: number // Monotonically increasing request ID for loadToothTreatmentsByAppointment

  // Multiple treatments actions
  loadToothTreatments: () => Promise<void>
  loadToothTreatmentsByPatient: (patientId: string, forceRefresh?: boolean) => Promise<void>
  loadToothTreatmentsByTooth: (patientId: string, toothNumber: number) => Promise<void>
  loadToothTreatmentsByAppointment: (appointmentId: string) => Promise<ToothTreatment[]>
  createToothTreatment: (treatment: Omit<ToothTreatment, 'id' | 'created_at' | 'updated_at'>) => Promise<ToothTreatment>
  updateToothTreatment: (id: string, updates: Partial<ToothTreatment>) => Promise<void>
  deleteToothTreatment: (id: string) => Promise<void>
  reorderToothTreatments: (patientId: string, toothNumber: number, treatmentIds: string[]) => Promise<void>

  // Tooth Treatment Images actions
  loadAllToothTreatmentImages: () => Promise<void>
  loadToothTreatmentImagesByTreatment: (treatmentId: string) => Promise<void>
  loadToothTreatmentImagesByTooth: (patientId: string, toothNumber: number) => Promise<void>
  loadAllToothTreatmentImagesByPatient: (patientId: string) => Promise<void>
  createToothTreatmentImage: (image: any) => Promise<any>
  deleteToothTreatmentImage: (id: string) => Promise<void>
  clearToothTreatmentImages: () => void

  // Legacy Image actions (for dental_treatment_images table)
  loadImages: () => Promise<void>
  loadImagesByTreatment: (treatmentId: string) => Promise<void>
  createImage: (image: Omit<DentalTreatmentImage, 'id' | 'created_at' | 'updated_at'>) => Promise<DentalTreatmentImage>
  deleteImage: (id: string) => Promise<void>
  refreshAllImages: () => Promise<void>
  clearImages: () => void

  // Utility actions
  setSelectedPatient: (patientId: string | null) => void
  setSelectedTooth: (toothNumber: number | null) => void
  clearError: () => void
}

export const useDentalTreatmentStore = create<DentalTreatmentState>((set, get) => ({
  // ✅ RACE CONDITION FIX: Separate state fields
  allToothTreatments: [], // All treatments (used by reports, counts)
  patientToothTreatments: [], // Patient-specific treatments (dental chart)
  toothTreatments: [], // DEPRECATED: Legacy field, aliased to patientToothTreatments for backward compatibility
  images: [],
  toothTreatmentImages: [], // Images for tooth treatments
  isLoading: false,
  error: null,
  selectedPatientId: null,
  selectedToothNumber: null,
  treatmentCache: {},
  // ✅ RACE CONDITION FIX: Request guard counters
  allTreatmentsRequestId: 0,
  patientTreatmentsRequestId: 0,
  appointmentTreatmentsRequestId: 0,

  // Multiple treatments per tooth actions
  loadToothTreatments: async () => {
    // ✅ RACE CONDITION FIX: Increment request ID before async operation
    const currentRequestId = get().allTreatmentsRequestId + 1
    set({ 
      allTreatmentsRequestId: currentRequestId, 
      isLoading: true, 
      error: null 
    })
    
    console.log('🔵 [STORE] loadToothTreatments started - requestId:', currentRequestId)
    
    try {
      const toothTreatments = await window.electronAPI.toothTreatments.getAll()
      
      // ✅ RACE CONDITION FIX: Verify this is still the latest request before updating state
      const latestRequestId = get().allTreatmentsRequestId
      if (currentRequestId !== latestRequestId) {
        console.warn('⚠️ [STORE] Stale loadToothTreatments response ignored - requestId:', currentRequestId, 'latest:', latestRequestId)
        return // Discard stale response
      }
      
      console.log('✅ [STORE] loadToothTreatments completed - requestId:', currentRequestId, 'count:', toothTreatments.length)
      set({ 
        allToothTreatments: toothTreatments,
        toothTreatments, // Legacy field for backward compatibility
        isLoading: false 
      })
    } catch (error) {
      // ✅ RACE CONDITION FIX: Only update error if still the latest request
      const latestRequestId = get().allTreatmentsRequestId
      if (currentRequestId === latestRequestId) {
        set({
          error: error instanceof Error ? error.message : 'Failed to load tooth treatments',
          isLoading: false
        })
      }
    }
  },

  loadToothTreatmentsByPatient: async (patientId: string, forceRefresh: boolean = false) => {
    // ✅ RACE CONDITION FIX: Increment request ID BEFORE any async operation
    const currentRequestId = get().patientTreatmentsRequestId + 1
    set({ patientTreatmentsRequestId: currentRequestId })
    
    console.log('🟢 [STORE] loadToothTreatmentsByPatient called for:', patientId, 'forceRefresh:', forceRefresh, 'requestId:', currentRequestId)
    
    const state = get()
    const cachedEntry = state.treatmentCache[patientId]
    const now = Date.now()

    // ✅ CACHE FIX: Check cache only if forceRefresh is false
    // If forceRefresh is true, bypass cache completely
    if (!forceRefresh && cachedEntry && (now - cachedEntry.timestamp) < CACHE_DURATION) {
      const cacheAge = Math.round((now - cachedEntry.timestamp) / 1000)
      console.log('🟢 [STORE] Using cached treatments for patient:', patientId, '- Cache age:', cacheAge, 'seconds - requestId:', currentRequestId)
      
      // ✅ RACE CONDITION FIX: Verify this is still the latest request
      const latestRequestId = get().patientTreatmentsRequestId
      if (currentRequestId !== latestRequestId) {
        console.warn('⚠️ [STORE] Stale cache read ignored for patient:', patientId, '- requestId:', currentRequestId, 'latest:', latestRequestId)
        return
      }
      
      set({
        patientToothTreatments: cachedEntry.data,
        toothTreatments: cachedEntry.data, // Legacy field for backward compatibility
        isLoading: false,
        selectedPatientId: patientId
      })

      // Emit event to update UI even when using cache
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('treatments-loaded', {
          detail: { patientId, treatmentsCount: cachedEntry.data.length, fromCache: true }
        }))
      }
      return
    }

    // Either forceRefresh is true, or cache is expired/missing
    console.log('🟢 [STORE] Loading treatments from database for patient:', patientId, 
                forceRefresh ? '(forced refresh)' : '(cache expired/missing)', '- requestId:', currentRequestId)
    
    set({ isLoading: true, error: null })
    
    try {
      // ✅ SAFETY: Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Treatment loading timeout')), 10000)
      )
      
      const loadPromise = window.electronAPI.toothTreatments.getByPatient(patientId)
      
      const toothTreatments = await Promise.race([loadPromise, timeoutPromise]) as any[]
      
      // ✅ RACE CONDITION FIX: Verify this is still the latest request before updating state
      const latestRequestId = get().patientTreatmentsRequestId
      if (currentRequestId !== latestRequestId) {
        console.warn('⚠️ [STORE] Stale response ignored for patient:', patientId, '- requestId:', currentRequestId, 'latest:', latestRequestId, 'count:', toothTreatments.length)
        return // Discard stale response
      }
      
      console.log('✅ [STORE] Successfully loaded', toothTreatments.length, 'treatments for patient:', patientId, '- requestId:', currentRequestId)

      // ✅ CACHE FIX: Always update cache with fresh data
      const updatedCache = {
        ...get().treatmentCache, // Get fresh cache reference
        [patientId]: {
          data: toothTreatments,
          timestamp: now
        }
      }

      set({
        patientToothTreatments: toothTreatments,
        toothTreatments, // Legacy field for backward compatibility
        isLoading: false,
        selectedPatientId: patientId,
        treatmentCache: updatedCache
      })

      // Emit event to update UI
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('treatments-loaded', {
          detail: { patientId, treatmentsCount: toothTreatments.length, fromCache: false }
        }))
      }
    } catch (error) {
      console.error('🟢 [STORE] Error loading treatments for patient:', patientId, error)
      console.error('🟢 [STORE] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      
      // ✅ RACE CONDITION FIX: Only update error if still the latest request
      const latestRequestId = get().patientTreatmentsRequestId
      if (currentRequestId !== latestRequestId) {
        console.warn('⚠️ [STORE] Stale error ignored for patient:', patientId, '- requestId:', currentRequestId, 'latest:', latestRequestId)
        return
      }
      
      // ✅ SAFETY: Set empty array instead of keeping old data
      set({
        patientToothTreatments: [],
        toothTreatments: [], // Legacy field for backward compatibility
        error: error instanceof Error ? error.message : 'Failed to load patient tooth treatments',
        isLoading: false
      })
      
      // ✅ SAFETY: Show user-friendly error notification
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('treatment-load-error', {
          detail: { 
            patientId, 
            error: error instanceof Error ? error.message : 'Failed to load treatments'
          }
        }))
      }
    }
  },

  loadToothTreatmentsByTooth: async (patientId: string, toothNumber: number) => {
    // ✅ RACE CONDITION FIX: Increment request ID (use patient request ID since it's patient-specific)
    const currentRequestId = get().patientTreatmentsRequestId + 1
    set({ 
      patientTreatmentsRequestId: currentRequestId,
      isLoading: true, 
      error: null 
    })
    
    console.log('🟡 [STORE] loadToothTreatmentsByTooth started - patient:', patientId, 'tooth:', toothNumber, 'requestId:', currentRequestId)
    
    try {
      const toothTreatments = await window.electronAPI.toothTreatments.getByTooth(patientId, toothNumber)
      
      // ✅ RACE CONDITION FIX: Verify this is still the latest request
      const latestRequestId = get().patientTreatmentsRequestId
      if (currentRequestId !== latestRequestId) {
        console.warn('⚠️ [STORE] Stale tooth treatments response ignored - requestId:', currentRequestId, 'latest:', latestRequestId)
        return
      }
      
      console.log('✅ [STORE] loadToothTreatmentsByTooth completed - requestId:', currentRequestId, 'count:', toothTreatments.length)
      set({
        patientToothTreatments: toothTreatments,
        toothTreatments, // Legacy field for backward compatibility
        isLoading: false,
        selectedPatientId: patientId,
        selectedToothNumber: toothNumber
      })
    } catch (error) {
      // ✅ RACE CONDITION FIX: Only update error if still the latest request
      const latestRequestId = get().patientTreatmentsRequestId
      if (currentRequestId === latestRequestId) {
        set({
          error: error instanceof Error ? error.message : 'Failed to load tooth treatments',
          isLoading: false
        })
      }
    }
  },

  loadToothTreatmentsByAppointment: async (appointmentId: string) => {
    // ✅ RACE CONDITION FIX: Use separate request ID for appointment-specific requests
    const currentRequestId = get().appointmentTreatmentsRequestId + 1
    set({ 
      appointmentTreatmentsRequestId: currentRequestId,
      isLoading: true, 
      error: null 
    })
    
    console.log('🟠 [STORE] loadToothTreatmentsByAppointment started - appointmentId:', appointmentId, 'requestId:', currentRequestId)
    
    try {
      const toothTreatments = await window.electronAPI.toothTreatments.getByAppointment(appointmentId)
      
      // ✅ RACE CONDITION FIX: Verify this is still the latest request
      const latestRequestId = get().appointmentTreatmentsRequestId
      if (currentRequestId !== latestRequestId) {
        console.warn('⚠️ [STORE] Stale appointment treatments response ignored - requestId:', currentRequestId, 'latest:', latestRequestId)
        return []
      }
      
      console.log('✅ [STORE] loadToothTreatmentsByAppointment completed - requestId:', currentRequestId, 'count:', toothTreatments.length)
      set({
        patientToothTreatments: toothTreatments,
        toothTreatments, // Legacy field for backward compatibility
        isLoading: false
      })
      return toothTreatments
    } catch (error) {
      // ✅ RACE CONDITION FIX: Only update error if still the latest request
      const latestRequestId = get().appointmentTreatmentsRequestId
      if (currentRequestId === latestRequestId) {
        set({
          error: error instanceof Error ? error.message : 'Failed to load tooth treatments by appointment',
          isLoading: false
        })
      }
      return []
    }
  },

  createToothTreatment: async (treatmentData) => {
    set({ isLoading: true, error: null })
    try {
      const newTreatment = await window.electronAPI.toothTreatments.create(treatmentData)
      const { treatmentCache } = get()

      // ✅ CACHE FIX: Clear cache for the affected patient immediately
      const updatedCache = { ...treatmentCache }
      if (treatmentData.patient_id) {
        delete updatedCache[treatmentData.patient_id]
        console.log('🦷 [STORE] Cache invalidated for patient after create:', treatmentData.patient_id)
      }

      // Update cache state immediately (before reload)
      set({
        isLoading: false,
        treatmentCache: updatedCache
      })

      // ✅ CACHE FIX: Force refresh from database to ensure consistency
      // This will bypass cache and fetch fresh data
      const store = get()
      if (store.selectedPatientId && store.selectedPatientId === treatmentData.patient_id) {
        console.log('🦷 [STORE] Force reloading treatments after create')
        await store.loadToothTreatmentsByPatient(treatmentData.patient_id, true)
      }

      // Emit events for real-time sync
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('treatment-added', {
          detail: {
            type: 'created',
            treatmentId: newTreatment.id,
            treatment: newTreatment
          }
        }))
        window.dispatchEvent(new CustomEvent('treatment-changed', {
          detail: {
            type: 'created',
            treatmentId: newTreatment.id,
            treatment: newTreatment
          }
        }))
      }

      return newTreatment
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create tooth treatment',
        isLoading: false
      })
      throw error
    }
  },

  updateToothTreatment: async (id: string, updates: Partial<ToothTreatment>) => {
    set({ isLoading: true, error: null })
    try {
      console.log('🦷 [STORE] Updating treatment in database:', id, updates)
      await window.electronAPI.toothTreatments.update(id, updates)
      console.log('🦷 [STORE] Database update successful')

      const { toothTreatments, treatmentCache } = get()

      // ✅ CACHE FIX: Find the updated treatment and clear its patient cache
      const updatedTreatment = toothTreatments.find(t => t.id === id)
      const updatedCache = { ...treatmentCache }
      if (updatedTreatment?.patient_id) {
        delete updatedCache[updatedTreatment.patient_id]
        console.log('🦷 [STORE] Cache invalidated for patient after update:', updatedTreatment.patient_id)
      }

      // Update cache state immediately
      set({
        isLoading: false,
        treatmentCache: updatedCache
      })

      // ✅ CACHE FIX: Force refresh from database to ensure consistency
      const store = get()
      if (store.selectedPatientId && updatedTreatment?.patient_id === store.selectedPatientId) {
        console.log('🦷 [STORE] Force reloading treatments after update')
        await store.loadToothTreatmentsByPatient(store.selectedPatientId, true)
      }

      // Emit events for real-time sync
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('treatment-updated', {
          detail: {
            type: 'updated',
            treatmentId: id,
            updates: updates
          }
        }))
        window.dispatchEvent(new CustomEvent('treatment-changed', {
          detail: {
            type: 'updated',
            treatmentId: id,
            updates: updates
          }
        }))

        // Emit event to update tooth colors immediately
        window.dispatchEvent(new CustomEvent('tooth-color-update', {
          detail: {
            type: 'status-changed',
            treatmentId: id,
            updates: updates,
            timestamp: Date.now()
          }
        }))
      }

      console.log('🦷 [STORE] Treatment update completed successfully')
    } catch (error) {
      console.error('🦷 [STORE] Error updating treatment:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to update tooth treatment',
        isLoading: false
      })
      throw error
    }
  },

  deleteToothTreatment: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const { toothTreatments, treatmentCache } = get()

      // ✅ CACHE FIX: Find the deleted treatment BEFORE deletion
      const deletedTreatment = toothTreatments.find(t => t.id === id)
      const patientId = deletedTreatment?.patient_id

      await window.electronAPI.toothTreatments.delete(id)

      // ✅ CACHE FIX: Clear cache for the affected patient
      const updatedCache = { ...treatmentCache }
      if (patientId) {
        delete updatedCache[patientId]
        console.log('🦷 [STORE] Cache invalidated for patient after delete:', patientId)
      }

      // Update cache state immediately
      set({
        isLoading: false,
        treatmentCache: updatedCache
      })

      // ✅ CACHE FIX: Force refresh from database to ensure consistency
      const store = get()
      if (store.selectedPatientId && patientId === store.selectedPatientId) {
        console.log('🦷 [STORE] Force reloading treatments after delete')
        await store.loadToothTreatmentsByPatient(store.selectedPatientId, true)
      }

      // Emit events for real-time sync
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('treatment-deleted', {
          detail: {
            type: 'deleted',
            treatmentId: id
          }
        }))
        window.dispatchEvent(new CustomEvent('treatment-changed', {
          detail: {
            type: 'deleted',
            treatmentId: id
          }
        }))
        // Emit event for payment store to update
        window.dispatchEvent(new CustomEvent('treatment-payments-deleted', {
          detail: {
            treatmentId: id
          }
        }))
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete tooth treatment',
        isLoading: false
      })
      throw error
    }
  },

  reorderToothTreatments: async (patientId: string, toothNumber: number, treatmentIds: string[]) => {
    set({ isLoading: true, error: null })
    try {
      await window.electronAPI.toothTreatments.reorder(patientId, toothNumber, treatmentIds)

      // Reload treatments for this tooth to get updated priorities
      const refreshedTreatments = await window.electronAPI.toothTreatments.getByTooth(patientId, toothNumber)
      const { toothTreatments } = get()

      // Update only the treatments for this specific tooth
      const updatedTreatments = toothTreatments.map(treatment => {
        if (treatment.patient_id === patientId && treatment.tooth_number === toothNumber) {
          const refreshed = refreshedTreatments.find(rt => rt.id === treatment.id)
          return refreshed || treatment
        }
        return treatment
      })

      // ✅ RACE CONDITION FIX: Update both patient and legacy fields
      set({ 
        patientToothTreatments: updatedTreatments,
        toothTreatments: updatedTreatments, // Legacy field for backward compatibility
        isLoading: false 
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to reorder tooth treatments',
        isLoading: false
      })
      throw error
    }
  },

  loadImages: async () => {
    set({ isLoading: true, error: null })
    try {
      const images = await window.electronAPI.dentalTreatmentImages.getAll()
      set({ images, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load images',
        isLoading: false
      })
    }
  },

  loadImagesByTreatment: async (treatmentId: string) => {
    set({ isLoading: true, error: null })
    try {
      const images = await window.electronAPI.dentalTreatmentImages.getByTreatment(treatmentId)
      set({ images, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load treatment images',
        isLoading: false
      })
    }
  },

  createImage: async (imageData) => {
    set({ isLoading: true, error: null })
    try {
      const newImage = await window.electronAPI.dentalTreatmentImages.create(imageData)
      const { images } = get()
      set({
        images: [...images, newImage],
        isLoading: false
      })
      return newImage
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create image',
        isLoading: false
      })
      throw error
    }
  },

  deleteImage: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await window.electronAPI.dentalTreatmentImages.delete(id)
      const { images } = get()
      const filteredImages = images.filter(image => image.id !== id)
      set({ images: filteredImages, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete image',
        isLoading: false
      })
    }
  },

  refreshAllImages: async () => {
    set({ isLoading: true, error: null })
    try {
      const images = await window.electronAPI.dentalTreatmentImages.getAll()
      set({ images, isLoading: false })
      console.log('✅ All images refreshed after backup restore')
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to refresh images',
        isLoading: false
      })
    }
  },

  clearImages: () => {
    set({ images: [] })
  },



  setSelectedPatient: (patientId: string | null) => {
    set({ selectedPatientId: patientId })
  },

  setSelectedTooth: (toothNumber: number | null) => {
    set({ selectedToothNumber: toothNumber })
  },

  clearError: () => {
    set({ error: null })
  },

  // NEW: Tooth Treatment Images actions
  loadAllToothTreatmentImages: async () => {
    set({ isLoading: true, error: null })
    try {
      const allImages = await window.electronAPI.toothTreatmentImages.getAll()
      set({ toothTreatmentImages: allImages, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load all tooth treatment images',
        isLoading: false
      })
    }
  },

  loadToothTreatmentImagesByTreatment: async (treatmentId: string) => {
    set({ isLoading: true, error: null })
    try {
      const images = await window.electronAPI.toothTreatmentImages.getByTreatment(treatmentId)
      set({ toothTreatmentImages: images, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load tooth treatment images',
        isLoading: false
      })
    }
  },

  loadToothTreatmentImagesByTooth: async (patientId: string, toothNumber: number) => {
    set({ isLoading: true, error: null })
    try {
      const newImages = await window.electronAPI.toothTreatmentImages.getByTooth(patientId, toothNumber)
      const { toothTreatmentImages } = get()

      // Remove existing images for this tooth and patient, then add new ones
      const filteredImages = toothTreatmentImages.filter(img =>
        !(img.tooth_number === toothNumber && img.patient_id === patientId)
      )

      set({
        toothTreatmentImages: [...filteredImages, ...newImages],
        isLoading: false
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load tooth treatment images',
        isLoading: false
      })
    }
  },

  createToothTreatmentImage: async (imageData: any) => {
    set({ isLoading: true, error: null })
    try {
      const newImage = await window.electronAPI.toothTreatmentImages.create(imageData)
      const { toothTreatmentImages } = get()
      set({
        toothTreatmentImages: [...toothTreatmentImages, newImage],
        isLoading: false
      })
      return newImage
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create tooth treatment image',
        isLoading: false
      })
      throw error
    }
  },

  deleteToothTreatmentImage: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await window.electronAPI.toothTreatmentImages.delete(id)
      const { toothTreatmentImages } = get()
      set({
        toothTreatmentImages: toothTreatmentImages.filter(img => img.id !== id),
        isLoading: false
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete tooth treatment image',
        isLoading: false
      })
      throw error
    }
  },

  clearToothTreatmentImages: () => {
    set({ toothTreatmentImages: [] })
  },

  loadAllToothTreatmentImagesByPatient: async (patientId: string) => {
    set({ isLoading: true, error: null })
    try {
      // Get all images for this patient from all teeth
      const allImages = await window.electronAPI.toothTreatmentImages.getAll()
      const patientImages = allImages.filter(img => img.patient_id === patientId)

      set({
        toothTreatmentImages: patientImages,
        isLoading: false
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load all tooth treatment images',
        isLoading: false
      })
    }
  }
}))
