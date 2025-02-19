-- Add missing columns to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_nom text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_email text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_telephone text;

-- Create view for invoices with client info
CREATE OR REPLACE VIEW invoices_with_client AS
SELECT 
  i.*,
  i.client_nom as name
FROM invoices i;

-- Update RLS policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON invoices;
CREATE POLICY "Enable read access for authenticated users" ON invoices
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON invoices;
CREATE POLICY "Enable insert access for authenticated users" ON invoices
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for authenticated users" ON invoices;
CREATE POLICY "Enable update access for authenticated users" ON invoices
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON invoices;
CREATE POLICY "Enable delete access for authenticated users" ON invoices
  FOR DELETE TO authenticated USING (true);