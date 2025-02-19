-- Add transport cost column to articles table
ALTER TABLE articles
  ADD COLUMN transport_cost decimal(10,2) DEFAULT 0,
  ADD COLUMN total_cost decimal(10,2) GENERATED ALWAYS AS (prixa + COALESCE(transport_cost, 0)) STORED;

-- Add comment to explain the columns
COMMENT ON COLUMN articles.transport_cost IS 'Cost of transport per unit';
COMMENT ON COLUMN articles.total_cost IS 'Total cost including purchase price and transport';

-- Create or replace view for article costs
CREATE OR REPLACE VIEW article_costs AS
SELECT
  id,
  cb,
  nom,
  prixa as purchase_price,
  transport_cost,
  total_cost,
  prixd as selling_price,
  CASE 
    WHEN total_cost > 0 THEN
      ROUND(((prixd - total_cost) / total_cost) * 100, 2)
    ELSE
      0
  END as margin_percentage
FROM articles;