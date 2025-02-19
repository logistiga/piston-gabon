-- Drop existing tables if they exist
DROP TABLE IF EXISTS client_account_audit CASCADE;
DROP TABLE IF EXISTS client_account_transactions CASCADE;
DROP TABLE IF EXISTS client_accounts CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

-- Create clients table
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text UNIQUE,
  nom text NOT NULL,
  entreprise text,
  email text,
  telephone text,
  limite_credit decimal(10,2) NOT NULL DEFAULT 0,
  auth_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create client_accounts table
CREATE TABLE client_accounts (
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
CREATE TABLE client_account_transactions (
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
CREATE TABLE client_account_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES client_accounts(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  changes jsonb NOT NULL,
  performed_by uuid REFERENCES auth.users(id),
  performed_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_account_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_account_audit ENABLE ROW LEVEL SECURITY;

-- Create sequence for client IDs
CREATE SEQUENCE IF NOT EXISTS client_id_seq START 1;

-- Create function to generate client ID
CREATE OR REPLACE FUNCTION generate_client_id()
RETURNS text AS $$
DECLARE
  new_id text;
  counter integer := 1;
BEGIN
  LOOP
    new_id := 'CL-' || LPAD(counter::text, 4, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 
      FROM clients 
      WHERE client_id = new_id
    );
    counter := counter + 1;
  END LOOP;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to normalize contact info
CREATE OR REPLACE FUNCTION normalize_client_contact()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate client_id if not provided
  IF NEW.client_id IS NULL THEN
    NEW.client_id := generate_client_id();
  END IF;

  -- Normalize email to lowercase if provided
  IF NEW.email IS NOT NULL THEN
    NEW.email := lower(trim(NEW.email));
  END IF;

  -- Only normalize if phone number is provided and changed
  IF NEW.telephone IS NOT NULL AND 
     (OLD IS NULL OR NEW.telephone != OLD.telephone) THEN
    -- Remove all non-digit characters except +
    NEW.telephone := regexp_replace(NEW.telephone, '[^0-9+]', '', 'g');
    
    -- Add Gabon country code if starts with 0
    IF NEW.telephone ~ '^0' THEN
      NEW.telephone := '+241' || substring(NEW.telephone from 2);
    END IF;
    
    -- Validate minimum length after normalization
    IF length(regexp_replace(NEW.telephone, '[^0-9]', '', 'g')) < 8 THEN
      NEW.telephone := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for contact normalization
CREATE TRIGGER normalize_client_contact_trigger
  BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION normalize_client_contact();

-- Create RLS policies for clients
CREATE POLICY "policy_admin_manage_clients"
ON clients
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'administrateur'
  )
);

CREATE POLICY "policy_staff_view_clients"
ON clients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('commercial', 'caisse')
  )
);

CREATE POLICY "policy_client_view_own"
ON clients
FOR SELECT
TO authenticated
USING (
  auth_user_id = auth.uid()
);

CREATE POLICY "policy_client_update_own"
ON clients
FOR UPDATE
TO authenticated
USING (
  auth_user_id = auth.uid()
)
WITH CHECK (
  auth_user_id = auth.uid()
);

-- Create RLS policies for client accounts
CREATE POLICY "policy_admin_manage_accounts"
ON client_accounts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'administrateur'
  )
);

CREATE POLICY "policy_staff_view_accounts"
ON client_accounts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('commercial', 'caisse')
  )
);

CREATE POLICY "policy_client_view_own_account"
ON client_accounts
FOR SELECT
TO authenticated
USING (
  auth_user_id = auth.uid()
);

-- Create RLS policies for transactions
CREATE POLICY "policy_admin_manage_transactions"
ON client_account_transactions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'administrateur'
  )
);

CREATE POLICY "policy_staff_view_transactions"
ON client_account_transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('commercial', 'caisse')
  )
);

CREATE POLICY "policy_client_view_own_transactions"
ON client_account_transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM client_accounts
    WHERE client_accounts.id = client_account_transactions.account_id
    AND client_accounts.auth_user_id = auth.uid()
  )
);

-- Create RLS policies for audit
CREATE POLICY "policy_admin_view_audit"
ON client_account_audit
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'administrateur'
  )
);

-- Create indexes for better performance
CREATE INDEX idx_clients_client_id ON clients(client_id);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_nom ON clients(nom);
CREATE INDEX idx_clients_entreprise ON clients(entreprise);
CREATE INDEX idx_clients_auth_user_id ON clients(auth_user_id);

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
COMMENT ON TABLE clients IS 'Stores basic client information';
COMMENT ON TABLE client_accounts IS 'Stores client account information and financial data';
COMMENT ON TABLE client_account_transactions IS 'Stores all financial transactions for client accounts';
COMMENT ON TABLE client_account_audit IS 'Tracks all changes made to client accounts';