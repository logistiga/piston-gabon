-- Create view for bank transactions with proper details
CREATE OR REPLACE VIEW bank_transactions_details AS
SELECT 
  bt.*,
  b.name as bank_name,
  b.account_number,
  CASE 
    WHEN bt.type = 'payment' THEN (
      SELECT COALESCE(
        (SELECT 'Paiement ticket ' || t.reference || ' - ' || t.client_nom
         FROM tickets t
         WHERE t.id = p.entity_id::uuid),
        (SELECT 'Paiement facture ' || i.reference || ' - ' || i.client_nom
         FROM invoices i
         WHERE i.id = p.entity_id::uuid),
        bt.description
      )
      FROM payments p
      WHERE p.id = bt.id
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