-- Drop existing foreign key constraints if they exist
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_categorie_article_id_fkey;
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_fournisseur_id_fkey;
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_marque_id_fkey;

-- First, add temporary UUID columns
ALTER TABLE articles 
  ADD COLUMN categorie_article_id_new uuid,
  ADD COLUMN fournisseur_id_new uuid,
  ADD COLUMN marque_id_new uuid;

-- Update the new columns with converted values
UPDATE articles 
SET categorie_article_id_new = CASE 
  WHEN categorie_article_id IS NOT NULL 
  THEN (SELECT id FROM categories WHERE id::text = categorie_article_id::text)
  ELSE NULL 
END;

UPDATE articles 
SET marque_id_new = CASE 
  WHEN marque_id IS NOT NULL 
  THEN (SELECT id FROM brands WHERE id::text = marque_id::text)
  ELSE NULL 
END;

-- Drop old columns
ALTER TABLE articles 
  DROP COLUMN categorie_article_id,
  DROP COLUMN fournisseur_id,
  DROP COLUMN marque_id;

-- Rename new columns to original names
ALTER TABLE articles 
  RENAME COLUMN categorie_article_id_new TO categorie_article_id;

ALTER TABLE articles 
  RENAME COLUMN fournisseur_id_new TO fournisseur_id;

ALTER TABLE articles 
  RENAME COLUMN marque_id_new TO marque_id;

-- Add foreign key constraints
ALTER TABLE articles 
  ADD CONSTRAINT articles_categorie_article_id_fkey 
  FOREIGN KEY (categorie_article_id) 
  REFERENCES categories(id);

ALTER TABLE articles 
  ADD CONSTRAINT articles_marque_id_fkey 
  FOREIGN KEY (marque_id) 
  REFERENCES brands(id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_articles_categorie_article_id ON articles(categorie_article_id);
CREATE INDEX IF NOT EXISTS idx_articles_marque_id ON articles(marque_id);
CREATE INDEX IF NOT EXISTS idx_articles_cb ON articles(cb);