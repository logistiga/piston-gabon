-- Create article_references table
CREATE TABLE IF NOT EXISTS article_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES articles(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT article_references_code_unique UNIQUE(article_id, code)
);

-- Enable RLS
ALTER TABLE article_references ENABLE ROW LEVEL SECURITY;

-- Create unified CRUD policy
CREATE POLICY "article_references_crud_policy" ON article_references
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX idx_article_references_article_id ON article_references(article_id);
CREATE INDEX idx_article_references_code ON article_references(code);

-- Add audit trigger
CREATE TRIGGER audit_article_references_trigger
  AFTER INSERT OR UPDATE OR DELETE ON article_references
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Add helpful comments
COMMENT ON TABLE article_references IS 'Stores additional reference codes for articles';
COMMENT ON COLUMN article_references.code IS 'Alternative reference code for the article';
COMMENT ON COLUMN article_references.description IS 'Optional description of what this reference code represents';