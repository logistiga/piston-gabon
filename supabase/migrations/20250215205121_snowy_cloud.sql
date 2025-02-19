-- Create function to handle new client account creation
CREATE OR REPLACE FUNCTION handle_new_client_account() 
RETURNS TRIGGER AS $$
DECLARE
  client_record clients%ROWTYPE;
BEGIN
  -- Get the client record
  SELECT * INTO client_record
  FROM clients
  WHERE id = NEW.client_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client with ID % not found', NEW.client_id;
  END IF;

  -- Ensure account number is set
  IF NEW.account_number IS NULL THEN
    NEW.account_number := generate_account_number_v3();
  END IF;

  -- Set auth_user_id if not provided
  IF NEW.auth_user_id IS NULL THEN
    -- Check if client already has an auth user
    SELECT auth_user_id INTO NEW.auth_user_id
    FROM client_accounts
    WHERE client_id = NEW.client_id
    LIMIT 1;
  END IF;

  -- Set initial status if not provided
  IF NEW.status IS NULL THEN
    NEW.status := 'active';
  END IF;

  -- Inherit credit limit from client if not set
  IF NEW.credit_limit IS NULL THEN
    NEW.credit_limit := client_record.limite_credit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new client account handling
DROP TRIGGER IF EXISTS handle_new_client_account_trigger ON client_accounts;
CREATE TRIGGER handle_new_client_account_trigger
  BEFORE INSERT ON client_accounts
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_client_account();

-- Create function to validate client account changes
CREATE OR REPLACE FUNCTION validate_client_account_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent duplicate active accounts for same client
  IF NEW.status = 'active' AND EXISTS (
    SELECT 1 FROM client_accounts
    WHERE client_id = NEW.client_id 
    AND status = 'active'
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Client already has an active account';
  END IF;

  -- Prevent negative credit limit
  IF NEW.credit_limit < 0 THEN
    RAISE EXCEPTION 'Credit limit cannot be negative';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for client account validation
DROP TRIGGER IF EXISTS validate_client_account_changes_trigger ON client_accounts;
CREATE TRIGGER validate_client_account_changes_trigger
  BEFORE INSERT OR UPDATE ON client_accounts
  FOR EACH ROW
  EXECUTE FUNCTION validate_client_account_changes();

-- Add helpful comments
COMMENT ON FUNCTION handle_new_client_account IS 'Handles initialization of new client accounts';
COMMENT ON FUNCTION validate_client_account_changes IS 'Validates changes to client accounts';