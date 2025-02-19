/*
  # Fix Quotes Schema

  1. Changes
    - Add missing columns to quotes table
    - Add proper constraints and defaults
    - Fix quote items table structure
    - Add proper indexes and policies

  2. Security
    - Enable RLS on all tables
    - Add unified CRUD policies
*/

-- Drop existing quote_items table if it exists
DROP TABLE IF EXISTS quote_items CASCADE;

-- Add missing columns to quotes table
ALTER TABLE quotes 
  ADD COLUMN IF NOT EXISTS client_nom text,
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS client_telephone text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS total decimal(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'rejected')),
  ADD COLUMN IF NOT EXISTS invoice_status text DEFAULT 'not_invoiced' CHECK (invoice_status IN ('not_invoiced', 'invoiced')),
  ADD COLUMN IF NOT EXISTS valid_until timestamptz;

-- Create quote_items table
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
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_article_id ON quote_items(article_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_invoice_status ON quotes(invoice_status);
CREATE INDEX IF NOT EXISTS idx_quotes_client_nom ON quotes(client_nom);

-- Add audit trigger
CREATE TRIGGER audit_quote_items_trigger
  AFTER INSERT OR UPDATE OR DELETE ON quote_items
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Add helpful comments
COMMENT ON TABLE quote_items IS 'Stores line items for quotes with proper article relations';
COMMENT ON COLUMN quote_items.article_id IS 'References the articles table for product details';
COMMENT ON COLUMN quotes.status IS 'Current status of the quote (draft, sent, confirmed, rejected)';
COMMENT ON COLUMN quotes.invoice_status IS 'Whether the quote has been converted to an invoice';