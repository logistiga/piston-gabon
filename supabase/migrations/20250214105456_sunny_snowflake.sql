-- Drop existing policies if they exist
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'settings'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON settings', pol.policyname);
  END LOOP;
END $$;

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create unified CRUD policy for administrators
CREATE POLICY "admin_settings_policy_v3"
ON settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Create read-only policy for all authenticated users
CREATE POLICY "read_settings_policy_v3"
ON settings
FOR SELECT
TO authenticated
USING (true);

-- Ensure initial settings exist
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
ON CONFLICT (category, key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now(),
  updated_by = auth.uid();

-- Add helpful comments
COMMENT ON POLICY "admin_settings_policy_v3" ON settings IS 'Allows administrators full access to settings';
COMMENT ON POLICY "read_settings_policy_v3" ON settings IS 'Allows all authenticated users to read settings';