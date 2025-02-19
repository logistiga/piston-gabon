/*
  # Brands Schema

  1. New Tables
    - `brands` - Stores brand information
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `abbreviation` (text, unique)
      - `description` (text)
      - `logo_url` (text)
      - `website` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on brands table
    - Add policies for authenticated users

  3. Initial Data
    - Insert initial list of brands
*/

-- Create brands table
CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  abbreviation text,
  description text,
  logo_url text,
  website text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(name),
  UNIQUE(abbreviation)
);

-- Enable RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Create policies for brands with unique names
CREATE POLICY "brands_select_policy" ON brands
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "brands_insert_policy" ON brands
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "brands_update_policy" ON brands
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "brands_delete_policy" ON brands
  FOR DELETE TO authenticated USING (true);

-- Insert initial brands
INSERT INTO brands (name, abbreviation) VALUES
  ('SAMPA', 'SAMPA'),
  ('MAXPART', 'MAXPART'),
  ('WABCO', 'WABCO'),
  ('TRUCKZ', 'TRUCKZ'),
  ('REN-PAR', 'REN-PAR'),
  ('RENOULTRAPAR', 'RENOULTRAPAR'),
  ('MONEX', 'MONEX'),
  ('HENGST', 'HENGST'),
  ('DONALDSON', 'DONALDSON'),
  ('WRNORTECH', 'WRNORTECH'),
  ('RENAULT', 'RENAULT'),
  ('MERCEDES', 'MERCEDES'),
  ('MAN', 'MAN'),
  ('TKL', 'TKL'),
  ('YUMAK', 'YUMAK'),
  ('EW', 'EW'),
  ('BOSCH', 'BOSCH'),
  ('QMP', 'QMP'),
  ('RENKEN', 'RENKEN'),
  ('WEICHAI', 'WEICHAI')
ON CONFLICT (name) DO UPDATE SET
  abbreviation = EXCLUDED.abbreviation;