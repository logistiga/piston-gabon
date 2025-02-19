/*
  # Tax Management Schema

  1. New Tables
    - `taxes`
      - `id` (uuid, primary key)
      - `name` (text, tax name)
      - `rate` (decimal, tax rate)
      - `type` (text: percentage, fixed)
      - `is_active` (boolean)
      - `description` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `tax_applications`
      - `id` (uuid, primary key)
      - `tax_id` (uuid, references taxes)
      - `entity_type` (text: invoice, quote)
      - `entity_id` (uuid)
      - `amount` (decimal)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create taxes table
CREATE TABLE IF NOT EXISTS taxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rate decimal(5,2) NOT NULL,
  type text NOT NULL CHECK (type IN ('percentage', 'fixed')),
  is_active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(name)
);

-- Create tax_applications table
CREATE TABLE IF NOT EXISTS tax_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_id uuid REFERENCES taxes(id) ON DELETE RESTRICT,
  entity_type text NOT NULL CHECK (entity_type IN ('invoice', 'quote')),
  entity_id uuid NOT NULL,
  amount decimal(12,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_applications ENABLE ROW LEVEL SECURITY;

-- Create policies for taxes
CREATE POLICY "Enable read access for authenticated users" ON taxes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON taxes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON taxes
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON taxes
  FOR DELETE TO authenticated USING (true);

-- Create policies for tax_applications
CREATE POLICY "Enable read access for authenticated users" ON tax_applications
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON tax_applications
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON tax_applications
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON tax_applications
  FOR DELETE TO authenticated USING (true);

-- Insert default taxes
INSERT INTO taxes (name, rate, type, description) VALUES
  ('TVA', 18.00, 'percentage', 'Taxe sur la Valeur Ajoutée'),
  ('CSS', 1.00, 'percentage', 'Contribution Sociale de Solidarité')
ON CONFLICT (name) DO NOTHING;