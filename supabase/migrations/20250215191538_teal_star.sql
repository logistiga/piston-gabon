-- Drop existing policies if any
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'clients'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON clients', pol.policyname);
  END LOOP;
END $$;

-- Drop and recreate clients table with original structure
DROP TABLE IF EXISTS clients CASCADE;

CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  entreprise text,
  email text,
  telephone text,
  limite_credit decimal(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policy
CREATE POLICY "policy_clients_access"
ON clients
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX idx_clients_nom ON clients(nom);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_entreprise ON clients(entreprise);

-- Add helpful comments
COMMENT ON TABLE clients IS 'Stores basic client information';
COMMENT ON COLUMN clients.limite_credit IS 'Credit limit for the client';