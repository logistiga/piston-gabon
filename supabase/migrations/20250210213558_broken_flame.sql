-- Drop existing view if it exists
DROP VIEW IF EXISTS bank_transactions_details;

-- Create view for bank transactions with proper details
CREATE VIEW bank_transactions_details AS
SELECT 
  bt.*,
  b.name as bank_name,
  b.account_number,
  CASE 
    WHEN bt.type = 'deposit' THEN 'Dépôt bancaire'
    WHEN bt.type = 'withdrawal' THEN 'Retrait bancaire'
    WHEN bt.type = 'transfer' THEN 'Virement bancaire'
    WHEN bt.type = 'payment' THEN 'Paiement'
  END as type_label,
  CASE
    WHEN bt.status = 'confirmed' THEN 'Confirmé'
    WHEN bt.status = 'pending' THEN 'En attente'
    ELSE 'Rejeté'
  END as status_label,
  CASE 
    WHEN bt.type = 'payment' THEN (
      SELECT COALESCE(
        (SELECT 'Paiement ticket ' || t.reference || ' - ' || t.client_nom
         FROM tickets t, payments p
         WHERE t.id = p.entity_id::uuid AND p.id = bt.id),
        (SELECT 'Paiement facture ' || i.reference || ' - ' || i.client_nom
         FROM invoices i, payments p
         WHERE i.id = p.entity_id::uuid AND p.id = bt.id),
        bt.description
      )
    )
    ELSE bt.description
  END as display_description,
  CASE 
    WHEN bt.type = 'payment' THEN (
      SELECT COALESCE(
        (SELECT t.reference
         FROM tickets t, payments p
         WHERE t.id = p.entity_id::uuid AND p.id = bt.id),
        (SELECT i.reference
         FROM invoices i, payments p
         WHERE i.id = p.entity_id::uuid AND p.id = bt.id),
        bt.reference
      )
    )
    ELSE bt.reference
  END as display_reference,
  CASE 
    WHEN bt.type = 'payment' THEN (
      SELECT COALESCE(
        (SELECT t.client_nom
         FROM tickets t, payments p
         WHERE t.id = p.entity_id::uuid AND p.id = bt.id),
        (SELECT i.client_nom
         FROM invoices i, payments p
         WHERE i.id = p.entity_id::uuid AND p.id = bt.id)
      )
    )
    ELSE NULL
  END as client_nom
FROM bank_transactions bt
LEFT JOIN banks b ON bt.bank_id = b.id;

-- Add RLS policy for the view
ALTER VIEW bank_transactions_details OWNER TO postgres;
GRANT SELECT ON bank_transactions_details TO authenticated;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bank_transactions_bank_id ON bank_transactions(bank_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_type ON bank_transactions(type);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_status ON bank_transactions(status);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(date);