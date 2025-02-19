-- Add unique code field to articles table
ALTER TABLE articles ADD COLUMN IF NOT EXISTS unique_code text;

-- Create function to generate unique code
CREATE OR REPLACE FUNCTION generate_unique_article_code() 
RETURNS trigger AS $$
DECLARE
  new_code text;
  counter integer := 1;
BEGIN
  -- Base code from article name (first 3 letters) + random number
  new_code := UPPER(SUBSTRING(NEW.nom FROM 1 FOR 3)) || '-' || 
              TO_CHAR(FLOOR(RANDOM() * 9999 + 1000), 'FM9999');
  
  -- Keep trying until we find a unique code
  WHILE EXISTS (SELECT 1 FROM articles WHERE unique_code = new_code) LOOP
    new_code := UPPER(SUBSTRING(NEW.nom FROM 1 FOR 3)) || '-' || 
                TO_CHAR(FLOOR(RANDOM() * 9999 + 1000), 'FM9999');
    counter := counter + 1;
    IF counter > 100 THEN
      RAISE EXCEPTION 'Could not generate unique code after 100 attempts';
    END IF;
  END LOOP;
  
  NEW.unique_code := new_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate unique code
DROP TRIGGER IF EXISTS generate_article_unique_code ON articles;
CREATE TRIGGER generate_article_unique_code
  BEFORE INSERT ON articles
  FOR EACH ROW
  WHEN (NEW.unique_code IS NULL)
  EXECUTE FUNCTION generate_unique_article_code();

-- Update existing articles with unique codes if they don't have one
UPDATE articles SET unique_code = NULL WHERE unique_code IS NULL;