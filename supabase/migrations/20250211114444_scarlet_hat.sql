-- First drop the dependent view
DROP VIEW IF EXISTS article_costs;

-- Add transport cost columns if they don't exist
DO $$ 
BEGIN
  -- Add transport_cost column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'articles' AND column_name = 'transport_cost'
  ) THEN
    ALTER TABLE articles ADD COLUMN transport_cost decimal(10,2) DEFAULT 0;
  END IF;

  -- Drop total_cost column if it exists (since we're changing the calculation)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'articles' AND column_name = 'total_cost'
  ) THEN
    ALTER TABLE articles DROP COLUMN total_cost;
  END IF;

  -- Add total_cost as a generated column
  ALTER TABLE articles 
    ADD COLUMN total_cost decimal(10,2) 
    GENERATED ALWAYS AS (prixa + COALESCE(transport_cost, 0)) STORED;

END $$;

-- Add or update column comments
COMMENT ON COLUMN articles.transport_cost IS 'Cost of transport per unit';
COMMENT ON COLUMN articles.total_cost IS 'Total cost including purchase price and transport';

-- Recreate the view with updated columns
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

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_articles_transport_cost ON articles(transport_cost);
CREATE INDEX IF NOT EXISTS idx_articles_total_cost ON articles(total_cost);