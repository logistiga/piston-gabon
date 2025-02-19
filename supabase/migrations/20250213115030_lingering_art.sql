-- Enable RLS on company_settings table
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read access for all authenticated users" ON company_settings;
DROP POLICY IF EXISTS "Allow update for admin users only" ON company_settings;

-- Create policies for company_settings
CREATE POLICY "policy_read_company_settings"
ON company_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "policy_update_company_settings"
ON company_settings
FOR UPDATE
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

-- Add helpful comments
COMMENT ON POLICY "policy_read_company_settings" ON company_settings IS 'Allow all authenticated users to read company settings';
COMMENT ON POLICY "policy_update_company_settings" ON company_settings IS 'Allow only administrators to update company settings';

-- Ensure initial company settings exist
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
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  website = EXCLUDED.website,
  address = EXCLUDED.address,
  capital = EXCLUDED.capital,
  rc_number = EXCLUDED.rc_number,
  nif_number = EXCLUDED.nif_number,
  stat_number = EXCLUDED.stat_number,
  bgfi_number = EXCLUDED.bgfi_number,
  ugb_number = EXCLUDED.ugb_number,
  return_policy = EXCLUDED.return_policy;