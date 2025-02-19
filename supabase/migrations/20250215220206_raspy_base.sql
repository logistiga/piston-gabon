-- Drop existing triggers if they exist
DO $$ BEGIN
  DROP TRIGGER IF EXISTS validate_client_signup_trigger ON client_accounts;
  DROP TRIGGER IF EXISTS handle_auth_user_linking_trigger ON client_accounts;
  DROP FUNCTION IF EXISTS validate_client_signup();
  DROP FUNCTION IF EXISTS handle_auth_user_linking();
END $$;

-- Create function to validate client signup
CREATE OR REPLACE FUNCTION validate_client_signup()
RETURNS TRIGGER AS $$
DECLARE
  client_record clients%ROWTYPE;
BEGIN
  -- Get client record
  SELECT * INTO client_record
  FROM clients 
  WHERE id = NEW.client_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client with ID % does not exist', NEW.client_id;
  END IF;

  -- Check for existing active account
  IF EXISTS (
    SELECT 1 
    FROM client_accounts 
    WHERE client_id = NEW.client_id 
    AND status = 'active'
    AND id != COALESCE(NEW.id, uuid_nil())
  ) THEN
    RAISE EXCEPTION 'Client already has an active account';
  END IF;

  -- Set default values
  NEW.status := COALESCE(NEW.status, 'active');
  NEW.credit_limit := COALESCE(NEW.credit_limit, client_record.limite_credit);
  NEW.credit_days := COALESCE(NEW.credit_days, 30);
  NEW.balance := COALESCE(NEW.balance, 0);
  NEW.account_number := COALESCE(NEW.account_number, generate_account_number_v3());

  -- Validate credit limit
  IF NEW.credit_limit < 0 THEN
    RAISE EXCEPTION 'Credit limit cannot be negative';
  END IF;

  -- Validate credit days
  IF NEW.credit_days < 0 THEN
    RAISE EXCEPTION 'Credit days cannot be negative';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for client signup validation
CREATE TRIGGER validate_client_signup_trigger
  BEFORE INSERT OR UPDATE ON client_accounts
  FOR EACH ROW
  EXECUTE FUNCTION validate_client_signup();

-- Create function to handle auth user linking
CREATE OR REPLACE FUNCTION handle_auth_user_linking()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if auth_user_id is set
  IF NEW.auth_user_id IS NOT NULL THEN
    -- Update client with auth_user_id
    UPDATE clients
    SET auth_user_id = NEW.auth_user_id
    WHERE id = NEW.client_id
    AND (auth_user_id IS NULL OR auth_user_id = NEW.auth_user_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auth user linking
CREATE TRIGGER handle_auth_user_linking_trigger
  AFTER INSERT OR UPDATE ON client_accounts
  FOR EACH ROW
  WHEN (NEW.auth_user_id IS NOT NULL)
  EXECUTE FUNCTION handle_auth_user_linking();

-- Create function to handle client account creation
CREATE OR REPLACE FUNCTION create_client_account(
  p_client_id uuid,
  p_email text,
  p_password text
) RETURNS uuid AS $$
DECLARE
  v_auth_user_id uuid;
  v_account_id uuid;
BEGIN
  -- Create auth user
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    role
  ) VALUES (
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"client"}'::jsonb,
    'authenticated'
  ) RETURNING id INTO v_auth_user_id;

  -- Create client account
  INSERT INTO client_accounts (
    client_id,
    auth_user_id,
    status,
    account_number
  ) VALUES (
    p_client_id,
    v_auth_user_id,
    'active',
    generate_account_number_v3()
  ) RETURNING id INTO v_account_id;

  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comments
COMMENT ON FUNCTION validate_client_signup IS 'Validates client signup data and sets default values';
COMMENT ON FUNCTION handle_auth_user_linking IS 'Links auth user to client after account creation';
COMMENT ON FUNCTION create_client_account IS 'Creates a new client account with auth user';