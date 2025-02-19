-- Drop existing table if it exists
DROP TABLE IF EXISTS quote_items CASCADE;

-- Create quote_items table with proper relations
CREATE TABLE quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE,
  article_id uuid REFERENCES articles(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL DEFAULT 0,
  discount decimal(5,2) NOT NULL DEFAULT 0 CHECK (discount >= 0 AND discount <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT quote_items_quote_article_unique UNIQUE(quote_id, article_id)
);

-- Enable RLS
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

-- Create unified CRUD policy
CREATE POLICY "quote_items_crud_policy" ON quote_items
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX idx_quote_items_article_id ON quote_items(article_id);

-- Add audit trigger
CREATE TRIGGER audit_quote_items_trigger
  AFTER INSERT OR UPDATE OR DELETE ON quote_items
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Add helpful comments
COMMENT ON TABLE quote_items IS 'Stores line items for quotes with proper article relations';
COMMENT ON COLUMN quote_items.article_id IS 'References the articles table for product details';