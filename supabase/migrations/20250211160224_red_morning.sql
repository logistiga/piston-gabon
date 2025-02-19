-- Drop existing table if it exists
DROP TABLE IF EXISTS purchase_order_items CASCADE;

-- Create purchase_order_items table with proper relations
CREATE TABLE purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE CASCADE,
  article_id uuid REFERENCES articles(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL DEFAULT 0,
  transport_cost decimal(10,2) DEFAULT 0,
  total_cost decimal(10,2) GENERATED ALWAYS AS (unit_price + COALESCE(transport_cost, 0)) STORED,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT purchase_order_items_order_article_unique UNIQUE(purchase_order_id, article_id)
);

-- Enable RLS
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Create unified CRUD policy
CREATE POLICY "purchase_order_items_crud_policy" ON purchase_order_items
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX idx_purchase_order_items_order_id ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_purchase_order_items_article_id ON purchase_order_items(article_id);

-- Add audit trigger
CREATE TRIGGER audit_purchase_order_items_trigger
  AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Add helpful comments
COMMENT ON TABLE purchase_order_items IS 'Stores line items for purchase orders with proper article relations';
COMMENT ON COLUMN purchase_order_items.article_id IS 'References the articles table for product details';