-- Add last sale price column to articles
ALTER TABLE articles 
  ADD COLUMN IF NOT EXISTS last_sale_price decimal(10,2) DEFAULT 0;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_articles_last_sale_price ON articles(last_sale_price);

-- Add helpful comment
COMMENT ON COLUMN articles.last_sale_price IS 'Last successful sale price of the article';