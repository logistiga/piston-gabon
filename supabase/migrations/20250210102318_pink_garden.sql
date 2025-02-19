/*
  # Payment System Schema Update

  1. Changes
    - Add payment status tracking
    - Create payment and cash register tables
    - Add proper indexing and triggers
    
  2. Security
    - Enable RLS on all tables
    - Add appropriate policies
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS cash_register CASCADE;
DROP TABLE IF EXISTS payments CASCADE;

-- Add payment status to existing tables if not exists
DO $$ BEGIN
  -- Add payment_status to tickets
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tickets' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE tickets 
      ADD COLUMN payment_status text DEFAULT 'pending' 
      CHECK (payment_status IN ('pending', 'partial', 'completed'));
  END IF;

  -- Add payment_status to invoices
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE invoices 
      ADD COLUMN payment_status text DEFAULT 'pending' 
      CHECK (payment_status IN ('pending', 'partial', 'completed'));
  END IF;
END $$;

-- Create payments table
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('ticket', 'invoice', 'quote')),
  entity_id uuid NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'check', 'bank_transfer')),
  amount decimal(12,2) NOT NULL CHECK (amount > 0),
  total_amount decimal(12,2) NOT NULL,
  remaining_amount decimal(12,2) GENERATED ALWAYS AS (total_amount - amount) STORED,
  payment_date timestamptz DEFAULT now(),
  reference text,
  notes text,
  bank_id uuid REFERENCES banks(id),
  check_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create cash register table
CREATE TABLE cash_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type text NOT NULL CHECK (operation_type IN ('income', 'expense')),
  amount decimal(12,2) NOT NULL CHECK (amount > 0),
  payment_id uuid REFERENCES payments(id),
  reason text NOT NULL,
  reference text,
  operation_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register ENABLE ROW LEVEL SECURITY;

-- Create unified CRUD policies
CREATE POLICY "payments_crud_policy" ON payments
  USING (true)
  WITH CHECK (true);

CREATE POLICY "cash_register_crud_policy" ON cash_register
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_payments_entity_type ON payments(entity_type);
CREATE INDEX idx_payments_entity_id ON payments(entity_id);
CREATE INDEX idx_payments_payment_method ON payments(payment_method);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
CREATE INDEX idx_cash_register_operation_type ON cash_register(operation_type);
CREATE INDEX idx_cash_register_operation_date ON cash_register(operation_date);

-- Create audit triggers
CREATE TRIGGER audit_payments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_cash_register_trigger
  AFTER INSERT OR UPDATE OR DELETE ON cash_register
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Add helpful comments
COMMENT ON TABLE payments IS 'Tracks all payments with their type and status';
COMMENT ON TABLE cash_register IS 'Tracks cash register operations (income/expense)';