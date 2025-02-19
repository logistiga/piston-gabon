-- Drop existing view if it exists
DROP VIEW IF EXISTS bank_transactions_details;

-- Create view for bank transactions with proper details
CREATE VIEW bank_transactions_details AS
WITH payment_info AS (
  SELECT 
    p.id as payment_id,
    p.entity_type,
    p.entity_id,
    p.payment_method,
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
      ELSE NULL
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
      ELSE NULL
    END as client_nom
  FROM payments p
)
SELECT 
  bt.id,
  bt.bank_id,
  bt.type,
  bt.amount,
  bt.status,
  bt.date::date as transaction_date,
  bt.transaction_number,
  b.name as bank_name,
  COALESCE(pi.document_reference, bt.reference) as reference_number,
  CASE
    WHEN bt.type = 'deposit' THEN 'Dépôt'
    WHEN bt.type = 'withdrawal' THEN 'Retrait'
    WHEN bt.type = 'transfer' THEN 'Virement'
    WHEN bt.type = 'payment' THEN (
      CASE pi.payment_method
        WHEN 'cash' THEN 'Espèces'
        WHEN 'check' THEN 'Chèque'
        WHEN 'bank_transfer' THEN 'Virement'
        ELSE 'Paiement'
      END
    )
    ELSE 'Paiement'
  END as payment_type,
  CASE
    WHEN bt.status = 'confirmed' THEN 'Confirmé'
    WHEN bt.status = 'pending' THEN 'En attente'
    ELSE 'Rejeté'
  END as status_label,
  pi.client_nom,
  bt.description
FROM bank_transactions bt
LEFT JOIN banks b ON bt.bank_id = b.id
LEFT JOIN payment_info pi ON bt.id = pi.payment_id;

-- Add RLS policy for the view
ALTER VIEW bank_transactions_details OWNER TO postgres;
GRANT SELECT ON bank_transactions_details TO authenticated;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_type ON bank_transactions(type);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_status ON bank_transactions(status);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_id ON bank_transactions(id);
CREATE INDEX IF NOT EXISTS idx_payments_entity_id ON payments(entity_id);
CREATE INDEX IF NOT EXISTS idx_payments_entity_type ON payments(entity_type);