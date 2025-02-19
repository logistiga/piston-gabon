-- Create client_accounts table
CREATE TABLE IF NOT EXISTS client_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  auth_user_id uuid REFERENCES auth.users(id),
  account_number text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  balance decimal(12,2) NOT NULL DEFAULT 0,
  credit_limit decimal(12,2) NOT NULL DEFAULT 0,
  credit_days integer NOT NULL DEFAULT 30,
  last_activity_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, auth_user_id)
);

-- Create client_account_transactions table
CREATE TABLE IF NOT EXISTS client_account_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES client_accounts(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('sale', 'payment', 'credit', 'debit', 'adjustment')),
  amount decimal(12,2) NOT NULL,
  reference_type text NOT NULL CHECK (reference_type IN ('ticket', 'invoice', 'payment', 'adjustment')),
  reference_id uuid NOT NULL,
  description text NOT NULL,
  transaction_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_account_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for client_accounts
CREATE POLICY "Admins can manage all accounts"
ON client_accounts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'administrateur'
  )
);

CREATE POLICY "Clients can view their own account"
ON client_accounts
FOR SELECT
TO authenticated
USING (
  auth_user_id = auth.uid()
);

-- Create RLS policies for client_account_transactions
CREATE POLICY "Admins can manage all transactions"
ON client_account_transactions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'administrateur'
  )
);

CREATE POLICY "Clients can view their own transactions"
ON client_account_transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM client_accounts
    WHERE client_accounts.id = client_account_transactions.account_id
    AND client_accounts.auth_user_id = auth.uid()
  )
);

-- Create function to generate account number
CREATE OR REPLACE FUNCTION generate_account_number()
RETURNS text AS $$
DECLARE
  new_number text;
  counter integer := 1;
BEGIN
  LOOP
    new_number := 'ACC-' || LPAD(counter::text, 6, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 
      FROM client_accounts 
      WHERE account_number = new_number
    );
    counter := counter + 1;
  END LOOP;
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate account number
CREATE OR REPLACE FUNCTION set_account_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.account_number IS NULL THEN
    NEW.account_number := generate_account_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_account_number_trigger
  BEFORE INSERT ON client_accounts
  FOR EACH ROW
  EXECUTE FUNCTION set_account_number();

-- Create function to update account balance
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
  account_record client_accounts%ROWTYPE;
BEGIN
  -- Get the account
  SELECT * INTO account_record
  FROM client_accounts
  WHERE id = NEW.account_id;

  -- Update account balance based on transaction type
  UPDATE client_accounts
  SET 
    balance = balance + CASE
      WHEN NEW.type IN ('payment', 'credit') THEN NEW.amount
      WHEN NEW.type IN ('sale', 'debit') THEN -NEW.amount
      ELSE 0
    END,
    last_activity_date = NEW.transaction_date,
    updated_at = now()
  WHERE id = NEW.account_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update account balance
CREATE TRIGGER update_account_balance_trigger
  AFTER INSERT ON client_account_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance();

-- Create view for client account details
CREATE OR REPLACE VIEW client_account_details AS
SELECT 
  ca.id as account_id,
  ca.account_number,
  ca.status,
  ca.balance,
  ca.credit_limit,
  ca.credit_days,
  ca.last_activity_date,
  c.id as client_id,
  c.client_id as client_number,
  c.nom,
  c.entreprise,
  c.email,
  c.telephone,
  COALESCE(
    (SELECT SUM(amount) 
     FROM client_account_transactions 
     WHERE account_id = ca.id 
     AND type = 'sale'
     AND transaction_date >= (now() - interval '30 days')),
    0
  ) as monthly_sales,
  COALESCE(
    (SELECT SUM(amount)
     FROM client_account_transactions 
     WHERE account_id = ca.id 
     AND type = 'payment'
     AND transaction_date >= (now() - interval '30 days')),
    0
  ) as monthly_payments
FROM client_accounts ca
JOIN clients c ON c.id = ca.client_id;

-- Add helpful comments
COMMENT ON TABLE client_accounts IS 'Stores client account information and financial data';
COMMENT ON TABLE client_account_transactions IS 'Stores all financial transactions for client accounts';
COMMENT ON VIEW client_account_details IS 'Detailed view of client accounts with summary statistics';