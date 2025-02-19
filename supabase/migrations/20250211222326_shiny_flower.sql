-- Add missing columns to purchase_orders table
ALTER TABLE purchase_orders 
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending' 
  CHECK (payment_status IN ('pending', 'partial', 'paid')),
  ADD COLUMN IF NOT EXISTS paid_amount decimal(12,2) NOT NULL DEFAULT 0;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_purchase_orders_payment_status 
ON purchase_orders(payment_status);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_paid_amount 
ON purchase_orders(paid_amount);

-- Update payment status trigger to handle payment deletion
CREATE OR REPLACE FUNCTION update_purchase_order_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total payments for the purchase order
  WITH total_payments AS (
    SELECT purchase_order_id, COALESCE(SUM(amount), 0) as paid_amount
    FROM purchase_order_payments
    WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)
    GROUP BY purchase_order_id
  )
  UPDATE purchase_orders po
  SET 
    payment_status = CASE 
      WHEN p.paid_amount >= po.total_amount THEN 'paid'
      WHEN p.paid_amount > 0 THEN 'partial'
      ELSE 'pending'
    END,
    paid_amount = p.paid_amount,
    updated_at = now()
  FROM total_payments p
  WHERE po.id = p.purchase_order_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_purchase_order_payment_status_trigger ON purchase_order_payments;

-- Create trigger for all payment operations
CREATE TRIGGER update_purchase_order_payment_status_trigger
AFTER INSERT OR UPDATE OR DELETE ON purchase_order_payments
FOR EACH ROW
EXECUTE FUNCTION update_purchase_order_payment_status();

-- Add helpful comments
COMMENT ON COLUMN purchase_orders.payment_status IS 'Payment status (pending, partial, paid)';
COMMENT ON COLUMN purchase_orders.paid_amount IS 'Total amount paid so far';