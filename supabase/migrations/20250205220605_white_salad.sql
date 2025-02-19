/*
  # Categories Schema

  1. New Tables
    - `categories` - Stores article categories
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `slug` (text, unique) - URL-friendly version of name
      - `description` (text)
      - `parent_id` (uuid, self-referential foreign key)
      - `order` (integer) - For custom ordering
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `article_categories` - Links articles to categories (many-to-many)
      - `id` (uuid, primary key)
      - `article_id` (uuid, references articles)
      - `category_id` (uuid, references categories)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users

  3. Initial Data
    - Insert base categories from the existing system
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  parent_id uuid REFERENCES categories(id) ON DELETE RESTRICT,
  "order" integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(name),
  UNIQUE(slug)
);

-- Create article_categories junction table
CREATE TABLE IF NOT EXISTS article_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES articles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(article_id, category_id)
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for categories
CREATE POLICY "Enable read access for authenticated users" ON categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON categories
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON categories
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON categories
  FOR DELETE TO authenticated USING (true);

-- Create policies for article_categories
CREATE POLICY "Enable read access for authenticated users" ON article_categories
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON article_categories
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON article_categories
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON article_categories
  FOR DELETE TO authenticated USING (true);

-- Function to generate slug from name
CREATE OR REPLACE FUNCTION generate_slug(name text)
RETURNS text AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'),
        '^-+|-+$', '', 'g'
      ),
      'é|è|ê|ë', 'e', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Insert initial categories
INSERT INTO categories (name, slug, description, "order") VALUES
  ('Moteur', 'moteur', 'Pièces moteur et composants associés', 1),
  ('Boîte de vitesse', 'boite-de-vitesse', 'Composants de transmission et boîte de vitesses', 2),
  ('Filtration', 'filtration', 'Systèmes et éléments de filtration', 3),
  ('Échappement', 'echappement', 'Système d''échappement et catalyseurs', 4),
  ('Direction', 'direction', 'Composants de direction et suspension', 5),
  ('Embrayage', 'embrayage', 'Système d''embrayage et composants', 6),
  ('Système freinage', 'systeme-freinage', 'Freins et composants de freinage', 7),
  ('Accessoires', 'accessoires', 'Accessoires et équipements divers', 8),
  ('Cabine', 'cabine', 'Composants et accessoires de cabine', 9),
  ('Système d''air comprimé', 'systeme-air-comprime', 'Composants pneumatiques et air comprimé', 10),
  ('Électrique', 'electrique', 'Système électrique et composants', 11),
  ('Suspension freinage', 'suspension-freinage', 'Suspension et système de freinage', 12),
  ('Lubrifiants', 'lubrifiants', 'Huiles et lubrifiants', 13),
  ('Équipements', 'equipements', 'Équipements et outillage', 14),
  ('Pneumatique', 'pneumatique', 'Pneus et accessoires', 15),
  ('Boulons et vis', 'boulons-et-vis', 'Visserie et fixations', 16),
  ('Tôlerie et peinture', 'tolerie-et-peinture', 'Carrosserie et peinture', 17),
  ('Matériel de soudure', 'materiel-de-soudure', 'Équipement de soudure', 18),
  ('Remorque', 'remorque', 'Pièces et accessoires pour remorques', 19)
ON CONFLICT (name) DO UPDATE SET
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  "order" = EXCLUDED."order";

-- Add trigger to automatically generate slug on category creation/update
CREATE OR REPLACE FUNCTION categories_generate_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.name <> OLD.name THEN
    NEW.slug := generate_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER categories_generate_slug_trigger
BEFORE INSERT OR UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION categories_generate_slug();