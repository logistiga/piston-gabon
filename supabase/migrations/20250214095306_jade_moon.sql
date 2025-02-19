-- Drop existing policies if they exist
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'company_settings'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON company_settings', pol.policyname);
  END LOOP;
END $$;

-- Enable RLS on company_settings table
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Create unified CRUD policy for administrators
CREATE POLICY "admin_company_settings_policy_v6"
ON company_settings
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

-- Create read-only policy for all authenticated users
CREATE POLICY "read_company_settings_policy_v6"
ON company_settings
FOR SELECT
TO authenticated
USING (true);

-- Ensure initial company settings exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM company_settings WHERE id = 1) THEN
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
    );
  END IF;
END $$;

-- Add helpful comments
COMMENT ON POLICY "admin_company_settings_policy_v6" ON company_settings IS 'Allows administrators full access to company settings';
COMMENT ON POLICY "read_company_settings_policy_v6" ON company_settings IS 'Allows all authenticated users to read company settings';