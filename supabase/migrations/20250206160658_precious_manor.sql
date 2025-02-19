-- Drop existing policies if they exist 
DROP POLICY IF EXISTS "article_categories_select_policy" ON article_categories;
DROP POLICY IF EXISTS "article_categories_insert_policy" ON article_categories;
DROP POLICY IF EXISTS "article_categories_update_policy" ON article_categories;
DROP POLICY IF EXISTS "article_categories_delete_policy" ON article_categories;
DROP POLICY IF EXISTS "article_categories_select_policy_new" ON article_categories;
DROP POLICY IF EXISTS "article_categories_insert_policy_new" ON article_categories;
DROP POLICY IF EXISTS "article_categories_update_policy_new" ON article_categories;
DROP POLICY IF EXISTS "article_categories_delete_policy_new" ON article_categories;

-- Create single unified policy
CREATE POLICY "article_categories_crud_policy" ON article_categories
  USING (true)
  WITH CHECK (true);

-- Drop and recreate audit trigger
DROP TRIGGER IF EXISTS audit_article_categories_trigger ON article_categories;

CREATE TRIGGER audit_article_categories_trigger
  AFTER INSERT OR UPDATE OR DELETE ON article_categories
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();