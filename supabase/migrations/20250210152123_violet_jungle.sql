-- Create bank_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id uuid REFERENCES banks(id) ON DELETE RESTRICT,
  type text NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer', 'payment')),
  amount decimal(12,2) NOT NULL CHECK (amount > 0),
  reference text,
  description text NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS if not already enabled
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bank_transactions'
  ) THEN
    ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policy if it exists and create new one
DROP POLICY IF EXISTS "bank_transactions_crud_policy" ON bank_transactions;
CREATE POLICY "bank_transactions_crud_policy" ON bank_transactions
  USING (true)
  WITH CHECK (true);

-- Create or replace indexes
DROP INDEX IF EXISTS idx_bank_transactions_bank_id;
DROP INDEX IF EXISTS idx_bank_transactions_type;
DROP INDEX IF EXISTS idx_bank_transactions_date;

CREATE INDEX idx_bank_transactions_bank_id ON bank_transactions(bank_id);
CREATE INDEX idx_bank_transactions_type ON bank_transactions(type);
CREATE INDEX idx_bank_transactions_date ON bank_transactions(date);

-- Create or replace function to update bank balance
CREATE OR REPLACE FUNCTION update_bank_balance_from_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Update bank balance based on transaction type
  UPDATE banks
  SET 
    balance = CASE
      WHEN NEW.type = 'deposit' THEN balance + NEW.amount
      WHEN NEW.type IN ('withdrawal', 'payment') THEN balance - NEW.amount
      ELSE balance
    END,
    updated_at = now()
  WHERE id = NEW.bank_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS update_bank_balance_from_transaction_trigger ON bank_transactions;
CREATE TRIGGER update_bank_balance_from_transaction_trigger
AFTER INSERT ON bank_transactions
FOR EACH ROW
EXECUTE FUNCTION update_bank_balance_from_transaction();

-- Drop existing audit trigger if it exists and create new one
DROP TRIGGER IF EXISTS audit_bank_transactions_trigger ON bank_transactions;
CREATE TRIGGER audit_bank_transactions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bank_transactions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Add helpful comments
COMMENT ON TABLE bank_transactions IS 'Tracks all bank transactions';
COMMENT ON COLUMN bank_transactions.amount IS 'Transaction amount that affects bank balance';