-- Drop existing triggers and functions if they exist
DROP TRIGGER IF EXISTS bank_transactions_before_insert_trigger ON bank_transactions;
DROP TRIGGER IF EXISTS update_bank_balance_from_transaction_trigger ON bank_transactions;
DROP TRIGGER IF EXISTS audit_bank_transactions_trigger ON bank_transactions;
DROP FUNCTION IF EXISTS bank_transactions_before_insert();
DROP FUNCTION IF EXISTS update_bank_balance_from_transaction();

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "bank_transactions_crud_policy" ON bank_transactions;
DROP POLICY IF EXISTS "bank_transactions_crud_policy_v2" ON bank_transactions;

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
  updated_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  transaction_number text UNIQUE
);

-- Enable RLS if not already enabled
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

-- Create unified CRUD policy with unique name
CREATE POLICY "bank_transactions_crud_policy_v3" ON bank_transactions
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bank_transactions_bank_id ON bank_transactions(bank_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_type ON bank_transactions(type);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_status ON bank_transactions(status);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_transaction_number ON bank_transactions(transaction_number);

-- Create function to generate transaction number
CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS text AS $$
DECLARE
  ref text;
  num int;
BEGIN
  -- Get the current max reference number
  SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_number FROM 4) AS integer)), 0)
  INTO num
  FROM bank_transactions;
  
  -- Generate new reference (TR_XXXXXX)
  ref := 'TR_' || LPAD((num + 1)::text, 6, '0');
  
  RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate transaction number
CREATE OR REPLACE FUNCTION bank_transactions_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_number IS NULL THEN
    NEW.transaction_number := generate_transaction_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bank_transactions_before_insert_trigger
BEFORE INSERT ON bank_transactions
FOR EACH ROW
EXECUTE FUNCTION bank_transactions_before_insert();

-- Create function to update bank balance
CREATE OR REPLACE FUNCTION update_bank_balance_from_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update balance for confirmed transactions
  IF NEW.status = 'confirmed' THEN
    UPDATE banks
    SET 
      balance = CASE
        WHEN NEW.type = 'deposit' THEN balance + NEW.amount
        WHEN NEW.type IN ('withdrawal', 'payment') THEN balance - NEW.amount
        ELSE balance
      END,
      updated_at = now()
    WHERE id = NEW.bank_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bank balance updates
CREATE TRIGGER update_bank_balance_from_transaction_trigger
AFTER INSERT OR UPDATE OF status ON bank_transactions
FOR EACH ROW
WHEN (NEW.status = 'confirmed')
EXECUTE FUNCTION update_bank_balance_from_transaction();

-- Create audit trigger
CREATE TRIGGER audit_bank_transactions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bank_transactions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Add helpful comments
COMMENT ON TABLE bank_transactions IS 'Tracks all bank transactions with status and reference number';
COMMENT ON COLUMN bank_transactions.status IS 'Transaction status (pending, confirmed, rejected)';
COMMENT ON COLUMN bank_transactions.transaction_number IS 'Unique transaction reference number';