-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS bank_transactions_before_insert_trigger ON bank_transactions;
DROP TRIGGER IF EXISTS bank_transactions_before_insert_trigger_v2 ON bank_transactions;
DROP TRIGGER IF EXISTS update_bank_balance_from_transaction_trigger ON bank_transactions;
DROP TRIGGER IF EXISTS audit_bank_transactions_trigger ON bank_transactions;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS bank_transactions_before_insert();
DROP FUNCTION IF EXISTS bank_transactions_before_insert_v2();
DROP FUNCTION IF EXISTS update_bank_balance_from_transaction();
DROP FUNCTION IF EXISTS generate_transaction_number();
DROP FUNCTION IF EXISTS generate_bank_transaction_number();

-- Recreate bank_transactions table with proper structure
DROP TABLE IF EXISTS bank_transactions CASCADE;
CREATE TABLE bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id uuid REFERENCES banks(id) ON DELETE RESTRICT,
  type text NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'transfer', 'payment')),
  amount decimal(12,2) NOT NULL CHECK (amount > 0),
  reference text,
  description text NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  transaction_number text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

-- Create unified CRUD policy
CREATE POLICY "bank_transactions_crud_policy_new" ON bank_transactions
  USING (true)
  WITH CHECK (true);

-- Create function to generate transaction number
CREATE FUNCTION generate_transaction_number() 
RETURNS text AS $$
DECLARE
  ref text;
  num int;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_number FROM 4) AS integer)), 0)
  INTO num
  FROM bank_transactions;
  
  ref := 'TR_' || LPAD((num + 1)::text, 6, '0');
  RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for transaction number generation
CREATE FUNCTION bank_transactions_before_insert()
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
CREATE FUNCTION update_bank_balance_from_transaction()
RETURNS TRIGGER AS $$
BEGIN
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

-- Create indexes
CREATE INDEX idx_bank_transactions_bank_id ON bank_transactions(bank_id);
CREATE INDEX idx_bank_transactions_type ON bank_transactions(type);
CREATE INDEX idx_bank_transactions_date ON bank_transactions(date);
CREATE INDEX idx_bank_transactions_status ON bank_transactions(status);
CREATE INDEX idx_bank_transactions_transaction_number ON bank_transactions(transaction_number);

-- Add helpful comments
COMMENT ON TABLE bank_transactions IS 'Tracks all bank transactions with status and reference number';
COMMENT ON COLUMN bank_transactions.status IS 'Transaction status (pending, confirmed, rejected)';
COMMENT ON COLUMN bank_transactions.transaction_number IS 'Unique transaction reference number';