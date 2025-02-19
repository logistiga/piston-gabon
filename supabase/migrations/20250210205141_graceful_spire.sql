-- Update cash register details view to hide ticket IDs
CREATE OR REPLACE VIEW cash_register_details AS
SELECT 
  cr.*,
  p.entity_type,
  p.payment_method,
  CASE 
    WHEN cr.operation_type = 'expense' THEN s.company_name
    WHEN p.entity_type = 'ticket' THEN (
      SELECT 'Paiement ticket ' || t.reference
      FROM tickets t
      WHERE t.id = p.entity_id::uuid
    )
    WHEN p.entity_type = 'invoice' THEN (
      SELECT 'Paiement facture ' || i.reference
      FROM invoices i
      WHERE i.id = p.entity_id::uuid
    )
    ELSE NULL
  END as reference_or_supplier,
  CASE
    WHEN cr.operation_type = 'expense' THEN 'supplier'
    ELSE 'reference'
  END as reference_type,
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
FROM cash_register cr
LEFT JOIN payments p ON cr.payment_id = p.id
LEFT JOIN suppliers s ON cr.supplier_id = s.id;

-- Add RLS policy for the view
ALTER VIEW cash_register_details OWNER TO postgres;
GRANT SELECT ON cash_register_details TO authenticated;