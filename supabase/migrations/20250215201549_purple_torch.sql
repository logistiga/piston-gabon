-- Add auth_user_id column to clients table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_clients_auth_user_id ON clients(auth_user_id);

-- Add helpful comment
COMMENT ON COLUMN clients.auth_user_id IS 'Reference to auth.users for client accounts';