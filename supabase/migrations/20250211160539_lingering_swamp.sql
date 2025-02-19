-- Drop existing check constraint if it exists
ALTER TABLE purchase_orders 
  DROP CONSTRAINT IF EXISTS purchase_orders_status_check;

-- Add new check constraint with all valid statuses
ALTER TABLE purchase_orders
  ADD CONSTRAINT purchase_orders_status_check 
  CHECK (status IN ('draft', 'validated', 'received', 'cancelled'));

-- Update existing orders with invalid status
UPDATE purchase_orders 
SET status = 'draft' 
WHERE status NOT IN ('draft', 'validated', 'received', 'cancelled');

-- Add index for status field
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status 
ON purchase_orders(status);

-- Add helpful comment
COMMENT ON COLUMN purchase_orders.status IS 'Order status (draft, validated, received, cancelled)';