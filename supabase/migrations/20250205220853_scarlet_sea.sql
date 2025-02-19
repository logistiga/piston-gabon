/*
  # Warehouses Schema

  1. New Tables
    - `warehouses` - Stores warehouse/depot information
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `code` (text, unique) - Short identifier code
      - `address` (text)
      - `city` (text)
      - `phone` (text)
      - `email` (text)
      - `manager` (text) - Name of warehouse manager
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `warehouse_locations` - Stores specific storage locations within warehouses
      - `id` (uuid, primary key)
      - `warehouse_id` (uuid, foreign key)
      - `name` (text) - Location identifier (e.g., "A1", "B2")
      - `zone` (text) - Zone identifier
      - `aisle` (text) - Aisle number/identifier
      - `rack` (text) - Rack number/identifier
      - `shelf` (text) - Shelf number/identifier
      - `notes` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `article_locations` - Maps articles to their storage locations
      - `id` (uuid, primary key)
      - `article_id` (uuid, foreign key)
      - `location_id` (uuid, foreign key)
      - `quantity` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users

  3. Initial Data
    - Insert base warehouses from the existing system
*/

-- Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  address text,
  city text,
  phone text,
  email text,
  manager text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(name),
  UNIQUE(code)
);

-- Create warehouse_locations table
CREATE TABLE IF NOT EXISTS warehouse_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE CASCADE,
  name text NOT NULL,
  zone text,
  aisle text,
  rack text,
  shelf text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(warehouse_id, name)
);

-- Create article_locations table
CREATE TABLE IF NOT EXISTS article_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES articles(id) ON DELETE CASCADE,
  location_id uuid REFERENCES warehouse_locations(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(article_id, location_id)
);

-- Enable RLS
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_locations ENABLE ROW LEVEL SECURITY;

-- Create policies for warehouses
CREATE POLICY "Enable read access for authenticated users" ON warehouses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON warehouses
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON warehouses
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON warehouses
  FOR DELETE TO authenticated USING (true);

-- Create policies for warehouse_locations
CREATE POLICY "Enable read access for authenticated users" ON warehouse_locations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON warehouse_locations
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON warehouse_locations
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON warehouse_locations
  FOR DELETE TO authenticated USING (true);

-- Create policies for article_locations
CREATE POLICY "Enable read access for authenticated users" ON article_locations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON article_locations
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON article_locations
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users" ON article_locations
  FOR DELETE TO authenticated USING (true);

-- Insert initial warehouses
INSERT INTO warehouses (name, code, address) VALUES
  ('PISTON GABON', 'PG-MAIN', 'DERRIERE SETRAG'),
  ('DEPOT 1', 'PG-D1', 'DERRIERE SETRAG'),
  ('DEPOT 2', 'PG-D2', 'DERRIERE SETRAG')
ON CONFLICT (name) DO UPDATE SET
  code = EXCLUDED.code,
  address = EXCLUDED.address;