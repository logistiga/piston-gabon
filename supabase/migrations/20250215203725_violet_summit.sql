-- Drop existing triggers if they exist
DO $$ BEGIN
  DROP TRIGGER IF EXISTS set_account_number_trigger ON client_accounts;
  DROP TRIGGER IF EXISTS update_account_balance_trigger ON client_account_transactions;
  DROP TRIGGER IF EXISTS track_account_changes_trigger ON client_accounts;
END $$;

-- Drop existing functions if they exist
DO $$ BEGIN
  DROP FUNCTION IF EXISTS set_account_number();
  DROP FUNCTION IF EXISTS update_account_balance();
  DROP FUNCTION IF EXISTS track_account_changes();
END $$;

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
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create client_account_audit table
CREATE TABLE IF NOT EXISTS client_account_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES client_accounts(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  changes jsonb NOT NULL,
  performed_by uuid REFERENCES auth.users(id),
  performed_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_account_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_account_audit ENABLE ROW LEVEL SECURITY;

-- Create RLS policies with unique names
CREATE POLICY "policy_admin_manage_accounts_v2"
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

CREATE POLICY "policy_staff_view_accounts_v2"
ON client_accounts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('commercial', 'caisse')
  )
);

CREATE POLICY "policy_client_view_own_account_v2"
ON client_accounts
FOR SELECT
TO authenticated
USING (
  auth_user_id = auth.uid()
);

-- Create RLS policies for transactions
CREATE POLICY "policy_admin_manage_transactions_v2"
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

CREATE POLICY "policy_staff_view_transactions_v2"
ON client_account_transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('commercial', 'caisse')
  )
);

CREATE POLICY "policy_client_view_own_transactions_v2"
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

-- Create RLS policies for audit
CREATE POLICY "policy_admin_view_audit_v2"
ON client_account_audit
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'administrateur'
  )
);

-- Create function to generate account number
CREATE OR REPLACE FUNCTION generate_account_number_v2()
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
CREATE OR REPLACE FUNCTION set_account_number_v2()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.account_number IS NULL THEN
    NEW.account_number := generate_account_number_v2();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_account_number_trigger_v2
  BEFORE INSERT ON client_accounts
  FOR EACH ROW
  EXECUTE FUNCTION set_account_number_v2();

-- Create function to update account balance
CREATE OR REPLACE FUNCTION update_account_balance_v2()
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
CREATE TRIGGER update_account_balance_trigger_v2
  AFTER INSERT ON client_account_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance_v2();

-- Create function to track account changes
CREATE OR REPLACE FUNCTION track_account_changes_v2()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO client_account_audit (
      account_id,
      action,
      changes,
      performed_by
    ) VALUES (
      NEW.id,
      'create',
      to_jsonb(NEW),
      auth.uid()
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO client_account_audit (
      account_id,
      action,
      changes,
      performed_by
    ) VALUES (
      NEW.id,
      'update',
      jsonb_build_object(
        'old', to_jsonb(OLD),
        'new', to_jsonb(NEW)
      ),
      auth.uid()
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO client_account_audit (
      account_id,
      action,
      changes,
      performed_by
    ) VALUES (
      OLD.id,
      'delete',
      to_jsonb(OLD),
      auth.uid()
    );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for account audit
CREATE TRIGGER track_account_changes_trigger_v2
  AFTER INSERT OR UPDATE OR DELETE ON client_accounts
  FOR EACH ROW
  EXECUTE FUNCTION track_account_changes_v2();

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
  ) as monthly_payments,
  ca.created_at,
  ca.updated_at
FROM client_accounts ca
JOIN clients c ON c.id = ca.client_id;

-- Add indexes for better performance
CREATE INDEX idx_client_accounts_client_id ON client_accounts(client_id);
CREATE INDEX idx_client_accounts_auth_user_id ON client_accounts(auth_user_id);
CREATE INDEX idx_client_accounts_status ON client_accounts(status);
CREATE INDEX idx_client_accounts_account_number ON client_accounts(account_number);

CREATE INDEX idx_client_account_transactions_account_id ON client_account_transactions(account_id);
CREATE INDEX idx_client_account_transactions_type ON client_account_transactions(type);
CREATE INDEX idx_client_account_transactions_transaction_date ON client_account_transactions(transaction_date);

CREATE INDEX idx_client_account_audit_account_id ON client_account_audit(account_id);
CREATE INDEX idx_client_account_audit_action ON client_account_audit(action);
CREATE INDEX idx_client_account_audit_performed_at ON client_account_audit(performed_at);

-- Add helpful comments
COMMENT ON TABLE client_accounts IS 'Stores client account information and financial data';
COMMENT ON TABLE client_account_transactions IS 'Stores all financial transactions for client accounts';
COMMENT ON TABLE client_account_audit IS 'Tracks all changes made to client accounts';
COMMENT ON VIEW client_account_details IS 'Detailed view of client accounts with summary statistics';