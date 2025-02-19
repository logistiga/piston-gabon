-- Rename created column to created_at for consistency
ALTER TABLE articles RENAME COLUMN created TO created_at;

-- Add indexes for commonly queried columns
CREATE INDEX IF NOT EXISTS articles_created_at_idx ON articles(created_at);
CREATE INDEX IF NOT EXISTS articles_cb_idx ON articles(cb);
CREATE INDEX IF NOT EXISTS articles_unique_code_idx ON articles(unique_code);
CREATE INDEX IF NOT EXISTS articles_nom_idx ON articles(nom);