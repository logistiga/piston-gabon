-- Add missing columns to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS client_nom text;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS client_email text;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS client_telephone text;

-- Add missing columns to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS client_nom text;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS client_email text;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS client_telephone text;

-- Update the queries in the components to use the new columns
CREATE OR REPLACE VIEW tickets_with_client AS
SELECT 
  t.*,
  t.client_nom as name
FROM tickets t;

CREATE OR REPLACE VIEW quotes_with_client AS
SELECT 
  q.*,
  q.client_nom as name
FROM quotes q;

-- Update RLS policies
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON tickets;
CREATE POLICY "Enable read access for authenticated users" ON tickets
  FOR SELECT TO authenticated USING (true);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON quotes;
CREATE POLICY "Enable read access for authenticated users" ON quotes
  FOR SELECT TO authenticated USING (true);