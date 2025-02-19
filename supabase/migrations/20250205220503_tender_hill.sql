/*
  # Article and Compatibility Schema

  1. New Tables
    - `articles` - Stores article information
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `category` (text)
      - `brand` (text)
      - `location` (text)
      - `wholesale_price` (decimal)
      - `retail_price` (decimal)
      - `stock` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `vehicle_brands` - Stores vehicle manufacturers
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `vehicle_models` - Stores vehicle models
      - `id` (uuid, primary key)
      - `brand_id` (uuid, references vehicle_brands)
      - `name` (text)
      - `year_start` (integer, nullable)
      - `year_end` (integer, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `article_compatibility` - Links articles to compatible vehicle models
      - `id` (uuid, primary key)
      - `article_id` (uuid, references articles)
      - `model_id` (uuid, references vehicle_models)
      - `notes` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create articles table first
CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text,
  brand text,
  location text,
  wholesale_price decimal(10,2) DEFAULT 0,
  retail_price decimal(10,2) DEFAULT 0,
  stock integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create vehicle_brands table
CREATE TABLE IF NOT EXISTS vehicle_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create vehicle_models table
CREATE TABLE IF NOT EXISTS vehicle_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES vehicle_brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  year_start integer,
  year_end integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(brand_id, name)
);

-- Create article_compatibility table
CREATE TABLE IF NOT EXISTS article_compatibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES articles(id) ON DELETE CASCADE,
  model_id uuid REFERENCES vehicle_models(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(article_id, model_id)
);

-- Enable RLS
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_compatibility ENABLE ROW LEVEL SECURITY;

-- Create policies for articles
CREATE POLICY "Enable read access for authenticated users" ON articles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON articles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON articles
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON articles
  FOR DELETE TO authenticated USING (true);

-- Create policies for vehicle_brands
CREATE POLICY "Enable read access for authenticated users" ON vehicle_brands
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON vehicle_brands
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON vehicle_brands
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON vehicle_brands
  FOR DELETE TO authenticated USING (true);

-- Create policies for vehicle_models
CREATE POLICY "Enable read access for authenticated users" ON vehicle_models
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON vehicle_models
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON vehicle_models
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON vehicle_models
  FOR DELETE TO authenticated USING (true);

-- Create policies for article_compatibility
CREATE POLICY "Enable read access for authenticated users" ON article_compatibility
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON article_compatibility
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON article_compatibility
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON article_compatibility
  FOR DELETE TO authenticated USING (true);

-- Insert initial vehicle brands
INSERT INTO vehicle_brands (name) VALUES
  ('Renault Trucks'),
  ('Mercedes-Benz'),
  ('MAN'),
  ('Volvo'),
  ('Scania'),
  ('DAF'),
  ('IVECO')
ON CONFLICT (name) DO NOTHING;

-- Insert initial vehicle models for Renault Trucks
INSERT INTO vehicle_models (brand_id, name)
SELECT 
  b.id,
  m.name
FROM vehicle_brands b
CROSS JOIN (
  VALUES 
    ('KERAX 440'),
    ('KERAX 380'),
    ('KERAX 350'),
    ('PREMIUM 440'),
    ('PREMIUM 380'),
    ('MAGNUM 440'),
    ('MAGNUM 480'),
    ('T HIGH 520'),
    ('T 440'),
    ('K 440')
) AS m(name)
WHERE b.name = 'Renault Trucks'
ON CONFLICT (brand_id, name) DO NOTHING;

-- Insert initial vehicle models for Mercedes-Benz
INSERT INTO vehicle_models (brand_id, name)
SELECT 
  b.id,
  m.name
FROM vehicle_brands b
CROSS JOIN (
  VALUES 
    ('ACTROS MP1'),
    ('ACTROS MP2'),
    ('ACTROS MP3'),
    ('ACTROS MP4'),
    ('ACTROS MP5'),
    ('AROCS'),
    ('AXOR'),
    ('ATEGO')
) AS m(name)
WHERE b.name = 'Mercedes-Benz'
ON CONFLICT (brand_id, name) DO NOTHING;