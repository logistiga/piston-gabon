-- Drop existing foreign key constraints if they exist
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_categorie_article_id_fkey;
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_fournisseur_id_fkey;
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_marque_id_fkey;

-- Create temporary columns with UUID type
ALTER TABLE articles 
  ADD COLUMN categorie_article_id_new uuid,
  ADD COLUMN fournisseur_id_new uuid,
  ADD COLUMN marque_id_new uuid;

-- Create temporary tables to store mappings
CREATE TEMPORARY TABLE category_id_map (
  old_id text,
  new_id uuid
);

CREATE TEMPORARY TABLE brand_id_map (
  old_id text,
  new_id uuid
);

-- Populate mapping tables
INSERT INTO category_id_map
SELECT id::text, id
FROM categories;

INSERT INTO brand_id_map
SELECT id::text, id
FROM brands;

-- Update the new columns using the mapping tables
UPDATE articles a
SET categorie_article_id_new = c.new_id
FROM category_id_map c
WHERE a.categorie_article_id::text = c.old_id;

UPDATE articles a
SET marque_id_new = b.new_id
FROM brand_id_map b
WHERE a.marque_id::text = b.old_id;

-- Drop old columns
ALTER TABLE articles 
  DROP COLUMN categorie_article_id,
  DROP COLUMN fournisseur_id,
  DROP COLUMN marque_id;

-- Rename new columns
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

-- Drop temporary tables
DROP TABLE category_id_map;
DROP TABLE brand_id_map;