/*
  # Add Suppliers Management Tables

  1. New Tables
    - `suppliers`
      - Basic supplier information
      - Contact details
      - Payment terms
      - Status tracking
  
  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text,
  address text,
  city text,
  country text,
  phone text,
  email text,
  website text,
  tax_id text,
  payment_terms text,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Create policies for suppliers
CREATE POLICY "Enable read access for authenticated users" ON suppliers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON suppliers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON suppliers
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON suppliers
  FOR DELETE TO authenticated USING (true);

-- Add audit trigger
CREATE TRIGGER audit_suppliers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();