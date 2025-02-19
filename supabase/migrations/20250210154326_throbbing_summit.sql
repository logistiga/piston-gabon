-- Add missing columns to bank_transactions table
ALTER TABLE bank_transactions 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  ADD COLUMN IF NOT EXISTS transaction_number text UNIQUE;

-- Create function to generate transaction number if it doesn't exist
CREATE OR REPLACE FUNCTION generate_bank_transaction_number()
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
CREATE OR REPLACE FUNCTION bank_transactions_before_insert_v2()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_number IS NULL THEN
    NEW.transaction_number := generate_bank_transaction_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS bank_transactions_before_insert_trigger_v2 ON bank_transactions;

-- Create new trigger
CREATE TRIGGER bank_transactions_before_insert_trigger_v2
BEFORE INSERT ON bank_transactions
FOR EACH ROW
EXECUTE FUNCTION bank_transactions_before_insert_v2();

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_bank_transactions_status ON bank_transactions(status);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_transaction_number ON bank_transactions(transaction_number);

-- Add helpful comments
COMMENT ON COLUMN bank_transactions.status IS 'Transaction status (pending, confirmed, rejected)';
COMMENT ON COLUMN bank_transactions.transaction_number IS 'Unique transaction reference number';