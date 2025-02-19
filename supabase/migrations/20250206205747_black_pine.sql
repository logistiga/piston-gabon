-- Drop existing table and triggers
DROP TRIGGER IF EXISTS audit_articles_trigger ON articles;
DROP TABLE IF EXISTS articles CASCADE;

-- Create articles table
CREATE TABLE articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cb text UNIQUE NOT NULL,
  nom text NOT NULL,
  description text,
  emplacement text,
  prixa decimal(10,2) DEFAULT 0,
  prixg decimal(10,2) DEFAULT 0,
  prixd decimal(10,2) DEFAULT 0,
  derniere_prix decimal(10,2) DEFAULT 0,
  stock integer DEFAULT 0,
  brand_id uuid REFERENCES brands(id),
  category_id uuid REFERENCES categories(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Create unified CRUD policy
DROP POLICY IF EXISTS "articles_crud_policy" ON articles;
CREATE POLICY "articles_crud_policy" ON articles
  USING (true)
  WITH CHECK (true);

-- Add audit trigger
CREATE TRIGGER audit_articles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON articles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Insert initial articles
INSERT INTO articles (cb, nom, emplacement, prixg, prixd, stock) VALUES
  ('AE-MAN-T', 'ACCORDEON D''ECHAPPEMENT MAN TKZ', NULL, 27720, 60000, 17),
  ('AE2-ACTROS-T', 'ACCORDÉON D''ECHAPPEMENT ACTROS TKZ/2', NULL, 13000, 54622, 2),
  ('AE-ACTROS-T', 'ACCORDÉON D''ECHAPPEMENT ACTROS TKZ', NULL, 13000, 54622, 0),
  ('AE-KERAX-T', 'ACCORDÉON D''ECHAPPEMENT KERAX TKZ', NULL, 13000, 54622, 0),
  ('AE-PREMIUM-T', 'ACCORDÉON D''ECHAPPEMENT PREMIUM TKZ', NULL, 13000, 54622, 0),
  ('AE-MAGNUM-T', 'ACCORDÉON D''ECHAPPEMENT MAGNUM TKZ', NULL, 13000, 54622, 0),
  ('AE-VOLVO-T', 'ACCORDÉON D''ECHAPPEMENT VOLVO TKZ', NULL, 13000, 54622, 0),
  ('AE-SCANIA-T', 'ACCORDÉON D''ECHAPPEMENT SCANIA TKZ', NULL, 13000, 54622, 0),
  ('AE-DAF-T', 'ACCORDÉON D''ECHAPPEMENT DAF TKZ', NULL, 13000, 54622, 0),
  ('AE-IVECO-T', 'ACCORDÉON D''ECHAPPEMENT IVECO TKZ', NULL, 13000, 54622, 0)
ON CONFLICT (cb) DO UPDATE SET
  nom = EXCLUDED.nom,
  prixg = EXCLUDED.prixg,
  prixd = EXCLUDED.prixd,
  stock = EXCLUDED.stock;