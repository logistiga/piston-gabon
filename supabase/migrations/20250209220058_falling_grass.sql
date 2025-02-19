-- Create ticket_items table with proper relations
CREATE TABLE IF NOT EXISTS ticket_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  article_id uuid REFERENCES articles(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL DEFAULT 0,
  discount decimal(5,2) NOT NULL DEFAULT 0 CHECK (discount >= 0 AND discount <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE ticket_items ENABLE ROW LEVEL SECURITY;

-- Create policies for ticket_items
CREATE POLICY "ticket_items_crud_policy" ON ticket_items
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ticket_items_ticket_id ON ticket_items(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_items_article_id ON ticket_items(article_id);

-- Add audit trigger
CREATE TRIGGER audit_ticket_items_trigger
  AFTER INSERT OR UPDATE OR DELETE ON ticket_items
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();