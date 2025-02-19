-- Drop existing triggers and function with CASCADE
DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_purchase_order_payment_status_trigger ON purchase_order_payments CASCADE;
  DROP TRIGGER IF EXISTS update_purchase_order_payment_status_insert_trigger ON payments CASCADE;
  DROP TRIGGER IF EXISTS update_purchase_order_payment_status_update_trigger ON payments CASCADE;
  DROP TRIGGER IF EXISTS update_purchase_order_payment_status_delete_trigger ON payments CASCADE;
  DROP FUNCTION IF EXISTS update_purchase_order_payment_status() CASCADE;
END $$;

-- Drop existing policies if they exist
DO $$ BEGIN
  DROP POLICY IF EXISTS "payments_crud_policy" ON payments;
  DROP POLICY IF EXISTS "payments_crud_policy_v2" ON payments;
  DROP POLICY IF EXISTS "payments_crud_policy_v3" ON payments;
  DROP POLICY IF EXISTS "cash_register_crud_policy" ON cash_register;
  DROP POLICY IF EXISTS "cash_register_crud_policy_v2" ON cash_register;
  DROP POLICY IF EXISTS "cash_register_crud_policy_v3" ON cash_register;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- First ensure the payments table exists with proper structure
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('ticket', 'invoice', 'purchase_order')),
  entity_id uuid NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'check', 'bank_transfer')),
  amount decimal(12,2) NOT NULL CHECK (amount > 0),
  total_amount decimal(12,2) NOT NULL,
  payment_date timestamptz NOT NULL DEFAULT now(),
  reference text,
  notes text,
  bank_id uuid REFERENCES banks(id),
  check_number text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create cash register table if it doesn't exist
CREATE TABLE IF NOT EXISTS cash_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type text NOT NULL CHECK (operation_type IN ('income', 'expense')),
  amount decimal(12,2) NOT NULL CHECK (amount > 0),
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  reason text NOT NULL,
  reference text,
  operation_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_register ENABLE ROW LEVEL SECURITY;

-- Create unified CRUD policies with unique names
CREATE POLICY "payments_crud_policy_v4" ON payments
  USING (true)
  WITH CHECK (true);

CREATE POLICY "cash_register_crud_policy_v4" ON cash_register
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_entity_type ON payments(entity_type);
CREATE INDEX IF NOT EXISTS idx_payments_entity_id ON payments(entity_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_cash_register_operation_type ON cash_register(operation_type);
CREATE INDEX IF NOT EXISTS idx_cash_register_operation_date ON cash_register(operation_date);

-- Create function to update purchase order payment status
CREATE OR REPLACE FUNCTION update_purchase_order_payment_status_v2()
RETURNS TRIGGER AS $$
DECLARE
  order_id uuid;
  total_paid decimal(12,2);
  order_total decimal(12,2);
BEGIN
  -- Determine the order ID based on operation type
  IF TG_OP = 'DELETE' THEN
    order_id := OLD.entity_id;
  ELSE
    order_id := NEW.entity_id;
  END IF;

  -- Only proceed if this is a purchase order payment
  IF TG_OP = 'DELETE' OR (TG_OP IN ('INSERT', 'UPDATE') AND NEW.entity_type = 'purchase_order') THEN
    -- Calculate total payments
    SELECT COALESCE(SUM(amount), 0)
    INTO total_paid
    FROM payments
    WHERE entity_type = 'purchase_order'
    AND entity_id = order_id;

    -- Get order total
    SELECT total_amount
    INTO order_total
    FROM purchase_orders
    WHERE id = order_id;

    -- Update order status
    UPDATE purchase_orders
    SET 
      payment_status = CASE 
        WHEN total_paid >= order_total THEN 'paid'
        WHEN total_paid > 0 THEN 'partial'
        ELSE 'pending'
      END,
      paid_amount = total_paid,
      updated_at = now()
    WHERE id = order_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create separate triggers for each operation with new names
CREATE TRIGGER update_purchase_order_payment_status_insert_trigger_v3
  AFTER INSERT ON payments
  FOR EACH ROW
  WHEN (NEW.entity_type = 'purchase_order')
  EXECUTE FUNCTION update_purchase_order_payment_status_v2();

CREATE TRIGGER update_purchase_order_payment_status_update_trigger_v3
  AFTER UPDATE ON payments
  FOR EACH ROW
  WHEN (NEW.entity_type = 'purchase_order')
  EXECUTE FUNCTION update_purchase_order_payment_status_v2();

CREATE TRIGGER update_purchase_order_payment_status_delete_trigger_v3
  AFTER DELETE ON payments
  FOR EACH ROW
  WHEN (OLD.entity_type = 'purchase_order')
  EXECUTE FUNCTION update_purchase_order_payment_status_v2();

-- Add helpful comments
COMMENT ON TABLE payments IS 'Tracks all payments across the system';
COMMENT ON TABLE cash_register IS 'Tracks cash register operations';
COMMENT ON COLUMN payments.total_amount IS 'Total amount of the related entity (order, invoice, etc.)';