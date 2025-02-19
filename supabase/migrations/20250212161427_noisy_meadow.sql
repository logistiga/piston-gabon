-- Drop existing views
DROP VIEW IF EXISTS client_monthly_sales;
DROP VIEW IF EXISTS article_sales_stats;
DROP VIEW IF EXISTS article_orders_stats;

-- Create view for monthly client sales
CREATE VIEW client_monthly_sales AS
WITH sales AS (
  -- Sales from tickets
  SELECT 
    t.client_nom as nom,
    t.montant as amount,
    t.created_at
  FROM tickets t
  WHERE t.statut = 'payé'
  
  UNION ALL
  
  -- Sales from invoices
  SELECT 
    i.client_nom as nom,
    i.total as amount,
    i.created_at
  FROM invoices i
  WHERE i.status = 'payé'
)
SELECT 
  c.id,
  c.nom,
  COALESCE(SUM(s.amount), 0) as total_sales,
  c.limite_credit - COALESCE(SUM(s.amount), 0) as balance,
  MIN(s.created_at) as first_sale,
  MAX(s.created_at) as last_sale,
  s.created_at as sale_date -- Include sale_date for filtering
FROM clients c
LEFT JOIN sales s ON c.nom = s.nom
GROUP BY c.id, c.nom, c.limite_credit, s.created_at;

-- Create view for article sales statistics
CREATE VIEW article_sales_stats AS
WITH sales AS (
  -- Sales from tickets
  SELECT 
    ti.article_id,
    ti.quantity,
    ti.unit_price * ti.quantity as total,
    t.created_at
  FROM ticket_items ti
  JOIN tickets t ON t.id = ti.ticket_id
  WHERE t.statut = 'payé'
  
  UNION ALL
  
  -- Sales from invoices
  SELECT 
    ii.article_id,
    ii.quantity,
    ii.unit_price * ii.quantity as total,
    i.created_at
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
  MIN(s.created_at) as first_sale,
  MAX(s.created_at) as last_sale,
  s.created_at as sale_date -- Include sale_date for filtering
FROM articles a
LEFT JOIN sales s ON a.id = s.article_id
GROUP BY a.id, a.cb, a.nom, s.created_at;

-- Create view for article orders statistics
CREATE VIEW article_orders_stats AS
WITH orders AS (
  SELECT 
    poi.article_id,
    poi.quantity,
    poi.unit_price * poi.quantity as total,
    po.created_at
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
  MIN(o.created_at) as first_order,
  MAX(o.created_at) as last_order,
  o.created_at as order_date -- Include order_date for filtering
FROM articles a
LEFT JOIN orders o ON a.id = o.article_id
GROUP BY a.id, a.cb, a.nom, o.created_at;

-- Grant access to views
GRANT SELECT ON client_monthly_sales TO authenticated;
GRANT SELECT ON article_sales_stats TO authenticated;
GRANT SELECT ON article_orders_stats TO authenticated;

-- Add helpful comments
COMMENT ON VIEW client_monthly_sales IS 'Monthly sales statistics per client with sale date for filtering';
COMMENT ON VIEW article_sales_stats IS 'Sales statistics per article with sale date for filtering';
COMMENT ON VIEW article_orders_stats IS 'Order statistics per article with order date for filtering';