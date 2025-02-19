-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE(category, key)
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "settings_read_policy"
ON settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "settings_write_policy"
ON settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'administrateur'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'administrateur'
  )
);

-- Insert initial settings
INSERT INTO settings (category, key, value, description) VALUES
  ('company', 'info', jsonb_build_object(
    'name', 'piston-gabon',
    'phone', '+24111701435',
    'email', 'info@piston-gabon.com',
    'website', 'www.piston-gabon.com',
    'address', 'situé au carrefour SETRAG non loin de CIMAF, Libreville',
    'logo_url', null
  ), 'Company information'),
  
  ('company', 'legal', jsonb_build_object(
    'capital', '18 000 000 XAF',
    'rc_number', 'RG LBV 2018B22365',
    'nif_number', '747046 R',
    'stat_number', '2018B22365'
  ), 'Legal information'),
  
  ('company', 'banking', jsonb_build_object(
    'bgfi_number', '40002 00043 90000460985 56',
    'ugb_number', '40003 04140 41053842011 06'
  ), 'Banking information'),
  
  ('company', 'policies', jsonb_build_object(
    'return_policy', 'Qu''il s''agisse de ses produits, Piston Gabon prend la qualité au sérieux. Si vous n''êtes pas entièrement satisfait de votre achat, vous pouvez retourner le produit dans son emballage d''origine dans un délai de 7 jours suivant la date de livraison pour obtenir un remboursement. Si le produit est endommagé ou défectueux'
  ), 'Company policies')
ON CONFLICT (category, key) DO NOTHING;

-- Add indexes
CREATE INDEX idx_settings_category ON settings(category);
CREATE INDEX idx_settings_key ON settings(key);
CREATE INDEX idx_settings_updated_at ON settings(updated_at);

-- Add helpful comments
COMMENT ON TABLE settings IS 'Stores all application settings';
COMMENT ON COLUMN settings.category IS 'Settings category (e.g., company, system, etc.)';
COMMENT ON COLUMN settings.key IS 'Setting key within category';
COMMENT ON COLUMN settings.value IS 'Setting value as JSON';
COMMENT ON COLUMN settings.description IS 'Optional description of the setting';