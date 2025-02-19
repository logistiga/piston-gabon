/*
  # Fix Invoices Schema

  1. New Tables
    - `invoice_items` for storing invoice line items

  2. Changes
    - Add missing columns to invoices table
    - Add reference generation trigger
    - Add RLS policies

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Add missing columns to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reference text UNIQUE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_nom text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_email text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_telephone text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total decimal(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS status text DEFAULT 'non_payé' CHECK (status IN ('payé', 'non_payé'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_date timestamptz;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date timestamptz;

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  article_id uuid REFERENCES articles(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL DEFAULT 0,
  discount decimal(5,2) NOT NULL DEFAULT 0 CHECK (discount >= 0 AND discount <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Create policies for invoice_items with unique names
CREATE POLICY "invoice_items_select_policy" ON invoice_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "invoice_items_insert_policy" ON invoice_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "invoice_items_update_policy" ON invoice_items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "invoice_items_delete_policy" ON invoice_items
  FOR DELETE TO authenticated USING (true);

-- Function to generate invoice reference
CREATE OR REPLACE FUNCTION generate_invoice_reference()
RETURNS text AS $$
DECLARE
  ref text;
  num int;
BEGIN
  -- Get the current max reference number
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference FROM 4) AS integer)), 0)
  INTO num
  FROM invoices;
  
  -- Generate new reference (FA_XXXXXX)
  ref := 'FA_' || LPAD((num + 1)::text, 6, '0');
  
  RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate invoice reference
CREATE OR REPLACE FUNCTION invoices_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference IS NULL THEN
    NEW.reference := generate_invoice_reference();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoices_before_insert_trigger
BEFORE INSERT ON invoices
FOR EACH ROW
EXECUTE FUNCTION invoices_before_insert();