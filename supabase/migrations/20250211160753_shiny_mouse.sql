-- Create function to update article costs and stock on reception
CREATE OR REPLACE FUNCTION update_article_on_reception()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status is changing to 'received'
  IF NEW.status = 'received' AND OLD.status != 'received' THEN
    -- Update articles based on purchase order items
    UPDATE articles a
    SET 
      prixa = poi.unit_price,
      transport_cost = poi.transport_cost,
      derniere_prix = poi.total_cost,
      stock = stock + poi.quantity,
      updated_at = now()
    FROM purchase_order_items poi
    WHERE poi.purchase_order_id = NEW.id
    AND poi.article_id = a.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for article updates
DROP TRIGGER IF EXISTS update_article_on_reception_trigger ON purchase_orders;
CREATE TRIGGER update_article_on_reception_trigger
  AFTER UPDATE OF status ON purchase_orders
  FOR EACH ROW
  WHEN (NEW.status = 'received')
  EXECUTE FUNCTION update_article_on_reception();

-- Add helpful comments
COMMENT ON FUNCTION update_article_on_reception() IS 'Updates article costs and stock when purchase order is received';