/*
  # Create quotes module schema
  
  1. New Tables
    - `quotes`
      - `id` (uuid, primary key)
      - `reference` (text, unique) - Format: DE_XXXXXX
      - `client_id` (uuid, references clients)
      - `total` (decimal) - Total amount
      - `status` (text) - Status of the quote (draft, sent, confirmed, rejected)
      - `invoice_status` (text) - Status of invoice conversion (not_invoiced, invoiced)
      - `valid_until` (timestamptz) - Quote validity date
      - `notes` (text) - Additional notes
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `quote_items`
      - `id` (uuid, primary key)
      - `quote_id` (uuid, references quotes)
      - `name` (text) - Product/service name
      - `description` (text)
      - `quantity` (integer)
      - `unit_price` (decimal)
      - `discount` (decimal)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE RESTRICT,
  total decimal(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'rejected')),
  invoice_status text NOT NULL DEFAULT 'not_invoiced' CHECK (invoice_status IN ('not_invoiced', 'invoiced')),
  valid_until timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create quote items table
CREATE TABLE IF NOT EXISTS quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL DEFAULT 0,
  discount decimal(5,2) NOT NULL DEFAULT 0 CHECK (discount >= 0 AND discount <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

-- Create policies for quotes
CREATE POLICY "Enable read access for authenticated users" ON quotes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON quotes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON quotes
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON quotes
  FOR DELETE TO authenticated USING (true);

-- Create policies for quote items
CREATE POLICY "Enable read access for authenticated users" ON quote_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON quote_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON quote_items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON quote_items
  FOR DELETE TO authenticated USING (true);

-- Create function to generate quote reference
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
  
  -- Generate new reference
  ref := 'DE_' || LPAD((num + 1)::text, 6, '0');
  
  RETURN ref;
END;
$$ LANGUAGE plpgsql;