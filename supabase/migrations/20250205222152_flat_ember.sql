/*
  # Company Settings Table

  1. New Tables
    - `company_settings`
      - Single row table to store company information
      - Contains contact details, fiscal information, and policies
      
  2. Security
    - Enable RLS
    - Only authenticated users can read
    - Only admin users can update
*/

CREATE TABLE IF NOT EXISTS company_settings (
  id integer PRIMARY KEY CHECK (id = 1), -- Ensure single row
  name text NOT NULL,
  logo_url text,
  phone text,
  email text,
  website text,
  address text,
  capital text,
  rc_number text,
  nif_number text,
  stat_number text,
  bgfi_number text,
  ugb_number text,
  return_policy text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow read access for all authenticated users" ON company_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow update for admin users only" ON company_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
      AND raw_user_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.uid() = id
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Insert initial data
INSERT INTO company_settings (
  id,
  name,
  phone,
  email,
  website,
  address,
  capital,
  rc_number,
  nif_number,
  stat_number,
  bgfi_number,
  ugb_number,
  return_policy
) VALUES (
  1,
  'piston-gabon',
  '+24111701435',
  'info@piston-gabon.com',
  'www.piston-gabon.com',
  'situé au carrefour SETRAG non loin de CIMAF, Libreville',
  '18 000 000 XAF',
  'RG LBV 2018B22365',
  '747046 R',
  '2018B22365',
  '40002 00043 90000460985 56',
  '40003 04140 41053842011 06',
  'Qu''il s''agisse de ses produits, Piston Gabon prend la qualité au sérieux. Si vous n''êtes pas entièrement satisfait de votre achat, vous pouvez retourner le produit dans son emballage d''origine dans un délai de 7 jours suivant la date de livraison pour obtenir un remboursement. Si le produit est endommagé ou défectueux'
) ON CONFLICT (id) DO NOTHING;