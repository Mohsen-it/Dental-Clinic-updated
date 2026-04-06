# All Patients Treatment Counts Fix

## Problem

After separating `allToothTreatments` and `patientToothTreatments` in the Zustand store, the "Show all patients" view was displaying patients but **without treatment counts**. The counts showed as 0 for all patients.

### Root Cause

The patient list component was computing treatment counts using the `toothTreatments` field, which is now aliased to `patientToothTreatments`. When viewing all patients (not a specific patient), `patientToothTreatments` is empty or only contains data for the last selected patient, causing counts to be missing.

## Solution

### 1. Use `allToothTreatments` for Counts

Updated the DentalTreatments page to use `allToothTreatments` instead of `toothTreatments` when computing per-patient statistics.

**Before:**
```typescript
const getPatientTreatmentCount = (patientId: string) => {
  const newSystemCount = toothTreatments.filter(t => t.patient_id === patientId).length
  return newSystemCount
}
```

**After:**
```typescript
const getPatientTreatmentCount = (patientId: string) => {
  return treatmentCountsByPatient.get(patientId) || 0
}
```

### 2. Memoized Maps for Performance

Created three memoized maps to avoid recomputing counts on every render:

#### a) Treatment Counts by Patient
```typescript
const treatmentCountsByPatient = useMemo(() => {
  const counts = new Map<string, number>()
  allToothTreatments.forEach(treatment => {
    const patientId = treatment.patient_id
    counts.set(patientId, (counts.get(patientId) || 0) + 1)
  })
  return counts
}, [allToothTreatments])
```

**Benefits:**
- O(n) pre-computation once when `allToothTreatments` changes
- O(1) lookup per patient when rendering table
- No repeated filtering operations

#### b) Treatment Stats by Patient (with status breakdown)
```typescript
const treatmentStatsByPatient = useMemo(() => {
  const stats = new Map<string, { 
    total: number
    completed: number
    inProgress: number
    planned: number 
  }>()
  
  allToothTreatments.forEach(treatment => {
    const patientId = treatment.patient_id
    const existing = stats.get(patientId) || { 
      total: 0, completed: 0, inProgress: 0, planned: 0 
    }
    
    existing.total++
    if (treatment.treatment_status === 'completed') existing.completed++
    else if (treatment.treatment_status === 'in_progress') existing.inProgress++
    else if (treatment.treatment_status === 'planned') existing.planned++
    
    stats.set(patientId, existing)
  })
  
  return stats
}, [allToothTreatments])
```

**Benefits:**
- Single pass through treatments
- Status breakdown available for each patient
- Used by `getPatientTreatmentStats()`

#### c) Last Treatment Date by Patient
```typescript
const lastTreatmentDateByPatient = useMemo(() => {
  const dates = new Map<string, string>()
  
  allToothTreatments.forEach(treatment => {
    const patientId = treatment.patient_id
    const existingDate = dates.get(patientId)
    
    if (!existingDate || new Date(treatment.created_at) > new Date(existingDate)) {
      dates.set(patientId, treatment.created_at)
    }
  })
  
  return dates
}, [allToothTreatments])
```

**Benefits:**
- No sorting required (finds max date in single pass)
- O(1) lookup per patient
- Used by `getLastTreatmentDate()`

### 3. Load All Treatments When Showing All Patients

Added a callback to ensure `loadToothTreatments()` is called when the user clicks "Show all patients" button.

**PatientSelectionTable.tsx:**
```typescript
interface PatientSelectionTableProps {
  // ... other props
  onShowAllPatients?: () => void // New callback
}

// In button handler:
onClick={() => {
  const newShowAllState = !showAllPatients
  setShowAllPatients(newShowAllState)
  
  // Trigger loading all treatments when showing all patients
  if (newShowAllState && onShowAllPatients) {
    onShowAllPatients()
  }
}}
```

**DentalTreatments.tsx:**
```typescript
<PatientSelectionTable
  // ... other props
  onShowAllPatients={() => {
    console.log('🔄 [TREATMENTS_PAGE] Loading all treatments for patient list...')
    loadToothTreatments()
  }}
/>
```

**Why needed?**
- When a patient is selected, only their treatments are loaded (`patientToothTreatments`)
- When switching back to "all patients" view, we need to ensure `allToothTreatments` is populated
- The initial load already calls `loadToothTreatments()` on mount, but this handles the case where user navigates back to all patients view

## Files Modified

### 1. `src/pages/DentalTreatments.tsx`
**Changes:**
- Imported `useMemo` from React
- Destructured `allToothTreatments` and `patientToothTreatments` from store
- Added three memoized maps: `treatmentCountsByPatient`, `treatmentStatsByPatient`, `lastTreatmentDateByPatient`
- Updated `getPatientTreatmentCount()` to use memoized map
- Updated `getPatientTreatmentStats()` to use memoized map
- Updated `getLastTreatmentDate()` to use memoized map
- Added `onShowAllPatients` callback to `PatientSelectionTable` component

### 2. `src/components/dental/PatientSelectionTable.tsx`
**Changes:**
- Added optional `onShowAllPatients` prop to interface
- Updated button click handler to call `onShowAllPatients()` when showing all patients
- Added console log for debugging

## Performance Impact

### Before (O(n × m))
For each of `m` patients in the table:
- Filter all `n` treatments: O(n)
- Total: O(n × m) for counts + O(n × m × log n) for last dates (sorting)

**Example:** 100 patients, 1000 treatments = 100,000 operations per render

### After (O(n + m))
- One-time memoized computation: O(n) when `allToothTreatments` changes
- Render table: O(m) lookups (constant time per patient)
- Total: O(n + m)

**Example:** 100 patients, 1000 treatments = 1,100 operations per render

**Improvement:** ~99% reduction in operations for typical cases

## Testing Scenarios

### Scenario 1: Initial Load
1. Open DentalTreatments page
2. **Expected:** All patients displayed with correct treatment counts
3. **Verify:** Check console for "Loading all treatments" log

### Scenario 2: Select Patient, Then Show All
1. Start at all patients view
2. Click "Select" on a patient
3. Table shows only selected patient
4. Click "عرض جميع المرضى" (Show all patients)
5. **Expected:** All patients displayed with correct counts
6. **Verify:** Console shows "Loading all treatments for patient list"

### Scenario 3: Multiple Patient Switches
1. Select Patient A → shows Patient A treatments
2. Click "Show all patients" → shows all patients with counts
3. Select Patient B → shows Patient B treatments
4. Click "Show all patients" → shows all patients with counts
5. **Expected:** Counts remain accurate throughout

### Scenario 4: Real-time Updates
1. View all patients with counts
2. Open patient details in another window
3. Add a new treatment for a patient
4. **Expected:** Count updates in the patient list
5. **Verify:** Memoized map recomputes when `allToothTreatments` changes

## Debugging

**Console Logs Added:**
```
🔄 [TREATMENTS_PAGE] Loading all treatments for patient list...
```

**Inspect Memoized Maps:**
```typescript
// In browser console:
// Access the store
const store = window.__ZUSTAND_STORES__?.dentalTreatmentStore?.getState()

// Check allToothTreatments
console.log('All treatments:', store.allToothTreatments.length)

// Check counts are correct
const counts = new Map()
store.allToothTreatments.forEach(t => {
  counts.set(t.patient_id, (counts.get(t.patient_id) || 0) + 1)
})
console.log('Counts by patient:', counts)
```

## Summary

**Problem:** Treatment counts showed as 0 in "all patients" view after race condition fix.

**Root Cause:** Used `toothTreatments` (patient-specific) instead of `allToothTreatments` (global).

**Solution:**
1. ✅ Use `allToothTreatments` for computing per-patient statistics
2. ✅ Created memoized maps for O(1) lookup performance
3. ✅ Added callback to reload all treatments when showing all patients

**Performance:** 99% reduction in computation per render (from O(n × m) to O(n + m))

**Files Modified:**
- `src/pages/DentalTreatments.tsx` - Core logic and memoization
- `src/components/dental/PatientSelectionTable.tsx` - Button callback
