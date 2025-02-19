-- Create article_purchase_history table
CREATE TABLE IF NOT EXISTS article_purchase_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES articles(id) ON DELETE CASCADE,
  purchase_order_id uuid REFERENCES purchase_orders(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL DEFAULT 0,
  transport_cost decimal(10,2) DEFAULT 0,
  total_cost decimal(10,2) GENERATED ALWAYS AS (unit_price + COALESCE(transport_cost, 0)) STORED,
  supplier_name text NOT NULL,
  purchase_date timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create article_stock_history table
CREATE TABLE IF NOT EXISTS article_stock_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES articles(id) ON DELETE CASCADE,
  operation_type text NOT NULL CHECK (operation_type IN ('purchase', 'sale', 'adjustment', 'transfer')),
  quantity integer NOT NULL,
  previous_stock integer NOT NULL,
  new_stock integer NOT NULL,
  reference_type text NOT NULL CHECK (reference_type IN ('purchase_order', 'ticket', 'invoice', 'adjustment', 'transfer')),
  reference_id uuid NOT NULL,
  notes text,
  operation_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE article_purchase_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_stock_history ENABLE ROW LEVEL SECURITY;

-- Create unified CRUD policies
CREATE POLICY "article_purchase_history_crud_policy" ON article_purchase_history
  USING (true)
  WITH CHECK (true);

CREATE POLICY "article_stock_history_crud_policy" ON article_stock_history
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX idx_article_purchase_history_article_id ON article_purchase_history(article_id);
CREATE INDEX idx_article_purchase_history_purchase_date ON article_purchase_history(purchase_date);
CREATE INDEX idx_article_purchase_history_supplier ON article_purchase_history(supplier_name);

CREATE INDEX idx_article_stock_history_article_id ON article_stock_history(article_id);
CREATE INDEX idx_article_stock_history_operation_date ON article_stock_history(operation_date);
CREATE INDEX idx_article_stock_history_operation_type ON article_stock_history(operation_type);

-- Add audit triggers
CREATE TRIGGER audit_article_purchase_history_trigger
  AFTER INSERT OR UPDATE OR DELETE ON article_purchase_history
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_article_stock_history_trigger
  AFTER INSERT OR UPDATE OR DELETE ON article_stock_history
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Add helpful comments
COMMENT ON TABLE article_purchase_history IS 'Tracks purchase history for each article';
COMMENT ON TABLE article_stock_history IS 'Tracks stock movements for each article';