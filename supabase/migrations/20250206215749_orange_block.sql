-- Add unique code field to articles table
ALTER TABLE articles ADD COLUMN IF NOT EXISTS unique_code text;

-- Add unique constraint on unique_code
ALTER TABLE articles ADD CONSTRAINT articles_unique_code_key UNIQUE (unique_code);

-- Remove automatic generation trigger if it exists
DROP TRIGGER IF EXISTS generate_article_unique_code ON articles;
DROP FUNCTION IF EXISTS generate_unique_article_code();