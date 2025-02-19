-- Drop existing views if they exist
DROP VIEW IF EXISTS tickets_with_client;
DROP VIEW IF EXISTS quotes_with_client;

-- Add missing columns and constraints to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS reference text UNIQUE;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS client_nom text;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS client_email text;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS client_telephone text;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS montant decimal(12,2) DEFAULT 0;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS statut text DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'payé', 'annulé'));
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS facture boolean DEFAULT false;

-- Create ticket_items table
CREATE TABLE IF NOT EXISTS ticket_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  article_id uuid REFERENCES articles(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL DEFAULT 0,
  discount decimal(5,2) NOT NULL DEFAULT 0 CHECK (discount >= 0 AND discount <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add missing columns and constraints to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS reference text UNIQUE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS client_nom text;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS client_email text;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS client_telephone text;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS total decimal(12,2) DEFAULT 0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'rejected'));
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS invoice_status text DEFAULT 'not_invoiced' CHECK (invoice_status IN ('not_invoiced', 'invoiced'));
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS valid_until timestamptz;

-- Create quote_items table
CREATE TABLE IF NOT EXISTS quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE,
  article_id uuid REFERENCES articles(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL DEFAULT 0,
  discount decimal(5,2) NOT NULL DEFAULT 0 CHECK (discount >= 0 AND discount <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE ticket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON ticket_items;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON ticket_items;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON ticket_items;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON ticket_items;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON quote_items;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON quote_items;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON quote_items;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON quote_items;

-- Create policies for ticket_items
CREATE POLICY "ticket_items_select_policy" ON ticket_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "ticket_items_insert_policy" ON ticket_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "ticket_items_update_policy" ON ticket_items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "ticket_items_delete_policy" ON ticket_items
  FOR DELETE TO authenticated USING (true);

-- Create policies for quote_items
CREATE POLICY "quote_items_select_policy" ON quote_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "quote_items_insert_policy" ON quote_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "quote_items_update_policy" ON quote_items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "quote_items_delete_policy" ON quote_items
  FOR DELETE TO authenticated USING (true);

-- Function to generate ticket reference
CREATE OR REPLACE FUNCTION generate_ticket_reference()
RETURNS text AS $$
DECLARE
  ref text;
  num int;
BEGIN
  -- Get the current max reference number
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM 3) AS integer)), 0)
  INTO num
  FROM tickets;
  
  -- Generate new reference (T_XXXXXX)
  ref := 'T_' || LPAD((num + 1)::text, 6, '0');
  
  RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate ticket reference
CREATE OR REPLACE FUNCTION tickets_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference IS NULL THEN
    NEW.reference := generate_ticket_reference();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tickets_before_insert_trigger
BEFORE INSERT ON tickets
FOR EACH ROW
EXECUTE FUNCTION tickets_before_insert();

-- Function to generate quote reference
CREATE OR REPLACE FUNCTION generate_quote_reference()
RETURNS text AS $$
DECLARE
  ref text;
  num int;
BEGIN
  -- Get the current max reference number
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM 4) AS integer)), 0)
  INTO num
  FROM quotes;
  
  -- Generate new reference (DE_XXXXXX)
  ref := 'DE_' || LPAD((num + 1)::text, 6, '0');
  
  RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate quote reference
CREATE OR REPLACE FUNCTION quotes_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference IS NULL THEN
    NEW.reference := generate_quote_reference();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quotes_before_insert_trigger
BEFORE INSERT ON quotes
FOR EACH ROW
EXECUTE FUNCTION quotes_before_insert();