/*
  # Add contact fields to clients table
  
  1. New Fields
    - contact_name (text)
    - contact_firstname (text) 
    - contact_email (text)
    - contact_phone (text)
    - id_number (text)
    - vat_number (text)
    - credit_days (integer)

  2. Changes
    - Add new columns for better contact management
    - Add fields for tax and credit information
*/

-- Add new columns if they don't exist
ALTER TABLE clients 
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_firstname text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS id_number text,
  ADD COLUMN IF NOT EXISTS vat_number text,
  ADD COLUMN IF NOT EXISTS credit_days integer DEFAULT 30;

-- Add indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_clients_contact_name ON clients(contact_name);
CREATE INDEX IF NOT EXISTS idx_clients_contact_email ON clients(contact_email);
CREATE INDEX IF NOT EXISTS idx_clients_contact_phone ON clients(contact_phone);