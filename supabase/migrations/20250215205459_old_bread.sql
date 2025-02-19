-- Create function to validate client account creation
CREATE OR REPLACE FUNCTION validate_client_signup()
RETURNS TRIGGER AS $$
DECLARE
  client_exists boolean;
  email_exists boolean;
BEGIN
  -- Check if client exists
  SELECT EXISTS (
    SELECT 1 FROM clients WHERE id = NEW.client_id
  ) INTO client_exists;

  IF NOT client_exists THEN
    RAISE EXCEPTION 'Client with ID % does not exist', NEW.client_id;
  END IF;

  -- Check if email is already used
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = NEW.email
  ) INTO email_exists;

  IF email_exists THEN
    RAISE EXCEPTION 'Email % is already in use', NEW.email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for client signup validation
DROP TRIGGER IF EXISTS validate_client_signup_trigger ON client_accounts;
CREATE TRIGGER validate_client_signup_trigger
  BEFORE INSERT ON client_accounts
  FOR EACH ROW
  EXECUTE FUNCTION validate_client_signup();

-- Create function to handle client account creation
CREATE OR REPLACE FUNCTION handle_client_account_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Set default values if not provided
  NEW.status := COALESCE(NEW.status, 'active');
  NEW.credit_limit := COALESCE(NEW.credit_limit, 0);
  NEW.credit_days := COALESCE(NEW.credit_days, 30);
  NEW.balance := COALESCE(NEW.balance, 0);
  
  -- Generate account number if not provided
  IF NEW.account_number IS NULL THEN
    NEW.account_number := generate_account_number_v3();
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

-- Create trigger for client account creation
DROP TRIGGER IF EXISTS handle_client_account_creation_trigger ON client_accounts;
CREATE TRIGGER handle_client_account_creation_trigger
  BEFORE INSERT ON client_accounts
  FOR EACH ROW
  EXECUTE FUNCTION handle_client_account_creation();

-- Add helpful comments
COMMENT ON FUNCTION validate_client_signup IS 'Validates client signup data before account creation';
COMMENT ON FUNCTION handle_client_account_creation IS 'Handles initialization of new client accounts';