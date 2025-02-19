-- Drop existing table and recreate with proper relations
DROP TABLE IF EXISTS ticket_items CASCADE;

CREATE TABLE ticket_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  article_id uuid REFERENCES articles(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL DEFAULT 0,
  discount decimal(5,2) NOT NULL DEFAULT 0 CHECK (discount >= 0 AND discount <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT ticket_items_ticket_article_unique UNIQUE(ticket_id, article_id)
);

-- Enable RLS
ALTER TABLE ticket_items ENABLE ROW LEVEL SECURITY;

-- Create unified CRUD policy
CREATE POLICY "ticket_items_crud_policy" ON ticket_items
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX idx_ticket_items_ticket_id ON ticket_items(ticket_id);
CREATE INDEX idx_ticket_items_article_id ON ticket_items(article_id);

-- Add audit trigger
CREATE TRIGGER audit_ticket_items_trigger
  AFTER INSERT OR UPDATE OR DELETE ON ticket_items
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Update PrintButton query to use proper join syntax
COMMENT ON TABLE ticket_items IS 'Stores line items for tickets with proper article relations';
COMMENT ON COLUMN ticket_items.article_id IS 'References the articles table for product details';