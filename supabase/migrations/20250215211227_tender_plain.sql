-- Drop existing functions and triggers if they exist
DO $$ BEGIN
  DROP TRIGGER IF EXISTS validate_client_signup_trigger ON client_accounts;
  DROP TRIGGER IF EXISTS handle_auth_user_creation_trigger ON client_accounts;
  DROP FUNCTION IF EXISTS validate_client_signup();
  DROP FUNCTION IF EXISTS handle_auth_user_creation();
END $$;

-- Create function to validate client signup
CREATE OR REPLACE FUNCTION validate_client_signup()
RETURNS TRIGGER AS $$
DECLARE
  client_record clients%ROWTYPE;
  email_exists boolean;
BEGIN
  -- Get client record
  SELECT * INTO client_record
  FROM clients 
  WHERE id = NEW.client_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client with ID % does not exist', NEW.client_id;
  END IF;

  -- Check if client has email
  IF client_record.email IS NULL THEN
    RAISE EXCEPTION 'Client must have an email address';
  END IF;

  -- Check if email is already used in auth.users
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE email = client_record.email
    AND id != COALESCE(NEW.auth_user_id, uuid_nil())
  ) INTO email_exists;

  IF email_exists THEN
    RAISE EXCEPTION 'Email % is already in use', client_record.email;
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

-- Create function to handle auth user creation
CREATE OR REPLACE FUNCTION handle_auth_user_creation()
RETURNS TRIGGER AS $$
DECLARE
  client_email text;
BEGIN
  -- Only proceed if auth_user_id is not set
  IF NEW.auth_user_id IS NULL THEN
    -- Get client email
    SELECT email INTO client_email
    FROM clients
    WHERE id = NEW.client_id;
    
    IF client_email IS NULL THEN
      RAISE EXCEPTION 'Client must have an email address';
    END IF;

    -- Set auth_user_id to null to be filled by application logic
    -- This prevents circular dependency with auth.users
    NEW.auth_user_id := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auth user creation
CREATE TRIGGER handle_auth_user_creation_trigger
  BEFORE INSERT ON client_accounts
  FOR EACH ROW
  EXECUTE FUNCTION handle_auth_user_creation();

-- Add helpful comments
COMMENT ON FUNCTION validate_client_signup IS 'Validates client signup data and sets default values';
COMMENT ON FUNCTION handle_auth_user_creation IS 'Prepares client account for auth user creation';