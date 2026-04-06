-- Migration to add doctor_name field to settings table
-- This migration adds the doctor_name column if it doesn't exist

-- Check if doctor_name column exists, if not add it (without default dummy data)
ALTER TABLE settings ADD COLUMN doctor_name TEXT;

-- Note: No default value is set to avoid dummy data
-- Users should set their doctor name through the settings interface
