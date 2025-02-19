-- Drop existing views that depend on payments table
DROP VIEW IF EXISTS payment_details;
DROP VIEW IF EXISTS bank_transactions_details;
DROP VIEW IF EXISTS cash_register_details;

-- Create a temporary table to store payment data
CREATE TEMP TABLE temp_payments AS SELECT * FROM payments;

-- Drop and recreate payments table with proper structure
DROP TABLE payments CASCADE;

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_type text NOT NULL CHECK (payment_type IN ('sale', 'purchase')),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'check', 'bank_transfer')),
  document_type text NOT NULL CHECK (document_type IN ('ticket', 'invoice', 'purchase_order')),
  document_id uuid NOT NULL,
  amount decimal(12,2) NOT NULL CHECK (amount > 0),
  total_amount decimal(12,2) NOT NULL,
  payment_date timestamptz NOT NULL DEFAULT now(),
  reference text,
  notes text,
  bank_id uuid REFERENCES banks(id),
  check_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Copy data back with new structure
INSERT INTO payments (
  id,
  payment_type,
  payment_method,
  document_type,
  document_id,
  amount,
  total_amount,
  payment_date,
  reference,
  notes,
  bank_id,
  check_number,
  created_at,
  updated_at
)
SELECT
  id,
  CASE 
    WHEN entity_type IN ('ticket', 'invoice') THEN 'sale'
    WHEN entity_type = 'purchase_order' THEN 'purchase'
  END,
  payment_method,
  entity_type,
  entity_id::uuid,
  amount,
  total_amount,
  payment_date,
  reference,
  notes,
  bank_id,
  check_number,
  created_at,
  updated_at
FROM temp_payments;

-- Drop temporary table
DROP TABLE temp_payments;

-- Recreate payment_details view
CREATE VIEW payment_details AS
WITH payment_info AS (
  SELECT 
    p.id,
    p.payment_type,
    p.payment_method,
    p.document_type,
    p.document_id,
    p.amount,
    p.payment_date,
    p.reference,
    p.notes,
    p.bank_id,
    p.check_number,
    b.name as bank_name,
    CASE 
      WHEN p.document_type = 'ticket' THEN (
        SELECT t.reference || ' - ' || t.client_nom
        FROM tickets t
        WHERE t.id = p.document_id
      )
      WHEN p.document_type = 'invoice' THEN (
        SELECT i.reference || ' - ' || i.client_nom
        FROM invoices i
        WHERE i.id = p.document_id
      )
      WHEN p.document_type = 'purchase_order' THEN (
        SELECT po.reference || ' - ' || po.supplier_name
        FROM purchase_orders po
        WHERE po.id = p.document_id
      )
    END as document_info,
    CASE
      WHEN p.payment_method = 'cash' THEN 'Espèces'
      WHEN p.payment_method = 'check' THEN 'Chèque'
      WHEN p.payment_method = 'bank_transfer' THEN 'Virement'
    END as payment_type_label
  FROM payments p
  LEFT JOIN banks b ON p.bank_id = b.id
)
SELECT * FROM payment_info;

-- Add indexes for better performance
CREATE INDEX idx_payments_document_type ON payments(document_type);
CREATE INDEX idx_payments_document_id ON payments(document_id);
CREATE INDEX idx_payments_payment_type ON payments(payment_type);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);

-- Add helpful comments
COMMENT ON TABLE payments IS 'Stores all payment transactions';
COMMENT ON COLUMN payments.payment_type IS 'Type of payment (sale or purchase)';
COMMENT ON COLUMN payments.document_type IS 'Type of document being paid';
COMMENT ON COLUMN payments.document_id IS 'ID of the document being paid';
COMMENT ON VIEW payment_details IS 'View showing payment details with proper column references';