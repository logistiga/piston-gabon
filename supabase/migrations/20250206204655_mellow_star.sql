/*
  # Update brands table

  1. Drop existing policies if they exist
  2. Create unified CRUD policy
  3. Add audit trigger
*/

-- Drop existing policies if they exist 
DROP POLICY IF EXISTS "brands_select_policy" ON brands;
DROP POLICY IF EXISTS "brands_insert_policy" ON brands;
DROP POLICY IF EXISTS "brands_update_policy" ON brands;
DROP POLICY IF EXISTS "brands_delete_policy" ON brands;

-- Create single unified policy
CREATE POLICY "brands_crud_policy" ON brands
  USING (true)
  WITH CHECK (true);

-- Drop and recreate audit trigger
DROP TRIGGER IF EXISTS audit_brands_trigger ON brands;

CREATE TRIGGER audit_brands_trigger
  AFTER INSERT OR UPDATE OR DELETE ON brands
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();