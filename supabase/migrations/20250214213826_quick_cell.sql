-- Drop existing view if it exists
DROP VIEW IF EXISTS cash_register_details;

-- Create view for cash register details with running balance
CREATE VIEW cash_register_details AS
WITH operations AS (
  SELECT 
    cr.id,
    cr.operation_type,
    cr.amount,
    cr.payment_id,
    cr.reason,
    cr.reference,
    cr.operation_date,
    cr.created_at,
    cr.updated_at,
    p.document_type,
    p.payment_method,
    CASE 
      WHEN cr.operation_type = 'expense' THEN s.company_name
      WHEN p.document_type = 'ticket' THEN (
        SELECT t.reference
        FROM tickets t
        WHERE t.id = p.document_id
      )
      WHEN p.document_type = 'invoice' THEN (
        SELECT i.reference
        FROM invoices i
        WHERE i.id = p.document_id
      )
      WHEN p.document_type = 'purchase_order' THEN (
        SELECT po.reference
        FROM purchase_orders po
        WHERE po.id = p.document_id
      )
      ELSE NULL
    END as reference_or_supplier,
    CASE
      WHEN cr.operation_type = 'expense' THEN 'supplier'
      ELSE 'reference'
    END as reference_type,
    CASE 
      WHEN p.document_type = 'ticket' THEN (
        SELECT t.client_nom
        FROM tickets t
        WHERE t.id = p.document_id
      )
      WHEN p.document_type = 'invoice' THEN (
        SELECT i.client_nom
        FROM invoices i
        WHERE i.id = p.document_id
      )
      WHEN p.document_type = 'purchase_order' THEN (
        SELECT po.supplier_name
        FROM purchase_orders po
        WHERE po.id = p.document_id
      )
      ELSE NULL
    END as client_nom,
    CASE
      WHEN cr.operation_type = 'income' THEN cr.amount
      ELSE -cr.amount
    END as signed_amount,
    SUM(
      CASE
        WHEN cr.operation_type = 'income' THEN cr.amount
        ELSE -cr.amount
      END
    ) OVER (
      PARTITION BY DATE_TRUNC('day', cr.operation_date)
      ORDER BY cr.operation_date, cr.id
    ) as daily_balance,
    SUM(
      CASE
        WHEN cr.operation_type = 'income' THEN cr.amount
        ELSE -cr.amount
      END
    ) OVER (
      ORDER BY cr.operation_date, cr.id
    ) as running_balance
  FROM cash_register cr
  LEFT JOIN payments p ON cr.payment_id = p.id
  LEFT JOIN suppliers s ON cr.supplier_id = s.id
)
SELECT 
  id,
  operation_type,
  signed_amount as amount,
  payment_id,
  reason,
  reference,
  operation_date,
  created_at,
  updated_at,
  document_type,
  payment_method,
  reference_or_supplier,
  reference_type,
  client_nom,
  daily_balance,
  running_balance
FROM operations;

-- Add RLS policy for the view
GRANT SELECT ON cash_register_details TO authenticated;

-- Add helpful comments
COMMENT ON VIEW cash_register_details IS 'View showing cash register operations with running balance';
COMMENT ON COLUMN cash_register_details.daily_balance IS 'Running balance for the current day';
COMMENT ON COLUMN cash_register_details.running_balance IS 'Running balance across all operations';
COMMENT ON COLUMN cash_register_details.amount IS 'Operation amount (positive for income, negative for expense)';