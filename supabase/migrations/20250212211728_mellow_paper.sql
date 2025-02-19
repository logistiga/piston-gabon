-- Add supplier_id column to purchase_orders table
ALTER TABLE purchase_orders 
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES suppliers(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id 
ON purchase_orders(supplier_id);

-- Add helpful comment
COMMENT ON COLUMN purchase_orders.supplier_id IS 'References the supplier for this purchase order';

-- Update existing orders to set supplier_id based on supplier_name
WITH supplier_matches AS (
  SELECT DISTINCT po.id as order_id, s.id as supplier_id
  FROM purchase_orders po
  JOIN suppliers s ON po.supplier_name = s.company_name
)
UPDATE purchase_orders po
SET supplier_id = sm.supplier_id
FROM supplier_matches sm
WHERE po.id = sm.order_id;