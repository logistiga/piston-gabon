-- Drop existing view if it exists
DROP VIEW IF EXISTS payment_details;

-- Create view for consolidated payment details
CREATE VIEW payment_details AS
SELECT 
  p.id,
  p.entity_type,
  p.entity_id,
  p.payment_method,
  p.amount,
  p.payment_date,
  p.reference,
  p.bank_id,
  p.check_number,
  b.name as bank_name,
  CASE 
    WHEN p.entity_type = 'ticket' THEN (
      SELECT t.reference
      FROM tickets t
      WHERE t.id = p.entity_id::uuid
    )
    WHEN p.entity_type = 'invoice' THEN (
      SELECT i.reference
      FROM invoices i
      WHERE i.id = p.entity_id::uuid
    )
  END as document_reference,
  CASE 
    WHEN p.entity_type = 'ticket' THEN (
      SELECT t.client_nom
      FROM tickets t
      WHERE t.id = p.entity_id::uuid
    )
    WHEN p.entity_type = 'invoice' THEN (
      SELECT i.client_nom
      FROM invoices i
      WHERE i.id = p.entity_id::uuid
    )
  END as client_nom,
  CASE
    WHEN p.payment_method = 'cash' THEN 'Espèces'
    WHEN p.payment_method = 'check' THEN 'Chèque'
    WHEN p.payment_method = 'bank_transfer' THEN 'Virement'
  END as payment_type_label,
  CASE
    WHEN p.entity_type = 'ticket' THEN 'Ticket'
    WHEN p.entity_type = 'invoice' THEN 'Facture'
  END as document_type
FROM payments p
LEFT JOIN banks b ON p.bank_id = b.id;

-- Add RLS policy for the view
ALTER VIEW payment_details OWNER TO postgres;
GRANT SELECT ON payment_details TO authenticated;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_bank_id ON payments(bank_id);
CREATE INDEX IF NOT EXISTS idx_payments_check_number ON payments(check_number);

-- Add helpful comments
COMMENT ON VIEW payment_details IS 'Consolidated view of all payment details including references to tickets and invoices';
COMMENT ON COLUMN payment_details.document_reference IS 'Reference number of the related ticket or invoice';
COMMENT ON COLUMN payment_details.payment_type_label IS 'Human readable payment method label in French';
COMMENT ON COLUMN payment_details.document_type IS 'Type of document being paid (Ticket or Facture)';