-- Create bank_payment_transactions table to track payments made through banks
CREATE TABLE IF NOT EXISTS bank_payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id uuid REFERENCES banks(id) ON DELETE RESTRICT,
  payment_id uuid REFERENCES payments(id) ON DELETE RESTRICT,
  amount decimal(12,2) NOT NULL CHECK (amount > 0),
  entity_type text NOT NULL CHECK (entity_type IN ('ticket', 'invoice', 'quote')),
  entity_id uuid NOT NULL,
  transaction_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE bank_payment_transactions ENABLE ROW LEVEL SECURITY;

-- Create unified CRUD policy
CREATE POLICY "bank_payment_transactions_crud_policy" ON bank_payment_transactions
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_bank_payment_transactions_bank_id ON bank_payment_transactions(bank_id);
CREATE INDEX idx_bank_payment_transactions_payment_id ON bank_payment_transactions(payment_id);
CREATE INDEX idx_bank_payment_transactions_transaction_date ON bank_payment_transactions(transaction_date);

-- Create trigger to update bank balance
CREATE OR REPLACE FUNCTION update_bank_balance_from_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Update bank balance
  UPDATE banks
  SET 
    balance = balance - NEW.amount,
    updated_at = now()
  WHERE id = NEW.bank_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_bank_balance_from_payment_trigger
AFTER INSERT ON bank_payment_transactions
FOR EACH ROW
EXECUTE FUNCTION update_bank_balance_from_payment();

-- Add audit trigger
CREATE TRIGGER audit_bank_payment_transactions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bank_payment_transactions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Add helpful comments
COMMENT ON TABLE bank_payment_transactions IS 'Tracks payments made through bank accounts';
COMMENT ON COLUMN bank_payment_transactions.amount IS 'Payment amount that affects bank balance';