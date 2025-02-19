-- Add supplier_id to cash_register table
ALTER TABLE cash_register 
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL;

-- Create index for supplier_id
CREATE INDEX IF NOT EXISTS idx_cash_register_supplier_id ON cash_register(supplier_id);

-- Drop existing view if it exists
DROP VIEW IF EXISTS cash_register_details;

-- Create view for cash register details with proper column names
CREATE VIEW cash_register_details AS
SELECT 
  cr.*,
  p.entity_type,
  p.payment_method,
  CASE 
    WHEN cr.operation_type = 'expense' THEN s.company_name
    WHEN p.entity_type = 'ticket' THEN 'Paiement Ticket'
    WHEN p.entity_type = 'invoice' THEN 'Paiement Facture'
    ELSE cr.reason
  END as description,
  CASE 
    WHEN cr.operation_type = 'expense' THEN s.company_name
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