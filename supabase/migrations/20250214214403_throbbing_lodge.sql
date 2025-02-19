-- Drop existing views that depend on payments
DROP VIEW IF EXISTS payment_details;
DROP VIEW IF EXISTS bank_transactions_details;
DROP VIEW IF EXISTS cash_register_details;

-- Create a temporary table to store payment data
CREATE TEMP TABLE temp_payments AS SELECT * FROM payments;

-- Drop and recreate payments table with proper structure
DROP TABLE payments CASCADE;

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL CHECK (document_type IN ('ticket', 'invoice', 'purchase_order')),
  document_id uuid NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'check', 'bank_transfer')),
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
  document_type,
  document_id,
  payment_method,
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
  document_type,
  document_id,
  payment_method,
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

-- Create function to update payment status
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  total_paid decimal(12,2);
  total_amount decimal(12,2);
  document_type text;
  document_id uuid;
BEGIN
  -- Get payment details
  IF TG_OP = 'DELETE' THEN
    document_type := OLD.document_type;
    document_id := OLD.document_id;
  ELSE
    document_type := NEW.document_type;
    document_id := NEW.document_id;
  END IF;

  -- Calculate total payments
  SELECT COALESCE(SUM(amount), 0)
  INTO total_paid
  FROM payments
  WHERE document_type = document_type
  AND document_id = document_id;

  -- Update status based on document type
  CASE document_type
    WHEN 'ticket' THEN
      UPDATE tickets 
      SET 
        statut = CASE 
          WHEN total_paid >= montant THEN 'payé'
          WHEN total_paid > 0 THEN 'avance'
          ELSE 'en_attente'
        END,
        payment_status = CASE 
          WHEN total_paid >= montant THEN 'completed'
          WHEN total_paid > 0 THEN 'partial'
          ELSE 'pending'
        END
      WHERE id = document_id;

    WHEN 'invoice' THEN
      UPDATE invoices 
      SET 
        status = CASE 
          WHEN total_paid >= total THEN 'payé'
          WHEN total_paid > 0 THEN 'avance'
          ELSE 'non_payé'
        END,
        payment_status = CASE 
          WHEN total_paid >= total THEN 'completed'
          WHEN total_paid > 0 THEN 'partial'
          ELSE 'pending'
        END,
        payment_date = CASE 
          WHEN total_paid >= total THEN now()
          ELSE payment_date
        END
      WHERE id = document_id;

    WHEN 'purchase_order' THEN
      UPDATE purchase_orders 
      SET 
        payment_status = CASE 
          WHEN total_paid >= total_amount THEN 'paid'
          WHEN total_paid > 0 THEN 'partial'
          ELSE 'pending'
        END,
        paid_amount = total_paid
      WHERE id = document_id;
  END CASE;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment status updates
CREATE TRIGGER update_payment_status_trigger
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_payment_status();

-- Create payment details view
CREATE VIEW payment_details AS
WITH payment_info AS (
  SELECT 
    p.id,
    p.document_type,
    p.document_id,
    p.payment_method,
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
CREATE INDEX idx_payments_payment_date ON payments(payment_date);

-- Add helpful comments
COMMENT ON TABLE payments IS 'Stores all payment transactions';
COMMENT ON COLUMN payments.document_type IS 'Type of document being paid (ticket, invoice, purchase_order)';
COMMENT ON COLUMN payments.document_id IS 'ID of the document being paid';
COMMENT ON VIEW payment_details IS 'View showing payment details with proper column references';