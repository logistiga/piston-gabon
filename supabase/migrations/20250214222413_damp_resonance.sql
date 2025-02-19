-- Create view for monthly client sales
CREATE OR REPLACE VIEW client_monthly_sales AS
WITH sales AS (
  -- Sales from tickets
  SELECT 
    t.client_nom as nom,
    t.montant as amount,
    t.created_at as sale_date
  FROM tickets t
  WHERE t.statut = 'payé'
  
  UNION ALL
  
  -- Sales from invoices
  SELECT 
    i.client_nom as nom,
    i.total as amount,
    i.created_at as sale_date
  FROM invoices i
  WHERE i.status = 'payé'
)
SELECT 
  c.id,
  c.nom,
  COALESCE(SUM(s.amount), 0) as total_sales,
  c.limite_credit - COALESCE(SUM(s.amount), 0) as balance,
  MIN(s.sale_date) as first_sale,
  MAX(s.sale_date) as last_sale,
  s.sale_date
FROM clients c
LEFT JOIN sales s ON c.nom = s.nom
GROUP BY c.id, c.nom, c.limite_credit, s.sale_date;

-- Create view for article sales statistics
CREATE OR REPLACE VIEW article_sales_stats AS
WITH sales AS (
  -- Sales from tickets
  SELECT 
    ti.article_id,
    ti.quantity,
    ti.unit_price * ti.quantity as total,
    t.created_at as sale_date
  FROM ticket_items ti
  JOIN tickets t ON t.id = ti.ticket_id
  WHERE t.statut = 'payé'
  
  UNION ALL
  
  -- Sales from invoices
  SELECT 
    ii.article_id,
    ii.quantity,
    ii.unit_price * ii.quantity as total,
    i.created_at as sale_date
  FROM invoice_items ii
  JOIN invoices i ON i.id = ii.invoice_id
  WHERE i.status = 'payé'
)
SELECT 
  a.id,
  a.cb,
  a.nom,
  COALESCE(SUM(s.quantity), 0) as quantity,
  COALESCE(SUM(s.total), 0) as total,
  MIN(s.sale_date) as first_sale,
  MAX(s.sale_date) as last_sale,
  s.sale_date
FROM articles a
LEFT JOIN sales s ON a.id = s.article_id
GROUP BY a.id, a.cb, a.nom, s.sale_date;

-- Create view for article orders statistics
CREATE OR REPLACE VIEW article_orders_stats AS
WITH orders AS (
  SELECT 
    poi.article_id,
    poi.quantity,
    poi.unit_price * poi.quantity as total,
    po.created_at as order_date
  FROM purchase_order_items poi
  JOIN purchase_orders po ON po.id = poi.purchase_order_id
  WHERE po.status = 'received'
)
SELECT 
  a.id,
  a.cb,
  a.nom,
  COALESCE(SUM(o.quantity), 0) as quantity,
  COALESCE(SUM(o.total), 0) as total,
  MIN(o.order_date) as first_order,
  MAX(o.order_date) as last_order,
  o.order_date
FROM articles a
LEFT JOIN orders o ON a.id = o.article_id
GROUP BY a.id, a.cb, a.nom, o.order_date;

-- Create view for cash register details with running balance
CREATE OR REPLACE VIEW cash_register_details AS
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

-- Add helpful comments
COMMENT ON VIEW client_monthly_sales IS 'Monthly sales statistics per client';
COMMENT ON VIEW article_sales_stats IS 'Sales statistics per article';
COMMENT ON VIEW article_orders_stats IS 'Order statistics per article';
COMMENT ON VIEW cash_register_details IS 'View showing cash register operations with running balance';