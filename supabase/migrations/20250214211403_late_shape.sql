-- Drop existing view if it exists
DROP VIEW IF EXISTS payment_details;

-- Create view for payment details with proper column references
CREATE VIEW payment_details AS
WITH payment_info AS (
  SELECT 
    p.id,
    p.entity_type,
    p.entity_id,
    p.payment_method,
    p.amount,
    p.payment_date,
    p.reference,
    p.notes,
    p.bank_id,
    p.check_number,
    b.name as bank_name,
    CASE 
      WHEN p.entity_type = 'ticket' THEN (
        SELECT t.reference || ' - ' || t.client_nom
        FROM tickets t
        WHERE t.id = p.entity_id::uuid
      )
      WHEN p.entity_type = 'invoice' THEN (
        SELECT i.reference || ' - ' || i.client_nom
        FROM invoices i
        WHERE i.id = p.entity_id::uuid
      )
      WHEN p.entity_type = 'purchase_order' THEN (
        SELECT po.reference || ' - ' || po.supplier_name
        FROM purchase_orders po
        WHERE po.id = p.entity_id::uuid
      )
    END as document_info,
    CASE
      WHEN p.payment_method = 'cash' THEN 'Espèces'
      WHEN p.payment_method = 'check' THEN 'Chèque'
      WHEN p.payment_method = 'bank_transfer' THEN 'Virement'
    END as payment_type_label,
    CASE
      WHEN p.entity_type = 'ticket' THEN 'Ticket'
      WHEN p.entity_type = 'invoice' THEN 'Facture'
      WHEN p.entity_type = 'purchase_order' THEN 'Commande'
    END as document_type
  FROM payments p
  LEFT JOIN banks b ON p.bank_id = b.id
)
SELECT * FROM payment_info;

-- Add RLS policy for the view
GRANT SELECT ON payment_details TO authenticated;

-- Add helpful comments
COMMENT ON VIEW payment_details IS 'View showing payment details with proper column references';