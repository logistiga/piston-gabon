/*
  # Update tickets table status constraint
  
  1. Changes
    - Update status check constraint to use correct values
    - Make description field nullable
    - Add default status value
*/

-- Drop existing check constraint if it exists
ALTER TABLE tickets 
  DROP CONSTRAINT IF EXISTS tickets_statut_check;

-- Add new check constraint with correct values
ALTER TABLE tickets
  ADD CONSTRAINT tickets_statut_check 
  CHECK (statut IN ('en_attente', 'payé', 'annulé'));

-- Make description nullable and add default status
ALTER TABLE tickets 
  ALTER COLUMN description DROP NOT NULL,
  ALTER COLUMN statut SET DEFAULT 'en_attente';

-- Add index for status field
CREATE INDEX IF NOT EXISTS idx_tickets_statut ON tickets(statut);