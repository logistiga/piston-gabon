-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON article_categories;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON article_categories;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON article_categories;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON article_categories;

-- Create new policies with unique names
CREATE POLICY "article_categories_select_policy" ON article_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "article_categories_insert_policy" ON article_categories
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "article_categories_update_policy" ON article_categories
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "article_categories_delete_policy" ON article_categories
  FOR DELETE TO authenticated USING (true);

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS audit_article_categories_trigger ON article_categories;

-- Add audit trigger
CREATE TRIGGER audit_article_categories_trigger
  AFTER INSERT OR UPDATE OR DELETE ON article_categories
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();