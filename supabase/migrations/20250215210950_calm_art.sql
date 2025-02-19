-- Create function to validate client signup
CREATE OR REPLACE FUNCTION validate_client_signup()
RETURNS TRIGGER AS $$
DECLARE
  client_exists boolean;
  active_account_exists boolean;
BEGIN
  -- Check if client exists
  SELECT EXISTS (
    SELECT 1 FROM clients WHERE id = NEW.client_id
  ) INTO client_exists;

  IF NOT client_exists THEN
    RAISE EXCEPTION 'Client with ID % does not exist', NEW.client_id;
  END IF;

  -- Check for existing active account
  SELECT EXISTS (
    SELECT 1 FROM client_accounts 
    WHERE client_id = NEW.client_id 
    AND status = 'active'
    AND id != COALESCE(NEW.id, uuid_nil())
  ) INTO active_account_exists;

  IF active_account_exists THEN
    RAISE EXCEPTION 'Client already has an active account';
  END IF;

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
DROP TRIGGER IF EXISTS validate_client_signup_trigger ON client_accounts;
CREATE TRIGGER validate_client_signup_trigger
  BEFORE INSERT OR UPDATE ON client_accounts
  FOR EACH ROW
  EXECUTE FUNCTION validate_client_signup();

-- Create function to handle auth user creation
CREATE OR REPLACE FUNCTION handle_auth_user_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if auth_user_id is not set
  IF NEW.auth_user_id IS NULL THEN
    -- Get client email
    SELECT email INTO NEW.auth_user_id
    FROM clients
    WHERE id = NEW.client_id;
    
    IF NEW.auth_user_id IS NULL THEN
      RAISE EXCEPTION 'Client must have an email address';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auth user creation
DROP TRIGGER IF EXISTS handle_auth_user_creation_trigger ON client_accounts;
CREATE TRIGGER handle_auth_user_creation_trigger
  BEFORE INSERT ON client_accounts
  FOR EACH ROW
  EXECUTE FUNCTION handle_auth_user_creation();

-- Add helpful comments
COMMENT ON FUNCTION validate_client_signup IS 'Validates client signup data before account creation';
COMMENT ON FUNCTION handle_auth_user_creation IS 'Handles auth user creation for new client accounts';