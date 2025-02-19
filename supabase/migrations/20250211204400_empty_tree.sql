-- First add last_sale_price column if it doesn't exist
ALTER TABLE articles 
  ADD COLUMN IF NOT EXISTS last_sale_price decimal(10,2) DEFAULT 0;

-- Create function to update last sale price
CREATE OR REPLACE FUNCTION update_article_last_sale_price()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last sale price when a ticket or invoice is paid
  IF NEW.statut = 'payé' AND OLD.statut != 'payé' THEN
    -- For tickets
    IF TG_TABLE_NAME = 'tickets' THEN
      UPDATE articles a
      SET 
        last_sale_price = ti.unit_price,
        updated_at = now()
      FROM ticket_items ti
      WHERE ti.ticket_id = NEW.id
      AND ti.article_id = a.id;
    -- For invoices
    ELSIF TG_TABLE_NAME = 'invoices' THEN
      UPDATE articles a
      SET 
        last_sale_price = ii.unit_price,
        updated_at = now()
      FROM invoice_items ii
      WHERE ii.invoice_id = NEW.id
      AND ii.article_id = a.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for tickets and invoices
DROP TRIGGER IF EXISTS update_article_last_sale_price_ticket_trigger ON tickets;
CREATE TRIGGER update_article_last_sale_price_ticket_trigger
  AFTER UPDATE OF statut ON tickets
  FOR EACH ROW
  WHEN (NEW.statut = 'payé')
  EXECUTE FUNCTION update_article_last_sale_price();

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_articles_last_sale_price ON articles(last_sale_price);

-- Add helpful comments
COMMENT ON FUNCTION update_article_last_sale_price() IS 'Updates article last sale price when a ticket or invoice is paid';
COMMENT ON COLUMN articles.last_sale_price IS 'Last successful sale price of the article';