-- Create purchase_order_payments table
CREATE TABLE IF NOT EXISTS purchase_order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE,
  amount decimal(12,2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'check', 'bank_transfer')),
  payment_date timestamptz NOT NULL DEFAULT now(),
  reference text,
  notes text,
  bank_id uuid REFERENCES banks(id),
  check_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE purchase_order_payments ENABLE ROW LEVEL SECURITY;

-- Create unified CRUD policy
CREATE POLICY "purchase_order_payments_crud_policy" ON purchase_order_payments
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX idx_purchase_order_payments_order_id ON purchase_order_payments(purchase_order_id);
CREATE INDEX idx_purchase_order_payments_payment_date ON purchase_order_payments(payment_date);
CREATE INDEX idx_purchase_order_payments_payment_method ON purchase_order_payments(payment_method);

-- Add audit trigger
CREATE TRIGGER audit_purchase_order_payments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON purchase_order_payments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Create function to update purchase order payment status
CREATE OR REPLACE FUNCTION update_purchase_order_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total payments for the purchase order
  WITH total_payments AS (
    SELECT purchase_order_id, SUM(amount) as paid_amount
    FROM purchase_order_payments
    WHERE purchase_order_id = NEW.purchase_order_id
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment status updates
CREATE TRIGGER update_purchase_order_payment_status_trigger
AFTER INSERT OR UPDATE OR DELETE ON purchase_order_payments
FOR EACH ROW
EXECUTE FUNCTION update_purchase_order_payment_status();

-- Add helpful comments
COMMENT ON TABLE purchase_order_payments IS 'Tracks payments made for purchase orders';
COMMENT ON COLUMN purchase_order_payments.payment_method IS 'Payment method (cash, check, bank_transfer)';
COMMENT ON COLUMN purchase_order_payments.bank_id IS 'Reference to bank account for check/transfer payments';